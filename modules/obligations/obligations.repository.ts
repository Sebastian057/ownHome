import { prisma } from '@/lib/prisma'
import type { BillingCycle, RecurringStatus, Prisma } from '@prisma/client'
import type { CreateRecurringTemplateDto, UpdateRecurringTemplateDto } from './obligations.types'

export const obligationRepository = {
  // ─── Recurring Templates ──────────────────────────────────────────────────

  async getMany(userId: string) {
    return prisma.recurringTemplate.findMany({
      where: { deletedAt: null },
      orderBy: { billingDay: 'asc' },
    })
  },

  async getById(id: string, userId: string) {
    return prisma.recurringTemplate.findFirst({
      where: { id, deletedAt: null },
    })
  },

  async create(data: CreateRecurringTemplateDto, userId: string) {
    return prisma.recurringTemplate.create({
      data: {
        userId,
        name: data.name,
        defaultAmount: data.defaultAmount,
        currency: data.currency ?? 'PLN',
        category: data.category,
        billingCycle: data.billingCycle as BillingCycle,
        billingDay: data.billingDay,
        notes: data.notes ?? null,
      },
    })
  },

  async update(id: string, userId: string, data: UpdateRecurringTemplateDto) {
    const updateData: Prisma.RecurringTemplateUpdateInput = {}
    if (data.name !== undefined) updateData.name = data.name
    if (data.defaultAmount !== undefined) updateData.defaultAmount = data.defaultAmount
    if (data.currency !== undefined) updateData.currency = data.currency
    if (data.category !== undefined) updateData.category = data.category
    if (data.billingCycle !== undefined) updateData.billingCycle = data.billingCycle as BillingCycle
    if (data.billingDay !== undefined) updateData.billingDay = data.billingDay
    if (data.notes !== undefined) updateData.notes = data.notes
    if (data.isActive !== undefined) updateData.isActive = data.isActive

    const rows = await prisma.recurringTemplate.updateMany({
      where: { id, deletedAt: null },
      data: updateData,
    })
    if (rows.count === 0) return null
    return prisma.recurringTemplate.findFirst({ where: { id } })
  },

  async softDelete(id: string, userId: string) {
    return prisma.recurringTemplate.updateMany({
      where: { id, deletedAt: null },
      data: { deletedAt: new Date(), isActive: false },
    })
  },

  // Used by budget.service during period creation
  async getActiveForPeriod(userId: string) {
    return prisma.recurringTemplate.findMany({
      where: { deletedAt: null, isActive: true },
      orderBy: { billingDay: 'asc' },
    })
  },

  // ─── Recurring Payments ───────────────────────────────────────────────────

  // Returns all payments for a given year/month
  async getPaymentsForMonth(userId: string, year: number, month: number) {
    return prisma.recurringPayment.findMany({
      where: { year, month },
      include: { template: { select: { name: true, category: true, defaultAmount: true, billingDay: true, billingCycle: true } } },
      orderBy: { dueDate: 'asc' },
    })
  },

  // Find single payment for a template in a specific month
  async getPaymentForMonth(templateId: string, userId: string, year: number, month: number) {
    return prisma.recurringPayment.findFirst({
      where: { templateId, year, month },
      include: { template: { select: { name: true, category: true, defaultAmount: true, billingDay: true, billingCycle: true, currency: true } } },
    })
  },

  // Backward-compatible: find by templateId + periodId (for budget.service createPeriod)
  async getPaymentByTemplateAndPeriod(templateId: string, periodId: string, userId: string) {
    return prisma.recurringPayment.findFirst({
      where: { templateId, periodId },
      include: { template: { select: { name: true, category: true, defaultAmount: true } } },
    })
  },

  // Upsert — creates payment record if it doesn't exist for this month yet
  async ensurePaymentForMonth(data: {
    templateId: string
    userId: string
    year: number
    month: number
    dueDate: Date
    amount: Prisma.Decimal | number
  }) {
    return prisma.recurringPayment.upsert({
      where: { templateId_year_month: { templateId: data.templateId, year: data.year, month: data.month } },
      create: {
        templateId: data.templateId,
        userId: data.userId,
        year: data.year,
        month: data.month,
        dueDate: data.dueDate,
        amount: data.amount,
        status: 'PENDING',
      },
      update: {}, // Don't overwrite if already confirmed/skipped
    })
  },

  // Used by budget.service createPeriod (bulk create with periodId)
  async createManyPendingPayments(items: Array<{
    templateId: string
    userId: string
    year: number
    month: number
    periodId: string
    dueDate: Date
    amount: number | Prisma.Decimal
    status: RecurringStatus
  }>) {
    return prisma.$transaction(
      items.map(item =>
        prisma.recurringPayment.upsert({
          where: { templateId_year_month: { templateId: item.templateId, year: item.year, month: item.month } },
          create: item,
          update: { periodId: item.periodId },
        })
      )
    )
  },

  async confirmPayment(
    id: string,
    userId: string,
    update: {
      amount: number | Prisma.Decimal
      confirmedAt: Date
      transactionId: string
      periodId: string
      status: RecurringStatus
    }
  ) {
    return prisma.recurringPayment.updateMany({
      where: { id },
      data: update,
    })
  },

  async skipPayment(id: string, userId: string) {
    return prisma.recurringPayment.updateMany({
      where: { id },
      data: { status: 'SKIPPED' },
    })
  },

  // Revert confirmed payment back to PENDING with default amount
  async unconfirmPayment(id: string, userId: string, defaultAmount: number) {
    return prisma.recurringPayment.updateMany({
      where: { id },
      data: {
        status: 'PENDING',
        confirmedAt: null,
        transactionId: null,
        periodId: null,
        amount: defaultAmount,
      },
    })
  },

  // Legacy: list by periodId (used by budget module)
  async listByPeriodId(periodId: string, userId: string) {
    return prisma.recurringPayment.findMany({
      where: { periodId },
      include: { template: { select: { name: true, category: true } } },
      orderBy: { dueDate: 'asc' },
    })
  },
}
