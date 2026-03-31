---
name: ownhome-mobile
description: >
  Wzorce i zasady dla aplikacji mobilnej OwnHome (Expo + React Native).
  Triggerowany przy pracy z plikami w apps/mobile/, packages/api-client/,
  packages/schemas/, packages/types/. Zawiera auth flow, wzorzec hookowy
  TanStack Query, nawigację Expo Router, NativeWind, push notifications
  i upload plików. Używaj przy każdej zmianie w kodzie mobilnym.
---

# OwnHome Mobile — wzorce i zasady

Aplikacja mobilna OwnHome to **Expo (Managed Workflow)** + **Expo Router v4**.
Konsumuje ten sam REST API co web. Typy i schematy Zod współdzielone przez monorepo.

---

## Stack i wersje

```
Expo SDK 53 (Managed Workflow)
├── expo-router v4              ← nawigacja file-based
├── @supabase/supabase-js ^2    ← auth + storage
├── expo-secure-store           ← JWT storage (Keychain iOS / Keystore Android)
├── @tanstack/react-query ^5    ← server state
├── zustand ^5                  ← UI state lokalny
├── NativeWind v4               ← Tailwind w React Native
├── Victory Native XL           ← wykresy (Skia)
├── react-hook-form ^7          ← formularze
├── zod ^4                      ← walidacja (te same schematy co web)
├── expo-notifications          ← push notifications
├── expo-image-picker           ← upload zdjęć
└── expo-document-picker        ← upload plików PDF/doc
```

**Workspace packages (monorepo):**
```
@ownhome/types     ← ApiResponse<T>, DTOs, ErrorCode, PaginationMeta
@ownhome/schemas   ← Zod schematy modułów
@ownhome/api-client ← typowany fetch wrapper
```

---

## Struktura projektu

```
apps/mobile/
├── app/
│   ├── _layout.tsx              ← root: auth guard + QueryClientProvider + ThemeProvider
│   ├── (auth)/
│   │   └── login.tsx
│   └── (tabs)/
│       ├── _layout.tsx          ← bottom tab bar
│       ├── budget/
│       │   ├── index.tsx
│       │   └── [id].tsx
│       ├── vehicles/
│       │   ├── index.tsx
│       │   └── [id]/
│       │       ├── index.tsx
│       │       ├── insurance.tsx
│       │       ├── inspections.tsx
│       │       └── service.tsx
│       ├── subscriptions/
│       │   └── index.tsx
│       ├── obligations/
│       │   └── index.tsx
│       └── profile/
│           └── index.tsx
├── components/                  ← wspólne komponenty UI
├── lib/
│   ├── supabase.ts              ← Supabase client (SecureStore adapter)
│   ├── api.ts                   ← useApi() hook
│   └── query-client.ts          ← QueryClient singleton
├── modules/
│   └── <module>/
│       ├── use<Module>.ts       ← TanStack Query hooks
│       └── components/          ← ekrany i komponenty modułu
└── app.config.ts
```

---

## Auth — obowiązkowy wzorzec

### Supabase client z SecureStore

```typescript
// lib/supabase.ts
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
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  }
);
```

### Auth guard (root layout)

```typescript
// app/_layout.tsx
import { useEffect } from 'react';
import { useRouter, useSegments, Slot } from 'expo-router';
import { supabase } from '@/lib/supabase';

export default function RootLayout() {
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      const inAuthGroup = segments[0] === '(auth)';
      if (!session && !inAuthGroup) {
        router.replace('/(auth)/login');
      } else if (session && inAuthGroup) {
        router.replace('/(tabs)/budget');
      }
    });
    return () => subscription.unsubscribe();
  }, [segments]);

  return <Slot />;
}
```

### Zakazy auth

```
❌ AsyncStorage jako Supabase storage — nieszyfrowany
❌ Ręczne przechowywanie tokenów poza Supabase SDK
❌ detectSessionInUrl: true (mobile nie używa URL sessions)
❌ Wywołania supabase.auth.* poza lib/supabase.ts i auth guard
❌ Hardcoded URL / klucze — tylko EXPO_PUBLIC_* env vars
```

---

## API Client — obowiązkowy wzorzec

```typescript
// lib/api.ts
import { supabase } from './supabase';
import type { ApiResponse } from '@ownhome/types';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL!; // np. https://ownhome.vercel.app

async function apiCall<T>(
  path: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;

  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  if (res.status === 401) {
    // Spróbuj odświeżyć token i ponów raz
    const { data: { session: refreshed } } = await supabase.auth.refreshSession();
    if (!refreshed) throw new Error('UNAUTHORIZED');

    const retry = await fetch(`${BASE_URL}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${refreshed.access_token}`,
        ...options.headers,
      },
    });
    return retry.json() as Promise<ApiResponse<T>>;
  }

  return res.json() as Promise<ApiResponse<T>>;
}

export const api = {
  get: <T>(path: string) => apiCall<T>(path),
  post: <T>(path: string, body: unknown) =>
    apiCall<T>(path, { method: 'POST', body: JSON.stringify(body) }),
  patch: <T>(path: string, body: unknown) =>
    apiCall<T>(path, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: <T>(path: string) => apiCall<T>(path, { method: 'DELETE' }),
};
```

