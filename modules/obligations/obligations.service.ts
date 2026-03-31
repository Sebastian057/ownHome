import { AppError } from '@/types/common.types'
import { eventEmitter } from '@/lib/event-emitter'
import { obligationRepository } from './obligations.repository'
import type {
  CreateRecurringTemplateDto,
  UpdateRecurringTemplateDto,
  ConfirmPaymentDto,
  RecurringTemplateListItem,
  ObligationMonthItem,
} from './obligations.types'

// Calculate due date for a template in a given month
function calcDueDate(year: number, month: number, billingDay: number): Date {
  return new Date(year, month - 1, Math.min(billingDay, 28))
}

// Determines if a BIMONTHLY template fires in the given month.
// Uses createdAt as the reference point — fires every 2 months starting from creation.
function firesThisMonth(
  billingCycle: import('@prisma/client').BillingCycle,
  createdAt: Date,
  year: number,
  month: number
): boolean {
  if (billingCycle !== 'BIMONTHLY') return true
  const startMonth = createdAt.getMonth() + 1 // 1-12
  const startYear = createdAt.getFullYear()
  const monthsDiff = (year - startYear) * 12 + (month - startMonth)
  return monthsDiff % 2 === 0
}

function mapTemplate(t: {
  id: string; name: string; defaultAmount: { toString(): string }; currency: string
  category: string; billingCycle: import('@prisma/client').BillingCycle; billingDay: number
  isActive: boolean; notes: string | null
}): RecurringTemplateListItem {
  return {
    id: t.id,
    name: t.name,
    defaultAmount: Number(t.defaultAmount).toFixed(2),
    currency: t.currency,
    category: t.category,
    billingCycle: t.billingCycle,
    billingDay: t.billingDay,
    isActive: t.isActive,
    notes: t.notes,
  }
}

