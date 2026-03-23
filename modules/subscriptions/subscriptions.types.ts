import type { BillingCycle } from '@prisma/client'
import type { z } from 'zod'
import type { createSubscriptionSchema, updateSubscriptionSchema } from './subscriptions.schema'

// BudgetCategory jest teraz string (dynamiczne kategorie z DB)
export type BudgetCategory = string
export type { BillingCycle }

export type CreateSubscriptionDto = z.infer<typeof createSubscriptionSchema>
export type UpdateSubscriptionDto = z.infer<typeof updateSubscriptionSchema>

export const BILLING_CYCLE_LABELS: Record<BillingCycle, string> = {
  WEEKLY: 'Co tydzień',
  MONTHLY: 'Co miesiąc',
  BIMONTHLY: 'Co 2 miesiące',
  QUARTERLY: 'Co kwartał',
  YEARLY: 'Co rok',
}

export interface SubscriptionListItem {
  id: string
  name: string
  amount: string
  currency: string
  category: string
  billingCycle: BillingCycle
  billingDay: number
  nextBillingDate: string
  isActive: boolean
  trialEndsAt: string | null
  notes: string | null
  daysUntilBilling: number
}
