import { z } from 'zod'

const billingCycleEnum = z.enum(['WEEKLY', 'MONTHLY', 'BIMONTHLY', 'QUARTERLY', 'YEARLY'])

export const createSubscriptionSchema = z.object({
  name: z.string().trim().min(1).max(200),
  amount: z.number().positive(),
  currency: z.string().length(3).default('PLN'),
  category: z.string().trim().min(1).max(50),
  billingCycle: billingCycleEnum,
  billingDay: z.number().int().min(1).max(28),
  nextBillingDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  trialEndsAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  notes: z.string().trim().max(500).nullable().optional(),
})

export const updateSubscriptionSchema = createSubscriptionSchema
  .partial()
  .extend({ isActive: z.boolean().optional() })

export const listSubscriptionsQuerySchema = z.object({
  active: z.enum(['true', 'false']).transform(v => v === 'true').optional(),
  upcoming: z.coerce.number().int().min(1).max(365).optional(),
})
