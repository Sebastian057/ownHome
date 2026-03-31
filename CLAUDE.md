# CLAUDE.md — OwnHome Project Constitution

> Ten plik jest jedynym źródłem prawdy dla Claude Code.
> Każdy wygenerowany plik, endpoint, komponent i migracja musi być zgodna z tymi regułami.
> Brak wyjątków. Brak skrótów.

---

## 1. Kontekst projektu

OwnHome to prywatna aplikacja webowa typu "personal life manager" — system do zarządzania finansami, czasem, majątkiem i zobowiązaniami w jednym spójnym ekosystemie.

**Stack:**
- Frontend: Next.js (App Router) + TypeScript + Tailwind CSS v4 + shadcn/ui (styl: nova, primitives: Radix UI)
- Backend: Next.js Route Handlers (REST API)
- ORM: Prisma
- Baza danych: PostgreSQL przez Supabase
- Auth: Supabase Auth (JWT + refresh tokens)
- Event system: in-process emitter z persystencją w DB
- Target mobilny: React Native (przyszłość) — architektura musi być kompatybilna

---

## 2. Architektura — zasady nadrzędne

### 2.1 API-first

- UI wywołuje **wyłącznie** REST API endpointy.
- UI nie zawiera logiki biznesowej — tylko renderowanie i wywołania fetch.
- Żaden komponent React nie importuje bezpośrednio z `repository` ani `service`.

### 2.2 Podział warstw (obowiązkowy)

```
UI → API Handler → Service → Repository → Prisma → DB
```

| Warstwa       | Odpowiedzialność                                              | Czego NIE robi                            |
|---------------|---------------------------------------------------------------|-------------------------------------------|
| `ui.tsx`      | Renderowanie, stan formularza, wywołania fetch                | Żadnej logiki biznesowej                  |
| `api.ts`      | Walidacja Zod, auth check, wywołanie service, format odpowiedzi | Brak dostępu do Prisma                    |
| `service.ts`  | Logika biznesowa, ownership check, emitowanie eventów         | Brak bezpośredniego dostępu do Prisma     |
| `repository.ts` | Zapytania Prisma, eager loading, filtrowanie po userId      | Brak logiki biznesowej                    |

### 2.3 Format odpowiedzi API (bez wyjątków)

```ts
// Sukces
{ data: T, error: null, meta?: { page, total, ... } }

// Błąd
{ data: null, error: { code: string, message: string, details?: unknown } }
```

Kody błędów jako stałe (`UNAUTHORIZED`, `NOT_FOUND`, `VALIDATION_ERROR`, `FORBIDDEN`).

---

## 3. Struktura modułu

Każdy moduł **musi** zawierać dokładnie te pliki w tej kolejności:

```
/modules/<module-name>/
  module.types.ts       ← 1. Typy TypeScript (bez any)
  module.schema.ts      ← 2. Schematy Zod (walidacja + inferowanie typów)
  module.repository.ts  ← 3. Dostęp do Prisma (jedyne miejsce)
  module.service.ts     ← 4. Logika biznesowa + ownership checks + eventy
  module.api.ts         ← 5. Route Handler: auth → validate → service → response
  module.ui.tsx         ← 6. Komponenty React (shadcn, stateless/dumb) — publiczny entry point
```

### Podział pliku UI (wymagany gdy > 400 linii)

Gdy `module.ui.tsx` przekracza **400 linii**, OBOWIĄZKOWO rozbij go na pliki sekcji:

```
/modules/<module-name>/
  module.ui.tsx              ← entry point (< 200 ln): re-eksporty + komponenty Page-level
  module.ui.<section>.tsx    ← sekcja/domena (< 500 ln każdy)
```

**Konwencja nazw sekcji** — dopasuj do domeny:
`form`, `card`, `table`, `forms`, `info`, `insurance`, `service`, `maintenance`, `inspections`,
`summary`, `transactions`, `income`, `template`, `categories`

