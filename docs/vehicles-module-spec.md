# Specyfikacja modułu `vehicles` — OwnHome

> Wersja: 1.0  
> Status: Do implementacji  
> Zależności: `budget` (transakcje), `calendar` (przypomnienia)  
> Zgodność: CLAUDE.md v1.0

---

## 1. Zakres modułu

Moduł `vehicles` zarządza pojazdami użytkownika jako assetami majątkowymi: danymi identyfikacyjnymi, ubezpieczeniami, przeglądami technicznymi, wizytami serwisowymi oraz historią eksploatacyjną. Moduł jest zintegrowany z `budget` (koszty → transakcje) i `calendar` (terminy → przypomnienia) przez warstwę service — bez bezpośrednich wywołań między UI a innymi modułami.

---

## 2. Model danych

### 2.1 Schemat Prisma

```prisma
model Vehicle {
  id                  String    @id @default(cuid())
  userId              String
  name                String    // nazwa własna, np. "Moje Volvo"
  licensePlate        String
  photoUrl            String?   // URL do Supabase Storage
  vin                 String?
  make                String?   // marka
  model               String?
  year                Int?
  color               String?
  engineType          String?   // np. "2.0 TDI"
  engineCapacity      String?   // np. "1968 cc"
  fuelType            FuelType?
  transmissionType    TransmissionType?
  bodyType            String?
  mileage             Int       @default(0) // aktualny przebieg w km
  registrationExpiry  DateTime?
  createdAt           DateTime  @default(now())
  updatedAt           DateTime  @updatedAt
  deletedAt           DateTime?

  insurances          VehicleInsurance[]
  inspections         VehicleInspection[]
  serviceVisits       VehicleServiceVisit[]
  maintenanceItems    VehicleMaintenanceItem[]

  @@index([userId])
  @@index([userId, deletedAt])
}

model VehicleInsurance {
  id             String    @id @default(cuid())
  vehicleId      String
  userId         String
  provider       String
  policyNumber   String?
  type           InsuranceType
  amount         Decimal   @db.Decimal(10,2)
  currency       String    @default("PLN")
  startDate      DateTime
  endDate        DateTime
  transactionId  String?   // FK → budget.Transaction (nullable)
  notes          String?
  createdAt      DateTime  @default(now())
  deletedAt      DateTime?

  vehicle        Vehicle   @relation(fields: [vehicleId], references: [id])

  @@index([vehicleId])
  @@index([userId, endDate])     // sortowanie po terminie wygaśnięcia
  @@index([userId, deletedAt])
}

model VehicleInspection {
  id                  String    @id @default(cuid())
  vehicleId           String
  userId              String
  date                DateTime
  nextDate            DateTime?
  mileageAtService    Int?
  result              InspectionResult
  cost                Decimal?  @db.Decimal(10,2)
  currency            String    @default("PLN")
  transactionId       String?   // FK → budget.Transaction (nullable)
  notes               String?
  createdAt           DateTime  @default(now())
  deletedAt           DateTime?

  vehicle             Vehicle   @relation(fields: [vehicleId], references: [id])

  @@index([vehicleId])
  @@index([userId, nextDate])
  @@index([userId, deletedAt])
}

model VehicleServiceVisit {
  id                  String    @id @default(cuid())
  vehicleId           String
  userId              String
  date                DateTime
  shopName            String?
  mileageAtService    Int?
  totalCost           Decimal?  @db.Decimal(10,2)
  currency            String    @default("PLN")
  transactionId       String?   // FK → budget.Transaction (nullable)
  notes               String?   // swobodny tekst analizowany przez AI
  aiSuggestions       Json?     // wynik parsowania notatek przez AI
  aiAppliedAt         DateTime? // kiedy sugestie zostały zatwierdzone
  createdAt           DateTime  @default(now())
  deletedAt           DateTime?

  vehicle             Vehicle   @relation(fields: [vehicleId], references: [id])
  maintenanceUpdates  VehicleMaintenanceItem[]

  @@index([vehicleId])
  @@index([userId, date])
  @@index([userId, deletedAt])
}

model VehicleMaintenanceItem {
  id                  String             @id @default(cuid())
  vehicleId           String
  userId              String
  type                MaintenanceItemType
  lastServiceDate     DateTime?
  lastServiceMileage  Int?
  nextServiceDate     DateTime?
  nextServiceMileage  Int?
  notes               String?
  updatedByVisitId    String?            // FK → VehicleServiceVisit (nullable)
  createdAt           DateTime           @default(now())
  updatedAt           DateTime           @updatedAt

  vehicle             Vehicle            @relation(fields: [vehicleId], references: [id])
  updatedByVisit      VehicleServiceVisit? @relation(fields: [updatedByVisitId], references: [id])

  @@unique([vehicleId, type])  // jeden wpis per typ per pojazd
  @@index([vehicleId])
  @@index([userId])
}

enum FuelType {
  petrol
  diesel
  lpg
  electric
  hybrid
  hydrogen
}

enum TransmissionType {
  manual
  automatic
  semi_automatic
  cvt
}

enum InsuranceType {
  oc          // obowiązkowe OC
  ac          // autocasco
  assistance
  nnw
  other
}

enum InspectionResult {
  passed
  passed_with_defects
  failed
}

enum MaintenanceItemType {
  oil_change
  timing_belt
  timing_chain
  brakes_front
  brakes_rear
  brake_fluid
  gearbox_oil
  coolant
  spark_plugs
  glow_plugs
  air_filter
  cabin_filter
  fuel_filter
  power_steering_fluid
  battery
  tires_summer
  tires_winter
  tires_all_season
  clutch
  suspension_front
  suspension_rear
  other
}
```

