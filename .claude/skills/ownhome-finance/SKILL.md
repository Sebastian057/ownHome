---
name: ownhome-finance
description: Implementuj moduły finansowe OwnHome (budget, subscriptions, obligations/recurring).
  Użyj tego skilla zawsze gdy tworzysz lub edytujesz pliki w modules/budget,
  modules/subscriptions, modules/obligations, app/api/budget, app/api/subscriptions,
  app/api/recurring. Skill zawiera kompletną specyfikację techniczną i kolejność implementacji.
---

# OwnHome Finance Modules — Skill

## Źródło prawdy

Przed każdą implementacją przeczytaj plik specyfikacji:

```
cat SPEC_FINANCE_MODULES.md (W folderze /docs)
```

Specyfikacja zawiera: schematy Prisma, pełne API, logikę biznesową, typy TypeScript,
schematy Zod i kolejność implementacji. Nie implementuj nic czego tam nie ma.

## Reguły obowiązkowe z CLAUDE.md

1. Kolejność plików w module: types → schema → repository → service → api → ui
2. Brak logiki biznesowej poza service.ts
3. Brak dostępu do Prisma poza repository.ts
4. Ownership check: WHERE { id, userId } w KAŻDYM zapytaniu
5. Soft delete: deletedAt: null w KAŻDYM SELECT listującym
6. Eventy: emit() zawsze po sukcesie, nigdy przed zapisem do DB
7. Odpowiedź API: { data, error, meta? } bez wyjątków
8. Kwoty: zawsze string (Decimal), nigdy number
9. Daty: zawsze ISO string, nigdy Date object w response

## Kluczowe zmiany v1.1 (aktualna implementacja)

### Kategorie — dynamiczny model, nie enum

`BudgetCategory` to **model Prisma** (tabela `budget_categories`), nie enum.
- Pole `category` we wszystkich modelach to `String @db.VarChar(50)` przechowujące slug
- Kategorie pobierane z `GET /api/budget/categories` — nie z hardcoded tablicy
- Typ w kodzie: `BudgetCategoryView { id, slug, label, icon?, sortOrder }`
- Schematy Zod walidują kategorię jako `z.string().regex(/^[a-z0-9_]+$/)`
- RLS dla `budget_categories`: `auth.uid() IS NOT NULL` (globalna tabela, brak userId)
- Seed 14 domyślnych kategorii przy inicjalizacji DB

### RecurringPayment — year+month zamiast periodId

`RecurringPayment` nie wymaga `periodId`. Zamiast tego używa `year: Int` i `month: Int`.
- `periodId` jest opcjonalne (`String?`) — wypełniane tylko gdy BudgetPeriod istnieje
- Unique constraint: `@@unique([templateId, year, month])`
- Płatność można potwierdzić nawet bez istniejącego BudgetPeriod

## Kolejność implementacji (nie zmieniaj)

### Faza 1 — Schema
```bash
# 1. Zaktualizuj prisma/schema.prisma — dodaj wszystkie modele z SPEC sekcja 3.1
#    WAŻNE: BudgetCategory jako model (nie enum), category pola jako String
# 2. Utwórz migrację SQL z RLS z SPEC sekcja 3.2
npx prisma migrate dev --name finance_modules_init
npx prisma generate
# 3. Seed kategorii (14 rekordów)
# 4. Sprawdź: npx tsc --noEmit
```

### Faza 2 — Template + Categories
```
budget.types.ts → budget.schema.ts → budget.repository.ts (tylko template) →
budget.service.ts (tylko template) → app/api/budget/template/route.ts →
app/api/budget/template/incomes/ → app/api/budget/template/expenses/ →
app/api/budget/categories/route.ts + [id]/route.ts
```

### Faza 3 — Periods + Transactions
```
budget.repository.ts (periods, transactions) → budget.service.ts (createPeriod z pełną logiką) →
wszystkie routy periods i transactions →
app/api/budget/periods/[id]/replace-template/route.ts →
app/api/budget/periods/[id]/reset/route.ts
```

### Faza 4 — Subscriptions
```
subscriptions.types.ts → subscriptions.schema.ts → subscriptions.repository.ts →
subscriptions.service.ts → app/api/subscriptions/ →
app/api/subscriptions/process-due/route.ts
```

### Faza 5 — Obligations (Recurring)
```
obligations.types.ts → obligations.schema.ts → obligations.repository.ts →
obligations.service.ts → app/api/recurring/
```

### Faza 6 — UI
```
budget.ui.tsx → subscriptions.ui.tsx → obligations.ui.tsx
```

## Kluczowa operacja: createPeriod

