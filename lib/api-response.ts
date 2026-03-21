import { NextResponse } from 'next/server';
import type { ApiResponse, ApiError, ErrorCode, PaginationMeta } from '@/types/common.types';

export function apiSuccess<T>(
  data: T,
  status = 200,
  meta?: PaginationMeta
): NextResponse<ApiResponse<T>> {
  return NextResponse.json({ data, error: null, ...(meta && { meta }) }, { status });
}

export function apiError(
  code: ErrorCode,
  status: number,
  details?: unknown
): NextResponse<ApiResponse<never>> {
  const messages: Record<ErrorCode, string> = {
    UNAUTHORIZED: 'Authentication required.',
    FORBIDDEN: 'You do not have permission to perform this action.',
    NOT_FOUND: 'The requested resource was not found.',
    VALIDATION_ERROR: 'The request data is invalid.',
    CONFLICT: 'A resource with this data already exists.',
    INTERNAL_ERROR: 'An unexpected error occurred.',
  };

  const error: ApiError = {
    code,
    message: messages[code],
    ...(details !== undefined && { details }),
  };

  return NextResponse.json({ data: null, error }, { status });
}
