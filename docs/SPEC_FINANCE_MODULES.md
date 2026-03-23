# Specyfikacja techniczna — moduły finansowe OwnHome
# Moduły: `budget` · `subscriptions` · `obligations`
# Wersja: 1.1 | Stack: Next.js · Prisma · Supabase · TypeScript

> Ten dokument jest kompletną specyfikacją techniczną i programistyczną.
> Claude Code implementuje dokładnie to co jest tu opisane — bez domysłów, bez własnych ulepszeń.
> Każde odchylenie wymaga explicit instrukcji od użytkownika.

---

## 1. Kontekst biznesowy

### Problem który rozwiązujemy

Użytkownik prowadzi budżet rodzinny w Excelu. Frustracje:
- Ręczne przepisywanie tych samych przychodów i kategorii co miesiąc
- Brak połączenia między subskrypcjami/zobowiązaniami a budżetem
- Regularne płatności (kredyt, czynsz, prąd) wymagają ręcznego wpisu

### Rozwiązanie — trzy typy źródeł kosztów

```
1. Subskrypcja        → auto-booking w dacie pobrania (Netflix, Spotify)
2. Płatność cykliczna → pojawia się co miesiąc, wymaga potwierdzenia (kredyt, prąd)
3. Transakcja ręczna  → jednorazowy wpis ad-hoc (zakupy, restauracja)
```

### Szablon budżetu — kluczowy koncept

Jeden globalny szablon zawiera domyślne przychody i kwoty per kategoria.
Na początku miesiąca użytkownik klika "Utwórz budżet na [miesiąc]" — system kopiuje szablon
i generuje pozycje oczekujące z subskrypcji i płatności cyklicznych.
Użytkownik modyfikuje tylko to co się zmieniło (2-3 pozycje, nie 20).

**Zasada:** edycja miesiąca NIGDY nie zmienia szablonu. Szablon zmienia się tylko przez
dedykowany ekran ustawień szablonu.

---

## 2. Kategorie wydatków — dynamiczny model (zarządzany przez użytkownika)

Kategorie są przechowywane w tabeli `budget_categories` jako zwykłe rekordy w bazie danych.
Nie są enumem Prisma — użytkownik może je przeglądać. Dodawanie i usuwanie przez panel jest
możliwe techniczne, ale UI domyślnie nie eksponuje tej możliwości dla stabilności budżetu.

Kategoria jest identyfikowana po `slug` (unikalny string, np. `zywnosc`).
W modelach powiązanych (Subscription, Transaction, itp.) pole `category` to `String @db.VarChar(50)`
przechowujące slug.

### Typ BudgetCategoryView (zwracany przez API)

```ts
interface BudgetCategoryView {
  id: string
  slug: string
  label: string
  icon?: string
  sortOrder: number
}
```

### Domyślne kategorie (seed przy inicjalizacji)

| slug                | label                  |
|---------------------|------------------------|
| dziecko             | Dziecko                |
| firma               | Firma                  |
| kredyt_i_raty       | Kredyt i raty          |
| oszczednosci        | Oszczędności           |
| prezenty            | Prezenty               |
| rachunki            | Rachunki               |
| rozrywka            | Rozrywka               |
| transport           | Transport              |
| ubezpieczenie       | Ubezpieczenie          |
| wycieczki           | Wycieczki              |
| wydatki_osobiste    | Wydatki osobiste       |
| wyposazenie_domu    | Wyposażenie domu       |
| zdrowie             | Zdrowie                |
| zywnosc             | Żywność                |

---

## 3. Schemat bazy danych — Prisma

### 3.1 Pełny schema.prisma (docelowy stan po migracji)

