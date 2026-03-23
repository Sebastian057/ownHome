import type { BillingCycle, RecurringStatus } from '@prisma/client'
import type { z } from 'zod'
import type {
  createRecurringTemplateSchema,
  updateRecurringTemplateSchema,
  confirmPaymentSchema,
  skipPaymentSchema,
} from './obligations.schema'

export type { BillingCycle, RecurringStatus }

export type CreateRecurringTemplateDto = z.infer<typeof createRecurringTemplateSchema>
export type UpdateRecurringTemplateDto = z.infer<typeof updateRecurringTemplateSchema>
export type ConfirmPaymentDto = z.infer<typeof confirmPaymentSchema>
export type SkipPaymentDto = z.infer<typeof skipPaymentSchema>

export interface RecurringTemplateListItem {
  id: string
  name: string
  defaultAmount: string
  currency: string
  category: string
  billingCycle: BillingCycle
  billingDay: number
  isActive: boolean
  notes: string | null
}

// Unified view: obligation + its status for a given month
export interface ObligationMonthItem {
  // Payment record (null if not yet confirmed/created)
  paymentId: string | null
  templateId: string
  name: string
  defaultAmount: string
  currency: string
  category: string
  billingDay: number
  billingCycle: BillingCycle
  dueDate: string        // YYYY-MM-DD
  amount: string         // confirmed amount or defaultAmount
  status: RecurringStatus | 'UNCONFIRMED'  // UNCONFIRMED = template exists but no payment record yet
  confirmedAt: string | null
  notes: string | null
}
