import type { ZodError } from 'zod';

// ─── API Response ─────────────────────────────────────────────────────────────

export type ErrorCode =
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'VALIDATION_ERROR'
  | 'CONFLICT'
  | 'INTERNAL_ERROR';

export interface ApiError {
  code: ErrorCode;
  message: string;
  details?: unknown;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  hasNext: boolean;
}

export type ApiResponse<T> =
  | { data: T; error: null; meta?: PaginationMeta }
  | { data: null; error: ApiError; meta?: never };

// ─── Event System ─────────────────────────────────────────────────────────────

export interface AppEvent<T = unknown> {
  name: string;
  payload: T;
  userId: string;
  occurredAt: Date;
}

export type EventName =
  | 'transaction.created'
  | 'transaction.deleted'
  | 'vehicle.service.created'
  | 'subscription.created'
  | 'subscription.deleted'
  | 'subscription.billing.due'
  | 'subscription.trial.ending'
  | 'obligation.due_date.approaching'
  | 'calendar.event.reminder'
  | 'budget.period.created'
  | 'budget.period.reset'
  | 'budget.period.replaced_with_template'
  | 'budget.transaction.created'
  | 'budget.category.overspent'
  | 'recurring.payment.due'
  | 'recurring.payment.confirmed'
  | 'subscription.processed';

// ─── App Error ────────────────────────────────────────────────────────────────

export class AppError extends Error {
  constructor(
    public readonly code: ErrorCode,
    message?: string,
    public readonly details?: unknown
  ) {
    super(message ?? code);
    this.name = 'AppError';
  }
}

// Silence unused import warning — ZodError is used by consumers of this module
export type { ZodError };
