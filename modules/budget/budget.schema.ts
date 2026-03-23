import { z } from 'zod'

// Slug kategorii — walidacja po stronie API (nie enum, dynamiczne kategorie z DB)
export const budgetCategorySlugSchema = z.string().trim().min(1).max(50)

export const updateTemplateCurrencySchema = z.object({
  currency: z.string().length(3).toUpperCase(),
})

export const createTemplateIncomeSchema = z.object({
  title: z.string().trim().min(1).max(200),
  amount: z.number().positive(),
  sortOrder: z.number().int().optional().default(0),
})

export const updateTemplateIncomeSchema = createTemplateIncomeSchema.partial()

export const bulkUpdateTemplateExpensesSchema = z.object({
  expenses: z.array(z.object({
    category: budgetCategorySlugSchema,
    amount: z.number().min(0),
  })).min(1).max(200),
})

export const createPeriodSchema = z.object({
  year: z.number().int().min(2020).max(2100),
  month: z.number().int().min(1).max(12),
  carryOverAmount: z.number().min(0).optional().default(0),
})

export const createIncomeSchema = z.object({
  title: z.string().trim().min(1).max(200),
  planned: z.number().positive(),
  actual: z.number().min(0).optional().nullable(),
  sortOrder: z.number().int().optional().default(0),
})

export const updateIncomeSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  planned: z.number().positive().optional(),
  actual: z.number().min(0).nullable().optional(),
})

export const bulkUpdatePlansSchema = z.object({
  plans: z.array(z.object({
    category: budgetCategorySlugSchema,
    planned: z.number().min(0),
  })).min(1).max(200),
})

export const createTransactionSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format daty: YYYY-MM-DD'),
  title: z.string().trim().min(1).max(300),
  amount: z.number().positive(),
  category: budgetCategorySlugSchema,
  tags: z.array(z.string().trim().max(50)).max(5).optional().default([]),
})

export const updateTransactionSchema = createTransactionSchema.partial()

export const annualQuerySchema = z.object({
  year: z.coerce.number().int().min(2020).max(2100),
})

export const periodsQuerySchema = z.object({
  year: z.coerce.number().int().min(2020).max(2100).optional(),
  month: z.coerce.number().int().min(1).max(12).optional(),
})

export const transactionsQuerySchema = z.object({
  category: budgetCategorySlugSchema.optional(),
  source: z.enum(['MANUAL', 'SUBSCRIPTION', 'RECURRING']).optional(),
})

// ─── Budget Category CRUD ────────────────────────────────────────────────────

export const createBudgetCategorySchema = z.object({
  slug: z.string().trim().min(1).max(50).regex(/^[a-z0-9_]+$/, 'Slug może zawierać tylko małe litery, cyfry i _'),
  label: z.string().trim().min(1).max(100),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Kolor musi być w formacie #rrggbb').default('#6b7280'),
  sortOrder: z.number().int().optional().default(0),
})

export const updateBudgetCategorySchema = z.object({
  label: z.string().trim().min(1).max(100).optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Kolor musi być w formacie #rrggbb').optional(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
})
