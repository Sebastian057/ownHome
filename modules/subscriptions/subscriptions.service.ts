import { AppError } from '@/types/common.types'
import { eventEmitter } from '@/lib/event-emitter'
import { advanceBillingDate } from '@/lib/billing'
import { subscriptionRepository } from './subscriptions.repository'
import type {
  CreateSubscriptionDto,
  UpdateSubscriptionDto,
  SubscriptionListItem,
} from './subscriptions.types'

function daysUntil(date: Date): number {
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  const target = new Date(date)
  target.setHours(0, 0, 0, 0)
  return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
}

function mapToListItem(sub: {
  id: string; name: string; amount: import('@prisma/client').Prisma.Decimal
  currency: string; category: string
  billingCycle: import('@prisma/client').BillingCycle; billingDay: number
  nextBillingDate: Date; isActive: boolean; trialEndsAt: Date | null; notes: string | null
}): SubscriptionListItem {
  return {
    id: sub.id,
    name: sub.name,
    amount: Number(sub.amount).toFixed(2),
    currency: sub.currency,
    category: sub.category,
    billingCycle: sub.billingCycle,
    billingDay: sub.billingDay,
    nextBillingDate: sub.nextBillingDate.toISOString().slice(0, 10),
    isActive: sub.isActive,
    trialEndsAt: sub.trialEndsAt ? sub.trialEndsAt.toISOString().slice(0, 10) : null,
    notes: sub.notes,
    daysUntilBilling: daysUntil(sub.nextBillingDate),
  }
}

export const subscriptionService = {
  async getMany(
    userId: string,
    filters: { active?: boolean; upcomingDays?: number }
  ): Promise<SubscriptionListItem[]> {
    const subs = await subscriptionRepository.getMany(userId, filters)
    return subs.map(mapToListItem)
  },

  async getById(id: string, userId: string): Promise<SubscriptionListItem> {
    const sub = await subscriptionRepository.getById(id, userId)
    if (!sub) throw new AppError('NOT_FOUND')
    return mapToListItem(sub)
  },

  async create(data: CreateSubscriptionDto, userId: string): Promise<SubscriptionListItem> {
    const sub = await subscriptionRepository.create(data, userId)

    await eventEmitter.emit(
      'subscription.created',
      { subscriptionId: sub.id, name: sub.name, amount: sub.amount.toString(), nextBillingDate: sub.nextBillingDate.toISOString() },
      userId
    )

    // Przypomnienie 3 dni przed pobraniem
    const billingDate = new Date(sub.nextBillingDate)
    const remindAt = new Date(billingDate.getTime() - 3 * 24 * 60 * 60 * 1000)
    await eventEmitter.emit(
      'subscription.billing.due',
      { subscriptionId: sub.id, name: sub.name, amount: sub.amount.toString(), billingDate: sub.nextBillingDate.toISOString() },
      userId,
      remindAt
    )

    if (sub.trialEndsAt) {
      const trialRemindAt = new Date(sub.trialEndsAt.getTime() - 7 * 24 * 60 * 60 * 1000)
      await eventEmitter.emit(
        'subscription.trial.ending',
        { subscriptionId: sub.id, name: sub.name, trialEndsAt: sub.trialEndsAt.toISOString() },
        userId,
        trialRemindAt
      )
    }

    return mapToListItem(sub)
  },

  async update(id: string, userId: string, data: UpdateSubscriptionDto): Promise<SubscriptionListItem> {
    const updated = await subscriptionRepository.update(id, userId, data)
    if (!updated) throw new AppError('NOT_FOUND')
    return mapToListItem(updated)
  },

  async delete(id: string, userId: string): Promise<void> {
    const sub = await subscriptionRepository.getById(id, userId)
    if (!sub) throw new AppError('NOT_FOUND')
    await subscriptionRepository.softDelete(id, userId)
  },

  async processDueSubscriptions(userId: string): Promise<{ processed: number; booked: number }> {
    const today = new Date()
    today.setHours(23, 59, 59, 999)

    const dueSubs = await subscriptionRepository.getDueSubscriptions(userId, today)
    if (dueSubs.length === 0) return { processed: 0, booked: 0 }

    const { budgetRepository } = await import('@/modules/budget/budget.repository')

    let processed = 0
    let booked = 0

    for (const sub of dueSubs) {
      let billingDate = new Date(sub.nextBillingDate)

      // Walk through every missed billing cycle
      while (billingDate <= today) {
        const year = billingDate.getFullYear()
        const month = billingDate.getMonth() + 1

        const period = await budgetRepository.getPeriodByYearMonth(year, month, userId)
        if (period) {
          const existing = await budgetRepository.findTransactionBySource(period.id, sub.id, 'SUBSCRIPTION')
          if (!existing) {
            await budgetRepository.createManyTransactions([{
              periodId: period.id,
              userId,
              date: new Date(billingDate),
              title: sub.name,
              amount: sub.amount,
              category: sub.category,
              source: 'SUBSCRIPTION' as const,
              sourceId: sub.id,
            }])
            booked++
          }
        }

        billingDate = advanceBillingDate(billingDate, sub.billingCycle)
      }

      // Advance nextBillingDate to first future date
      await subscriptionRepository.updateNextBillingDate(sub.id, userId, billingDate)
      processed++
    }

    await eventEmitter.emit('subscription.processed', { processed, booked }, userId)

    return { processed, booked }
  },
}

