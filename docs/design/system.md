# OwnHome — Design System

> Jedyne źródło prawdy dla decyzji wizualnych.
> Każdy komponent UI musi wynikać z tych reguł — bez odchyleń, bez ad-hoc klas.

---

## 1. Filozofia

**Ton:** Ciepły fintech — nie zimna, korporacyjna aplikacja bankowa, ale też nie playful consumer app.
Użytkownik powierza tej aplikacji dane o swoich finansach, majątku i zobowiązaniach.
Interfejs musi budzić **zaufanie i spokój**, jednocześnie pozostając **przyjazny i osobisty**.

**Zasady projektowe:**
- **Clarity first** — dane finansowe muszą być czytelne, nie dekoracyjne
- **Warmth through restraint** — ciepło przez dobór koloru, nie przez animacje czy ozdobniki
- **Density as context** — gęstość layoutu zależy od modułu (patrz sekcja 7)
- **Dark mode as equal** — nie afterthought; oba motywy projektowane równolegle

---

## 2. Kolory — paleta tokenów

### Strategia

Paleta opiera się na **warm indigo** jako kolorze primary — niebiesko-fioletowy z ciepłą nutą,
który kojarzy się z technologią i zaufaniem, ale nie jest zimny jak czyste `hsl(220, 90%, 50%)`.

Tła i powierzchnie to **ciepłe neutralne** — lekko żółtawe biele (light) i lekko indygowe ciemne (dark).

Kolory semantyczne (success, warning, destructive) są jednoznaczne i dostępne.

### CSS tokeny (globals.css)

| Token | Light | Dark | Zastosowanie |
|-------|-------|------|--------------|
| `--background` | `oklch(0.99 0.004 100)` | `oklch(0.13 0.012 265)` | Tło strony |
| `--foreground` | `oklch(0.15 0.01 265)` | `oklch(0.96 0.004 100)` | Tekst główny |
| `--card` | `oklch(1 0 0)` | `oklch(0.18 0.015 265)` | Powierzchnia kart |
| `--card-foreground` | `oklch(0.15 0.01 265)` | `oklch(0.96 0.004 100)` | Tekst na kartach |
| `--primary` | `oklch(0.46 0.19 268)` | `oklch(0.72 0.15 268)` | Główne akcje, CTA |
| `--primary-foreground` | `oklch(0.99 0 0)` | `oklch(0.13 0.012 265)` | Tekst na primary |
| `--secondary` | `oklch(0.95 0.008 265)` | `oklch(0.23 0.02 265)` | Przyciski drugorzędne, chips |
| `--secondary-foreground` | `oklch(0.35 0.06 268)` | `oklch(0.85 0.05 265)` | Tekst na secondary |
| `--muted` | `oklch(0.95 0.008 265)` | `oklch(0.23 0.02 265)` | Tła sekcji muted |
| `--muted-foreground` | `oklch(0.52 0.03 265)` | `oklch(0.62 0.025 265)` | Tekst pomocniczy |
| `--accent` | `oklch(0.93 0.025 268)` | `oklch(0.28 0.03 265)` | Hover states, aktywne tła |
| `--accent-foreground` | `oklch(0.35 0.06 268)` | `oklch(0.85 0.05 265)` | Tekst na accent |
| `--border` | `oklch(0.90 0.012 265)` | `oklch(1 0 0 / 10%)` | Krawędzie, separatory |
| `--input` | `oklch(0.90 0.012 265)` | `oklch(1 0 0 / 15%)` | Obramowania inputów |
| `--ring` | `oklch(0.46 0.19 268)` | `oklch(0.72 0.15 268)` | Focus ring |
| `--destructive` | `oklch(0.577 0.245 27.325)` | `oklch(0.704 0.191 22.216)` | Błędy, usuwanie |
| `--success` | `oklch(0.58 0.16 145)` | `oklch(0.72 0.14 145)` | Przychody, potwierdzenia |
| `--success-foreground` | `oklch(0.99 0 0)` | `oklch(0.13 0 0)` | Tekst na success |
| `--warning` | `oklch(0.72 0.15 75)` | `oklch(0.82 0.14 80)` | Zbliżające się płatności, ostrzeżenia |
| `--warning-foreground` | `oklch(0.20 0.05 75)` | `oklch(0.15 0.04 75)` | Tekst na warning |

### Sidebar

