---
name: ownhome-backend
description: >
  Generuje kompletny backend nowego modułu OwnHome — wszystkie 5 plików
  backendowych (types, schema, repository, service, api) + migracja Prisma
  + RLS SQL — ściśle według architektury z CLAUDE.md.
  Używaj gdy dodajesz nowy moduł: budget, calendar, vehicles, subscriptions, obligations.
---

# OwnHome — Backend Module Generator

Generuj pliki **w tej kolejności**. Każdy krok musi kompilować się przed przejściem do następnego.

## Przed rozpoczęciem

Ustal nazwę modułu (np. `subscriptions`) i encję główną (np. `Subscription`).
Przeczytaj `CLAUDE.md` sekcje 2–6 jeśli potrzebujesz przypomnienia architektury.

---

## Krok 1 — Prisma model

Dodaj model do `prisma/schema.prisma`.

Obowiązkowe elementy:
- `id String @id @default(cuid())`
- `userId String` — zawsze, bez wyjątków
- `createdAt DateTime @default(now())`
- `updatedAt DateTime @updatedAt`
- `deletedAt DateTime?` — dla modułów finansowych i asset (vehicles, subscriptions, obligations, budget)
- `@map("snake_case_field")` na każdym polu camelCase
- `@@map("snake_case_table")` na modelu
- `@@index([userId])` — obowiązkowy
- `@@index([userId, createdAt])` — jeśli używasz sortowania

```prisma
model Subscription {
  id              String    @id @default(cuid())
  userId          String    @map("user_id")
  name            String
  amount          Decimal   @db.Decimal(10, 2)
  currency        String    @db.Char(3)
  billingCycle    String    @map("billing_cycle")
  nextBillingDate DateTime  @map("next_billing_date")
  deletedAt       DateTime? @map("deleted_at")
  createdAt       DateTime  @default(now()) @map("created_at")
  updatedAt       DateTime  @updatedAt @map("updated_at")

  @@index([userId])
  @@index([userId, nextBillingDate])
  @@map("subscriptions")
}
```

Po dodaniu modelu: `npx prisma db push`

---

## Krok 2 — RLS migration SQL

Utwórz `prisma/migrations/<module>_rls/migration.sql`:

```sql
ALTER TABLE <table_name> ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_own_<table_name>" ON <table_name>
  FOR ALL USING (auth.uid()::text = user_id);
```

Zastąp `user_id` dokładną snake_case nazwą kolumny z `@map`.
Następnie: `npx prisma db execute --file prisma/migrations/<module>_rls/migration.sql --schema prisma/schema.prisma`

---

## Krok 3 — `modules/<name>/module.types.ts`

- Interfejs główny encji (pola z modelu Prisma, typy TypeScript)
- Typy DTO inferowane z Zod: `type CreateXDto = z.infer<typeof createXSchema>`
- Zakaz `any` — bezwzględny
- Zakaz ręcznego deklarowania typów które Prisma już generuje

```ts
import type { z } from 'zod';
import type { createSubscriptionSchema, updateSubscriptionSchema } from './module.schema';

export interface Subscription {
  id: string;
  userId: string;
  name: string;
  amount: number;
  currency: string;
  billingCycle: BillingCycle;
  nextBillingDate: Date;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export type BillingCycle = 'monthly' | 'yearly' | 'weekly';
export type CreateSubscriptionDto = z.infer<typeof createSubscriptionSchema>;
export type UpdateSubscriptionDto = z.infer<typeof updateSubscriptionSchema>;
```

---

## Krok 4 — `modules/<name>/module.schema.ts`

Schematy Zod do walidacji wejścia w API handlerach.

Reguły:
- `z.string().trim().min(1).max(200)` — zawsze trim i max dla pól tekstowych
- `z.number().positive()` lub `z.coerce.number()` dla kwot
- `z.coerce.date()` dla dat z requestu
- `updateXSchema = createXSchema.partial()` — reużywaj

```ts
import { z } from 'zod';

export const createSubscriptionSchema = z.object({
  name: z.string().trim().min(1).max(200),
  amount: z.number().positive(),
  currency: z.string().trim().length(3),
  billingCycle: z.enum(['monthly', 'yearly', 'weekly']),
  nextBillingDate: z.coerce.date(),
});

export const updateSubscriptionSchema = createSubscriptionSchema.partial();
```

---

## Krok 5 — `modules/<name>/module.repository.ts`

Jedyne miejsce gdzie importujesz `prisma`. Zakaz w każdym innym pliku.

