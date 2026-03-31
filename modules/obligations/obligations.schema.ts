import { z } from 'zod'

const billingCycleEnum = z.enum(['WEEKLY', 'MONTHLY', 'BIMONTHLY', 'QUARTERLY', 'YEARLY'])

export const createRecurringTemplateSchema = z.object({
  name: z.string().trim().min(1).max(200),
  defaultAmount: z.number().positive(),
  currency: z.string().length(3).default('PLN'),
  category: z.string().trim().min(1).max(50),
  billingCycle: billingCycleEnum.default('MONTHLY'),
  billingDay: z.number().int().min(1).max(28),
  notes: z.string().trim().max(500).nullable().optional(),
})

export const updateRecurringTemplateSchema = createRecurringTemplateSchema
  .partial()
  .extend({ isActive: z.boolean().optional() })

// periodId is now optional — system auto-finds/creates period on confirm
export const confirmPaymentSchema = z.object({
  amount: z.number().positive().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
})

export const skipPaymentSchema = z.object({
  year: z.number().int().min(2020).max(2100),
  month: z.number().int().min(1).max(12),
})

export const pendingQuerySchema = z.object({
  year: z.coerce.number().int().min(2020).max(2100),
  month: z.coerce.number().int().min(1).max(12),
})