| Token | Light | Dark |
|-------|-------|------|
| `--sidebar` | `oklch(0.97 0.006 265)` | `oklch(0.17 0.018 265)` |
| `--sidebar-foreground` | `oklch(0.35 0.06 268)` | `oklch(0.85 0.05 265)` |
| `--sidebar-primary` | `oklch(0.46 0.19 268)` | `oklch(0.72 0.15 268)` |
| `--sidebar-primary-foreground` | `oklch(0.99 0 0)` | `oklch(0.13 0.012 265)` |
| `--sidebar-accent` | `oklch(0.93 0.025 268)` | `oklch(0.25 0.028 265)` |
| `--sidebar-accent-foreground` | `oklch(0.35 0.06 268)` | `oklch(0.85 0.05 265)` |
| `--sidebar-border` | `oklch(0.90 0.012 265)` | `oklch(1 0 0 / 10%)` |
| `--sidebar-ring` | `oklch(0.46 0.19 268)` | `oklch(0.72 0.15 268)` |

### Tokeny niestandardowe (Tailwind)

Dostępne przez klasy `bg-success`, `text-success-foreground`, `bg-warning`, `text-warning-foreground`:

```ts
// tailwind.config.ts
colors: {
  success: 'oklch(var(--success) / <alpha-value>)',
  'success-foreground': 'oklch(var(--success-foreground) / <alpha-value>)',
  warning: 'oklch(var(--warning) / <alpha-value>)',
  'warning-foreground': 'oklch(var(--warning-foreground) / <alpha-value>)',
}
```

---

## 3. Typografia

Font: **Geist** (już skonfigurowany w `layout.tsx` przez `next/font/google`)

| Rola | Klasa Tailwind | Opis |
|------|----------------|------|
| Nagłówki stron | `text-2xl font-semibold` | H1 modułu (np. "Subskrypcje") |
| Nagłówki sekcji | `text-lg font-semibold` | CardTitle, sekcje |
| Nagłówki tabel | `text-sm font-medium` | TableHead |
| Tekst główny | `text-sm` | Treść komórek, formularzy |
| Tekst pomocniczy | `text-sm text-muted-foreground` | Opisy, daty, metadane |
| Kwoty pieniężne | `text-sm font-mono font-medium` | Konsekwentnie monospace dla liczb |
| Mikrotekst | `text-xs text-muted-foreground` | Labels, tooltips |

**Reguła kwot:** Zawsze `font-mono` dla wartości finansowych — wyrównuje cyfry w kolumnach.

---

## 4. Zaokrąglenia (Border Radius)

`--radius: 0.5rem` (8px) — umiarkowane. Nie za kwadratowe (fintech minimalism), nie za okrągłe (consumer app).

| Komponent | Klasa |
|-----------|-------|
| Karty, modale | `rounded-lg` (= `--radius`) |
| Przyciski, inputy | `rounded-md` (= `--radius * 0.75`) |
| Badges | `rounded-full` |
| Avatary | `rounded-full` |
| Małe elementy (chips, tagi) | `rounded-sm` |

Shadcn komponenty dziedziczą `--radius` automatycznie — nie nadpisuj.

---

## 5. Cienie

| Klasa | Zastosowanie |
|-------|--------------|
| `shadow-sm` | Karty na białym tle |
| `shadow-md` | Dropdown, floating elements |
| brak | Karty na kolorowych tłach, inline elements |

W dark mode cienie są mniej widoczne — komponenty oddzielone przez `border` zamiast cienia.

---

## 6. Ikony

Biblioteka: **lucide-react** (skonfigurowana przez shadcn)

Rozmiar zarządzany przez komponent rodzica (shadcn CSS) — **nie dodawaj `w-4 h-4`** na ikonach.
Wyjątek: standalone ikony poza komponentami shadcn — `w-4 h-4` dozwolone.

Ikony inline w przyciskach i nagłówkach: `data-icon="inline-start"` (shadcn konwencja).

```tsx
// ✅ Poprawnie
<Button>
  <PlusIcon data-icon="inline-start" />
  Dodaj
</Button>

// ❌ Błąd
<Button>
  <PlusIcon className="w-4 h-4 mr-2" />
  Dodaj
</Button>
```

---

## 7. Gęstość layoutu per moduł

| Moduł | Gęstość | Uzasadnienie |
|-------|---------|--------------|
| `budget` | Dense | Dużo wierszy transakcji, priorytet danych |
| `subscriptions` | Balanced | Nieduża lista, więcej białej przestrzeni |
| `obligations` | Dense | Tabele harmonogramów spłat |
| `vehicles` | Spacious | Mało rekordów, emphasis na detalach |
| `calendar` | Balanced | Widok kalendarza dyktuje layout |