### 2.2 Polityki RLS (Supabase)

```sql
-- vehicles
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_own_vehicles" ON vehicles
  FOR ALL USING (auth.uid()::text = user_id);

-- vehicle_insurances
ALTER TABLE vehicle_insurances ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_own_vehicle_insurances" ON vehicle_insurances
  FOR ALL USING (auth.uid()::text = user_id);

-- vehicle_inspections
ALTER TABLE vehicle_inspections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_own_vehicle_inspections" ON vehicle_inspections
  FOR ALL USING (auth.uid()::text = user_id);

-- vehicle_service_visits
ALTER TABLE vehicle_service_visits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_own_vehicle_service_visits" ON vehicle_service_visits
  FOR ALL USING (auth.uid()::text = user_id);

-- vehicle_maintenance_items
ALTER TABLE vehicle_maintenance_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_own_vehicle_maintenance_items" ON vehicle_maintenance_items
  FOR ALL USING (auth.uid()::text = user_id);
```

---

## 3. Typy TypeScript (`module.types.ts`)

Typy inferowane z Zod schematów lub importowane z Prisma. Poniżej typy domenowe niezbędne w warstwie service.

```ts
// Pole status — obliczane dynamicznie w service, nigdy persystowane
export type MaintenanceStatus = 'ok' | 'upcoming' | 'overdue' | 'unknown';

// Interwały per typ — stałe w service.ts, nie w DB
export type MaintenanceInterval = {
  km?: number;     // np. 15000 (co 15 000 km)
  months?: number; // np. 12 (co rok)
};

// Enriched response dla maintenance itemów
export interface MaintenanceItemWithStatus {
  id: string;
  vehicleId: string;
  type: MaintenanceItemType;
  lastServiceDate: Date | null;
  lastServiceMileage: number | null;
  nextServiceDate: Date | null;
  nextServiceMileage: number | null;
  status: MaintenanceStatus;     // computed
  daysUntilDue: number | null;   // computed
  kmUntilDue: number | null;     // computed
  notes: string | null;
  updatedByVisitId: string | null;
}

// Payload opcjonalnej integracji z budżetem
export interface CreateTransactionPayload {
  amount: number;
  currency: string;
  categoryId: string;
  date: Date;
  description?: string;
}

// Sugestie AI z parsowania notatek wizyty
export interface AiMaintenanceSuggestion {
  type: MaintenanceItemType;
  lastServiceDate?: Date;
  lastServiceMileage?: number;
  confidence: 'high' | 'medium' | 'low';
  reason: string; // np. "notatka zawiera 'wymiana oleju'"
}
```

---

## 4. Schematy Zod (`module.schema.ts`)

