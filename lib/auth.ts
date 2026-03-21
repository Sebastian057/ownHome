import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { AppError } from '@/types/common.types';

export interface Session {
  userId: string;
  email: string;
}

export async function getSession(): Promise<Session | null> {
  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {}
        },
      },
    }
  );

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.user) return null;

  return {
    userId: session.user.id,
    email: session.user.email ?? '',
  };
}

export async function requireAuth(): Promise<Session> {
  const session = await getSession();
  if (!session) throw new AppError('UNAUTHORIZED');
  return session;
}
