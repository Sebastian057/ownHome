import { z } from 'zod';

export const updateProfileSchema = z.object({
  // Dane w Supabase Auth
  fullName: z.string().trim().min(1).max(200).optional(),
  email: z.string().trim().email().max(300).optional(),
  // Dane aplikacji (user_profiles)
  phone: z.string().trim().max(20).optional(),
  language: z.enum(['pl', 'en']).optional(),
  theme: z.enum(['light', 'dark']).optional(),
});

export const changePasswordSchema = z.object({
  newPassword: z.string().min(6).max(128),
});
