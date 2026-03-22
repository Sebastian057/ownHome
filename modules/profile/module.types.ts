import type { z } from 'zod';
import type { updateProfileSchema, changePasswordSchema } from './module.schema';

export type Role = 'admin' | 'user';

/**
 * Widok profilu użytkownika zwracany przez API.
 * Łączy dane z Supabase Auth (fullName, email) z danymi aplikacji (role, theme, itp.).
 */
export interface UserProfile {
  id: string;
  userId: string;
  // Dane z Supabase Auth (auth.users)
  fullName: string | null;
  email: string | null;
  // Dane aplikacji (user_profiles)
  avatarUrl: string | null;
  phone: string | null;
  language: string;
  theme: string;
  role: Role;
  createdAt: Date;
  updatedAt: Date;
}

export type UpdateProfileDto = z.infer<typeof updateProfileSchema>;
export type ChangePasswordDto = z.infer<typeof changePasswordSchema>;
