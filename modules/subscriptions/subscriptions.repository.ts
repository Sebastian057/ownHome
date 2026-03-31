import { prisma } from '@/lib/prisma'
import type { BillingCycle } from '@prisma/client'
import type { CreateSubscriptionDto, UpdateSubscriptionDto } from './subscriptions.types'

export const subscriptionRepository = {
  async getMany(userId: string, filters: { active?: boolean; upcomingDays?: number }) {
    const now = new Date()
    const where: import('@prisma/client').Prisma.SubscriptionWhereInput = {
      deletedAt: null,
    }

    if (filters.active !== undefined) where.isActive = filters.active

    if (filters.upcomingDays !== undefined) {
      const cutoff = new Date(now.getTime() + filters.upcomingDays * 24 * 60 * 60 * 1000)
      where.nextBillingDate = { lte: cutoff }
    }

    return prisma.subscription.findMany({
      where,
      orderBy: { nextBillingDate: 'asc' },
    })
  },

  async getById(id: string, userId: string) {
    return prisma.subscription.findFirst({
      where: { id, deletedAt: null },
    })
  },

  async create(data: CreateSubscriptionDto, userId: string) {
    return prisma.subscription.create({
      data: {
        userId,
        name: data.name,
        amount: data.amount,
        currency: data.currency ?? 'PLN',
        category: data.category,
        billingCycle: data.billingCycle as BillingCycle,
        billingDay: data.billingDay,
        nextBillingDate: new Date(data.nextBillingDate),
        trialEndsAt: data.trialEndsAt ? new Date(data.trialEndsAt) : null,
        notes: data.notes ?? null,
      },
    })
  },

  async update(id: string, userId: string, data: UpdateSubscriptionDto) {
    const updateData: Parameters<typeof prisma.subscription.updateMany>[0]['data'] = {}
    if (data.name !== undefined) updateData.name = data.name
    if (data.amount !== undefined) updateData.amount = data.amount
    if (data.currency !== undefined) updateData.currency = data.currency
    if (data.category !== undefined) updateData.category = data.category
    if (data.billingCycle !== undefined) updateData.billingCycle = data.billingCycle as BillingCycle
    if (data.billingDay !== undefined) updateData.billingDay = data.billingDay
    if (data.nextBillingDate !== undefined) updateData.nextBillingDate = new Date(data.nextBillingDate)
    if (data.trialEndsAt !== undefined) updateData.trialEndsAt = data.trialEndsAt ? new Date(data.trialEndsAt) : null
    if (data.notes !== undefined) updateData.notes = data.notes
    if (data.isActive !== undefined) updateData.isActive = data.isActive

    const rows = await prisma.subscription.updateMany({
      where: { id, deletedAt: null },
      data: updateData,
    })
    if (rows.count === 0) return null
    return prisma.subscription.findFirst({ where: { id } })
  },

  async softDelete(id: string, userId: string) {
    return prisma.subscription.updateMany({
      where: { id, deletedAt: null },
      data: { deletedAt: new Date(), isActive: false },
    })
  },

  // Used by budget.service during period creation
  async getActiveForPeriod(userId: string, periodStart: Date, periodEnd: Date) {
    return prisma.subscription.findMany({
      where: {
        deletedAt: null,
        isActive: true,
        nextBillingDate: { gte: periodStart, lte: periodEnd },
      },
    })
  },

  async updateNextBillingDate(id: string, userId: string, nextDate: Date) {
    return prisma.subscription.updateMany({
      where: { id },
      data: { nextBillingDate: nextDate },
    })
  },

  // Returns all active subscriptions whose nextBillingDate is on or before `asOf`
  async getDueSubscriptions(userId: string, asOf: Date) {
    return prisma.subscription.findMany({
      where: {
        deletedAt: null,
        isActive: true,
        nextBillingDate: { lte: asOf },
      },
    })
  },
}
