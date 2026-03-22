import { requireAuth } from '@/lib/auth';
import { apiSuccess, apiError } from '@/lib/api-response';
import { withRateLimit } from '@/lib/rate-limit';
import { AppError } from '@/types/common.types';
import { updateProfileSchema, changePasswordSchema } from './module.schema';
import { profileService } from './module.service';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import type { NextRequest } from 'next/server';

export async function handleGetProfile() {
  try {
    const session = await requireAuth();
    const profile = await profileService.getOrCreate(session.userId);
    return apiSuccess(profile);
  } catch (err) {
    if (err instanceof AppError) {
      if (err.code === 'UNAUTHORIZED') return apiError('UNAUTHORIZED', 401);
      return apiError(err.code, 400);
    }
    throw err;
  }
}

export async function handleUpdateProfile(req: NextRequest) {
  try {
    const session = await requireAuth();
    return withRateLimit(session.userId, async () => {
      const body: unknown = await req.json();
      const validated = updateProfileSchema.safeParse(body);
      if (!validated.success) return apiError('VALIDATION_ERROR', 400, validated.error);

      const profile = await profileService.update(session.userId, validated.data);
      return apiSuccess(profile);
    });
  } catch (err) {
    if (err instanceof AppError) {
      if (err.code === 'UNAUTHORIZED') return apiError('UNAUTHORIZED', 401);
      return apiError(err.code, 400);
    }
    throw err;
  }
}

export async function handleChangePassword(req: NextRequest) {
  try {
    const session = await requireAuth();
    return withRateLimit(session.userId, async () => {
      const body: unknown = await req.json();
      const validated = changePasswordSchema.safeParse(body);
      if (!validated.success) return apiError('VALIDATION_ERROR', 400, validated.error);

      const supabase = await createSupabaseServerClient();
      const { error } = await supabase.auth.updateUser({
        password: validated.data.newPassword,
      });

      if (error) return apiError('INTERNAL_ERROR', 500, error.message);

      return apiSuccess({ success: true });
    });
  } catch (err) {
    if (err instanceof AppError) {
      if (err.code === 'UNAUTHORIZED') return apiError('UNAUTHORIZED', 401);
      return apiError(err.code, 400);
    }
    throw err;
  }
}
