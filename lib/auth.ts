import { createSupabaseServerClient } from '@/lib/supabase-server';
import { AppError } from '@/types/common.types';

export interface Session {
  userId: string;
  email: string;
}

export async function getSession(): Promise<Session | null> {
  const supabase = await createSupabaseServerClient();

  // getUser() authenticates against Supabase Auth server — safe for server-side use
  // getSession() reads from cookies without verifying — insecure on server
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) return null;

  return {
    userId: user.id,
    email: user.email ?? '',
  };
}

export async function requireAuth(): Promise<Session> {
  const session = await getSession();
  if (!session) throw new AppError('UNAUTHORIZED');
  return session;
}