```ts
import { z } from 'zod';

export const createVehicleSchema = z.object({
  name:               z.string().trim().min(1).max(100),
  licensePlate:       z.string().trim().min(1).max(20),
  photoUrl:           z.string().url().optional(),
  vin:                z.string().trim().length(17).optional(),
  make:               z.string().trim().max(100).optional(),
  model:              z.string().trim().max(100).optional(),
  year:               z.number().int().min(1900).max(new Date().getFullYear() + 1).optional(),
  color:              z.string().trim().max(50).optional(),
  engineType:         z.string().trim().max(50).optional(),
  engineCapacity:     z.string().trim().max(20).optional(),
  fuelType:           z.enum(['petrol','diesel','lpg','electric','hybrid','hydrogen']).optional(),
  transmissionType:   z.enum(['manual','automatic','semi_automatic','cvt']).optional(),
  bodyType:           z.string().trim().max(50).optional(),
  mileage:            z.number().int().min(0).default(0),
  registrationExpiry: z.coerce.date().optional(),
});

export const updateVehicleSchema = createVehicleSchema.partial();

// --- Ubezpieczenie ---
const createTransactionPayloadSchema = z.object({
  amount:      z.number().positive(),
  currency:    z.string().length(3).default('PLN'),
  categoryId:  z.string().cuid(),
  date:        z.coerce.date(),
  description: z.string().trim().max(500).optional(),
});

export const createInsuranceSchema = z.object({
  provider:          z.string().trim().min(1).max(200),
  policyNumber:      z.string().trim().max(100).optional(),
  type:              z.enum(['oc','ac','assistance','nnw','other']),
  amount:            z.number().positive(),
  currency:          z.string().length(3).default('PLN'),
  startDate:         z.coerce.date(),
  endDate:           z.coerce.date(),
  notes:             z.string().trim().max(2000).optional(),
  createTransaction: createTransactionPayloadSchema.optional(),
});

export const updateInsuranceSchema = createInsuranceSchema.partial().omit({ createTransaction: true });

// --- Przegląd ---
export const createInspectionSchema = z.object({
  date:              z.coerce.date(),
  nextDate:          z.coerce.date().optional(),
  mileageAtService:  z.number().int().min(0).optional(),
  result:            z.enum(['passed','passed_with_defects','failed']),
  cost:              z.number().positive().optional(),
  currency:          z.string().length(3).default('PLN'),
  notes:             z.string().trim().max(2000).optional(),
  createTransaction: createTransactionPayloadSchema.optional(),
});

export const updateInspectionSchema = createInspectionSchema.partial().omit({ createTransaction: true });

// --- Wizyta serwisowa ---
export const createServiceVisitSchema = z.object({
  date:              z.coerce.date(),
  shopName:          z.string().trim().max(200).optional(),
  mileageAtService:  z.number().int().min(0).optional(),
  totalCost:         z.number().positive().optional(),
  currency:          z.string().length(3).default('PLN'),
  notes:             z.string().trim().max(5000).optional(),
  createTransaction: createTransactionPayloadSchema.optional(),
});

export const updateServiceVisitSchema = createServiceVisitSchema.partial().omit({ createTransaction: true });

// --- Maintenance ---
export const updateMaintenanceItemSchema = z.object({
  lastServiceDate:    z.coerce.date().optional(),
  lastServiceMileage: z.number().int().min(0).optional(),
  nextServiceDate:    z.coerce.date().optional(),
  nextServiceMileage: z.number().int().min(0).optional(),
  notes:              z.string().trim().max(2000).optional(),
});

export const applyAiSuggestionsSchema = z.object({
  suggestions: z.array(z.object({
    type:               z.nativeEnum(MaintenanceItemType),
    lastServiceDate:    z.coerce.date().optional(),
    lastServiceMileage: z.number().int().min(0).optional(),
  })).min(1),
});

// --- VIN lookup ---
export const vinLookupSchema = z.object({
  vin: z.string().trim().length(17),
});

export const uploadPhotoSchema = z.object({
  vehicleId: z.string().cuid(),
});
```

---

## 5. Endpointy API

### Pojazdy