---

## TanStack Query — wzorzec hookowy

Każdy moduł ma plik `use<Module>.ts` z hookami. Brak logiki biznesowej poza hookami.

```typescript
// modules/subscriptions/useSubscriptions.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Subscription, CreateSubscriptionDto } from '@ownhome/types';
import { createSubscriptionSchema } from '@ownhome/schemas';

// Query keys jako stałe (nie inline strings)
export const subscriptionKeys = {
  all: ['subscriptions'] as const,
  detail: (id: string) => ['subscriptions', id] as const,
};

export function useSubscriptions() {
  return useQuery({
    queryKey: subscriptionKeys.all,
    queryFn: () => api.get<Subscription[]>('/api/subscriptions'),
    select: (res) => res.data ?? [],
  });
}

export function useSubscription(id: string) {
  return useQuery({
    queryKey: subscriptionKeys.detail(id),
    queryFn: () => api.get<Subscription>(`/api/subscriptions/${id}`),
    select: (res) => res.data,
  });
}

export function useCreateSubscription() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateSubscriptionDto) =>
      api.post<Subscription>('/api/subscriptions', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: subscriptionKeys.all });
    },
  });
}

export function useDeleteSubscription() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/api/subscriptions/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: subscriptionKeys.all });
    },
  });
}
```

### Zasady TanStack Query

```
✅ Query keys jako stałe obiektu (subscriptionKeys.all, subscriptionKeys.detail(id))
✅ select: (res) => res.data ?? [] — wyciągnij dane z ApiResponse
✅ invalidateQueries po każdej mutacji
✅ onError: (res) => res.error?.message — obsługa błędów API
❌ Bezpośrednie wywołania fetch poza api.ts
❌ useState + useEffect do fetchowania danych (zastąp useQuery)
❌ Inline query keys jako string literals
```

---

## NativeWind — zasady stylowania

NativeWind v4 = Tailwind CSS w React Native. Składnia identyczna jak Tailwind web.

```tsx
// ✅ Poprawnie — NativeWind
<View className="flex-1 bg-background p-4 gap-4">
  <Text className="text-2xl font-semibold text-foreground">Subskrypcje</Text>
  <Text className="text-sm text-muted-foreground">Aktywne subskrypcje</Text>
</View>

// ❌ Błąd — StyleSheet (tylko gdy NativeWind nie obsługuje)
const styles = StyleSheet.create({ container: { flex: 1, padding: 16 } });
```

**Semantic tokeny** — identyczne jak web (fintech blue primary):
```
text-foreground, text-muted-foreground
bg-background, bg-card
text-primary, bg-primary
text-destructive, text-success, text-warning
font-mono (kwoty pieniężne)
```

**Zakazy:**
```
❌ Hardcoded kolory (text-green-500, bg-blue-100) — używaj semantic tokens
❌ StyleSheet.create dla podstawowych układów — użyj NativeWind
❌ Inline style={{ color: '#2549D9' }} — użyj className="text-primary"
```

---

## Formularze — react-hook-form + Zod

Te same schematy Zod co web, importowane z `@ownhome/schemas`.

```typescript
// modules/subscriptions/components/SubscriptionForm.tsx
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createSubscriptionSchema } from '@ownhome/schemas';
import type { CreateSubscriptionDto } from '@ownhome/types';
import { useCreateSubscription } from '../useSubscriptions';

export function SubscriptionForm({ onSuccess }: { onSuccess: () => void }) {
  const { mutateAsync, isPending } = useCreateSubscription();
  const form = useForm<CreateSubscriptionDto>({
    resolver: zodResolver(createSubscriptionSchema),
    defaultValues: { currency: 'PLN', billingCycle: 'monthly' },
  });

  async function onSubmit(data: CreateSubscriptionDto) {
    const res = await mutateAsync(data);
    if (res.error) {
      form.setError('root', { message: res.error.message });
      return;
    }
    onSuccess();
  }

  return (
    <View className="gap-4">
      <Controller
        control={form.control}
        name="name"
        render={({ field, fieldState }) => (
          <View className="gap-1">
            <Text className="text-sm font-medium text-foreground">Nazwa</Text>
            <TextInput
              className={`border rounded-lg px-3 py-2 text-foreground bg-background ${
                fieldState.error ? 'border-destructive' : 'border-border'
              }`}
              onChangeText={field.onChange}
              value={field.value}
              placeholder="np. Spotify"
            />
            {fieldState.error && (
              <Text className="text-sm text-destructive">{fieldState.error.message}</Text>
            )}
          </View>
        )}
      />

      {form.formState.errors.root && (
        <Text className="text-sm text-destructive">{form.formState.errors.root.message}</Text>
      )}

      <Pressable
        onPress={form.handleSubmit(onSubmit)}
        disabled={isPending}
        className="bg-primary rounded-lg py-3 items-center"
      >
        <Text className="text-primary-foreground font-medium">
          {isPending ? 'Zapisuję...' : 'Zapisz'}
        </Text>
      </Pressable>
    </View>
  );
}
```