```prisma
// ─── BUDGET CATEGORIES (globalny słownik) ─────────────────────────────────────

model BudgetCategory {
  id        String   @id @default(cuid())
  slug      String   @unique @db.VarChar(50)
  label     String   @db.VarChar(100)
  icon      String?  @db.VarChar(50)
  sortOrder Int      @default(0)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([slug])
  @@map("budget_categories")
}

// ─── BUDGET TEMPLATE ─────────────────────────────────────────────────────────

model BudgetTemplate {
  id        String   @id @default(cuid())
  userId    String   @unique        // jeden szablon per user
  currency  String   @default("PLN")
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  incomes  BudgetTemplateIncome[]
  expenses BudgetTemplateExpense[]

  @@index([userId])
  @@map("budget_templates")
}

model BudgetTemplateIncome {
  id         String         @id @default(cuid())
  templateId String
  template   BudgetTemplate @relation(fields: [templateId], references: [id], onDelete: Cascade)
  userId     String
  title      String         @db.VarChar(200)
  amount     Decimal        @db.Decimal(12, 2)
  sortOrder  Int            @default(0)
  createdAt  DateTime       @default(now())

  @@index([templateId])
  @@index([userId])
  @@map("budget_template_incomes")
}

model BudgetTemplateExpense {
  id         String         @id @default(cuid())
  templateId String
  template   BudgetTemplate @relation(fields: [templateId], references: [id], onDelete: Cascade)
  userId     String
  category   String         @db.VarChar(50)   // slug kategorii
  amount     Decimal        @db.Decimal(12, 2)
  createdAt  DateTime       @default(now())
  updatedAt  DateTime       @updatedAt

  @@unique([templateId, category])  // jedna kwota per kategoria w szablonie
  @@index([templateId])
  @@index([userId])
  @@map("budget_template_expenses")
}

// ─── BUDGET PERIOD (miesiąc) ──────────────────────────────────────────────────

model BudgetPeriod {
  id              String   @id @default(cuid())
  userId          String
  year            Int
  month           Int      // 1-12
  currency        String   @default("PLN")
  carryOverAmount Decimal  @default(0) @db.Decimal(12, 2)  // saldo przeniesione z poprzedniego
  closedAt        DateTime?  // null = miesiąc otwarty
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  incomes       BudgetIncome[]
  categoryPlans BudgetCategoryPlan[]
  transactions  Transaction[]

  @@unique([userId, year, month])
  @@index([userId])
  @@index([userId, year, month])
  @@map("budget_periods")
}

model BudgetIncome {
  id        String       @id @default(cuid())
  periodId  String
  period    BudgetPeriod @relation(fields: [periodId], references: [id], onDelete: Cascade)
  userId    String
  title     String       @db.VarChar(200)
  planned   Decimal      @db.Decimal(12, 2)
  actual    Decimal?     @db.Decimal(12, 2)   // null = jeszcze nie wpłynęło
  sortOrder Int          @default(0)
  createdAt DateTime     @default(now())
  updatedAt DateTime     @updatedAt

  @@index([periodId])
  @@index([userId])
  @@map("budget_incomes")
}

model BudgetCategoryPlan {
  id        String       @id @default(cuid())
  periodId  String
  period    BudgetPeriod @relation(fields: [periodId], references: [id], onDelete: Cascade)
  userId    String
  category  String       @db.VarChar(50)   // slug kategorii
  planned   Decimal      @db.Decimal(12, 2)
  createdAt DateTime     @default(now())
  updatedAt DateTime     @updatedAt

  @@unique([periodId, category])
  @@index([periodId])
  @@index([userId])
  @@map("budget_category_plans")
}

// ─── TRANSACTION ─────────────────────────────────────────────────────────────

model Transaction {
  id        String            @id @default(cuid())
  periodId  String
  period    BudgetPeriod      @relation(fields: [periodId], references: [id], onDelete: Cascade)
  userId    String
  date      DateTime          @db.Date
  title     String            @db.VarChar(300)
  amount    Decimal           @db.Decimal(12, 2)
  category  String            @db.VarChar(50)   // slug kategorii
  source    TransactionSource @default(MANUAL)
  sourceId  String?           // id subskrypcji lub płatności cyklicznej — do trace back
  tags      String[]          @default([])
  deletedAt DateTime?
  createdAt DateTime          @default(now())
  updatedAt DateTime          @updatedAt

  @@index([periodId])
  @@index([userId])
  @@index([userId, date])
  @@index([userId, deletedAt])
  @@index([userId, category])
  @@map("transactions")
}

enum TransactionSource {
  MANUAL
  SUBSCRIPTION
  RECURRING
}

// ─── SUBSCRIPTION ────────────────────────────────────────────────────────────

model Subscription {
  id              String       @id @default(cuid())
  userId          String
  name            String       @db.VarChar(200)
  amount          Decimal      @db.Decimal(12, 2)
  currency        String       @default("PLN")
  category        String       @default("rachunki") @db.VarChar(50)  // slug kategorii
  billingCycle    BillingCycle
  billingDay      Int          // dzień miesiąca (1-31) lub dzień roku
  nextBillingDate DateTime     @db.Date
  isActive        Boolean      @default(true)
  trialEndsAt     DateTime?    @db.Date
  notes           String?      @db.VarChar(500)
  deletedAt       DateTime?
  createdAt       DateTime     @default(now())
  updatedAt       DateTime     @updatedAt

  @@index([userId])
  @@index([userId, isActive])
  @@index([userId, nextBillingDate])
  @@index([userId, deletedAt])
  @@map("subscriptions")
}

enum BillingCycle {
  WEEKLY
  MONTHLY
  QUARTERLY
  YEARLY
}

// ─── RECURRING TEMPLATE (płatności cykliczne) ─────────────────────────────────

model RecurringTemplate {
  id            String       @id @default(cuid())
  userId        String
  name          String       @db.VarChar(200)
  defaultAmount Decimal      @db.Decimal(12, 2)
  currency      String       @default("PLN")
  category      String       @db.VarChar(50)   // slug kategorii
  billingCycle  BillingCycle @default(MONTHLY)
  billingDay    Int          // dzień miesiąca (1-28 dla bezpieczeństwa)
  isActive      Boolean      @default(true)
  notes         String?      @db.VarChar(500)
  deletedAt     DateTime?
  createdAt     DateTime     @default(now())
  updatedAt     DateTime     @updatedAt

  payments RecurringPayment[]

  @@index([userId])
  @@index([userId, isActive])
  @@index([userId, deletedAt])
  @@map("recurring_templates")
}

model RecurringPayment {
  id            String            @id @default(cuid())
  templateId    String
  template      RecurringTemplate @relation(fields: [templateId], references: [id], onDelete: Cascade)
  userId        String
  year          Int               // rok płatności
  month         Int               // miesiąc płatności (1-12)
  periodId      String?           // opcjonalne — wypełniane gdy potwierdzono z istniejącym BudgetPeriod
  dueDate       DateTime          @db.Date
  amount        Decimal           @db.Decimal(12, 2)  // może być zmieniona przy potwierdzeniu
  status        RecurringStatus   @default(PENDING)
  confirmedAt   DateTime?
  transactionId String?           // id transakcji po potwierdzeniu (jeśli BudgetPeriod istniał)
  createdAt     DateTime          @default(now())
  updatedAt     DateTime          @updatedAt

  @@unique([templateId, year, month])   // jedna płatność per szablon per rok/miesiąc
  @@index([templateId])
  @@index([userId])
  @@index([userId, status])
  @@index([userId, year, month])
  @@map("recurring_payments")
}

enum RecurringStatus {
  PENDING    // wygenerowana, czeka na potwierdzenie
  CONFIRMED  // zapłacono, transakcja utworzona (jeśli BudgetPeriod istniał)
  SKIPPED    // pominięta w tym miesiącu
}
```

### 3.2 RLS SQL — wszystkie tabele (migracja inicjalizacyjna)

```sql
-- budget_categories (globalny słownik — dostęp dla każdego zalogowanego)
ALTER TABLE budget_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "authenticated_read_budget_categories" ON budget_categories
  FOR ALL USING (auth.uid() IS NOT NULL);

-- budget_templates
ALTER TABLE budget_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_own_budget_templates" ON budget_templates
  FOR ALL USING (auth.uid()::text = user_id);

-- budget_template_incomes
ALTER TABLE budget_template_incomes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_own_budget_template_incomes" ON budget_template_incomes
  FOR ALL USING (auth.uid()::text = user_id);

-- budget_template_expenses
ALTER TABLE budget_template_expenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_own_budget_template_expenses" ON budget_template_expenses
  FOR ALL USING (auth.uid()::text = user_id);

-- budget_periods
ALTER TABLE budget_periods ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_own_budget_periods" ON budget_periods
  FOR ALL USING (auth.uid()::text = user_id);

-- budget_incomes
ALTER TABLE budget_incomes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_own_budget_incomes" ON budget_incomes
  FOR ALL USING (auth.uid()::text = user_id);

-- budget_category_plans
ALTER TABLE budget_category_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_own_budget_category_plans" ON budget_category_plans
  FOR ALL USING (auth.uid()::text = user_id);

-- transactions
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_own_transactions" ON transactions
  FOR ALL USING (auth.uid()::text = user_id);

-- subscriptions
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_own_subscriptions" ON subscriptions
  FOR ALL USING (auth.uid()::text = user_id);

-- recurring_templates
ALTER TABLE recurring_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_own_recurring_templates" ON recurring_templates
  FOR ALL USING (auth.uid()::text = user_id);

-- recurring_payments
ALTER TABLE recurring_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_own_recurring_payments" ON recurring_payments
  FOR ALL USING (auth.uid()::text = user_id);
```

---

## 4. Struktura modułów i pliki

### 4.1 Katalogi

```
/modules/
  budget/
    budget.types.ts
    budget.schema.ts
    budget.repository.ts
    budget.service.ts
    budget.api.ts           ← re-eksportuje, routy są w /app/api/
    budget.ui.tsx
  subscriptions/
    subscriptions.types.ts
    subscriptions.schema.ts
    subscriptions.repository.ts
    subscriptions.service.ts
    subscriptions.api.ts
    subscriptions.ui.tsx
  obligations/
    obligations.types.ts    ← RecurringTemplate + RecurringPayment
    obligations.schema.ts
    obligations.repository.ts
    obligations.service.ts
    obligations.api.ts
    obligations.ui.tsx

/app/api/
  budget/
    template/
      route.ts              ← GET, PUT
      incomes/
        route.ts            ← GET, POST
        [id]/route.ts       ← PUT, DELETE
      expenses/
        route.ts            ← GET, PUT (bulk)
    periods/
      route.ts              ← GET (lista), POST (utwórz miesiąc)
      current/route.ts      ← GET (skrót do bieżącego miesiąca)
      [id]/
        route.ts            ← GET (pełny widok), DELETE
        incomes/
          route.ts          ← GET, POST
          [incomeId]/route.ts ← PUT, DELETE
        plans/
          route.ts          ← GET, PUT (bulk upsert)
        transactions/
          route.ts          ← GET, POST
          [txId]/route.ts   ← PUT, DELETE
        summary/route.ts    ← GET (agregacja: saldo, sumy per kategoria)
        replace-template/route.ts ← POST (zastąp plany szablonem)
        reset/route.ts      ← DELETE (resetuj okres: usuń transakcje i plany)
    categories/
      route.ts              ← GET, POST
      [id]/route.ts         ← PUT, DELETE
    annual/
      route.ts              ← GET ?year=2025
  subscriptions/
    route.ts                ← GET, POST
    [id]/route.ts           ← GET, PUT, DELETE
    process-due/route.ts    ← POST (zaksięguj przeterminowane subskrypcje)
  recurring/
    route.ts                ← GET, POST
    [id]/
      route.ts              ← GET, PUT, DELETE
      confirm/route.ts      ← POST (potwierdź płatność)
      skip/route.ts         ← POST (pomiń w tym miesiącu)
    pending/route.ts        ← GET ?year=Y&month=M (auto-sync + lista)
```

