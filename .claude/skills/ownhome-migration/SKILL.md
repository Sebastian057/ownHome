---
name: ownhome-migration
description: Twórz migracje Prisma i polityki RLS dla OwnHome. Użyj tego skilla zawsze
  gdy dodajesz lub modyfikujesz modele Prisma, piszesz SQL migracji, lub konfigurujesz
  Row Level Security w Supabase. Zapobiega pominięciu indeksów i polityk RLS.
---

# OwnHome Migration Skill

## Obowiązkowa kolejność przy każdej migracji

```
1. Dodaj model do prisma/schema.prisma
2. Utwórz plik SQL z RLS w prisma/migrations/
3. npx prisma migrate dev --name <nazwa>
4. npx prisma generate
5. npx tsc --noEmit
```

## Szablon nowego modelu

```prisma
model NazwaModelu {
  id        String   @id @default(cuid())
  userId    String                          // ← ZAWSZE pierwsze pole po id
  // ... pola biznesowe
  deletedAt DateTime?                       // ← dla danych finansowych i assetów
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([userId])                         // ← OBOWIĄZKOWY
  @@index([userId, deletedAt])              // ← jeśli soft delete
  @@index([userId, <pole_sortowania>])      // ← jeśli lista jest sortowana
  @@map("nazwa_tabeli_snake_case")
}
```

## Szablon RLS SQL

```sql
ALTER TABLE nazwa_tabeli ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_own_nazwa_tabeli" ON nazwa_tabeli
  FOR ALL USING (auth.uid()::text = user_id);
```

## Checklist dla każdego nowego modelu

```
□ userId jako String (nie uuid) — Supabase auth.uid() to uuid, castujemy w RLS
□ @@index([userId]) — bez wyjątków
□ @@index na każdym foreignKey
□ @@index na polach używanych w WHERE (date, status, isActive, nextBillingDate)
□ @@map("snake_case") — nazwy tabel lowercase z podkreśleniami
□ deletedAt DateTime? — dla tabel finansowych i assetów
□ onDelete: Cascade na relacjach child → parent
□ RLS ALTER TABLE + CREATE POLICY w pliku SQL
□ npx prisma generate po każdej zmianie schema
```

## Reguły Decimal dla kwot finansowych

```prisma
amount    Decimal @db.Decimal(12, 2)   // max 9 999 999 999.99 — wystarczy
```

Nigdy `Float` dla kwot — błędy zaokrąglania.
W TypeScript `Decimal` z Prisma serializuje do `string` — zwracaj jako string w API.

## Relacje — wzorce

```prisma
// Parent → Children (cascade delete)
model Parent {
  id       String  @id @default(cuid())
  children Child[]
}

model Child {
  id       String @id @default(cuid())
  parentId String
  parent   Parent @relation(fields: [parentId], references: [id], onDelete: Cascade)
  userId   String

  @@index([parentId])
  @@index([userId])
}
```

## Enumy — wzorzec OwnHome

```prisma
enum NazwaEnum {
  WARTOSC_A
  WARTOSC_B
}
// Enumy bez @@map — Prisma generuje je w schema PostgreSQL automatycznie
```

## Migracje produkcyjne — zasady

- Nigdy nie usuwaj kolumn w jednej migracji — najpierw deprecated, potem usuń w kolejnej
- Nigdy nie zmieniaj typu kolumny bezpośrednio — utwórz nową, skopiuj dane, usuń starą
- Dodawanie NOT NULL wymaga DEFAULT lub wypełnienia istniejących rekordów
- Indeksy na dużych tabelach: `CREATE INDEX CONCURRENTLY` (nie blokuje odczytów)