**Zasady podziału (bezwzględne):**

1. Strony (`app/`) importują **WYŁĄCZNIE** z `module.ui.tsx` — żadnych zmian importów w `app/`
2. Pliki sekcji (`module.ui.<section>.tsx`) NIE są importowane bezpośrednio przez `app/`
3. `module.ui.tsx` re-eksportuje wszystko co potrzebują strony:
   ```ts
   // module.ui.tsx
   export { VehicleFormDialog } from './module.ui.form'
   export { VehicleInsuranceTab } from './module.ui.insurance'
   ```
4. Importy wewnętrzne używają ścieżki relatywnej:
   ```ts
   import { InsuranceCard } from './vehicles.ui.insurance'
   ```
5. Każdy plik sekcji ma własną dyrektywę `'use client'` i wszystkie potrzebne importy
6. Komponenty pomocnicze (dialogi, karty) eksportowane z pliku sekcji, a nie z ui.tsx bezpośrednio

**Przykład (moduł vehicles):**
```
modules/vehicles/
  vehicles.ui.tsx              ← VehicleListPage, VehicleDetailPage + re-eksporty
  vehicles.ui.form.tsx         ← VehicleFormDialog
  vehicles.ui.info.tsx         ← VehicleInfoTab, InfoSection, InfoRow
  vehicles.ui.insurance.tsx    ← VehicleInsuranceTab, InsuranceFormDialog, InsuranceCard
  vehicles.ui.inspections.tsx  ← VehicleInspectionsTab, InspectionFormDialog, InspectionCard
  vehicles.ui.service.tsx      ← VehicleServiceTab, ServiceVisitFormDialog, ServiceVisitCard
  vehicles.ui.maintenance.tsx  ← VehicleMaintenanceTab, MaintenanceLogFormDialog
```

### Konwencje nazewnicze

- Repository: `getX`, `getManyX`, `createX`, `updateX`, `deleteX`
- Service: identycznie jak repository, ale z prefiksem warstwy jeśli różni się logiką
- API routes: `GET /api/<module>`, `POST /api/<module>`, `GET /api/<module>/[id]`, itp.
- Żadnych alternatywnych nazw. Żadnych `fetchX`, `loadX`, `removeX`.

---

## 4. Autentykacja

Auth przez **Supabase Auth** (JWT). Brak publicznej rejestracji — konta tworzy admin z panelu (`supabase.auth.admin.createUser`).

- Middleware (`middleware.ts`) chroni wszystkie trasy poza `/login` i `/auth/*`
- Strony auth wywołują Supabase SDK bezpośrednio (wyjątek od API-first)
- Pierwszy admin: ręcznie w Supabase Dashboard → auto-create profilu z `role: 'admin'`
- Pełna dokumentacja: `.claude/skills/ownhome-auth/SKILL.md`

---

## 5. Bezpieczeństwo — reguły krytyczne

### 4.1 Ownership check (obowiązkowy w każdej operacji)

Każde zapytanie do bazy **musi** filtrować po `userId`. Nie ma operacji bez sprawdzenia właściciela.

```ts
// ✅ POPRAWNIE — repository zawsze filtruje po userId
async getVehicle(vehicleId: string, userId: string) {
  return prisma.vehicle.findFirst({
    where: { id: vehicleId, userId },  // ← userId ZAWSZE
  });
}

// ❌ BŁĄD — podatność IDOR
async getVehicle(vehicleId: string) {
  return prisma.vehicle.findUnique({ where: { id: vehicleId } });
}
```

Service sprawdza wynik: jeśli `null` → rzuca błąd `NOT_FOUND` (nie `FORBIDDEN` — nie ujawniamy istnienia zasobu).

### 4.2 Auth check w każdym API handlerze

