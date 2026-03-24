import type { BillingCycle } from '@prisma/client'

export function advanceBillingDate(current: Date, cycle: BillingCycle | string): Date {
  const next = new Date(current)
  switch (cycle) {
    case 'WEEKLY':     next.setDate(next.getDate() + 7); break
    case 'MONTHLY':    next.setMonth(next.getMonth() + 1); break
    case 'BIMONTHLY':  next.setMonth(next.getMonth() + 2); break
    case 'QUARTERLY':  next.setMonth(next.getMonth() + 3); break
    case 'YEARLY':     next.setFullYear(next.getFullYear() + 1); break
  }
  return next
}
