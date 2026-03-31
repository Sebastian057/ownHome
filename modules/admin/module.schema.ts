import { z } from 'zod';

export const createUserSchema = z.object({
  fullName: z.string().trim().min(1).max(200),
  email: z.string().trim().email().max(300),
  password: z.string().min(6).max(128),
});

export const updateRoleSchema = z.object({
  role: z.enum(['admin', 'user']),
});