export const obligationService = {
  // ─── Templates CRUD ───────────────────────────────────────────────────────

  async getMany(userId: string): Promise<RecurringTemplateListItem[]> {
    const templates = await obligationRepository.getMany(userId)
    return templates.map(mapTemplate)
  },

  async getById(id: string, userId: string): Promise<RecurringTemplateListItem> {
    const template = await obligationRepository.getById(id, userId)
    if (!template) throw new AppError('NOT_FOUND')
    return mapTemplate(template)
  },

  async create(data: CreateRecurringTemplateDto, userId: string): Promise<RecurringTemplateListItem> {
    const template = await obligationRepository.create(data, userId)
    await eventEmitter.emit('recurring.payment.due', { templateId: template.id }, userId)
    return mapTemplate(template)
  },

  async update(id: string, userId: string, data: UpdateRecurringTemplateDto): Promise<RecurringTemplateListItem> {
    const updated = await obligationRepository.update(id, userId, data)
    if (!updated) throw new AppError('NOT_FOUND')
    return mapTemplate(updated)
  },

  async delete(id: string, userId: string): Promise<void> {
    const template = await obligationRepository.getById(id, userId)
    if (!template) throw new AppError('NOT_FOUND')
    await obligationRepository.softDelete(id, userId)
  },

  // ─── Month view — the main entry point for the UI ─────────────────────────

  /**
   * Returns unified obligation list for a given month.
   * Auto-creates RecurringPayment records for active templates that don't have one yet.
   * Does NOT require a BudgetPeriod to exist.
   */
  async getMonthView(userId: string, year: number, month: number): Promise<ObligationMonthItem[]> {
    // 1. Get all active templates
    const templates = await obligationRepository.getMany(userId)
    const active = templates.filter(t => t.isActive)

    // 2. Get existing payments for this month
    const payments = await obligationRepository.getPaymentsForMonth(userId, year, month)
    const paymentByTemplateId = new Map(payments.map(p => [p.templateId, p]))

    // 3. Ensure payment records exist for active templates that fire this month (idempotent upsert)
    const firingTemplates = active.filter(t => firesThisMonth(t.billingCycle, t.createdAt, year, month))
    await Promise.all(
      firingTemplates.map(t =>
        obligationRepository.ensurePaymentForMonth({
          templateId: t.id,
          userId,
          year,
          month,
          dueDate: calcDueDate(year, month, t.billingDay),
          amount: t.defaultAmount,
        })
      )
    )

    // 4. Re-fetch after upsert to get fresh data
    const freshPayments = await obligationRepository.getPaymentsForMonth(userId, year, month)

    // 5. Map to unified view — include ALL templates (active + those with payment records)
    const templateMap = new Map(templates.map(t => [t.id, t]))
    const result: ObligationMonthItem[] = []
    const seen = new Set<string>()

    for (const p of freshPayments) {
      seen.add(p.templateId)
      const tpl = templateMap.get(p.templateId)
      result.push({
        paymentId: p.id,
        templateId: p.templateId,
        name: p.template.name,
        defaultAmount: Number(p.template.defaultAmount).toFixed(2),
        currency: tpl?.currency ?? 'PLN',
        category: p.template.category,
        billingDay: p.template.billingDay,
        billingCycle: tpl?.billingCycle ?? 'MONTHLY',
        dueDate: p.dueDate.toISOString().slice(0, 10),
        amount: Number(p.amount).toFixed(2),
        status: p.status,
        confirmedAt: p.confirmedAt ? p.confirmedAt.toISOString() : null,
        notes: tpl?.notes ?? null,
      })
    }

    // Add templates that are inactive but had a payment this month (historical)
    for (const [templateId, payment] of paymentByTemplateId) {
      if (!seen.has(templateId)) {
        const tpl = templateMap.get(templateId)
        if (tpl) {
          result.push({
            paymentId: payment.id,
            templateId,
            name: payment.template.name,
            defaultAmount: Number(payment.template.defaultAmount).toFixed(2),
            currency: tpl.currency,
            category: payment.template.category,
            billingDay: payment.template.billingDay,
            billingCycle: tpl.billingCycle,
            dueDate: payment.dueDate.toISOString().slice(0, 10),
            amount: Number(payment.amount).toFixed(2),
            status: payment.status,
            confirmedAt: payment.confirmedAt ? payment.confirmedAt.toISOString() : null,
            notes: tpl.notes,
          })
        }
      }
    }

    return result.sort((a, b) => {
      // PENDING first, then by dueDate
      if (a.status === 'PENDING' && b.status !== 'PENDING') return -1
      if (a.status !== 'PENDING' && b.status === 'PENDING') return 1
      return a.dueDate.localeCompare(b.dueDate)
    })
  },

  // ─── Confirm payment ──────────────────────────────────────────────────────

  /**
   * Marks a payment as confirmed and creates a budget transaction.
   * Auto-finds the budget period for the payment's year/month.
   * If no period exists — still confirms, but no transaction is created.
   */
  async confirmPayment(
    templateId: string,
    userId: string,
    year: number,
    month: number,
    data: ConfirmPaymentDto
  ): Promise<ObligationMonthItem> {
    const payment = await obligationRepository.getPaymentForMonth(templateId, userId, year, month)
    if (!payment) throw new AppError('NOT_FOUND')
    if (payment.status === 'CONFIRMED') throw new AppError('CONFLICT', 'Płatność już potwierdzona')

    const amount = data.amount ?? Number(payment.template.defaultAmount)
    const date = data.date ? new Date(data.date) : calcDueDate(year, month, payment.template.billingDay)

    // Try to find budget period for this month — optional, no error if missing
    const { budgetRepository } = await import('@/modules/budget/budget.repository')
    const period = await budgetRepository.getPeriodByYearMonth(year, month, userId)

    let transactionId: string | null = null
    if (period) {
      const tx = await budgetRepository.createTransaction(period.id, userId, {
        date: date.toISOString().slice(0, 10),
        title: payment.template.name,
        amount,
        category: payment.template.category,
        tags: [],
        source: 'RECURRING',
        sourceId: templateId,
      } as Parameters<typeof budgetRepository.createTransaction>[2])
      transactionId = tx.id
    }

    await obligationRepository.confirmPayment(payment.id, userId, {
      amount,
      confirmedAt: new Date(),
      transactionId: transactionId ?? '',
      periodId: period?.id ?? '',
      status: 'CONFIRMED',
    })

    await eventEmitter.emit(
      'recurring.payment.confirmed',
      { templateId, paymentId: payment.id, transactionId, amount: amount.toString() },
      userId
    )

    const tplName = payment.template.name
    const tplCategory = payment.template.category
    const tplDefault = Number(payment.template.defaultAmount).toFixed(2)

    return {
      paymentId: payment.id,
      templateId,
      name: tplName,
      defaultAmount: tplDefault,
      currency: payment.template.currency,
      category: tplCategory,
      billingDay: payment.template.billingDay,
      billingCycle: payment.template.billingCycle,
      dueDate: date.toISOString().slice(0, 10),
      amount: amount.toFixed(2),
      status: 'CONFIRMED' as const,
      confirmedAt: new Date().toISOString(),
      notes: null,
    }
  },

  // ─── Unconfirm / undo payment ─────────────────────────────────────────────

  /**
   * Reverts a CONFIRMED payment back to PENDING.
   * Deletes the associated budget transaction if it was created.
   */
  async unconfirmPayment(templateId: string, userId: string, year: number, month: number): Promise<void> {
    const payment = await obligationRepository.getPaymentForMonth(templateId, userId, year, month)
    if (!payment) throw new AppError('NOT_FOUND')
    if (payment.status !== 'CONFIRMED') throw new AppError('CONFLICT', 'Płatność nie jest potwierdzona')

    // Delete the transaction if it was created
    if (payment.transactionId) {
      const { budgetRepository } = await import('@/modules/budget/budget.repository')
      if (payment.periodId) {
        await budgetRepository.softDeleteTransaction(payment.transactionId, payment.periodId, userId)
      }
    }

    // Reset payment back to PENDING with original default amount
    await obligationRepository.unconfirmPayment(payment.id, userId, Number(payment.template.defaultAmount))
  },

  // ─── Skip payment ─────────────────────────────────────────────────────────

  async skipPayment(templateId: string, userId: string, year: number, month: number): Promise<void> {
    const payment = await obligationRepository.getPaymentForMonth(templateId, userId, year, month)
    if (!payment) throw new AppError('NOT_FOUND')
    if (payment.status === 'CONFIRMED') throw new AppError('CONFLICT', 'Nie można pominąć potwierdzonej płatności')
    await obligationRepository.skipPayment(payment.id, userId)
  },
}