---

## 5. API Endpoints — pełna specyfikacja

### 5.1 Konwencje wspólne

Wszystkie endpointy:
- Wymagają JWT w nagłówku `Authorization: Bearer <token>`
- Zwracają `{ data, error, meta? }` bez wyjątków
- Mutujące endpointy mają rate limit 20 req/min per userId
- GET endpointy mają rate limit 10 req/s per IP
- Daty zawsze w formacie ISO 8601
- Kwoty zawsze jako `string` (Decimal serialized) — nigdy `number` (floating point)
- Waluta zawsze jako 3-literowy kod ISO (PLN, EUR, USD)

### 5.2 Budget Template

#### `GET /api/budget/template`
Zwraca szablon użytkownika z przychodami i wydatkami. Jeśli szablon nie istnieje, tworzy pusty.

```ts
// Response data
{
  id: string
  currency: string
  incomes: Array<{
    id: string
    title: string
    amount: string      // "5000.00"
    sortOrder: number
  }>
  expenses: Array<{     // wszystkie kategorie, brakujące mają amount "0.00"
    id: string
    category: string    // slug kategorii
    amount: string
  }>
}
```

#### `PUT /api/budget/template`
Aktualizuje ustawienia szablonu (waluta).

```ts
// Request body
{ currency: string }
```

#### `GET /api/budget/template/incomes`
Lista przychodów domyślnych z szablonu.

#### `POST /api/budget/template/incomes`
Dodaj pozycję przychodu do szablonu.

```ts
// Request body
{
  title: string        // max 200 znaków
  amount: number       // > 0
  sortOrder?: number
}
```

#### `PUT /api/budget/template/incomes/[id]`
Edytuj pozycję przychodu w szablonie.

#### `DELETE /api/budget/template/incomes/[id]`
Usuń pozycję przychodu z szablonu (hard delete — to tylko template).

#### `GET /api/budget/template/expenses`
Lista kwot per kategoria z szablonu.

#### `PUT /api/budget/template/expenses`
Bulk upsert kwot per kategoria. Przyjmuje tablicę — tworzy lub aktualizuje.

```ts
// Request body
{
  expenses: Array<{
    category: string    // slug kategorii
    amount: number      // >= 0
  }>
}
```

### 5.3 Budget Periods

#### `GET /api/budget/periods`
Lista wszystkich miesięcy użytkownika (do historii i analizy rocznej).

```ts
// Query params
?year=2025          // opcjonalne, filtruje do roku

// Response data
Array<{
  id: string
  year: number
  month: number       // 1-12
  currency: string
  closedAt: string | null
  summary: {          // agregacja — liczymy w repository
    plannedIncome: string
    actualIncome: string
    plannedExpenses: string
    actualExpenses: string
    balance: string
  }
}>
```

#### `POST /api/budget/periods`
Utwórz nowy miesiąc z szablonu. Kluczowa operacja. Można tworzyć dla dowolnego miesiąca (przeszłego lub przyszłego).

```ts
// Request body
{
  year: number        // np. 2026
  month: number       // 1-12
  carryOverAmount?: number  // saldo z poprzedniego miesiąca (default 0)
}

// Business logic w service:
// 1. Sprawdź czy miesiąc już istnieje → CONFLICT
// 2. Pobierz szablon użytkownika
// 3. Utwórz BudgetPeriod
// 4. Skopiuj wszystkie BudgetTemplateIncome → BudgetIncome (planned = amount, actual = null)
// 5. Skopiuj wszystkie BudgetTemplateExpense → BudgetCategoryPlan
// 6. Pobierz aktywne subskrypcje z nextBillingDate w tym miesiącu →
//    utwórz Transaction z source=SUBSCRIPTION
// 7. Pobierz aktywne RecurringTemplate →
//    utwórz RecurringPayment ze status=PENDING (year+month zamiast periodId)
// 8. Emit event 'budget.period.created'
```

#### `GET /api/budget/periods/current`
Skrót — zwraca budżet bieżącego miesiąca (rok i miesiąc z serwera).
Jeśli nie istnieje, zwraca `404` — klient pyta czy otworzyć nowy.

#### `GET /api/budget/periods/[id]`
Pełny widok miesiąca — wszystkie dane w jednym zapytaniu (bez N+1).

```ts
// Response data
{
  id: string
  year: number
  month: number
  currency: string
  carryOverAmount: string
  closedAt: string | null
  incomes: Array<BudgetIncome>
  categoryPlans: Array<BudgetCategoryPlan>
  transactions: Array<Transaction>     // tylko deletedAt = null
  pendingPayments: Array<RecurringPayment>  // status = PENDING dla tego miesiąca (year+month)
  summary: {
    plannedIncome: string
    actualIncome: string           // suma actual z incomes (null traktujemy jako 0)
    carryOver: string
    totalPlannedBudget: string     // plannedIncome + carryOver
    plannedExpenses: string        // suma categoryPlans
    actualExpenses: string         // suma transactions
    balance: string                // totalPlannedBudget - actualExpenses
    byCategory: Array<{
      category: string             // slug kategorii
      planned: string
      actual: string
      difference: string           // actual - planned (ujemna = przekroczono)
    }>
  }
}
```

#### `DELETE /api/budget/periods/[id]`
Soft close miesiąca (ustawia `closedAt`). Nie usuwa danych.

#### `POST /api/budget/periods/[id]/replace-template`
Zastępuje plany kategorii okresu planami z bieżącego szablonu użytkownika.
Usuwa stare BudgetCategoryPlan i tworzy nowe na podstawie szablonu.

```ts
// Request body — brak (używa szablonu zalogowanego użytkownika)
// Response: zaktualizowany BudgetPeriod z nowymi planami
```

#### `DELETE /api/budget/periods/[id]/reset`
Resetuje okres: usuwa wszystkie transakcje i plany kategorii tego okresu.
Używane do "restart miesiąca od zera". Nie usuwa samego BudgetPeriod ani przychodów.

```ts
// Response: { deleted: { transactions: number, plans: number } }
```

### 5.4 Budget Incomes (w ramach okresu)

#### `GET /api/budget/periods/[id]/incomes`
Lista przychodów okresu.

#### `POST /api/budget/periods/[id]/incomes`
Dodaj przychód do okresu (np. jednorazowa premia).

```ts
// Request body
{
  title: string
  planned: number
  actual?: number
  sortOrder?: number
}
```

#### `PUT /api/budget/periods/[id]/incomes/[incomeId]`
Aktualizuj przychód (głównie `actual` gdy pieniądze wpłyną).