```ts
// Szablon każdego Route Handlera
export async function GET(req: Request) {
  const session = await getSession(req);  // Supabase JWT verify
  if (!session) return apiError('UNAUTHORIZED', 401);

  const validated = schema.safeParse(await req.json());
  if (!validated.success) return apiError('VALIDATION_ERROR', 400, validated.error);

  const result = await someService.getX(validated.data, session.userId);
  return apiSuccess(result);
}
```

### 4.3 Supabase Row Level Security (RLS)

Każda migracja tworząca tabelę z danymi użytkownika **musi** zawierać politykę RLS:

```sql
-- Dodawać do każdej nowej tabeli użytkownika
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_own_vehicles" ON vehicles
  FOR ALL USING (auth.uid() = user_id);
```

RLS to ostatnia linia obrony — działa niezależnie od błędów w application layer.

### 4.4 Input sanitization

Zod waliduje typy. Dodatkowo dla pól tekstowych:
- `z.string().trim().max(500)` — zawsze trim i max length
- Dla pól tekstowych wyświetlanych jako HTML: escape przez React (automatyczny) — nie używać `dangerouslySetInnerHTML`
- Nigdy nie interpolować danych użytkownika do zapytań SQL poza Prisma

### 4.5 Rate limiting

Każdy endpoint mutujący (POST, PUT, PATCH, DELETE) musi mieć rate limit:

```ts
import { Ratelimit } from '@upstash/ratelimit';
// 20 requestów na minutę per userId
```

Endpointy tylko-odczytu: rate limit na poziomie IP (10 req/s).

### 4.6 Obsługa 401 / refresh token

API zawsze zwraca czysty kod HTTP `401` gdy token wygasł (nie `403`, nie `500`).
Klient (web i przyszły mobile) nasłuchuje na `401` i wywołuje Supabase `refreshSession()` przed retry.

---

## 6. Reguły bazy danych

### 5.1 Indeksy — obowiązkowe

Przy każdym nowym `foreignKey` i każdym polu używanym w `where`:

```prisma
model Vehicle {
  id        String   @id @default(cuid())
  userId    String
  createdAt DateTime @default(now())

  @@index([userId])           // ← obowiązkowy przy każdym userId
  @@index([userId, createdAt]) // ← jeśli stosujesz sortowanie
}
```

### 5.2 Zakaz N+1 queries

Żadnych zapytań w pętlach. Repository używa `include` lub `select` do eager loading:

```ts
// ✅ POPRAWNIE — jedno zapytanie
async getVehicleWithServices(vehicleId: string, userId: string) {
  return prisma.vehicle.findFirst({
    where: { id: vehicleId, userId },
    include: {
      services: { orderBy: { date: 'desc' }, take: 10 },
      documents: true,
    },
  });
}

// ❌ BŁĄD — N+1
const vehicle = await prisma.vehicle.findFirst(...);
const services = await prisma.service.findMany({ where: { vehicleId: vehicle.id } });
```

### 5.3 Soft delete

Tabele z danymi finansowymi i assetami używają soft delete:

```prisma
deletedAt DateTime?

@@index([userId, deletedAt])
```

Repository nigdy nie zwraca rekordów z `deletedAt !== null` w zapytaniach listujących.

---

## 7. System eventów

### 6.1 Zasada

Eventy są emitowane przez `service.ts` po każdej operacji istotnej dla przypomnień lub automatyzacji. Event system jest persystentny — eventy zapisywane do tabeli `scheduled_events` w DB, nie tylko in-memory.

### 6.2 Format eventu

```ts
interface AppEvent<T = unknown> {
  name: string;          // np. 'subscription.created'
  payload: T;
  userId: string;        // zawsze — eventy są per-user
  occurredAt: Date;
}

// Przykłady nazw eventów
'transaction.created'
'vehicle.service.created'
'subscription.created'
'obligation.due_date.approaching'
'calendar.event.reminder'
```

### 6.3 Persystencja eventów