| Metoda | Ścieżka | Opis |
|--------|---------|------|
| `GET` | `/api/vehicles` | Lista pojazdów użytkownika (bez deletedAt) |
| `POST` | `/api/vehicles` | Nowy pojazd |
| `GET` | `/api/vehicles/[id]` | Pojazd ze wszystkimi powiązanymi danymi |
| `PATCH` | `/api/vehicles/[id]` | Aktualizacja danych pojazdu |
| `DELETE` | `/api/vehicles/[id]` | Soft delete |
| `POST` | `/api/vehicles/[id]/photo` | Upload zdjęcia → Supabase Storage, zwraca URL |
| `POST` | `/api/vehicles/vin-lookup` | Lookup danych z VIN (proxy do zewnętrznego API) |

### Ubezpieczenia

| Metoda | Ścieżka | Opis |
|--------|---------|------|
| `GET` | `/api/vehicles/[id]/insurance` | Lista ubezpieczeń pojazdu |
| `POST` | `/api/vehicles/[id]/insurance` | Nowe ubezpieczenie + opcjonalna transakcja |
| `PATCH` | `/api/vehicles/[id]/insurance/[iid]` | Aktualizacja ubezpieczenia |
| `DELETE` | `/api/vehicles/[id]/insurance/[iid]` | Soft delete |

### Przeglądy techniczne

| Metoda | Ścieżka | Opis |
|--------|---------|------|
| `GET` | `/api/vehicles/[id]/inspections` | Lista przeglądów |
| `POST` | `/api/vehicles/[id]/inspections` | Nowy przegląd + opcjonalna transakcja |
| `PATCH` | `/api/vehicles/[id]/inspections/[iid]` | Aktualizacja przeglądu |
| `DELETE` | `/api/vehicles/[id]/inspections/[iid]` | Soft delete |

### Wizyty serwisowe

| Metoda | Ścieżka | Opis |
|--------|---------|------|
| `GET` | `/api/vehicles/[id]/service-visits` | Lista wizyt (paginacja cursor-based) |
| `POST` | `/api/vehicles/[id]/service-visits` | Nowa wizyta + opcjonalna transakcja + trigger AI |
| `PATCH` | `/api/vehicles/[id]/service-visits/[vid]` | Aktualizacja wizyty |
| `DELETE` | `/api/vehicles/[id]/service-visits/[vid]` | Soft delete |

### Dane eksploatacyjne

| Metoda | Ścieżka | Opis |
|--------|---------|------|
| `GET` | `/api/vehicles/[id]/maintenance` | Lista itemów eksploatacyjnych ze statusem computed |
| `PATCH` | `/api/vehicles/[id]/maintenance/[mid]` | Ręczna aktualizacja itemu |
| `POST` | `/api/vehicles/[id]/maintenance/apply-ai` | Zatwierdzenie sugestii AI |

### Koszty (cross-module)

| Metoda | Ścieżka | Opis |
|--------|---------|------|
| `GET` | `/api/vehicles/[id]/costs` | Sumowanie transakcji powiązanych z pojazdem (z modułu budget) |

---

## 6. Logika biznesowa (`module.service.ts`)

### 6.1 Integracja z budżetem

Przy tworzeniu ubezpieczenia, przeglądu i wizyty serwisowej payload może zawierać opcjonalne pole `createTransaction`. Jeśli jest obecne, service wywołuje `budgetService.createTransaction()` w tej samej operacji.

**Zasada atomowości:** Oba zapisy (encja pojazdu + transakcja budżetowa) muszą być wykonane w jednej transakcji Prisma (`prisma.$transaction([])`). Rollback obu w przypadku błędu. Pole `transactionId` w encji pojazdu jest ustawiane na wynik `budgetService.createTransaction()`.