Reguły:
- Każde zapytanie zawiera `userId` w `where` — bez wyjątków (ochrona IDOR)
- Zakaz zapytań w pętlach (N+1) — użyj `include` lub `select`
- Soft delete: `findMany` zawsze filtruje `deletedAt: null`
- Nazwy metod: `getMany`, `getById`, `create`, `update`, `softDelete`

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

---

## Krok 6 — `modules/<name>/module.service.ts`

Logika biznesowa + ownership checks + emitowanie eventów.

Reguły:
- Ownership check przez repository: jeśli `null` → rzuć `new AppError('NOT_FOUND')` (nie `FORBIDDEN`)
- `eventEmitter.emit()` zawsze **po** sukcesie operacji, nigdy przed
- Payload eventu musi być `Prisma.InputJsonObject`
- Zakaz importu Prisma — korzysta wyłącznie z repository

```ts
import { AppError } from '@/types/common.types';
import { eventEmitter } from '@/lib/event-emitter';
import { subscriptionRepository } from './module.repository';
import type { CreateSubscriptionDto, UpdateSubscriptionDto } from './module.types';

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
    await eventEmitter.emit('subscription.created', { subscriptionId: subscription.id }, userId);
    return subscription;
  },

  async update(id: string, data: UpdateSubscriptionDto, userId: string) {
    const sub = await subscriptionRepository.getById(id, userId);
    if (!sub) throw new AppError('NOT_FOUND');
    await subscriptionRepository.update(id, userId, data);
    return subscriptionRepository.getById(id, userId);
  },

  async delete(id: string, userId: string) {
    const sub = await subscriptionRepository.getById(id, userId);
    if (!sub) throw new AppError('NOT_FOUND');
    await subscriptionRepository.softDelete(id, userId);
    await eventEmitter.emit('subscription.deleted', { subscriptionId: id }, userId);
  },
};
```

---

## Krok 7 — `modules/<name>/module.api.ts` + `app/api/<name>/route.ts`

Route Handler: auth → validate → service → response.

Reguły:
- `requireAuth()` jako pierwsze — zwróć `apiError('UNAUTHORIZED', 401)` jeśli brak sesji
- `withRateLimit(session.userId, handler)` na KAŻDEJ mutacji (POST/PUT/PATCH/DELETE)
- Zod `safeParse` przed service — zwróć `apiError('VALIDATION_ERROR', 400, validated.error)` przy błędzie
- `try/catch` z `AppError` → mapuj na odpowiedni kod HTTP
- Nigdy nie importuj Prisma ani repository

```ts
// modules/subscriptions/module.api.ts
import { requireAuth } from '@/lib/auth';
import { apiSuccess, apiError } from '@/lib/api-response';
import { withRateLimit } from '@/lib/rate-limit';
import { AppError } from '@/types/common.types';
import { createSubscriptionSchema } from './module.schema';
import { subscriptionService } from './module.service';
import type { NextRequest } from 'next/server';

export async function handleGetMany(req: NextRequest) {
  const session = await requireAuth();
  const subscriptions = await subscriptionService.getMany(session.userId);
  return apiSuccess(subscriptions);
}

export async function handleCreate(req: NextRequest) {
  const session = await requireAuth();
  return withRateLimit(session.userId, async () => {
    const body = await req.json();
    const validated = createSubscriptionSchema.safeParse(body);
    if (!validated.success) return apiError('VALIDATION_ERROR', 400, validated.error);

    try {
      const subscription = await subscriptionService.create(validated.data, session.userId);
      return apiSuccess(subscription, 201);
    } catch (err) {
      if (err instanceof AppError) return apiError(err.code, 400);
      throw err;
    }
  });
}
```

```ts
// app/api/subscriptions/route.ts
import { handleGetMany, handleCreate } from '@/modules/subscriptions/module.api';
import type { NextRequest } from 'next/server';

export const GET = (req: NextRequest) => handleGetMany(req);
export const POST = (req: NextRequest) => handleCreate(req);
```

---

## Krok 8 — Weryfikacja

```bash
npx tsc --noEmit
```

Musi zwrócić **0 błędów**. Jeśli są błędy — napraw je przed przejściem do UI.

---

## Zakazy bezwzględne (naruszenie = błąd architektoniczny)

- `any` — nigdy
- Import `prisma` poza `*.repository.ts` — nigdy
- Import z repository lub service w `*.api.ts` bezpośrednio do UI — nigdy
- Operacja bez `userId` w `where` — nigdy (IDOR vulnerability)
- Tabela bez RLS policy — nigdy
- Event tylko in-memory (bez `eventEmitter.emit`) — nigdy
- `FORBIDDEN` zamiast `NOT_FOUND` dla nieistniejącego zasobu — nigdy (ujawnia istnienie)