```ts
// Request body — partial
{
  title?: string
  planned?: number
  actual?: number     // null = jeszcze nie wpłynęło
}
```

#### `DELETE /api/budget/periods/[id]/incomes/[incomeId]`
Soft delete przychodu z okresu.

### 5.5 Budget Category Plans

#### `GET /api/budget/periods/[id]/plans`
Lista planów per kategoria dla okresu.

#### `PUT /api/budget/periods/[id]/plans`
Bulk upsert planów per kategoria. Użytkownik edytuje kwoty w trybie inline-edit (wszystkie kategorie naraz).

```ts
// Request body
{
  plans: Array<{
    category: string    // slug kategorii
    planned: number
  }>
}
```

### 5.6 Transactions

#### `GET /api/budget/periods/[id]/transactions`
Lista transakcji okresu.

```ts
// Query params
?category=zywnosc     // opcjonalne filtrowanie (slug)
?source=MANUAL        // opcjonalne filtrowanie

// Response data — posortowane date DESC
Array<{
  id: string
  date: string        // "2026-01-15"
  title: string
  amount: string
  category: string    // slug kategorii
  source: TransactionSource
  sourceId: string | null
  tags: string[]
}>
```

#### `POST /api/budget/periods/[id]/transactions`
Dodaj transakcję ręcznie.

```ts
// Request body
{
  date: string        // ISO date "2026-01-15"
  title: string       // max 300 znaków
  amount: number      // > 0
  category: string    // slug kategorii
  tags?: string[]     // max 5 tagów, każdy max 50 znaków
}

// Po zapisie: emit 'budget.transaction.created'
// Sprawdź czy suma transakcji kategorii > plan → emit 'budget.category.overspent'
```

#### `PUT /api/budget/periods/[id]/transactions/[txId]`
Edytuj transakcję. Tylko MANUAL transactions można edytować.
SUBSCRIPTION i RECURRING → 403 FORBIDDEN z komunikatem "Edytuj subskrypcję lub szablon cykliczny".

#### `DELETE /api/budget/periods/[id]/transactions/[txId]`
Soft delete transakcji.

### 5.7 Budget Summary

#### `GET /api/budget/periods/[id]/summary`
Zagregowane dane — używane do widoku "przegląd miesiąca".
Zwraca ten sam obiekt `summary` co GET /periods/[id], ale bez listy transakcji.
Użyteczne dla mobile gdzie ładowanie pełnego okresu jest kosztowne.

### 5.8 Annual Analysis

#### `GET /api/budget/annual?year=2025`
Analiza roczna — dane dla 12 miesięcy.

```ts
// Response data
{
  year: number
  months: Array<{
    month: number
    plannedIncome: string
    actualIncome: string
    plannedExpenses: string
    actualExpenses: string
    balance: string
    byCategory: Array<{
      category: string    // slug
      planned: string
      actual: string
    }>
  }>
  yearSummary: {
    totalPlannedIncome: string
    totalActualIncome: string
    totalPlannedExpenses: string
    totalActualExpenses: string
    totalSavings: string
    topCategories: Array<{    // top 5 kategorii wg wydatków
      category: string        // slug
      total: string
    }>
  }
}
```

### 5.9 Subscriptions

#### `GET /api/subscriptions`
Lista aktywnych subskrypcji.

```ts
// Query params
?active=true|false    // default: true (tylko aktywne)
?upcoming=30          // opcjonalne: subskrypcje z nextBillingDate w ciągu N dni

// Response — posortowane nextBillingDate ASC
Array<{
  id: string
  name: string
  amount: string
  currency: string
  category: string    // slug kategorii
  billingCycle: BillingCycle
  billingDay: number
  nextBillingDate: string
  isActive: boolean
  trialEndsAt: string | null
  notes: string | null
  daysUntilBilling: number    // obliczone w service
}>
```

#### `POST /api/subscriptions`
Utwórz subskrypcję.

```ts
// Request body
{
  name: string
  amount: number
  currency?: string       // default "PLN"
  category: string        // slug kategorii
  billingCycle: BillingCycle
  billingDay: number      // 1-28
  nextBillingDate: string // "2026-02-01"
  trialEndsAt?: string
  notes?: string
}

// Po zapisie: emit 'subscription.created'
// Jeśli nextBillingDate <= 7 dni od teraz → emit 'subscription.billing.due'
```

#### `GET /api/subscriptions/[id]`
Szczegóły subskrypcji.

#### `PUT /api/subscriptions/[id]`
Aktualizuj subskrypcję. Wszystkie pola opcjonalne (partial update).
Obsługuje toggle `isActive` — przycisk Power na karcie subskrypcji wysyła `{ isActive: bool }`.

```ts
// Request body — partial
{
  name?: string
  amount?: number
  category?: string       // slug kategorii
  billingCycle?: BillingCycle
  billingDay?: number
  nextBillingDate?: string
  isActive?: boolean
  trialEndsAt?: string | null
  notes?: string | null
}
```

#### `DELETE /api/subscriptions/[id]`
Soft delete subskrypcji.

#### `POST /api/subscriptions/process-due`
Przetwarza przeterminowane subskrypcje — "zaksięguj w budżecie".

```ts
// Request body — brak (userId z sesji)

// Business logic:
// 1. Pobierz aktywne subskrypcje gdzie nextBillingDate <= today
// 2. Dla każdej subskrypcji przejdź przez wszystkie pominięte cykle (idempotent):
//    a. Znajdź lub utwórz BudgetPeriod dla roku/miesiąca nextBillingDate
//    b. Sprawdź czy transakcja z sourceId=sub.id już istnieje (idempotent)
//    c. Jeśli nie — utwórz Transaction (source=SUBSCRIPTION, sourceId=sub.id)
//    d. Przesuń nextBillingDate do następnego cyklu
// 3. Zwróć statystyki

// Response data
{
  processed: number   // liczba subskrypcji przetworzonych
  booked: number      // liczba transakcji utworzonych
}
```

UI wyświetla amber warning banner gdy istnieją przeterminowane subskrypcje (nextBillingDate <= today dla aktywnych).
Przycisk "Zaksięguj w budżecie" wywołuje ten endpoint.

### 5.10 Obligations / Recurring (Płatności cykliczne)

#### Kluczowa zmiana architektury vs. specyfikacja v1.0

`RecurringPayment` nie wymaga `periodId` — używa `year` i `month`. Płatności można
potwierdzać nawet jeśli BudgetPeriod dla danego miesiąca nie istnieje.
`GET /api/recurring/pending` automatycznie tworzy brakujące rekordy RecurringPayment (idempotent upsert).

#### UI — strona zobowiązań

- Jeden widok z nawigacją miesiąc po miesiącu (← Marzec 2026 →)
- Brak zakładki "Szablony" — szablony zarządzane w zwijającym się panelu "Zarządzaj zobowiązaniami"
- Karty płatności: PENDING z badge "Do zapłaty" (amber), CONFIRMED (zielony), SKIPPED
- Karty podsumowania: Do zapłaty / Zapłacono / Łącznie
- Przycisk "Zapłacono" otwiera ConfirmPaymentModal (kwota, data — opcjonalne)
- Widok działa standalone — brak zależności od BudgetPeriod

#### `GET /api/recurring`
Lista aktywnych szablonów płatności cyklicznych.

```ts
// Response — posortowane billingDay ASC
Array<{
  id: string
  name: string
  defaultAmount: string
  currency: string
  category: string    // slug kategorii
  billingCycle: BillingCycle
  billingDay: number
  isActive: boolean
  notes: string | null
}>
```

