---
name: ownhome-auth
description: >
  Dokumentacja systemu autentykacji OwnHome — Supabase Auth, middleware,
  login/logout flow, forgot password, tworzenie kont przez admina.
  Triggerowany przy pracy z plikami auth, middleware, stronami (auth).
---

# OwnHome — System Autentykacji

## Architektura

Auth oparty na **Supabase Auth** (JWT + refresh tokens). Brak publicznej rejestracji — konta tworzy admin z panelu.

### Kluczowe pliki

| Plik | Rola |
|------|------|
| `lib/supabase-browser.ts` | Klient Supabase do `"use client"` komponentów |
| `lib/supabase-server.ts` | Klient server-side + admin client (service role) |
| `lib/auth.ts` | `getSession()`, `requireAuth()` — używane w API handlerach |
| `middleware.ts` | Ochrona tras — redirect do `/login` gdy brak sesji |
| `app/(auth)/login/page.tsx` | Strona logowania (jedyna publiczna strona) |
| `app/auth/callback/route.ts` | Supabase callback (email confirm, password reset) |
| `app/auth/reset-password/page.tsx` | Formularz nowego hasła po resecie |

---

## Flow logowania

```
User → /login → email + hasło → supabase.auth.signInWithPassword()
  → success: router.push('/') + router.refresh()
  → error: wyświetl "Nieprawidłowy email lub hasło"
```

## Flow forgot password

```
User → /login → "Zapomniałem hasła" → email
  → supabase.auth.resetPasswordForEmail(email, { redirectTo: '/auth/callback?type=recovery' })
  → Supabase wysyła email z linkiem
  → User klika link → /auth/callback?code=...&type=recovery
  → exchangeCodeForSession → redirect /auth/reset-password
  → User ustawia nowe hasło → supabase.auth.updateUser({ password })
```

## Flow tworzenia konta (admin)

```
Admin → /admin/users → "Dodaj użytkownika" → formularz (imię, email, hasło)
  → POST /api/admin/users
  → supabase.auth.admin.createUser({ email, password, email_confirm: true })
  → Tworzy UserProfile w naszej bazie
  → Nowy user może się od razu zalogować
```

Wymaga `SUPABASE_SERVICE_ROLE_KEY` (już w env).

## Flow logout

```
User → sidebar "Wyloguj" → supabase.auth.signOut()
  → router.push('/login') + router.refresh()
  → middleware wykrywa brak sesji → redirect /login
```

## Zmiana hasła (w profilu)

```
User → /profile → sekcja "Zmiana hasła"
  → POST /api/profile/password → supabase.auth.updateUser({ password })
```

---

## Middleware — trasy publiczne/chronione

```ts
// Publiczne (bez sesji):
'/login', '/auth/callback', '/auth/reset-password'

// Chronione (wymagają sesji):
Wszystkie inne trasy → brak sesji = redirect /login
Zalogowany na /login → redirect /
```

---

## Pierwszy admin

Tworzony **ręcznie w Supabase Dashboard**:
1. Supabase → Authentication → Users → "Add user"
2. Podaj email + hasło
3. Po pierwszym logowaniu → `profileService.getOrCreate()` tworzy UserProfile z `role: 'admin'`
   (bo jest pierwszym userem w tabeli `user_profiles`)

---

## Supabase clients — kiedy który

| Client | Gdzie | Kiedy |
|--------|-------|-------|
| `createSupabaseBrowserClient()` | `"use client"` | Login, logout, reset password w UI |
| `createSupabaseServerClient()` | Server Components, Route Handlers, API | Sprawdzanie sesji, auth middleware |
| `createSupabaseAdminClient()` | Route Handlers (admin only) | Tworzenie kont, zarządzanie userami |

**Nigdy** nie używaj admin client po stronie klienta ani w Server Components dostępnych dla zwykłych userów.

---

## Zakazy

| Zakaz | Powód |
|-------|-------|
| Publiczna rejestracja (`/signup`) | Konta tworzy admin |
| `SUPABASE_SERVICE_ROLE_KEY` w kliencie | Security — tylko server-side, admin operations |
| Redirect na `/login` z kodem 403 | Middleware zwraca redirect 307 |
| Sesja przez cookies bez JWT | CLAUDE.md §11: mobile-ready, JWT only |
| Auth logic w komponentach UI | Wyjątek: strony (auth) wywołują Supabase SDK bezpośrednio |