```prisma
model ScheduledEvent {
  id          String    @id @default(cuid())
  userId      String
  name        String
  payload     Json
  scheduledAt DateTime
  processedAt DateTime?
  failedAt    DateTime?
  retryCount  Int       @default(0)
  createdAt   DateTime  @default(now())

  @@index([userId, scheduledAt, processedAt])
}
```

Worker przetwarza eventy z `processedAt = null` i `scheduledAt <= now()`. Max 3 retry, po których `failedAt` jest ustawiane.

### 6.4 Użycie w service

```ts
// Po operacji biznesowej — emit zawsze na końcu, po sukcesie
async createSubscription(data: CreateSubscriptionDto, userId: string) {
  const subscription = await this.repository.createSubscription(data, userId);
  await eventEmitter.emit('subscription.created', { subscription }, userId);
  return subscription;
}
```

---

## 8. Moduły — zakres (scope)

### Moduły core (faza 1 — jedyne dozwolone)

| Moduł          | Opis                                          |
|----------------|-----------------------------------------------|
| `budget`       | Transakcje, kategorie, budżet miesięczny      |
| `calendar`     | Eventy, przypomnienia, planowanie             |
| `vehicles`     | Pojazdy, serwisy, ubezpieczenia, dokumenty    |
| `subscriptions`| Subskrypcje cykliczne, daty odnowień          |
| `obligations`  | Zobowiązania finansowe, harmonogramy spłat    |

Claude Code **nie dodaje** żadnych innych modułów bez explicit instrukcji. Nie rozbudowuje modułów o features poza ich definicją. Skupia się na solidnej implementacji core.

### Wspólne elementy

```
/lib/
  auth.ts          ← getSession(), requireAuth()
  api-response.ts  ← apiSuccess(), apiError()
  event-emitter.ts ← emit(), subscribe()
  rate-limit.ts    ← withRateLimit()
  prisma.ts        ← singleton Prisma client

/types/
  common.types.ts  ← ApiResponse<T>, AppEvent, PaginationMeta
```

---

## 9. TypeScript — reguły

- **Zakaz `any`** — bezwzględny. Używaj `unknown` jeśli typ nie jest znany, następnie narrowing.
- **Zakaz type assertion `as X`** poza uzasadnionymi wyjątkami z komentarzem.
- Typy inferuj z Zod schematów: `type CreateVehicleDto = z.infer<typeof createVehicleSchema>`
- Prisma generuje typy modeli — importuj je zamiast deklarować ręcznie.
- `strict: true` w `tsconfig.json` — bez wyłączeń.

```ts
// ✅ Poprawnie
type CreateVehicleDto = z.infer<typeof createVehicleSchema>;

// ❌ Błąd
const dto = data as CreateVehicleDto;
```

---

## 10. Workflow Claude Code — kolejność generowania

Claude Code **zawsze** generuje pliki w tej kolejności. Żadnych skrótów.

```
1. Migracja Prisma (schema.prisma + RLS SQL)
2. module.types.ts
3. module.schema.ts (Zod)
4. module.repository.ts
5. module.service.ts
6. module.api.ts
7. module.ui.tsx
```

Każdy krok kompiluje się niezależnie przed przejściem do następnego.
Typy z kroku 1-3 są importowane w 4-7 — nie deklarowane ponownie.

---

## 11. Zakazy bezwzględne

```
❌ Logika biznesowa w UI
❌ Bezpośredni import Prisma poza repository
❌ Zapytania do DB w API handlerach
❌ Operacje bez ownership check
❌ Tabele użytkownika bez RLS policy
❌ Migracje bez indeksów na foreignKey
❌ N+1 queries (zapytania w pętlach)
❌ Typy `any`
❌ Eventy tylko in-memory (bez persystencji w DB)
❌ Moduły poza zdefiniowanym scope bez explicit instrukcji
❌ `dangerouslySetInnerHTML`
❌ Hardcoded user IDs, secrets lub connection strings
```