```ts
// Przykład — atomowe tworzenie wizyty + transakcji
async createServiceVisit(data: CreateServiceVisitDto, vehicleId: string, userId: string) {
  const vehicle = await vehicleRepository.getById(vehicleId, userId);
  if (!vehicle) throw new AppError('NOT_FOUND');

  return await prisma.$transaction(async (tx) => {
    let transactionId: string | null = null;

    if (data.createTransaction) {
      const txn = await budgetRepository.createTransaction(
        { ...data.createTransaction, vehicleId },
        userId,
        tx
      );
      transactionId = txn.id;
    }

    const visit = await vehicleRepository.createServiceVisit(
      { ...data, transactionId },
      vehicleId,
      userId,
      tx
    );

    // Aktualizacja przebiegu pojazdu jeśli wyższy
    if (data.mileageAtService && data.mileageAtService > vehicle.mileage) {
      await vehicleRepository.updateMileage(vehicleId, userId, data.mileageAtService, tx);
    }

    await eventEmitter.emit('vehicle.service_visit.created', { visitId: visit.id, vehicleId }, userId);

    return visit;
  });
}
```

### 6.2 Obliczanie statusu eksploatacyjnego

Status maintenance **nie jest persystowany** w bazie. Obliczany w service przy każdym `GET /maintenance`.

```ts
// Interwały domyślne — stałe, nie DB
const MAINTENANCE_INTERVALS: Record<MaintenanceItemType, MaintenanceInterval> = {
  oil_change:          { km: 15000, months: 12 },
  timing_belt:         { km: 120000, months: 60 },
  timing_chain:        { km: 200000 },
  brakes_front:        { months: 24 },
  brakes_rear:         { months: 36 },
  brake_fluid:         { months: 24 },
  gearbox_oil:         { km: 60000 },
  coolant:             { months: 24 },
  spark_plugs:         { km: 30000, months: 36 },
  glow_plugs:          { km: 60000 },
  air_filter:          { km: 30000 },
  cabin_filter:        { km: 20000, months: 12 },
  fuel_filter:         { km: 30000 },
  power_steering_fluid:{ km: 60000 },
  battery:             { months: 48 },
  tires_summer:        {},   // status ręczny
  tires_winter:        {},
  tires_all_season:    {},
  clutch:              { km: 120000 },
  suspension_front:    { km: 80000 },
  suspension_rear:     { km: 80000 },
  other:               {},
};

// Progi dla statusów
const UPCOMING_KM_THRESHOLD = 2000;    // "wkrótce" jeśli < 2000 km
const UPCOMING_DAYS_THRESHOLD = 30;    // "wkrótce" jeśli < 30 dni

function computeMaintenanceStatus(
  item: VehicleMaintenanceItem,
  currentMileage: number
): MaintenanceStatus {
  const interval = MAINTENANCE_INTERVALS[item.type];
  const now = new Date();

  // Sprawdź przebieg
  if (interval.km && item.lastServiceMileage != null) {
    const nextKm = item.lastServiceMileage + interval.km;
    const diff = nextKm - currentMileage;
    if (diff <= 0) return 'overdue';
    if (diff <= UPCOMING_KM_THRESHOLD) return 'upcoming';
  }

  // Sprawdź datę
  if (interval.months && item.lastServiceDate) {
    const nextDate = addMonths(item.lastServiceDate, interval.months);
    const diffDays = differenceInDays(nextDate, now);
    if (diffDays <= 0) return 'overdue';
    if (diffDays <= UPCOMING_DAYS_THRESHOLD) return 'upcoming';
  }

  // Użyj nextServiceDate jeśli ustawione ręcznie
  if (item.nextServiceDate) {
    const diffDays = differenceInDays(item.nextServiceDate, now);
    if (diffDays <= 0) return 'overdue';
    if (diffDays <= UPCOMING_DAYS_THRESHOLD) return 'upcoming';
  }

  if (!item.lastServiceDate && !item.lastServiceMileage) return 'unknown';
  return 'ok';
}
```

### 6.3 Flow AI — parsowanie notatek

1. Worker odbiera event `vehicle.service_visit.created`.
2. Pobiera notatkę wizyty i aktualny stan wszystkich `VehicleMaintenanceItem` dla danego pojazdu.
3. Buduje prompt strukturalny i wywołuje Claude API.
4. Zapisuje wynik do `ServiceVisit.aiSuggestions` (pole JSON).
5. Emituje event `vehicle.maintenance.ai_suggestions_ready`.
6. UI poll lub SSE — pokazuje toast z prośbą o zatwierdzenie.

**Prompt dla AI:**
```ts
const buildAiPrompt = (notes: string, items: VehicleMaintenanceItem[]): string => `
Przeanalizuj notatkę z wizyty serwisowej i określ, które pozycje eksploatacyjne pojazdu zostały wykonane.

