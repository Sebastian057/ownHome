import type { z } from 'zod';
import type { createUserSchema, updateRoleSchema } from './module.schema';

export interface AdminUserView {
  id: string;
  userId: string;
  // Dane z Supabase Auth
  fullName: string | null;
  email: string | null;
  // Dane aplikacji
  phone: string | null;
  role: string;
  createdAt: Date;
}

export type CreateUserDto = z.infer<typeof createUserSchema>;
export type UpdateRoleDto = z.infer<typeof updateRoleSchema>;