---

## 12. Mobile-ready — zasady

- Autentykacja **tylko przez JWT** — bez cookies sesji.
- Każdy endpoint zwraca `401` (nie redirect) gdy brak/wygasły token.
- Brak logiki specyficznej dla przeglądarki w API layer.
- Response body jest zawsze `application/json` — nigdy HTML.
- Pagination przez `cursor` lub `page/limit` — nigdy `offset` nieograniczony.

> Pełna dokumentacja implementacji React Native: **sekcja 15** oraz `.claude/skills/ownhome-mobile/SKILL.md`.

---

## 13. Obsługa błędów

```ts
// Kody błędów — stałe w /types/common.types.ts
type ErrorCode =
  | 'UNAUTHORIZED'        // 401 — brak lub wygasły token
  | 'FORBIDDEN'           // 403 — brak uprawnień do akcji (nie do zasobu)
  | 'NOT_FOUND'           // 404 — zasób nie istnieje lub nie należy do usera
  | 'VALIDATION_ERROR'    // 400 — błąd walidacji Zod
  | 'CONFLICT'            // 409 — duplikat, naruszenie uniq
  | 'INTERNAL_ERROR';     // 500 — nieoczekiwany błąd serwera

// Nigdy nie zwracaj FORBIDDEN dla nieistniejącego zasobu → NOT_FOUND
// Nie ujawniaj czy zasób istnieje, gdy user nie ma do niego dostępu
```

Wszystkie błędy serwera są logowane (console.error w dev, Sentry/zewnętrzny logger w prod).

---

## 14. Przykładowy moduł — szkielet

Poniżej minimalny, poprawny szkielet dla modułu `subscriptions`.

### `module.types.ts`
```ts
export interface Subscription {
  id: string;
  userId: string;
  name: string;
  amount: number;
  currency: string;
  billingCycle: BillingCycle;
  nextBillingDate: Date;
  createdAt: Date;
  deletedAt: Date | null;
}

export type BillingCycle = 'monthly' | 'yearly' | 'weekly';
export type CreateSubscriptionDto = z.infer<typeof createSubscriptionSchema>;
export type UpdateSubscriptionDto = z.infer<typeof updateSubscriptionSchema>;
```

### `module.schema.ts`
```ts
import { z } from 'zod';

export const createSubscriptionSchema = z.object({
  name: z.string().trim().min(1).max(200),
  amount: z.number().positive(),
  currency: z.string().length(3),
  billingCycle: z.enum(['monthly', 'yearly', 'weekly']),
  nextBillingDate: z.coerce.date(),
});

export const updateSubscriptionSchema = createSubscriptionSchema.partial();
```

### `module.repository.ts`
```ts
import { prisma } from '@/lib/prisma';
import type { CreateSubscriptionDto, UpdateSubscriptionDto } from './module.types';

export const subscriptionRepository = {
  async getMany(userId: string) {
    return prisma.subscription.findMany({
      where: { userId, deletedAt: null },
      orderBy: { nextBillingDate: 'asc' },
    });
  },

  async getById(id: string, userId: string) {
    return prisma.subscription.findFirst({
      where: { id, userId, deletedAt: null },
    });
  },

  async create(data: CreateSubscriptionDto, userId: string) {
    return prisma.subscription.create({ data: { ...data, userId } });
  },

  async update(id: string, userId: string, data: UpdateSubscriptionDto) {
    return prisma.subscription.updateMany({
      where: { id, userId },
      data,
    });
  },

  async softDelete(id: string, userId: string) {
    return prisma.subscription.updateMany({
      where: { id, userId },
      data: { deletedAt: new Date() },
    });
  },
};
```

