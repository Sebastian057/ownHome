import { requireAuth } from '@/lib/auth';
import { apiSuccess, apiError } from '@/lib/api-response';
import { withRateLimit } from '@/lib/rate-limit';
import { AppError } from '@/types/common.types';
import { createUserSchema, updateRoleSchema } from './module.schema';
import { adminService } from './module.service';
import type { NextRequest } from 'next/server';

export async function handleGetUsers() {
  try {
    const session = await requireAuth();
    const users = await adminService.getUsers(session.userId);
    return apiSuccess(users);
  } catch (err) {
    if (err instanceof AppError) {
      if (err.code === 'UNAUTHORIZED') return apiError('UNAUTHORIZED', 401);
      if (err.code === 'FORBIDDEN') return apiError('FORBIDDEN', 403);
      return apiError(err.code, 400);
    }
    throw err;
  }
}

export async function handleCreateUser(req: NextRequest) {
  try {
    const session = await requireAuth();
    return withRateLimit(session.userId, async () => {
      const body: unknown = await req.json();
      const validated = createUserSchema.safeParse(body);
      if (!validated.success) return apiError('VALIDATION_ERROR', 400, validated.error);

      const user = await adminService.createUser(validated.data, session.userId);
      return apiSuccess(user, 201);
    });
  } catch (err) {
    if (err instanceof AppError) {
      if (err.code === 'UNAUTHORIZED') return apiError('UNAUTHORIZED', 401);
      if (err.code === 'FORBIDDEN') return apiError('FORBIDDEN', 403);
      if (err.code === 'CONFLICT') return apiError('CONFLICT', 409);
      return apiError(err.code, 400);
    }
    throw err;
  }
}

export async function handleUpdateRole(req: NextRequest, userId: string) {
  try {
    const session = await requireAuth();
    return withRateLimit(session.userId, async () => {
      const body: unknown = await req.json();
      const validated = updateRoleSchema.safeParse(body);
      if (!validated.success) return apiError('VALIDATION_ERROR', 400, validated.error);

      const user = await adminService.updateRole(userId, validated.data, session.userId);
      return apiSuccess(user);
    });
  } catch (err) {
    if (err instanceof AppError) {
      if (err.code === 'UNAUTHORIZED') return apiError('UNAUTHORIZED', 401);
      if (err.code === 'FORBIDDEN') return apiError('FORBIDDEN', 403);
      if (err.code === 'NOT_FOUND') return apiError('NOT_FOUND', 404);
      return apiError(err.code, 400);
    }
    throw err;
  }
}

export async function handleDeleteUser(req: NextRequest, userId: string) {
  try {
    const session = await requireAuth();
    return withRateLimit(session.userId, async () => {
      await adminService.deleteUser(userId, session.userId);
      return apiSuccess({ success: true });
    });
  } catch (err) {
    if (err instanceof AppError) {
      if (err.code === 'UNAUTHORIZED') return apiError('UNAUTHORIZED', 401);
      if (err.code === 'FORBIDDEN') return apiError('FORBIDDEN', 403);
      if (err.code === 'NOT_FOUND') return apiError('NOT_FOUND', 404);
      return apiError(err.code, 400);
    }
    throw err;
  }
}
