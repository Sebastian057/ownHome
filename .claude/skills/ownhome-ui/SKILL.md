---
name: ownhome-ui
description: >
  Generuje module.ui.tsx dla modułu OwnHome — stateless komponenty React
  z shadcn/ui (Radix UI primitives), wywołaniami fetch do REST API, obsługą formularzy
  przez react-hook-form + zodResolver. Używaj po ukończeniu ownhome-backend.
---

# OwnHome — UI Module Generator

Generuje `modules/<name>/module.ui.tsx`. Komponenty są **stateless/dumb** —
żadnej logiki biznesowej, tylko renderowanie i fetch do REST API.

---

## System wizualny — reguły obowiązkowe

### Paleta kolorów

OwnHome używa **fintech blue (~#2549D9)** jako primary. Tylko semantic tokens — nigdy raw Tailwind kolory.

**Kluczowe wartości (globals.css, oklch):**
- Primary: `#2549D9` → oklch(0.52 0.22 264) — WCAG AA 7.8:1 z białym
- Background: subtelny blue-tint `oklch(0.93 0.005 256)` + radial gradient mesh
- Sidebar: gradient `#717171→#3E3E3E` (top→bottom, na komponencie inline style, BEZ zmian)
- Grays: neutralne, hue 0
- Radius: `0.5rem` (8px)

**Glassmorphism:**
- Karty używają `bg-card/85 backdrop-blur-sm` (automatycznie przez `<Card>`)
- Dla wyróżnionych elementów: klasa `glass` lub `glass-primary` z globals.css
- NIE dodawaj własnych `backdrop-filter` — używaj gotowych klas

**Dark mode:** Automatyczny przez `.dark {}` w globals.css. Primary jaśniejszy w dark mode (`oklch(0.68 0.19 264)`).

| Zastosowanie | Token | Przykład klasy |
|---|---|---|
| Tekst główny | `--foreground` | `text-foreground` |
| Tekst pomocniczy | `--muted-foreground` | `text-muted-foreground` |
| Powierzchnia karty | `--card` | automatycznie przez `<Card>` |
| Akcje CTA | `--primary` | automatycznie przez `<Button>` |
| Przychody, sukces | `--success` | `text-success`, `bg-success` |
| Ostrzeżenia, zbliżające się płatności | `--warning` | `text-warning`, `bg-warning` |
| Błędy, usuwanie | `--destructive` | automatycznie przez `<Alert variant="destructive">` |

### Typografia

```tsx
// Nagłówek strony modułu
<h1 className="text-2xl font-semibold">Subskrypcje</h1>

// Tekst pomocniczy
<span className="text-sm text-muted-foreground">Ostatnia aktualizacja</span>

// Kwoty pieniężne — zawsze font-mono
<span className="font-mono font-medium">199,00 PLN</span>

// Przychód (+ zielony)
<span className="font-mono font-medium text-success">+500,00 PLN</span>

// Wydatek (- czerwony)
<span className="font-mono font-medium text-destructive">-99,90 PLN</span>
```

### Gęstość layoutu per moduł

| Moduł | Gęstość | Wrapper |
|---|---|---|
| `budget` | Dense | `<div className="flex flex-col gap-4 p-4">`, `<CardContent className="p-0">` |
| `subscriptions` | Balanced | `<div className="flex flex-col gap-6 p-6">` |
| `obligations` | Dense | j.w. budget |
| `vehicles` | Spacious | `<div className="flex flex-col gap-8 p-8">` |
| `calendar` | Balanced | j.w. subscriptions |

### Badges dla statusów

```tsx
<Badge variant="default">Aktywna</Badge>           // aktywny
<Badge variant="secondary">Miesięczny</Badge>       // neutralny
<Badge className="bg-warning text-warning-foreground">Za 3 dni</Badge>  // ostrzeżenie
<Badge variant="destructive">Przeterminowane</Badge>  // błąd/danger
<Badge className="bg-success text-success-foreground">Opłacone</Badge>  // sukces
```

### Dark mode

Dark mode obsługuje `.dark { }` w `globals.css` — **nie dodawaj ręcznie klas `dark:`**.
Używaj semantic tokens a dark mode zadziała automatycznie.

---

## Krok 0 — Kontekst projektu (zawsze najpierw)

```bash
npx shadcn@latest info --json
```

Kluczowe pola dla OwnHome:
- `base`: `radix` → **używaj `asChild` dla triggerów** (nie `render`)
- `tailwindVersion`: `v4` → custom kolory w `@theme inline` w `globals.css`, nie w `tailwind.config.ts`
- `iconLibrary`: `lucide` → import z `lucide-react`
- `installedComponents`: sprawdź co już jest — nie reinstaluj

Przed użyciem każdego komponentu sprawdź dokumentację:
```bash
npx shadcn@latest docs <component-name>
```
Pobierz zwrócone URL i przeczytaj przed generowaniem kodu. Nigdy nie zgaduj API.

---

## Krok 1 — Dobierz i zainstaluj komponenty

Korzystaj z pełnej biblioteki shadcn — **nie ograniczaj się do podzbioru**.
Wybieraj komponent odpowiedni do potrzeby UI, konsultując tabelę z shadcn skill:

| Potrzeba UI | Komponent |
|-------------|-----------|
| Akcja / przycisk | `Button` (variant: default, outline, ghost, destructive) |
| Pola formularza | `Input`, `Select`, `Combobox`, `Textarea`, `Checkbox`, `Switch`, `RadioGroup`, `Slider`, `InputOTP` |
| Opcje 2–5 wyborów | `ToggleGroup + ToggleGroupItem` |
| Wyświetlanie danych | `Table`, `Card`, `Badge`, `Avatar` |
| Nawigacja | `Sidebar`, `NavigationMenu`, `Breadcrumb`, `Tabs`, `Pagination` |
| Overlaye | `Dialog` (modal), `Sheet` (panel boczny), `Drawer` (bottom), `AlertDialog` (potwierdzenie) |
| Feedback | `sonner` (toast), `Alert`, `Progress`, `Skeleton`, `Spinner` |
| Pusty stan | `Empty` |
| Menu | `DropdownMenu`, `ContextMenu`, `Menubar` |
| Tooltip / info | `Tooltip`, `HoverCard`, `Popover` |
| Layout | `Card`, `Separator`, `Resizable`, `ScrollArea`, `Accordion`, `Collapsible` |
| Wykresy | `Chart` (wraps Recharts) |
| Command palette | `Command` inside `Dialog` |
| Grupowanie pól | `FieldSet + FieldLegend` |
| Input z przyciskiem | `InputGroup + InputGroupInput + InputGroupAddon` |
| Klawiatura | `Kbd` |
| Typografia | `Typography` |

Jeśli nie ma komponentu na liście — wyszukaj:
```bash
npx shadcn@latest search @shadcn -q "<słowo kluczowe>"
```

Instaluj tylko brakujące (sprawdź `npx shadcn@latest info` → `installedComponents`):
```bash
npx shadcn@latest add <component> [component2] ...
```

---

## Krok 2 — Struktura pliku UI (+ zasada podziału)

### Kiedy rozbijać `module.ui.tsx`

**Próg obowiązkowy: > 400 linii** — jeśli `module.ui.tsx` przekracza 400 linii, MUSISZ rozbić go
na pliki sekcji według konwencji `module.ui.<section>.tsx`.

### Konwencja plików sekcji

```
modules/<module>/
  <module>.ui.tsx              ← entry point (< 200 ln): re-eksporty + komponenty Page-level
  <module>.ui.<section>.tsx    ← sekcja/domena (< 500 ln każdy)
```

**Nazwy sekcji** — dopasuj do domeny komponentu:
`form`, `card`, `table`, `forms`, `info`, `insurance`, `service`, `maintenance`,
`inspections`, `summary`, `transactions`, `income`, `template`, `categories`

### Zasady podziału (bezwzględne)

1. **`app/` importuje WYŁĄCZNIE z `module.ui.tsx`** — nigdy z pliku sekcji
2. `module.ui.tsx` zawiera re-eksporty wszystkiego co potrzebują strony:
   ```ts
   // module.ui.tsx
   export { VehicleFormDialog } from './vehicles.ui.form'
   export { VehicleInsuranceTab, InsuranceCard } from './vehicles.ui.insurance'
   ```
3. Importy wewnętrzne (plik sekcji → plik sekcji lub → ui.tsx) używają ścieżki relatywnej
4. Każdy plik sekcji ma własną dyrektywę `'use client'` i kompletne importy
5. Komponenty pomocnicze (private, np. `TemplateRow`) zostają w pliku który je używa — nieeksportowane

### Przykład rozbicia (moduł vehicles — 7 plików)

```
modules/vehicles/
  vehicles.ui.tsx              ← VehicleListPage, VehicleDetailPage + re-eksporty sekcji
  vehicles.ui.form.tsx         ← VehicleFormDialog
  vehicles.ui.info.tsx         ← VehicleInfoTab, InfoSection, InfoRow
  vehicles.ui.insurance.tsx    ← VehicleInsuranceTab, InsuranceFormDialog, InsuranceCard
  vehicles.ui.inspections.tsx  ← VehicleInspectionsTab, InspectionFormDialog, InspectionCard
  vehicles.ui.service.tsx      ← VehicleServiceTab, ServiceVisitFormDialog, ServiceVisitCard
  vehicles.ui.maintenance.tsx  ← VehicleMaintenanceTab, MaintenanceLogFormDialog
```

```ts
// vehicles.ui.tsx — entry point
'use client'
import { VehicleFormDialog } from './vehicles.ui.form'
import { VehicleInfoTab } from './vehicles.ui.info'
import { VehicleInsuranceTab } from './vehicles.ui.insurance'
// ...

// Re-eksporty dla app/
export { VehicleFormDialog } from './vehicles.ui.form'
export { VehicleInsuranceTab, InsuranceCard } from './vehicles.ui.insurance'

export function VehicleListPage() { ... }
export function VehicleDetailPage() { ... }
```

### Struktura każdego pliku

```
"use client"                      ← zawsze, komponenty używają useState/useEffect

1. importy
2. [opcjonalnie] funkcje fetch (async, ApiResponse<T>) — jeśli komponent sam fetch-uje
3. <XList> lub <XCard>  — tabela/lista lub karta, loading/error/empty state
4. <XForm> lub <XDialog> — formularz z react-hook-form + zodResolver
5. <XPage>              — składa komponenty (tylko w module.ui.tsx)
```

---

## Krok 3 — Funkcje fetch

Wywołują REST API — **nigdy nie importują z service ani repository**.

```ts
import type { ApiResponse } from '@/types/common.types';
import type { Subscription, CreateSubscriptionDto } from './module.types';

async function fetchSubscriptions(): Promise<ApiResponse<Subscription[]>> {
  const res = await fetch('/api/subscriptions');
  return res.json();
}

async function createSubscription(
  data: CreateSubscriptionDto
): Promise<ApiResponse<Subscription>> {
  const res = await fetch('/api/subscriptions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return res.json();
}

async function deleteSubscription(id: string): Promise<ApiResponse<void>> {
  const res = await fetch(`/api/subscriptions/${id}`, { method: 'DELETE' });
  return res.json();
}
```

Zawsze sprawdzaj `response.error !== null` przed użyciem `response.data`.

---

## Krok 4 — Komponent listujący `<XList>`

```tsx
export function SubscriptionList() {
  const [items, setItems] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchSubscriptions().then((res) => {
      if (res.error) setError(res.error.message);
      else setItems(res.data);
      setLoading(false);
    });
  }, []);

  if (loading) return <Skeleton className="h-48 w-full" />;

  if (error) return (
    <Alert>
      <AlertDescription>{error}</AlertDescription>
    </Alert>
  );

  if (items.length === 0) return (
    <Empty>
      <EmptyHeader>
        <EmptyMedia variant="icon"><InboxIcon /></EmptyMedia>
        <EmptyTitle>Brak subskrypcji</EmptyTitle>
        <EmptyDescription>Dodaj pierwszą subskrypcję.</EmptyDescription>
      </EmptyHeader>
    </Empty>
  );

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Nazwa</TableHead>
          <TableHead>Kwota</TableHead>
          <TableHead>Cykl</TableHead>
          <TableHead>Następna płatność</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((item) => (
          <TableRow key={item.id}>
            <TableCell className="font-medium">{item.name}</TableCell>
            <TableCell>{item.amount} {item.currency}</TableCell>
            <TableCell>
              <Badge variant="secondary">{item.billingCycle}</Badge>
            </TableCell>
            <TableCell className="text-muted-foreground">
              {new Date(item.nextBillingDate).toLocaleDateString('pl-PL')}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
```

Zasady:
- `Skeleton` dla loading — nie custom `animate-pulse`
- `Empty` dla pustego stanu — nie custom div
- `Alert` dla błędu — nie custom styled div
- `Badge variant="secondary"` dla statusów — nie `<span className="text-green-500">`
- `text-muted-foreground` — nie `text-gray-500` (semantic tokens)
- `gap-*` — nie `space-y-*`

---

## Krok 5 — Formularz `<XForm>`

### Dlaczego `Form + FormField + zodResolver` (nie `FieldGroup + Field`)

OwnHome ma schematy Zod w `module.schema.ts` — `zodResolver` to bezpośrednie połączenie
tych schematów z formularzem, bez duplikowania walidacji. `FormField` automatycznie:
- ustawia `data-invalid` na `Field` gdy pole ma błąd
- ustawia `aria-invalid` na kontrolce
- propaguje błędy przez `FormMessage`

`FieldGroup + Field` bez react-hook-form wymaga ręcznego zarządzania stanem walidacji —
to cofnięcie się do manualnej pracy którą Zod już wykonuje.

```tsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createSubscriptionSchema } from './module.schema';
import type { CreateSubscriptionDto } from './module.types';

export function SubscriptionForm({ onSuccess }: { onSuccess: () => void }) {
  const form = useForm<CreateSubscriptionDto>({
    resolver: zodResolver(createSubscriptionSchema),
    defaultValues: { currency: 'PLN', billingCycle: 'monthly' },
  });

  async function onSubmit(data: CreateSubscriptionDto) {
    const res = await createSubscription(data);
    if (res.error) {
      form.setError('root', { message: res.error.message });
      return;
    }
    form.reset();
    onSuccess();
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">

        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nazwa</FormLabel>
              <FormControl>
                <Input placeholder="np. Spotify" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="amount"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Kwota</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  {...field}
                  onChange={(e) => field.onChange(parseFloat(e.target.value))}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="billingCycle"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Cykl rozliczeniowy</FormLabel>
              <FormControl>
                <ToggleGroup
                  defaultValue={[field.value]}
                  onValueChange={(v) => field.onChange(v[0])}
                  spacing={2}
                >
                  <ToggleGroupItem value="monthly">Miesięczny</ToggleGroupItem>
                  <ToggleGroupItem value="yearly">Roczny</ToggleGroupItem>
                  <ToggleGroupItem value="weekly">Tygodniowy</ToggleGroupItem>
                </ToggleGroup>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {form.formState.errors.root && (
          <Alert>
            <AlertDescription>{form.formState.errors.root.message}</AlertDescription>
          </Alert>
        )}

        <Button type="submit" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting && <Spinner data-icon="inline-start" />}
          Zapisz
        </Button>

      </form>
    </Form>
  );
}
```

Zasady formularza:
- `Form + FormField + FormItem + FormLabel + FormControl + FormMessage` — nie surowe divy
- `ToggleGroup` dla opcji 2–5 — nie loopowane `Button` z active state (radix API: `type="single"`, `defaultValue` to string)
- Błąd z API → `form.setError('root', ...)` — nie osobny `useState`
- Button loading → `Spinner + data-icon + disabled` — brak `isLoading`/`isPending` prop
- `gap-4` — nie `space-y-4`

---

## Krok 6 — Strona `<XPage>`

### Ważne: `asChild` (projekt używa `radix` library)

```tsx
// ✅ POPRAWNIE — radix używa asChild
<DialogTrigger asChild>
  <Button>Dodaj</Button>
</DialogTrigger>

// ❌ BŁĄD — render prop jest dla base UI, nie radix
<DialogTrigger render={<Button />}>
  Dodaj
</DialogTrigger>
```

```tsx
export function SubscriptionsPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Subskrypcje</h1>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <PlusIcon data-icon="inline-start" />
              Dodaj
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nowa subskrypcja</DialogTitle>
              <DialogDescription>Uzupełnij dane subskrypcji.</DialogDescription>
            </DialogHeader>
            <SubscriptionForm
              onSuccess={() => {
                setDialogOpen(false);
                setRefreshKey((k) => k + 1);
              }}
            />
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Twoje subskrypcje</CardTitle>
        </CardHeader>
        <CardContent>
          <SubscriptionList key={refreshKey} />
        </CardContent>
      </Card>
    </div>
  );
}
```

Zasady:
- `asChild` na triggerach — nie `render` prop (projekt: `radix` library)
- `Dialog` zawsze z `DialogTitle` i `DialogDescription` (accessibility)
- `Card` = `CardHeader + CardTitle + CardContent` — nie dump do `CardContent`
- `PlusIcon` z `lucide-react`, `data-icon="inline-start"` bez klas rozmiaru

---

## Krok 7 — Instalacja zależności formularzy

```bash
npm install react-hook-form @hookform/resolvers
npx shadcn@latest add form
```

---

## Krok 8 — Weryfikacja

```bash
npx tsc --noEmit
```

Musi zwrócić **0 błędów**.

---

## Zakazy bezwzględne

| Zakaz | Powód |
|-------|-------|
| `render` prop na triggerach | projekt używa `radix`, nie `base` — używaj `asChild` |
| Import z `@/modules/*/repository` lub `*/service` | architektura API-first |
| `dangerouslySetInnerHTML` | XSS |
| `any` | strict TypeScript |
| `space-y-*` lub `space-x-*` | użyj `gap-*` |
| Raw kolory (`text-green-500`, `bg-blue-100`) | użyj semantic tokens |
| Używanie `data` przed sprawdzeniem `error !== null` | null safety |
| `w-4 h-4` na ikonach w komponentach | komponenty zarządzają rozmiarem via CSS |
| `dark:bg-gray-900` lub podobne | semantic tokens obsługują dark mode |
| Custom `animate-pulse` div | użyj `Skeleton` |
| Custom styled div dla błędu | użyj `Alert` |
| Custom styled span dla statusu | użyj `Badge` |
| `z-50` na overlay | `Dialog`/`Sheet`/`Popover` zarządzają stackingiem |