Notatka: "${notes}"

Dostępne typy pozycji: ${Object.values(MaintenanceItemType).join(', ')}

Aktualny stan pozycji eksploatacyjnych:
${items.map(i => `- ${i.type}: ostatni serwis ${i.lastServiceDate?.toISOString() ?? 'brak'}, przebieg ${i.lastServiceMileage ?? 'brak'}`).join('\n')}

Odpowiedz wyłącznie w formacie JSON (bez preambuły, bez komentarzy):
{
  "suggestions": [
    {
      "type": "MaintenanceItemType",
      "lastServiceDate": "ISO date lub null",
      "lastServiceMileage": number lub null,
      "confidence": "high|medium|low",
      "reason": "krótkie uzasadnienie po polsku"
    }
  ]
}
`;
```

**Sugestie są zapisywane — nigdy automatycznie stosowane.** Użytkownik musi wywołać `POST /api/vehicles/[id]/maintenance/apply-ai` z zatwierdzeniem.

---

## 7. System eventów

### 7.1 Lista eventów

| Nazwa eventu | Trigger | Kiedy schedulować |
|---|---|---|
| `vehicle.created` | Po dodaniu pojazdu | Natychmiast (informacyjny) |
| `vehicle.insurance.created` | Po dodaniu ubezpieczenia | Natychmiast |
| `vehicle.insurance.expiring` | Cron dzienny | 30 dni przed `endDate` |
| `vehicle.inspection.created` | Po dodaniu przeglądu | Natychmiast |
| `vehicle.inspection.expiring` | Cron dzienny | 60 i 30 dni przed `nextDate` |
| `vehicle.registration.expiring` | Cron dzienny | 30 dni przed `registrationExpiry` |
| `vehicle.service_visit.created` | Po dodaniu wizyty | Natychmiast → trigger AI worker |
| `vehicle.maintenance.due` | Cron dzienny | 7 dni lub 500 km przed terminem |
| `vehicle.maintenance.ai_suggestions_ready` | Po zakończeniu AI parse | Natychmiast |

### 7.2 Integracja z modułem `calendar`

Eventy expiracyjne (`insurance.expiring`, `inspection.expiring`, `registration.expiring`) są obsługiwane przez handler w module `calendar`, który tworzy wpis `CalendarEvent` z odpowiednim tytułem i datą. Użytkownik widzi przypomnienie w kalendarzu bez dodatkowej konfiguracji.

```ts
// Handler w calendar/module.service.ts
eventEmitter.on('vehicle.insurance.expiring', async (event) => {
  await calendarService.createReminder({
    title: `OC wygasa — ${event.payload.vehicleName}`,
    date: event.payload.expiryDate,
    userId: event.userId,
    sourceModule: 'vehicles',
    sourceId: event.payload.insuranceId,
  });
});
```

---

## 8. Obsługa zdjęć (Supabase Storage)

### Bucket: `vehicle-photos`

Polityka RLS na buckecie:
```sql
-- Odczyt: publiczny (URL jest wystarczającym sekretem)
CREATE POLICY "public_read_vehicle_photos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'vehicle-photos');

-- Zapis: tylko właściciel
CREATE POLICY "owner_upload_vehicle_photos"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'vehicle-photos' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );
```

### Ścieżka pliku: `{userId}/{vehicleId}/{timestamp}.jpg`

```ts
// service — endpoint POST /api/vehicles/[id]/photo
async uploadVehiclePhoto(vehicleId: string, userId: string, file: File) {
  const vehicle = await vehicleRepository.getById(vehicleId, userId);
  if (!vehicle) throw new AppError('NOT_FOUND');

  const path = `${userId}/${vehicleId}/${Date.now()}.jpg`;
  const { data, error } = await supabase.storage
    .from('vehicle-photos')
    .upload(path, file, { upsert: true });

  if (error) throw new AppError('INTERNAL_ERROR');

  const { data: { publicUrl } } = supabase.storage
    .from('vehicle-photos')
    .getPublicUrl(path);

  await vehicleRepository.update(vehicleId, userId, { photoUrl: publicUrl });
  return { photoUrl: publicUrl };
}
```