#### `POST /api/recurring`
Utwórz szablon płatności cyklicznej.

```ts
// Request body
{
  name: string
  defaultAmount: number
  currency?: string
  category: string    // slug kategorii
  billingCycle: BillingCycle  // default MONTHLY
  billingDay: number          // 1-28
  notes?: string
}
```

#### `PUT /api/recurring/[id]`
Aktualizuj szablon (partial).

#### `DELETE /api/recurring/[id]`
Soft delete szablonu. Istniejące RecurringPayment pozostają w DB.

#### `GET /api/recurring/pending?year=Y&month=M`
Główny endpoint widoku zobowiązań. Auto-synchronizuje: dla każdego aktywnego szablonu
tworzy RecurringPayment dla podanego roku/miesiąca (idempotent upsert) jeśli jeszcze nie istnieje.
Następnie zwraca listę wszystkich płatności na ten miesiąc.

```ts
// Query params — wymagane oba:
?year=2026
?month=3

// Auto-sync behavior:
// Dla każdego aktywnego RecurringTemplate: utwórz RecurringPayment (year, month)
// jeśli jeszcze nie istnieje — niezależnie od tego czy BudgetPeriod istnieje

// Response
Array<{
  id: string          // RecurringPayment id
  templateId: string
  templateName: string
  dueDate: string
  amount: string      // defaultAmount z szablonu (lub nadpisana przy tworzeniu)
  category: string    // slug kategorii
  status: RecurringStatus
  periodId: string | null     // null jeśli BudgetPeriod nie istnieje
  transactionId: string | null
}>
```

#### `POST /api/recurring/[id]/confirm`
Potwierdź płatność — kluczowa operacja. `[id]` to id RecurringPayment (nie templateId).
Rok i miesiąc przekazywane jako query params.

```ts
// Query params — wymagane:
?year=2026&month=3

// Request body
{
  amount?: number     // jeśli różna od defaultAmount (np. prąd 163 zamiast 180)
  date?: string       // data płatności (default: today), format "YYYY-MM-DD"
}

// Business logic w service (prisma.$transaction):
// 1. Pobierz RecurringPayment WHERE { id, userId } — sprawdź ownership
// 2. Jeśli status=CONFIRMED → throw CONFLICT
// 3. Zaktualizuj RecurringPayment: status=CONFIRMED, confirmedAt=now, amount=podana
// 4. Sprawdź czy istnieje BudgetPeriod dla (userId, year, month):
//    a. Jeśli TAK → utwórz Transaction (source=RECURRING, sourceId=templateId),
//       ustaw RecurringPayment.transactionId i periodId
//    b. Jeśli NIE → tylko oznacz jako CONFIRMED, nie twórz transakcji
// 5. Emit 'recurring.payment.confirmed'
```

#### `POST /api/recurring/[id]/skip`
Pomiń płatność w danym miesiącu. `[id]` to id RecurringPayment.

```ts
// Request body
{
  year: number
  month: number
}

// Ustawia RecurringPayment.status = SKIPPED
```

### 5.11 Budget Categories

#### `GET /api/budget/categories`
Lista wszystkich kategorii (globalny słownik). Dostępna dla każdego zalogowanego użytkownika.

```ts
// Response — posortowane sortOrder ASC, następnie label ASC
Array<{
  id: string
  slug: string
  label: string
  icon: string | null
  sortOrder: number
}>
```

#### `POST /api/budget/categories`
Utwórz nową kategorię.

```ts
// Request body
{
  slug: string      // unikalny, max 50 znaków, tylko [a-z0-9_]
  label: string     // max 100 znaków
  icon?: string     // opcjonalny identyfikator ikony, max 50 znaków
  sortOrder?: number
}
```

#### `PUT /api/budget/categories/[id]`
Aktualizuj kategorię (partial).

```ts
// Request body — partial
{
  label?: string
  icon?: string | null
  sortOrder?: number
}
// Uwaga: slug jest immutable po utworzeniu — nie można go zmienić
```

#### `DELETE /api/budget/categories/[id]`
Usuń kategorię. Hard delete — tylko jeśli nie jest używana w żadnych transakcjach, planach ani subskrypcjach.
Zwraca 409 CONFLICT jeśli kategoria jest w użyciu.

---

## 6. Logika biznesowa — reguły service layer

### 6.1 Tworzenie nowego miesiąca (budget.service.ts)

```ts
async createPeriod(data: CreatePeriodDto, userId: string): Promise<BudgetPeriodDetail> {
  // 1. Guard: czy miesiąc już istnieje?
  const existing = await budgetRepository.getPeriodByYearMonth(data.year, data.month, userId)
  if (existing) throw new AppError('CONFLICT', 'Budget period already exists')

  // 2. Pobierz lub utwórz szablon
  const template = await budgetRepository.getOrCreateTemplate(userId)

  // 3. Utwórz okres
  const period = await budgetRepository.createPeriod({
    userId,
    year: data.year,
    month: data.month,
    carryOverAmount: data.carryOverAmount ?? 0,
  })

  // 4. Kopiuj przychody z szablonu
  if (template.incomes.length > 0) {
    await budgetRepository.createManyIncomes(
      template.incomes.map(inc => ({
        periodId: period.id,
        userId,
        title: inc.title,
        planned: inc.amount,
        actual: null,
        sortOrder: inc.sortOrder,
      }))
    )
  }

  // 5. Kopiuj plany kategorii z szablonu
  if (template.expenses.length > 0) {
    await budgetRepository.createManyCategoryPlans(
      template.expenses.map(exp => ({
        periodId: period.id,
        userId,
        category: exp.category,
        planned: exp.amount,
      }))
    )
  }

  // 6. Auto-booking subskrypcji — jedna query, bez N+1
  const periodStart = new Date(data.year, data.month - 1, 1)
  const periodEnd = new Date(data.year, data.month, 0)
  const subscriptions = await subscriptionRepository.getActiveForPeriod(
    userId, periodStart, periodEnd
  )
  if (subscriptions.length > 0) {
    await budgetRepository.createManyTransactions(
      subscriptions.map(sub => ({
        periodId: period.id,
        userId,
        date: sub.nextBillingDate,
        title: sub.name,
        amount: sub.amount,
        category: sub.category,
        source: 'SUBSCRIPTION',
        sourceId: sub.id,
      }))
    )
  }

  // 7. Generuj oczekujące płatności cykliczne (year+month, bez periodId)
  const recurringTemplates = await obligationRepository.getActiveTemplates(userId)
  if (recurringTemplates.length > 0) {
    await obligationRepository.createManyPendingPayments(
      recurringTemplates.map(tpl => ({
        templateId: tpl.id,
        userId,
        year: data.year,
        month: data.month,
        dueDate: new Date(data.year, data.month - 1, Math.min(tpl.billingDay, periodEnd.getDate())),
        amount: tpl.defaultAmount,
        status: 'PENDING',
      }))
    )
  }

  // 8. Event
  await eventEmitter.emit('budget.period.created', { periodId: period.id, year: data.year, month: data.month }, userId)

  // 9. Zwróć pełny widok
  return budgetRepository.getPeriodDetail(period.id, userId)
}
```

### 6.2 Aktualizacja nextBillingDate po auto-booking (subscription.service.ts)

Po każdym auto-booking subskrypcji (podczas tworzenia okresu) system wylicza i zapisuje
następną datę naliczenia:

```ts
function calculateNextBillingDate(current: Date, cycle: BillingCycle): Date {
  const next = new Date(current)
  switch (cycle) {
    case 'WEEKLY':    next.setDate(next.getDate() + 7); break
    case 'MONTHLY':   next.setMonth(next.getMonth() + 1); break
    case 'QUARTERLY': next.setMonth(next.getMonth() + 3); break
    case 'YEARLY':    next.setFullYear(next.getFullYear() + 1); break
  }
  return next
}
```

### 6.3 Obliczanie summary (bez N+1)

Repository pobiera wszystkie dane w jednym zapytaniu z `include`.
Service oblicza sumy. Kategorie pobierane z `GET /api/budget/categories` — nie z hardcoded listy.

```ts
function calculateSummary(
  period: BudgetPeriodWithRelations,
  categories: BudgetCategoryView[]
): BudgetSummary {
  const plannedIncome = period.incomes.reduce((sum, inc) => sum + Number(inc.planned), 0)
  const actualIncome = period.incomes.reduce((sum, inc) => sum + Number(inc.actual ?? 0), 0)
  const plannedExpenses = period.categoryPlans.reduce((sum, p) => sum + Number(p.planned), 0)
  const actualExpenses = period.transactions
    .filter(tx => !tx.deletedAt)
    .reduce((sum, tx) => sum + Number(tx.amount), 0)

  const byCategory = categories.map(cat => {
    const plan = period.categoryPlans.find(p => p.category === cat.slug)
    const txs = period.transactions.filter(tx => tx.category === cat.slug && !tx.deletedAt)
    const actual = txs.reduce((sum, tx) => sum + Number(tx.amount), 0)
    const planned = Number(plan?.planned ?? 0)
    return {
      category: cat.slug,
      planned: planned.toFixed(2),
      actual: actual.toFixed(2),
      difference: (actual - planned).toFixed(2),
    }
  })

  return {
    plannedIncome: plannedIncome.toFixed(2),
    actualIncome: actualIncome.toFixed(2),
    carryOver: Number(period.carryOverAmount).toFixed(2),
    totalPlannedBudget: (plannedIncome + Number(period.carryOverAmount)).toFixed(2),
    plannedExpenses: plannedExpenses.toFixed(2),
    actualExpenses: actualExpenses.toFixed(2),
    balance: (plannedIncome + Number(period.carryOverAmount) - actualExpenses).toFixed(2),
    byCategory,
  }
}
```

### 6.4 getMonthView — główny entry point dla zobowiązań

`obligationService.getMonthView(userId, year, month)` zastępuje `getPending`.
Wykonuje auto-sync (upsert RecurringPayment dla każdego aktywnego szablonu) i zwraca
kompletny widok miesiąca z podziałem na statusy.

```ts
async getMonthView(userId: string, year: number, month: number): Promise<ObligationMonthView> {
  // 1. Pobierz aktywne szablony
  const templates = await obligationRepository.getActiveTemplates(userId)

  // 2. Auto-sync — upsert RecurringPayment dla brakujących
  for (const tpl of templates) {
    await obligationRepository.upsertPayment({
      templateId: tpl.id,
      userId,
      year,
      month,
      dueDate: calculateDueDate(year, month, tpl.billingDay),
      amount: tpl.defaultAmount,
      status: 'PENDING',
    })
  }

  // 3. Pobierz wszystkie płatności dla (userId, year, month)
  const payments = await obligationRepository.getPaymentsByMonth(userId, year, month)

  // 4. Oblicz summary
  const pending = payments.filter(p => p.status === 'PENDING')
  const confirmed = payments.filter(p => p.status === 'CONFIRMED')

  return {
    year,
    month,
    payments,
    summary: {
      toPay: pending.reduce((s, p) => s + Number(p.amount), 0).toFixed(2),
      paid: confirmed.reduce((s, p) => s + Number(p.amount), 0).toFixed(2),
      total: payments.reduce((s, p) => s + Number(p.amount), 0).toFixed(2),
    }
  }
}
```

---

## 7. System eventów — definicje

### 7.1 Eventy emitowane przez moduły finansowe

```ts
// budget.period.created
// Payload: { periodId, year, month }
// Trigger: po utworzeniu nowego miesiąca
// Użycie: powiadomienie, refresh cache

// budget.transaction.created
// Payload: { transactionId, periodId, amount, category }
// Trigger: po każdej nowej transakcji
// Użycie: real-time update salda w UI

// budget.category.overspent
// Payload: { periodId, category, planned, actual, overspentBy }
// Trigger: gdy suma transakcji kategorii przekroczy plan
// Użycie: powiadomienie push (mobile przyszłość)
// scheduledAt: now() — natychmiastowe

// subscription.created
// Payload: { subscriptionId, name, amount, nextBillingDate }
// Trigger: po utworzeniu subskrypcji

// subscription.billing.due
// Payload: { subscriptionId, name, amount, billingDate }
// Trigger: ustawiamy scheduledAt = nextBillingDate - 3 dni
// Użycie: przypomnienie przed pobraniem

// subscription.trial.ending
// Payload: { subscriptionId, name, trialEndsAt }
// Trigger: ustawiamy scheduledAt = trialEndsAt - 7 dni
// Użycie: przypomnienie zanim trial się skończy

// recurring.payment.due
// Payload: { templateId, name, amount, year, month }
// Trigger: podczas tworzenia okresu dla każdego PENDING payment
// scheduledAt: dueDate płatności

// recurring.payment.confirmed
// Payload: { templateId, paymentId, transactionId, amount }
// Trigger: po potwierdzeniu płatności
```

### 7.2 Ustawianie scheduledAt dla przypomnień

```ts
// W subscription.service.ts po create:
await eventEmitter.emit(
  'subscription.billing.due',
  { subscriptionId: sub.id, name: sub.name, amount: sub.amount },
  userId,
  new Date(sub.nextBillingDate.getTime() - 3 * 24 * 60 * 60 * 1000)  // -3 dni
)

if (sub.trialEndsAt) {
  await eventEmitter.emit(
    'subscription.trial.ending',
    { subscriptionId: sub.id, name: sub.name, trialEndsAt: sub.trialEndsAt },
    userId,
    new Date(sub.trialEndsAt.getTime() - 7 * 24 * 60 * 60 * 1000)   // -7 dni
  )
}
```

---

## 8. Typy TypeScript — kompletne definicje

### 8.1 budget.types.ts