**Balanced (domyślny):**
```tsx
<div className="flex flex-col gap-6 p-6">
  <Card>
    <CardHeader className="pb-4">...</CardHeader>
    <CardContent>...</CardContent>
  </Card>
</div>
```

**Dense:**
```tsx
<div className="flex flex-col gap-4 p-4">
  <Card>
    <CardHeader className="py-3 px-4">...</CardHeader>
    <CardContent className="p-0">  {/* Tabela bez wewnętrznego paddingu */}
      <Table>...</Table>
    </CardContent>
  </Card>
</div>
```

**Spacious:**
```tsx
<div className="flex flex-col gap-8 p-8">
  <Card>
    <CardHeader className="pb-6">...</CardHeader>
    <CardContent className="space-y-0 gap-6 flex flex-col">...</CardContent>
  </Card>
</div>
```

---

## 8. Stany semantyczne

### Badge variants dla statusów

| Status | Variant | Przykład |
|--------|---------|---------|
| Aktywny, opłacony | `default` | "Aktywna", "Opłacone" |
| Oczekujący, miesięczny | `secondary` | "Miesięczny", "Oczekuje" |
| Zbliżający się termin | `warning` (custom) | "Płatność za 3 dni" |
| Przeterminowany | `destructive` | "Przeterminowane" |
| Sukces, przychód | `success` (custom) | "Wpłynęło" |

**Nigdy** raw kolory: `text-green-500`, `bg-red-100`, `text-amber-600` — zawsze semantic tokens.

### Wartości finansowe

```tsx
// Przychód (positive)
<span className="text-success font-mono font-medium">+500,00 PLN</span>

// Wydatek (negative)
<span className="text-destructive font-mono font-medium">-99,90 PLN</span>

// Neutralna kwota
<span className="font-mono font-medium">199,00 PLN</span>
```

---

## 9. Formularze

### Układ

Wszystkie formularze: `flex flex-col gap-4` (nie `space-y-4`).

### Walidacja

Błędy pól: automatycznie przez `FormMessage` (shadcn `Form` + zodResolver).
Błąd globalny formularza: `form.setError('root', ...)` → wyświetlony w `Alert` przed przyciskiem submit.

### Submit button

```tsx
<Button type="submit" disabled={form.formState.isSubmitting}>
  {form.formState.isSubmitting && <Spinner data-icon="inline-start" />}
  Zapisz
</Button>
```

---

## 10. Dark mode

### Implementacja

Next.js + `next-themes` (do zainstalowania przed implementacją UI):

```bash
npm install next-themes
```

Provider w `app/layout.tsx`:
```tsx
import { ThemeProvider } from 'next-themes';
// ...
<ThemeProvider attribute="class" defaultTheme="light" enableSystem>
  {children}
</ThemeProvider>
```

Klasa `dark` na `<html>` aktywuje tokeny `.dark { ... }` z `globals.css`.

### Toggle

Komponent `ThemeToggle` w nawigacji — przełącza między `light` / `dark` / `system`.

---

## 11. Dostępność

- Kontrast minimum **4.5:1** dla tekstu głównego (WCAG AA)
- `primary` na białym tle spełnia AA (oklch 0.46 jest wystarczająco ciemne)
- Focus ring: `--ring` = primary color — widoczny w obu trybach
- Formularze: zawsze `FormLabel` + `FormMessage` (shadcn form obsługuje `aria-*` automatycznie)
- Dialogi: zawsze `DialogTitle` + `DialogDescription` (wymagane dla screen readerów)

---

## 12. Czego NIE robić

```
❌ text-green-500, bg-blue-100, text-amber-600  → użyj semantic tokens
❌ dark:bg-gray-900, dark:text-white             → dark mode obsługuje .dark { }
❌ animate-pulse na divie                        → użyj <Skeleton>
❌ custom styled div dla błędu                   → użyj <Alert>
❌ custom styled span dla statusu                → użyj <Badge>
❌ z-50 na overlay                               → Dialog/Sheet/Popover zarządzają stackingiem
❌ space-y-4, space-x-2                          → użyj gap-4, gap-2
❌ w-4 h-4 na ikonach w komponentach shadcn      → komponenty zarządzają rozmiarem
```