---

## 9. VIN Lookup

### Endpoint: `POST /api/vehicles/vin-lookup`

- Proxy do zewnętrznego API — UI nigdy nie wywołuje zewnętrznego API bezpośrednio.
- Primarne źródło: NHTSA VPIC API (`https://vpic.nhtsa.dot.gov/api/vehicles/decodevin/{vin}?format=json`) — bezpłatne, USA.
- Fallback / rozbudowa: komercyjny dekoder europejski (opcjonalnie).
- Rate limit: 5 req/min per `userId`.
- Cache: wynik VIN cachowany przez 30 dni (te same dane dla tego samego VIN). Klucz cache: `vin-lookup:{vin}`.

### Response mapping:

```ts
// Mapowanie z NHTSA na pola Vehicle
const VIN_FIELD_MAP: Record<string, keyof CreateVehicleDto> = {
  'Make':             'make',
  'Model':            'model',
  'Model Year':       'year',
  'Engine Displacement (L)': 'engineCapacity',
  'Fuel Type - Primary': 'fuelType',
  'Transmission Style': 'transmissionType',
  'Body Class':       'bodyType',
};
```

---

## 10. Tabela eksploatacyjna — domyślne wpisy

Przy tworzeniu nowego pojazdu (`POST /api/vehicles`) service automatycznie tworzy pełny zestaw `VehicleMaintenanceItem` dla wszystkich typów z `MaintenanceItemType`. Wszystkie pola dat i przebiegów są `null` — użytkownik uzupełnia stopniowo (ręcznie lub przez AI).

```ts
async createVehicle(data: CreateVehicleDto, userId: string) {
  const vehicle = await vehicleRepository.create(data, userId);

  // Utwórz wszystkie maintenance items dla nowego pojazdu
  const maintenanceItems = Object.values(MaintenanceItemType).map(type => ({
    vehicleId: vehicle.id,
    userId,
    type,
  }));
  await vehicleRepository.createManyMaintenanceItems(maintenanceItems);

  await eventEmitter.emit('vehicle.created', { vehicleId: vehicle.id }, userId);
  return vehicle;
}
```

---

## 11. Koszty pojazdu (cross-module query)

Endpoint `GET /api/vehicles/[id]/costs` odpytuje moduł `budget` o transakcje powiązane z pojazdem przez `transactionId` lub po `vehicleId` w metadanych transakcji.

```ts
// Odpowiedź
interface VehicleCostsSummary {
  vehicleId: string;
  year: number;
  totalCost: number;
  currency: string;
  breakdown: {
    insurance:     number;
    inspections:   number;
    serviceVisits: number;
    other:         number;
  };
  byMonth: Array<{
    month: number; // 1–12
    cost: number;
  }>;
}
```

---

## 12. Widok UI (`module.ui.tsx`)

### Struktura ekranu

```
/vehicles
  VehicleListPage
    ├── VehicleCard (zdjęcie + nr rej. + nazwa + status ubezpieczenia)
    └── AddVehicleButton

/vehicles/[id]
  VehicleDetailPage
    ├── VehicleHeader (zdjęcie, nazwa, nr rej., marka/model/rok)
    ├── Tabs
    │   ├── "Informacje"    → VehicleInfoTab
    │   ├── "Ubezpieczenie" → VehicleInsuranceTab
    │   ├── "Przeglądy"     → VehicleInspectionsTab
    │   ├── "Serwis"        → VehicleServiceVisitsTab
    │   └── "Eksploatacja"  → VehicleMaintenanceTab
    └── VehicleCostsSummaryWidget (roczny koszt)
```

### Kluczowe komponenty

**VehicleCard** — karta na liście:
- Zdjęcie (aspect ratio 16:9, placeholder jeśli brak)
- Wyróżniony numer rejestracyjny (badge)
- Nazwa własna i marka/model
- Chip statusu ubezpieczenia (ok / wygasa wkrótce / wygasłe)

**VehicleMaintenanceTab** — tabela eksploatacyjna:
- Tabela z kolumnami: Typ, Ostatni serwis, Przebieg, Następny serwis, Km do terminu, Status
- Kolorowanie wierszy wg statusu (ok=zielony, upcoming=żółty, overdue=czerwony)
- Inline edit per wiersz