```ts
import type { BillingCycle, TransactionSource, RecurringStatus } from '@prisma/client'
import type { z } from 'zod'
import type {
  createPeriodSchema,
  createTransactionSchema,
  updateTransactionSchema,
  updateIncomeSchema,
  bulkUpdatePlansSchema,
  bulkUpdateTemplateExpensesSchema,
  createTemplateIncomeSchema,
} from './budget.schema'

export type { BillingCycle, TransactionSource, RecurringStatus }

// BudgetCategory jest teraz modelem DB — nie enumem Prisma
// Kategorie pobierane dynamicznie z GET /api/budget/categories
export interface BudgetCategoryView {
  id: string
  slug: string
  label: string
  icon?: string
  sortOrder: number
}

// DTOs — inferowane z Zod
export type CreatePeriodDto = z.infer<typeof createPeriodSchema>
export type CreateTransactionDto = z.infer<typeof createTransactionSchema>
export type UpdateTransactionDto = z.infer<typeof updateTransactionSchema>
export type UpdateIncomeDto = z.infer<typeof updateIncomeSchema>
export type BulkUpdatePlansDto = z.infer<typeof bulkUpdatePlansSchema>
export type BulkUpdateTemplateExpensesDto = z.infer<typeof bulkUpdateTemplateExpensesSchema>
export type CreateTemplateIncomeDto = z.infer<typeof createTemplateIncomeSchema>

// View types — zwracane przez API
export interface BudgetSummary {
  plannedIncome: string
  actualIncome: string
  carryOver: string
  totalPlannedBudget: string
  plannedExpenses: string
  actualExpenses: string
  balance: string
  byCategory: CategorySummaryItem[]
}

export interface CategorySummaryItem {
  category: string    // slug kategorii
  planned: string
  actual: string
  difference: string  // ujemna = przekroczono
}

export interface BudgetPeriodListItem {
  id: string
  year: number
  month: number
  currency: string
  closedAt: string | null
  summary: BudgetSummary
}

export interface AnnualSummary {
  year: number
  months: MonthSummary[]
  yearSummary: {
    totalPlannedIncome: string
    totalActualIncome: string
    totalPlannedExpenses: string
    totalActualExpenses: string
    totalSavings: string
    topCategories: Array<{ category: string; total: string }>
  }
}

export interface MonthSummary {
  month: number
  plannedIncome: string
  actualIncome: string
  plannedExpenses: string
  actualExpenses: string
  balance: string
  byCategory: CategorySummaryItem[]
}
```

### 8.2 subscriptions.types.ts

```ts
import type { BillingCycle } from '@prisma/client'
import type { z } from 'zod'
import type { createSubscriptionSchema, updateSubscriptionSchema } from './subscriptions.schema'

export type { BillingCycle }

export type CreateSubscriptionDto = z.infer<typeof createSubscriptionSchema>
export type UpdateSubscriptionDto = z.infer<typeof updateSubscriptionSchema>

export const BILLING_CYCLE_LABELS: Record<BillingCycle, string> = {
  WEEKLY: 'Co tydzień',
  MONTHLY: 'Co miesiąc',
  QUARTERLY: 'Co kwartał',
  YEARLY: 'Co rok',
}

export interface SubscriptionListItem {
  id: string
  name: string
  amount: string
  currency: string
  category: string    // slug kategorii
  billingCycle: BillingCycle
  billingDay: number
  nextBillingDate: string
  isActive: boolean
  trialEndsAt: string | null
  notes: string | null
  daysUntilBilling: number
}
```

### 8.3 obligations.types.ts

```ts
import type { BillingCycle, RecurringStatus } from '@prisma/client'
import type { z } from 'zod'
import type {
  createRecurringTemplateSchema,
  updateRecurringTemplateSchema,
  confirmPaymentSchema,
  skipPaymentSchema,
} from './obligations.schema'

export type { BillingCycle, RecurringStatus }

export type CreateRecurringTemplateDto = z.infer<typeof createRecurringTemplateSchema>
export type UpdateRecurringTemplateDto = z.infer<typeof updateRecurringTemplateSchema>
export type ConfirmPaymentDto = z.infer<typeof confirmPaymentSchema>
export type SkipPaymentDto = z.infer<typeof skipPaymentSchema>

export interface RecurringTemplateListItem {
  id: string
  name: string
  defaultAmount: string
  currency: string
  category: string    // slug kategorii
  billingCycle: BillingCycle
  billingDay: number
  isActive: boolean
  notes: string | null
}

export interface PendingPaymentItem {
  id: string            // RecurringPayment id
  templateId: string
  templateName: string
  dueDate: string
  amount: string
  category: string      // slug kategorii
  status: RecurringStatus
  periodId: string | null
  transactionId: string | null
}

export interface ObligationMonthView {
  year: number
  month: number
  payments: PendingPaymentItem[]
  summary: {
    toPay: string     // suma PENDING
    paid: string      // suma CONFIRMED
    total: string     // suma wszystkich
  }
}
```

---

## 9. Schematy Zod — walidacja

### 9.1 budget.schema.ts

```ts
import { z } from 'zod'

// Kategoria jako string (slug) — walidacja tylko długości i formatu
const categorySlugSchema = z.string().trim().min(1).max(50).regex(/^[a-z0-9_]+$/)

export const createPeriodSchema = z.object({
  year: z.number().int().min(2020).max(2100),
  month: z.number().int().min(1).max(12),
  carryOverAmount: z.number().min(0).optional().default(0),
})

export const createTemplateIncomeSchema = z.object({
  title: z.string().trim().min(1).max(200),
  amount: z.number().positive(),
  sortOrder: z.number().int().optional().default(0),
})

export const updateTemplateIncomeSchema = createTemplateIncomeSchema.partial()

export const bulkUpdateTemplateExpensesSchema = z.object({
  expenses: z.array(z.object({
    category: categorySlugSchema,
    amount: z.number().min(0),
  })).min(1),
})

export const createIncomeSchema = z.object({
  title: z.string().trim().min(1).max(200),
  planned: z.number().positive(),
  actual: z.number().min(0).optional().nullable(),
  sortOrder: z.number().int().optional().default(0),
})

export const updateIncomeSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  planned: z.number().positive().optional(),
  actual: z.number().min(0).nullable().optional(),
})

export const bulkUpdatePlansSchema = z.object({
  plans: z.array(z.object({
    category: categorySlugSchema,
    planned: z.number().min(0),
  })).min(1),
})

export const createTransactionSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format daty: YYYY-MM-DD'),
  title: z.string().trim().min(1).max(300),
  amount: z.number().positive(),
  category: categorySlugSchema,
  tags: z.array(z.string().trim().max(50)).max(5).optional().default([]),
})

export const updateTransactionSchema = createTransactionSchema.partial()

export const annualQuerySchema = z.object({
  year: z.coerce.number().int().min(2020).max(2100),
})

export const createBudgetCategorySchema = z.object({
  slug: z.string().trim().min(1).max(50).regex(/^[a-z0-9_]+$/),
  label: z.string().trim().min(1).max(100),
  icon: z.string().trim().max(50).optional(),
  sortOrder: z.number().int().optional().default(0),
})

export const updateBudgetCategorySchema = z.object({
  label: z.string().trim().min(1).max(100).optional(),
  icon: z.string().trim().max(50).nullable().optional(),
  sortOrder: z.number().int().optional(),
})
```

### 9.2 subscriptions.schema.ts

```ts
import { z } from 'zod'

const billingCycleEnum = z.enum(['WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY'])
const categorySlugSchema = z.string().trim().min(1).max(50).regex(/^[a-z0-9_]+$/)

export const createSubscriptionSchema = z.object({
  name: z.string().trim().min(1).max(200),
  amount: z.number().positive(),
  currency: z.string().length(3).default('PLN'),
  category: categorySlugSchema,
  billingCycle: billingCycleEnum,
  billingDay: z.number().int().min(1).max(28),
  nextBillingDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  trialEndsAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  notes: z.string().trim().max(500).nullable().optional(),
})

export const updateSubscriptionSchema = createSubscriptionSchema
  .partial()
  .extend({ isActive: z.boolean().optional() })
```

### 9.3 obligations.schema.ts