### `module.service.ts`
```ts
import { subscriptionRepository } from './module.repository';
import { eventEmitter } from '@/lib/event-emitter';
import type { CreateSubscriptionDto } from './module.types';

export const subscriptionService = {
  async getMany(userId: string) {
    return subscriptionRepository.getMany(userId);
  },

  async getById(id: string, userId: string) {
    const sub = await subscriptionRepository.getById(id, userId);
    if (!sub) throw new AppError('NOT_FOUND');
    return sub;
  },

  async create(data: CreateSubscriptionDto, userId: string) {
    const subscription = await subscriptionRepository.create(data, userId);
    await eventEmitter.emit('subscription.created', { subscription }, userId);
    return subscription;
  },

  async delete(id: string, userId: string) {
    const sub = await subscriptionRepository.getById(id, userId);
    if (!sub) throw new AppError('NOT_FOUND');
    await subscriptionRepository.softDelete(id, userId);
    await eventEmitter.emit('subscription.deleted', { subscriptionId: id }, userId);
  },
};
```

### `module.api.ts`
```ts
import { requireAuth } from '@/lib/auth';
import { apiSuccess, apiError } from '@/lib/api-response';
import { createSubscriptionSchema } from './module.schema';
import { subscriptionService } from './module.service';

export async function GET(req: Request) {
  const session = await requireAuth(req);
  if (!session) return apiError('UNAUTHORIZED', 401);

  const subscriptions = await subscriptionService.getMany(session.userId);
  return apiSuccess(subscriptions);
}

export async function POST(req: Request) {
  const session = await requireAuth(req);
  if (!session) return apiError('UNAUTHORIZED', 401);

  const body = await req.json();
  const validated = createSubscriptionSchema.safeParse(body);
  if (!validated.success) return apiError('VALIDATION_ERROR', 400, validated.error);

  const subscription = await subscriptionService.create(validated.data, session.userId);
  return apiSuccess(subscription, 201);
}
```

---

## 15. Mobile — React Native (Expo)

> Pełna dokumentacja wzorców mobilnych: `.claude/skills/ownhome-mobile/SKILL.md`

### 15.1 Stack mobilny

```
apps/mobile/                    ← Expo SDK 53, Managed Workflow
├── Expo Router v4              ← file-based routing (jak Next.js App Router)
├── @supabase/supabase-js       ← auth (token refresh automatyczny)
├── expo-secure-store           ← przechowywanie JWT (Keychain/Keystore, NIE AsyncStorage)
├── @tanstack/react-query       ← server state (cache, invalidation, offline)
├── zustand                     ← lokalny UI state
├── NativeWind v4               ← Tailwind CSS w React Native
├── Victory Native XL           ← wykresy (React Native Skia)
└── react-hook-form + zod       ← formularze (te same schematy co web)
```

### 15.2 Monorepo — współdzielone pakiety

Po migracji do Turborepo projekt będzie zawierał:

```
packages/
├── types/      ← ApiResponse<T>, AppError, ErrorCode, PaginationMeta, wszystkie DTOs
├── schemas/    ← Zod schematy (reużywane w web i mobile — ta sama walidacja)
└── api-client/ ← typowany fetch wrapper z auth headers i retry na 401
```

Importuj z workspace pakietów, nie duplikuj typów:
```ts
import type { ApiResponse, Subscription } from '@ownhome/types';
import { createSubscriptionSchema } from '@ownhome/schemas';
import { createApiClient } from '@ownhome/api-client';
```

### 15.3 Auth w mobile (obowiązkowy wzorzec)

```typescript
// apps/mobile/lib/supabase.ts
import * as SecureStore from 'expo-secure-store';
import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      storage: {
        getItem: (key) => SecureStore.getItemAsync(key),
        setItem: (key, value) => SecureStore.setItemAsync(key, value),
        removeItem: (key) => SecureStore.deleteItemAsync(key),
      },
      autoRefreshToken: true,    // ← token odświeżany automatycznie
      persistSession: true,
      detectSessionInUrl: false, // ← mobile nie używa URL sessions
    },
  }
);
```