**AiSuggestionsToast** — modal/toast po AI parse:
- Lista sugestii z confidence i uzasadnieniem
- Checkboxy per sugestia (domyślnie zaznaczone)
- Przycisk "Zatwierdź zaznaczone"

**InsuranceForm / InspectionForm / ServiceVisitForm** — formularze z opcją:
- Toggle "Dodaj do budżetu"
- Jeśli włączony: pola kwoty, kategorii i daty transakcji

---

## 13. Kolejność implementacji (zgodnie z CLAUDE.md §9)

```
1. Migracja Prisma
   └── schema.prisma — 5 modeli + 5 enumów
   └── RLS SQL — 5 polityk
   └── Supabase Storage bucket + polityki

2. vehicles/module.types.ts
   └── MaintenanceStatus, MaintenanceInterval, MaintenanceItemWithStatus
   └── CreateTransactionPayload, AiMaintenanceSuggestion

3. vehicles/module.schema.ts
   └── createVehicleSchema, updateVehicleSchema
   └── createInsuranceSchema, updateInsuranceSchema
   └── createInspectionSchema, updateInspectionSchema
   └── createServiceVisitSchema, updateServiceVisitSchema
   └── updateMaintenanceItemSchema, applyAiSuggestionsSchema
   └── vinLookupSchema

4. vehicles/module.repository.ts
   └── vehicleRepository (CRUD + uploadPhoto)
   └── insuranceRepository
   └── inspectionRepository
   └── serviceVisitRepository (z AI suggestions)
   └── maintenanceRepository (getMany, updateOne, batchUpdate)

5. vehicles/module.service.ts
   └── vehicleService (createVehicle → auto-creates maintenance items)
   └── insuranceService (z budgetService.createTransaction)
   └── inspectionService (z budgetService.createTransaction)
   └── serviceVisitService (z budgetService + event AI trigger + mileage update)
   └── maintenanceService (computeStatus, applyAiSuggestions)
   └── vinLookupService (proxy + cache)
   └── vehicleCostsService (cross-module query)

6. vehicles/module.api.ts (Route Handlers per sub-ścieżka)
   └── /api/vehicles
   └── /api/vehicles/[id]
   └── /api/vehicles/[id]/photo
   └── /api/vehicles/vin-lookup
   └── /api/vehicles/[id]/insurance + /[iid]
   └── /api/vehicles/[id]/inspections + /[iid]
   └── /api/vehicles/[id]/service-visits + /[vid]
   └── /api/vehicles/[id]/maintenance + /[mid] + /apply-ai
   └── /api/vehicles/[id]/costs

7. vehicles/module.ui.tsx
   └── VehicleListPage + VehicleCard
   └── VehicleDetailPage + Tabs
   └── VehicleInfoTab (dane + VIN lookup)
   └── VehicleInsuranceTab + InsuranceForm
   └── VehicleInspectionsTab + InspectionForm
   └── VehicleServiceVisitsTab + ServiceVisitForm
   └── VehicleMaintenanceTab (tabela + inline edit)
   └── AiSuggestionsToast
   └── VehicleCostsSummaryWidget
```

---

## 14. Decyzje otwarte / przyszła faza

| Temat | Decyzja | Priorytet |
|---|---|---|
| VIN lookup — europejski dekoder | Komercyjne API (np. carVertical) — wymaga klucza | Faza 2 |
| Historia przebiegu — wykres | Computed z `serviceVisits.mileageAtService`, wykres liniowy | Faza 2 |
| AI — prognoza kosztów rocznych | Na podstawie historii + maintenance upcoming → szacunek budżetu | Faza 3 |
| Upload dokumentów (PDF) | Supabase Storage, osobna tabela `VehicleDocument` | Faza 2 |
| Porównanie kosztów między pojazdami | Cross-vehicle query w `vehicleCostsService` | Faza 2 |
| Push notifications (mobile) | Eventy expiracyjne → Firebase Cloud Messaging | Faza React Native |

---

*Koniec specyfikacji vehicles v1.0*  
*Każda zmiana w zakresie modułu wymaga aktualizacji tego dokumentu przed implementacją.*