```ts
import { z } from 'zod'

const billingCycleEnum = z.enum(['WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY'])
const categorySlugSchema = z.string().trim().min(1).max(50).regex(/^[a-z0-9_]+$/)

export const createRecurringTemplateSchema = z.object({
  name: z.string().trim().min(1).max(200),
  defaultAmount: z.number().positive(),
  currency: z.string().length(3).default('PLN'),
  category: categorySlugSchema,
  billingCycle: billingCycleEnum.default('MONTHLY'),
  billingDay: z.number().int().min(1).max(28),
  notes: z.string().trim().max(500).nullable().optional(),
})

export const updateRecurringTemplateSchema = createRecurringTemplateSchema
  .partial()
  .extend({ isActive: z.boolean().optional() })

export const confirmPaymentSchema = z.object({
  amount: z.number().positive().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
})

export const skipPaymentSchema = z.object({
  year: z.number().int().min(2020).max(2100),
  month: z.number().int().min(1).max(12),
})

export const pendingPaymentsQuerySchema = z.object({
  year: z.coerce.number().int().min(2020).max(2100),
  month: z.coerce.number().int().min(1).max(12),
})

export const confirmPaymentQuerySchema = z.object({
  year: z.coerce.number().int().min(2020).max(2100),
  month: z.coerce.number().int().min(1).max(12),
})
```

---

## 10. Mobile-ready — szczegóły implementacji API

### 10.1 Wymagania dla React Native

- Wszystkie daty jako `string` ISO 8601 — React Native ma problemy z Date serialization
- Wszystkie kwoty jako `string` (Decimal) — nigdy `number` — flotopy mogą się różnić między platformami
- Pagination przez `cursor` lub `page+limit` — widoki listy na mobile ładują stopniowo
- Endpoint `/api/budget/periods/current` — mobile nie musi znać roku i miesiąca
- Endpoint `/api/budget/periods/[id]/summary` — lekki endpoint tylko z agregacją (bez transakcji)
- `GET /api/subscriptions?upcoming=7` — widget na dashboardzie mobile: "co płacisz w tym tygodniu"
- `GET /api/recurring/pending?year=Y&month=M` — lista "do zapłaty" na mobile (auto-sync)
- `GET /api/budget/categories` — lista kategorii pobierana przy starcie aplikacji i cachowana

### 10.2 Pagination (gdzie stosować)

```ts
// GET /api/budget/periods/[id]/transactions — może być długa lista
// Query: ?page=1&limit=20&category=zywnosc
// Response meta: { page, limit, total, hasNext }

// GET /api/budget/periods — lista miesięcy
// Query: ?page=1&limit=12
// Sortowanie: year DESC, month DESC

// Pozostałe listy (subskrypcje, szablony) — zazwyczaj < 50 pozycji, bez pagination
```

### 10.3 Nagłówki odpowiedzi API

Każda odpowiedź musi zawierać:
```
Content-Type: application/json
Cache-Control: no-store   // dane finansowe — nigdy nie cachować
```

---

## 11. Kolejność implementacji przez Claude Code

### Faza 1 — Fundament

```
1.  Prisma schema — wszystkie modele z sekcji 3.1 (w tym BudgetCategory jako model, nie enum)
2.  Migracja RLS SQL — wszystkie tabele z sekcji 3.2
3.  npx prisma generate
4.  npx prisma migrate dev --name finance_modules_init
5.  Seed domyślnych kategorii (14 rekordów w budget_categories)
```

### Faza 2 — Moduł budget/template

```
6.  budget.types.ts
7.  budget.schema.ts
8.  budget.repository.ts  ← getOrCreateTemplate, updateTemplate, CRUD incomes, bulk expenses
9.  budget.service.ts     ← logika szablonu
10. app/api/budget/template/route.ts
11. app/api/budget/template/incomes/route.ts + [id]/route.ts
12. app/api/budget/template/expenses/route.ts
13. app/api/budget/categories/route.ts + [id]/route.ts
```

### Faza 3 — Moduł budget/periods

```
14. budget.repository.ts  ← createPeriod, getPeriodDetail (z include), getPeriodByYearMonth
15. budget.service.ts     ← createPeriod (pełna logika z sekcji 6.1), calculateSummary
16. app/api/budget/periods/route.ts
17. app/api/budget/periods/current/route.ts
18. app/api/budget/periods/[id]/route.ts
19. app/api/budget/periods/[id]/summary/route.ts
20. app/api/budget/periods/[id]/incomes/route.ts + [incomeId]/route.ts
21. app/api/budget/periods/[id]/plans/route.ts
22. app/api/budget/periods/[id]/transactions/route.ts + [txId]/route.ts
23. app/api/budget/periods/[id]/replace-template/route.ts
24. app/api/budget/periods/[id]/reset/route.ts
25. app/api/budget/annual/route.ts
```

### Faza 4 — Moduł subscriptions

```
26. subscriptions.types.ts
27. subscriptions.schema.ts
28. subscriptions.repository.ts
29. subscriptions.service.ts  ← calculateNextBillingDate, event scheduling, processDue
30. app/api/subscriptions/route.ts + [id]/route.ts
31. app/api/subscriptions/process-due/route.ts
```

### Faza 5 — Moduł obligations (recurring)

```
32. obligations.types.ts
33. obligations.schema.ts
34. obligations.repository.ts  ← upsertPayment, getPaymentsByMonth, getActiveTemplates
35. obligations.service.ts     ← getMonthView, confirmPayment (atomowa), skipPayment
36. app/api/recurring/route.ts + [id]/route.ts
37. app/api/recurring/[id]/confirm/route.ts  ← query params: year+month
38. app/api/recurring/[id]/skip/route.ts
39. app/api/recurring/pending/route.ts       ← auto-sync + lista
```

### Faza 6 — UI Components

```
40. budget.ui.tsx         ← BudgetOverview, CategoryTable (inline edit), TransactionList
                             IncomeSection (tylko w MonthlyReportTab), ExtendedSummaryCards (5 kart)
41. subscriptions.ui.tsx  ← SubscriptionList, SubscriptionCard (Power toggle), BillingBadge,
                             amber warning banner + "Zaksięguj w budżecie" button
42. obligations.ui.tsx    ← MonthNavigation, ObligationCard, ConfirmPaymentModal,
                             SummaryCards (Do zapłaty/Zapłacono/Łącznie),
                             CollapsibleTemplatePanel ("Zarządzaj zobowiązaniami")
```

---

## 12. Checklist bezpieczeństwa — każdy endpoint

Przed ukończeniem każdego route handlera zweryfikuj:

```
✅ requireAuth() na początku — zwraca 401 jeśli brak/wygasły token
✅ Zod safeParse() dla body/query — zwraca 400 VALIDATION_ERROR
✅ userId przekazany do service — nigdy nie wyciągnięty z body
✅ Repository filtruje WHERE { id, userId } — ochrona przed IDOR
✅ Service zwraca NOT_FOUND gdy null — nigdy FORBIDDEN dla zasobu
✅ withRateLimit() na endpointach mutujących — 20 req/min per userId
✅ Kwoty zwracane jako string — nigdy number
✅ Daty zwracane jako ISO string — nigdy Date object
✅ deletedAt: null w każdym SELECT listującym — soft delete respektowany
✅ Emit event po sukcesie — zawsze na końcu, nigdy przed zapisem do DB
✅ Category jako string (slug) — nie enum Prisma
✅ RecurringPayment: year+month zamiast periodId (periodId opcjonalne)
```

---

*Koniec specyfikacji — wersja 1.1*
*Implementuj dokładnie to co jest opisane. Żadnych własnych ulepszeń bez instrukcji.*