---

## Push Notifications

### Rejestracja tokenu przy starcie

```typescript
// lib/notifications.ts
import * as Notifications from 'expo-notifications';
import { api } from './api';

export async function registerForPushNotifications() {
  const { status } = await Notifications.requestPermissionsAsync();
  if (status !== 'granted') return;

  const token = await Notifications.getExpoPushTokenAsync({
    projectId: process.env.EXPO_PUBLIC_PROJECT_ID!,
  });

  // Zapisz token na serwerze
  await api.patch('/api/profile/push-token', { expoPushToken: token.data });
}
```

Wywołaj `registerForPushNotifications()` w root `_layout.tsx` po zalogowaniu.

### Obsługa notyfikacji

```typescript
// app/_layout.tsx (fragment)
useEffect(() => {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });

  const sub = Notifications.addNotificationResponseReceivedListener((response) => {
    const data = response.notification.request.content.data;
    // np. router.push(`/(tabs)/${data.module}`)
  });

  return () => sub.remove();
}, []);
```

---

## Upload plików (Supabase Storage)

```typescript
// Zdjęcie pojazdu
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '@/lib/supabase';
import { api } from '@/lib/api';

async function uploadVehiclePhoto(vehicleId: string) {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    quality: 0.8,
  });

  if (result.canceled) return;
  const file = result.assets[0];

  // Pobierz blob
  const response = await fetch(file.uri);
  const blob = await response.blob();
  const filename = `${vehicleId}/${Date.now()}.jpg`;

  // Upload do Supabase Storage
  const { data, error } = await supabase.storage
    .from('vehicle-files')
    .upload(filename, blob, { contentType: 'image/jpeg' });

  if (error) throw error;

  // Zapisz URL przez API (API-first)
  const { data: { publicUrl } } = supabase.storage
    .from('vehicle-files')
    .getPublicUrl(data.path);

  await api.post(`/api/vehicles/${vehicleId}/files`, {
    fileName: file.fileName ?? filename,
    fileUrl: publicUrl,
    mimeType: 'image/jpeg',
    sizeBytes: blob.size,
  });
}
```

---

## Wzorzec ekranu (Screen Pattern)

```tsx
// modules/subscriptions/components/SubscriptionListScreen.tsx
import { FlatList, RefreshControl, View, Text } from 'react-native';
import { useSubscriptions } from '../useSubscriptions';

export function SubscriptionListScreen() {
  const { data: subscriptions, isLoading, isError, refetch, isRefetching } =
    useSubscriptions();

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator />
      </View>
    );
  }

  if (isError) {
    return (
      <View className="flex-1 items-center justify-center gap-2 p-4">
        <Text className="text-destructive text-center">Błąd ładowania danych</Text>
        <Pressable onPress={refetch} className="bg-primary rounded-lg px-4 py-2">
          <Text className="text-primary-foreground">Spróbuj ponownie</Text>
        </Pressable>
      </View>
    );
  }

  if (!subscriptions?.length) {
    return (
      <View className="flex-1 items-center justify-center gap-2 p-4">
        <Text className="text-muted-foreground">Brak subskrypcji</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={subscriptions}
      keyExtractor={(item) => item.id}
      refreshControl={
        <RefreshControl refreshing={isRefetching} onRefresh={refetch} />
      }
      renderItem={({ item }) => <SubscriptionCard subscription={item} />}
      contentContainerClassName="gap-3 p-4"
    />
  );
}
```

### Zasady ekranów

```
✅ FlatList (nie ScrollView + map) dla list — wydajność na mobile
✅ RefreshControl z isRefetching z TanStack Query (pull-to-refresh)
✅ 3 stany zawsze: loading / error / data (+ empty state)
✅ ActivityIndicator dla loading — nie custom spinner
❌ ScrollView + .map() dla długich list
❌ useState + useEffect do fetchowania — użyj useQuery
❌ Brak empty state
❌ Brak pull-to-refresh
```

---

## Zakazy bezwzględne mobile

```
❌ AsyncStorage jako Supabase auth storage — użyj expo-secure-store
❌ Bezpośrednie wywołania fetch poza api.ts — tylko przez api.get/post/patch/delete
❌ Import z modules/*/repository lub modules/*/service — architektura API-first
❌ useState + useEffect do danych serwerowych — użyj useQuery
❌ Hardcoded kolory (bg-green-500) — semantic tokens
❌ ScrollView + map dla list — FlatList
❌ Brak obsługi stanu error i loading
❌ Brak pull-to-refresh na listach
❌ StyleSheet zamiast NativeWind dla podstawowych styli
❌ Supabase storage dla tokenów bezpośrednio — tylko przez SDK
❌ detectSessionInUrl: true — mobile nie używa URL sessions
```