To najważniejsza metoda w całym module. Musi w jednej transakcji:
1. Sprawdzić czy miesiąc istnieje (→ CONFLICT jeśli tak)
2. Pobrać szablon użytkownika (getOrCreateTemplate)
3. Utworzyć BudgetPeriod
4. Skopiować BudgetTemplateIncome → BudgetIncome (planned=amount, actual=null)
5. Skopiować BudgetTemplateExpense → BudgetCategoryPlan
6. Auto-booking subskrypcji z nextBillingDate w tym miesiącu → Transaction (source=SUBSCRIPTION)
7. Generować RecurringPayment dla aktywnych szablonów → status=PENDING, **year+month** (nie periodId)
8. Emit 'budget.period.created'

Użyj prisma.$transaction() dla kroków 3-7 — atomowość obowiązkowa.

Okresy można tworzyć dla dowolnego miesiąca (przeszłego lub przyszłego) — brak ograniczenia.

## Kluczowa operacja: confirmPayment (zaktualizowana v1.1)

Sygnatura: `POST /api/recurring/[id]/confirm?year=Y&month=M`
- `[id]` to id **RecurringPayment** (nie templateId)
- `year` i `month` przekazywane jako **query params** (nie w body)
- `periodId` NIE jest wymagany w body

Musi w jednej transakcji (prisma.$transaction):
1. Pobrać RecurringPayment WHERE { id, userId } — sprawdź ownership
2. Jeśli status=CONFIRMED → throw CONFLICT
3. Zaktualizować RecurringPayment: status=CONFIRMED, confirmedAt=now, amount=podana
4. Sprawdzić czy BudgetPeriod istnieje dla (userId, year, month):
   - TAK → utwórz Transaction (source=RECURRING, sourceId=templateId),
     ustaw RecurringPayment.transactionId i periodId
   - NIE → tylko oznacz CONFIRMED, transactionId i periodId pozostają null
5. Emit 'recurring.payment.confirmed'

## Kluczowa operacja: getMonthView (zastępuje getPending)

`obligationService.getMonthView(userId, year, month)` to główny entry point dla zobowiązań.

Wykonuje **auto-sync**: dla każdego aktywnego RecurringTemplate tworzy RecurringPayment
dla podanego roku/miesiąca jeśli jeszcze nie istnieje (idempotent upsert).
Działa niezależnie od tego czy BudgetPeriod dla tego miesiąca istnieje.

Używany przez `GET /api/recurring/pending?year=Y&month=M`.

## Kluczowa operacja: processDue (subscriptions)

`subscriptionService.processDue(userId)` — zaksięguj przeterminowane subskrypcje.

Dla każdej aktywnej subskrypcji gdzie `nextBillingDate <= today`:
1. Przejdź przez wszystkie pominięte cykle (może być kilka jeśli użytkownik nie zaglądał)
2. Idempotent: sprawdź czy transakcja z `sourceId=sub.id` dla danej daty już istnieje
3. Jeśli nie → znajdź lub utwórz BudgetPeriod, utwórz Transaction
4. Przesuń `nextBillingDate` do następnego cyklu
5. Zwróć `{ processed, booked }`

## Obliczanie summary — bez N+1

Repository pobiera period z include:
```ts
prisma.budgetPeriod.findFirst({
  where: { id, userId },
  include: {
    incomes: true,
    categoryPlans: true,
    transactions: { where: { deletedAt: null } },
  }
})
```
Service przelicza sumy w pamięci — zero dodatkowych zapytań.
Kategorie do `byCategory` pobrane wcześniej z `categoryRepository.getAll()` — nie hardcoded.

## Checklist przed każdym commitem

```
□ npx tsc --noEmit — zero błędów TypeScript
□ Brak any w żadnym pliku
□ Każdy endpoint: requireAuth → validate → service → apiSuccess/apiError
□ Każde repository query: where: { ..., userId }
□ Każde listing query: where: { deletedAt: null }
□ Kwoty jako string w response
□ Daty jako ISO string w response
□ Rate limit na mutujących endpointach
□ RLS policy na każdej nowej tabeli
□ category pola jako String (slug), nie enum Prisma
□ RecurringPayment: year+month w unique constraint, periodId opcjonalne
□ confirmPayment: year+month z query params, nie body
```

## Pliki do sprawdzenia przy debugowaniu

- `lib/prisma.ts` — singleton client
- `lib/auth.ts` — requireAuth()
- `lib/api-response.ts` — apiSuccess(), apiError()
- `lib/event-emitter.ts` — emit()
- `lib/rate-limit.ts` — withRateLimit()
- `types/common.types.ts` — AppError, ErrorCode