**Zakazy auth mobile:**
- ❌ `AsyncStorage` jako storage adapter — nieszyfrowany, użyj `expo-secure-store`
- ❌ Ręczne przechowywanie tokenów poza Supabase SDK
- ❌ `detectSessionInUrl: true` w mobile
- ❌ Bezpośrednie wywołania Supabase poza `lib/supabase.ts`

### 15.4 Wzorzec hookowy (TanStack Query)

Każdy moduł mobilny eksportuje hooki zamiast funkcji fetch:

```typescript
// apps/mobile/modules/subscriptions/useSubscriptions.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useApi } from '@/lib/api';
import type { Subscription, CreateSubscriptionDto } from '@ownhome/types';

export function useSubscriptions() {
  const api = useApi();
  return useQuery({
    queryKey: ['subscriptions'],
    queryFn: () => api.get<Subscription[]>('/api/subscriptions'),
    select: (res) => res.data ?? [],
  });
}

export function useCreateSubscription() {
  const api = useApi();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateSubscriptionDto) =>
      api.post<Subscription>('/api/subscriptions', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscriptions'] });
    },
  });
}
```

### 15.5 Nawigacja (Expo Router)

Struktura plików w `apps/mobile/app/` mapuje się 1:1 na URL (jak Next.js):

```
app/
├── _layout.tsx          ← root layout: auth guard + QueryClientProvider
├── (auth)/
│   └── login.tsx
└── (tabs)/
    ├── _layout.tsx      ← bottom tab bar (5 zakładek)
    ├── budget/
    │   ├── index.tsx    ← lista transakcji + summary
    │   └── [id].tsx     ← szczegół okresu
    ├── vehicles/
    │   ├── index.tsx
    │   └── [id]/
    │       ├── index.tsx
    │       ├── insurance.tsx
    │       ├── inspections.tsx
    │       └── service.tsx
    ├── subscriptions/index.tsx
    ├── obligations/index.tsx
    └── profile/index.tsx
```

### 15.6 Push notifications — flow

```
Przy starcie apki:
  expo-notifications.getExpoPushTokenAsync()
  → POST /api/profile/push-token { token }
  → Zapisz w UserProfile.expoPushToken

Cron worker (Vercel lub Supabase Edge Function):
  SELECT * FROM ScheduledEvent WHERE processedAt IS NULL AND scheduledAt <= now()
  → POST https://exp.host/--/api/v2/push/send { to: expoPushToken, ... }
  → UPDATE ScheduledEvent SET processedAt = now()
```

### 15.7 Upload plików

Pliki uploadowane bezpośrednio do Supabase Storage z mobile, URL zapisywany przez API:

```typescript
// 1. Wybierz plik
const result = await ImagePicker.launchImageLibraryAsync({ ... });

// 2. Upload bezpośrednio do Supabase Storage (bez pośrednictwa API)
const { data } = await supabase.storage
  .from('vehicle-files')
  .upload(`${userId}/${vehicleId}/${filename}`, file);

// 3. Zapisz URL przez API (zachowuje architekturę API-first)
await api.post(`/api/vehicles/${vehicleId}/files`, { fileUrl: data.path });
```

### 15.8 Testowanie mobile

| Środowisko | Jak uruchomić | Kiedy używać |
|------------|---------------|--------------|
| Expo Go (telefon) | `npx expo start` → skan QR | Szybki dev, bez custom native modules |
| Android Emulator | Android Studio → AVD → `press a` | Dev z większym ekranem, DevTools |
| EAS Build (APK) | `eas build --platform android --profile preview` | Push notifications, production build |
| iOS | Wymaga Apple Developer ($99/rok) + macOS lub EAS Build | Produkcja iOS |

---

*Koniec CLAUDE.md — wersja 1.1*
*Każda zmiana w tym pliku wymaga świadomej decyzji i jest traktowana jako zmiana architektoniczna.*
