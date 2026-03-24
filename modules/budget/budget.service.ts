import { AppError } from '@/types/common.types'
import { eventEmitter } from '@/lib/event-emitter'
import { advanceBillingDate } from '@/lib/billing'
import { budgetRepository } from './budget.repository'
import {
  type CreatePeriodDto,
  type CreateTransactionDto,
  type UpdateTransactionDto,
  type CreateIncomeDto,
  type UpdateIncomeDto,
  type BulkUpdatePlansDto,
  type BulkUpdateTemplateExpensesDto,
  type CreateTemplateIncomeDto,
  type UpdateTemplateIncomeDto,
  type BudgetSummary,
  type BudgetPeriodDetail,
  type AnnualSummary,
  type AnnualQueryDto,
  type BudgetCategoryView,
  type CreateBudgetCategoryDto,
  type UpdateBudgetCategoryDto,
  type UpdateBalanceDto,
} from './budget.types'
import type { Prisma, BudgetPeriod, BudgetIncome, BudgetCategoryPlan, Transaction } from '@prisma/client'

// ─── Helpers ──────────────────────────────────────────────────────────────────

type PeriodWithRelations = BudgetPeriod & {
  incomes: BudgetIncome[]
  categoryPlans: BudgetCategoryPlan[]
  transactions: Transaction[]
}

function calculateSummary(period: PeriodWithRelations, categories: BudgetCategoryView[]): BudgetSummary {
  const plannedIncome = period.incomes.reduce((sum, inc) => sum + Number(inc.planned), 0)
  const actualIncome = period.incomes.reduce((sum, inc) => sum + Number(inc.actual ?? 0), 0)
  const plannedExpenses = period.categoryPlans.reduce((sum, p) => sum + Number(p.planned), 0)
  const activeTxs = period.transactions.filter(tx => !tx.deletedAt)
  const actualExpenses = activeTxs.reduce((sum, tx) => sum + Number(tx.amount), 0)

  // Zbieramy wszystkie slugi kategorii z planów i transakcji (nawet usuniętych z listy aktywnych)
  const catMap = new Map(categories.map(c => [c.slug, c]))
  const allSlugs = new Set([
    ...categories.map(c => c.slug),
    ...period.categoryPlans.map(p => p.category),
    ...activeTxs.map(t => t.category),
  ])

  const byCategory = Array.from(allSlugs).map(slug => {
    const cat = catMap.get(slug)
    const plan = period.categoryPlans.find(p => p.category === slug)
    const txs = activeTxs.filter(tx => tx.category === slug)
    const actual = txs.reduce((sum, tx) => sum + Number(tx.amount), 0)
    const planned = Number(plan?.planned ?? 0)
    return {
      category: slug,
      label: cat?.label ?? slug,
      color: cat?.color ?? '#6b7280',
      planned: planned.toFixed(2),
      actual: actual.toFixed(2),
      difference: (actual - planned).toFixed(2),
    }
  }).sort((a, b) => {
    // Sortuj według sortOrder z kategorii, potem alfabetycznie
    const aOrder = catMap.get(a.category)?.sortOrder ?? 999
    const bOrder = catMap.get(b.category)?.sortOrder ?? 999
    return aOrder !== bOrder ? aOrder - bOrder : a.label.localeCompare(b.label)
  })

  // Stan konta — obliczane tylko gdy openingBalance jest ustawiony
  const openingBal = period.openingBalance !== null && period.openingBalance !== undefined
    ? Number(period.openingBalance)
    : null
  const closingBal = period.closingBalance !== null && period.closingBalance !== undefined
    ? Number(period.closingBalance)
    : null
  const expectedBalance = openingBal !== null
    ? (openingBal + actualIncome - actualExpenses).toFixed(2)
    : null
  const discrepancy = closingBal !== null && expectedBalance !== null
    ? (closingBal - Number(expectedBalance)).toFixed(2)
    : null

  return {
    plannedIncome: plannedIncome.toFixed(2),
    actualIncome: actualIncome.toFixed(2),
    carryOver: Number(period.carryOverAmount).toFixed(2),
    totalPlannedBudget: (plannedIncome + Number(period.carryOverAmount)).toFixed(2),
    plannedExpenses: plannedExpenses.toFixed(2),
    actualExpenses: actualExpenses.toFixed(2),
    balance: (plannedIncome + Number(period.carryOverAmount) - actualExpenses).toFixed(2),
    byCategory,
    expectedBalance,
    discrepancy,
  }
}

function mapPeriodDetail(
  period: PeriodWithRelations,
  pendingPayments: Array<{
    id: string; templateId: string; dueDate: Date; amount: Prisma.Decimal
    status: string; template: { name: string; category: string }
  }>,
  categories: BudgetCategoryView[]
): BudgetPeriodDetail {
  const catMap = new Map(categories.map(c => [c.slug, c]))

  return {
    id: period.id,
    year: period.year,
    month: period.month,
    currency: period.currency,
    carryOverAmount: Number(period.carryOverAmount).toFixed(2),
    openingBalance: period.openingBalance !== null && period.openingBalance !== undefined
      ? Number(period.openingBalance).toFixed(2)
      : null,
    closingBalance: period.closingBalance !== null && period.closingBalance !== undefined
      ? Number(period.closingBalance).toFixed(2)
      : null,
    closedAt: period.closedAt?.toISOString() ?? null,
    incomes: period.incomes.map(inc => ({
      id: inc.id,
      title: inc.title,
      planned: Number(inc.planned).toFixed(2),
      actual: inc.actual !== null ? Number(inc.actual).toFixed(2) : null,
      sortOrder: inc.sortOrder,
    })),
    categoryPlans: period.categoryPlans.map(p => {
      const cat = catMap.get(p.category)
      return {
        id: p.id,
        category: p.category,
        label: cat?.label ?? p.category,
        color: cat?.color ?? '#6b7280',
        planned: Number(p.planned).toFixed(2),
      }
    }),
    transactions: period.transactions
      .filter(tx => !tx.deletedAt)
      .map(tx => ({
        id: tx.id,
        date: tx.date.toISOString().slice(0, 10),
        title: tx.title,
        amount: Number(tx.amount).toFixed(2),
        category: tx.category,
        source: tx.source,
        sourceId: tx.sourceId,
        tags: tx.tags,
      })),
    pendingPayments: pendingPayments.map(p => ({
      id: p.id,
      templateId: p.templateId,
      templateName: p.template.name,
      dueDate: p.dueDate.toISOString().slice(0, 10),
      amount: Number(p.amount).toFixed(2),
      category: p.template.category,
      status: p.status as 'PENDING' | 'CONFIRMED' | 'SKIPPED',
    })),
    summary: calculateSummary(period, categories),
  }
}

// ─── Template service ─────────────────────────────────────────────────────────

export const budgetService = {
  async getTemplate(userId: string) {
    const [template, categories] = await Promise.all([
      budgetRepository.getOrCreateTemplate(userId),
      budgetRepository.getCategories(),
    ])

    return {
      id: template.id,
      currency: template.currency,
      incomes: template.incomes.map(inc => ({
        id: inc.id,
        title: inc.title,
        amount: Number(inc.amount).toFixed(2),
        sortOrder: inc.sortOrder,
      })),
      expenses: categories.map(cat => {
        const exp = template.expenses.find(e => e.category === cat.slug)
        return {
          id: exp?.id ?? '',
          category: cat.slug,
          label: cat.label,
          color: cat.color,
          amount: Number(exp?.amount ?? 0).toFixed(2),
        }
      }),
    }
  },

  async updateTemplateCurrency(userId: string, currency: string) {
    await budgetRepository.getOrCreateTemplate(userId)
    return budgetRepository.updateTemplateCurrency(userId, currency)
  },

  async createTemplateIncome(userId: string, data: CreateTemplateIncomeDto) {
    const template = await budgetRepository.getOrCreateTemplate(userId)
    return budgetRepository.createTemplateIncome(userId, template.id, data)
  },

  async updateTemplateIncome(id: string, userId: string, data: UpdateTemplateIncomeDto) {
    const updated = await budgetRepository.updateTemplateIncome(id, userId, data)
    if (!updated) throw new AppError('NOT_FOUND')
    return updated
  },

  async deleteTemplateIncome(id: string, userId: string) {
    const result = await budgetRepository.deleteTemplateIncome(id, userId)
    if (result.count === 0) throw new AppError('NOT_FOUND')
  },

  async bulkUpdateTemplateExpenses(userId: string, data: BulkUpdateTemplateExpensesDto) {
    const template = await budgetRepository.getOrCreateTemplate(userId)
    return budgetRepository.bulkUpsertTemplateExpenses(userId, template.id, data)
  },

  // ─── Periods ─────────────────────────────────────────────────────────────────

  async listPeriods(userId: string, year?: number) {
    const periods = await budgetRepository.listPeriods(userId, year)
    return periods.map(period => ({
      id: period.id,
      year: period.year,
      month: period.month,
      currency: period.currency,
      closedAt: period.closedAt?.toISOString() ?? null,
    }))
  },

  async getPeriodByYearMonth(year: number, month: number, userId: string): Promise<BudgetPeriodDetail | null> {
    const [period, categories] = await Promise.all([
      budgetRepository.getPeriodByYearMonthFull(year, month, userId),
      budgetRepository.getCategories(),
    ])
    if (!period) return null

    const { obligationRepository } = await import('@/modules/obligations/obligations.repository')
    const pendingPayments = await obligationRepository.listByPeriodId(period.id, userId)

    return mapPeriodDetail(period, pendingPayments, categories)
  },

  async createPeriod(data: CreatePeriodDto, userId: string): Promise<BudgetPeriodDetail> {
    // 1. Guard: czy miesiąc już istnieje?
    const existing = await budgetRepository.getPeriodByYearMonth(data.year, data.month, userId)
    if (existing) throw new AppError('CONFLICT', 'Budget period already exists')

    // 2. Pobierz lub utwórz szablon
    const template = await budgetRepository.getOrCreateTemplate(userId)

    // 3. Sprawdź poprzedni miesiąc — auto-carry openingBalance z closingBalance poprzedniego miesiąca
    const prevYear = data.month === 1 ? data.year - 1 : data.year
    const prevMonth = data.month === 1 ? 12 : data.month - 1
    const prevPeriod = await budgetRepository.getPeriodByYearMonth(prevYear, prevMonth, userId)
    const inheritedOpeningBalance = prevPeriod?.closingBalance !== null && prevPeriod?.closingBalance !== undefined
      ? Number(prevPeriod.closingBalance)
      : undefined

    // 4. Utwórz okres
    const period = await budgetRepository.createPeriod({
      userId,
      year: data.year,
      month: data.month,
      carryOverAmount: data.carryOverAmount ?? 0,
      ...(inheritedOpeningBalance !== undefined && { openingBalance: inheritedOpeningBalance }),
    })

    // 5. Kopiuj przychody z szablonu
    if (template.incomes.length > 0) {
      await budgetRepository.createManyIncomes(
        template.incomes.map(inc => ({
          periodId: period.id,
          userId,
          title: inc.title,
          planned: inc.amount,
          actual: null,
          sortOrder: inc.sortOrder,
        }))
      )
    }

    // 6. Kopiuj plany kategorii z szablonu
    if (template.expenses.length > 0) {
      await budgetRepository.createManyCategoryPlans(
        template.expenses.map(exp => ({
          periodId: period.id,
          userId,
          category: exp.category,
          planned: exp.amount,
        }))
      )
    }

    // 7. Auto-booking subskrypcji — tylko te, których data płatności już minęła (nextBillingDate <= dziś)
    //    Subskrypcje z przyszłą datą NIE są bookowane — zostaną zaksięgowane lazily przy otwarciu okresu
    const periodStart = new Date(data.year, data.month - 1, 1)
    const periodEnd = new Date(data.year, data.month, 0)
    const today = new Date()

    const { subscriptionRepository } = await import('@/modules/subscriptions/subscriptions.repository')
    const subscriptions = await subscriptionRepository.getActiveForPeriod(userId, periodStart, periodEnd)
    const dueSubscriptions = subscriptions.filter(sub => sub.nextBillingDate <= today)

    if (dueSubscriptions.length > 0) {
      await budgetRepository.createManyTransactions(
        dueSubscriptions.map(sub => ({
          periodId: period.id,
          userId,
          date: sub.nextBillingDate,
          title: sub.name,
          amount: sub.amount,
          category: sub.category,
          source: 'SUBSCRIPTION' as const,
          sourceId: sub.id,
        }))
      )
      await Promise.all(dueSubscriptions.map(sub => {
        const next = advanceBillingDate(sub.nextBillingDate, sub.billingCycle)
        return subscriptionRepository.updateNextBillingDate(sub.id, userId, next)
      }))
    }

    // 8. Generuj oczekujące płatności cykliczne
    const { obligationRepository } = await import('@/modules/obligations/obligations.repository')
    const recurringTemplates = await obligationRepository.getActiveForPeriod(userId)

    if (recurringTemplates.length > 0) {
      await obligationRepository.createManyPendingPayments(
        recurringTemplates.map(tpl => ({
          templateId: tpl.id,
          userId,
          year: data.year,
          month: data.month,
          periodId: period.id,
          dueDate: new Date(data.year, data.month - 1, Math.min(tpl.billingDay, periodEnd.getDate())),
          amount: tpl.defaultAmount,
          status: 'PENDING' as const,
        }))
      )
    }

    // 9. Event
    await eventEmitter.emit(
      'budget.period.created',
      { periodId: period.id, year: data.year, month: data.month },
      userId
    )

    // 10. Zwróć pełny widok
    return budgetService.getPeriodDetail(period.id, userId)
  },

  async getCurrentPeriod(userId: string) {
    const now = new Date()
    const period = await budgetRepository.getPeriodByYearMonth(now.getFullYear(), now.getMonth() + 1, userId)
    if (!period) throw new AppError('NOT_FOUND')
    return budgetService.getPeriodDetail(period.id, userId)
  },

  async getPeriodDetail(id: string, userId: string): Promise<BudgetPeriodDetail> {
    const [period, categories] = await Promise.all([
      budgetRepository.getPeriodDetail(id, userId),
      budgetRepository.getCategories(),
    ])
    if (!period) throw new AppError('NOT_FOUND')

    // Lazy booking: zaksięguj subskrypcje których data już minęła, a jeszcze nie ma transakcji
    await bookDueSubscriptionsForPeriod(id, userId, period.year, period.month)

    // Odśwież dane okresu po potencjalnym booking (nowe transakcje mogły zostać dodane)
    const refreshed = await budgetRepository.getPeriodDetail(id, userId)
    if (!refreshed) throw new AppError('NOT_FOUND')

    const { obligationRepository } = await import('@/modules/obligations/obligations.repository')
    const pendingPayments = await obligationRepository.listByPeriodId(id, userId)

    return mapPeriodDetail(refreshed, pendingPayments, categories)
  },

  async resetPeriod(id: string, userId: string) {
    const ok = await budgetRepository.getPeriodOwnership(id, userId)
    if (!ok) throw new AppError('NOT_FOUND')
    await budgetRepository.deletePeriod(id, userId)
    await eventEmitter.emit('budget.period.reset', { periodId: id }, userId)
  },

  async replaceWithTemplate(id: string, userId: string): Promise<BudgetPeriodDetail> {
    const ok = await budgetRepository.getPeriodOwnership(id, userId)
    if (!ok) throw new AppError('NOT_FOUND')

    const template = await budgetRepository.getOrCreateTemplate(userId)

    // Usuń istniejące dane (ale nie sam okres)
    await budgetRepository.deleteAllPeriodData(id, userId)

    // Skopiuj przychody z szablonu
    if (template.incomes.length > 0) {
      await budgetRepository.createManyIncomes(
        template.incomes.map(inc => ({
          periodId: id,
          userId,
          title: inc.title,
          planned: inc.amount,
          actual: null,
          sortOrder: inc.sortOrder,
        }))
      )
    }

    // Skopiuj plany kategorii z szablonu
    if (template.expenses.length > 0) {
      await budgetRepository.createManyCategoryPlans(
        template.expenses.map(exp => ({
          periodId: id,
          userId,
          category: exp.category,
          planned: exp.amount,
        }))
      )
    }

    await eventEmitter.emit('budget.period.replaced_with_template', { periodId: id }, userId)

    return budgetService.getPeriodDetail(id, userId)
  },

  async closePeriod(id: string, userId: string) {
    const result = await budgetRepository.closePeriod(id, userId)
    if (result.count === 0) throw new AppError('NOT_FOUND')
  },

  async updateBalance(id: string, userId: string, data: UpdateBalanceDto): Promise<BudgetPeriodDetail> {
    const ok = await budgetRepository.getPeriodOwnership(id, userId)
    if (!ok) throw new AppError('NOT_FOUND')
    const result = await budgetRepository.updatePeriodBalance(id, userId, {
      openingBalance: data.openingBalance,
      closingBalance: data.closingBalance,
    })
    if (result.count === 0) throw new AppError('NOT_FOUND')
    return budgetService.getPeriodDetail(id, userId)
  },

  // ─── Incomes ─────────────────────────────────────────────────────────────────

  async listIncomes(periodId: string, userId: string) {
    const ok = await budgetRepository.getPeriodOwnership(periodId, userId)
    if (!ok) throw new AppError('NOT_FOUND')
    return budgetRepository.listIncomes(periodId, userId)
  },

  async createIncome(periodId: string, userId: string, data: CreateIncomeDto) {
    const ok = await budgetRepository.getPeriodOwnership(periodId, userId)
    if (!ok) throw new AppError('NOT_FOUND')
    return budgetRepository.createIncome(periodId, userId, data)
  },

  async updateIncome(id: string, periodId: string, userId: string, data: UpdateIncomeDto) {
    const updated = await budgetRepository.updateIncome(id, periodId, userId, data)
    if (!updated) throw new AppError('NOT_FOUND')
    return updated
  },

  async deleteIncome(id: string, periodId: string, userId: string) {
    const result = await budgetRepository.deleteIncome(id, periodId, userId)
    if (result.count === 0) throw new AppError('NOT_FOUND')
  },

  // ─── Category Plans ───────────────────────────────────────────────────────────

  async listCategoryPlans(periodId: string, userId: string) {
    const ok = await budgetRepository.getPeriodOwnership(periodId, userId)
    if (!ok) throw new AppError('NOT_FOUND')
    return budgetRepository.listCategoryPlans(periodId, userId)
  },

  async bulkUpsertCategoryPlans(periodId: string, userId: string, data: BulkUpdatePlansDto) {
    const ok = await budgetRepository.getPeriodOwnership(periodId, userId)
    if (!ok) throw new AppError('NOT_FOUND')
    return budgetRepository.bulkUpsertCategoryPlans(periodId, userId, data)
  },

  // ─── Transactions ─────────────────────────────────────────────────────────────

  async listTransactions(
    periodId: string,
    userId: string,
    filters: { category?: string; source?: 'MANUAL' | 'SUBSCRIPTION' | 'RECURRING' }
  ) {
    const ok = await budgetRepository.getPeriodOwnership(periodId, userId)
    if (!ok) throw new AppError('NOT_FOUND')
    return budgetRepository.listTransactions(periodId, userId, filters)
  },

  async createTransaction(periodId: string, userId: string, data: CreateTransactionDto) {
    const ok = await budgetRepository.getPeriodOwnership(periodId, userId)
    if (!ok) throw new AppError('NOT_FOUND')

    const tx = await budgetRepository.createTransaction(periodId, userId, data)

    await eventEmitter.emit(
      'budget.transaction.created',
      { transactionId: tx.id, periodId, amount: tx.amount.toString(), category: tx.category },
      userId
    )

    // Sprawdź przekroczenie kategorii (lekkie zapytanie tylko o tę kategorię)
    const [categorySum, plan] = await Promise.all([
      budgetRepository.sumTransactionsByCategory(periodId, userId, data.category),
      budgetRepository.getCategoryPlan(periodId, userId, data.category),
    ])
    if (plan && categorySum > Number(plan.planned)) {
      await eventEmitter.emit(
        'budget.category.overspent',
        {
          periodId,
          category: data.category,
          planned: Number(plan.planned).toFixed(2),
          actual: categorySum.toFixed(2),
          overspentBy: (categorySum - Number(plan.planned)).toFixed(2),
        },
        userId
      )
    }

    return tx
  },

  async updateTransaction(id: string, periodId: string, userId: string, data: UpdateTransactionDto) {
    const existing = await budgetRepository.getTransaction(id, periodId, userId)
    if (!existing) throw new AppError('NOT_FOUND')
    if (existing.source !== 'MANUAL') throw new AppError('FORBIDDEN', 'Edytuj subskrypcję lub szablon cykliczny')

    const updated = await budgetRepository.updateTransaction(id, periodId, userId, data)
    if (!updated) throw new AppError('NOT_FOUND')
    return updated
  },

  async deleteTransaction(id: string, periodId: string, userId: string) {
    const result = await budgetRepository.softDeleteTransaction(id, periodId, userId)
    if (result.count === 0) throw new AppError('NOT_FOUND')
  },

  /**
   * Best-effort transaction creation for inter-module integration.
   * Looks up the budget period by date, silently returns null if no period exists.
   * Used by other modules (e.g. vehicles) to record costs without coupling to repository layer.
   */
  async recordExternalTransaction(
    payload: { date: Date; title: string; amount: number; currency: string; category: string; tags?: string[] },
    userId: string
  ): Promise<string | null> {
    try {
      const period = await budgetRepository.getPeriodByYearMonth(
        payload.date.getFullYear(),
        payload.date.getMonth() + 1,
        userId
      )
      if (!period) return null
      const tx = await budgetRepository.createTransaction(period.id, userId, {
        date: payload.date.toISOString().slice(0, 10),
        title: payload.title,
        amount: payload.amount,
        category: payload.category,
        tags: payload.tags ?? [],
      })
      return tx.id
    } catch (err) {
      console.error('[recordExternalTransaction]', err)
      return null
    }
  },

  // ─── Summary ─────────────────────────────────────────────────────────────────

  async getSummary(periodId: string, userId: string) {
    const [period, categories] = await Promise.all([
      budgetRepository.getPeriodDetail(periodId, userId),
      budgetRepository.getCategories(),
    ])
    if (!period) throw new AppError('NOT_FOUND')
    return calculateSummary(period, categories)
  },

  // ─── Annual ──────────────────────────────────────────────────────────────────

  async getAnnual(userId: string, dto: AnnualQueryDto): Promise<AnnualSummary> {
    const [periods, categories] = await Promise.all([
      budgetRepository.getPeriodsForYear(userId, dto.year),
      budgetRepository.getCategories(),
    ])

    const months = periods.map(period => {
      const summary = calculateSummary(period, categories)
      return {
        month: period.month,
        plannedIncome: summary.plannedIncome,
        actualIncome: summary.actualIncome,
        plannedExpenses: summary.plannedExpenses,
        actualExpenses: summary.actualExpenses,
        balance: summary.balance,
        byCategory: summary.byCategory,
      }
    })

    const totalPlannedIncome = months.reduce((s, m) => s + Number(m.plannedIncome), 0)
    const totalActualIncome = months.reduce((s, m) => s + Number(m.actualIncome), 0)
    const totalPlannedExpenses = months.reduce((s, m) => s + Number(m.plannedExpenses), 0)
    const totalActualExpenses = months.reduce((s, m) => s + Number(m.actualExpenses), 0)

    // Aggregate by category slug across all months
    const categoryTotalsMap = new Map<string, { label: string; total: number }>()
    for (const month of months) {
      for (const cat of month.byCategory) {
        const existing = categoryTotalsMap.get(cat.category)
        categoryTotalsMap.set(cat.category, {
          label: cat.label,
          total: (existing?.total ?? 0) + Number(cat.actual),
        })
      }
    }

    const topCategories = Array.from(categoryTotalsMap.entries())
      .map(([category, { label, total }]) => ({ category, label, total: total.toFixed(2) }))
      .sort((a, b) => Number(b.total) - Number(a.total))
      .slice(0, 5)

    return {
      year: dto.year,
      months,
      yearSummary: {
        totalPlannedIncome: totalPlannedIncome.toFixed(2),
        totalActualIncome: totalActualIncome.toFixed(2),
        totalPlannedExpenses: totalPlannedExpenses.toFixed(2),
        totalActualExpenses: totalActualExpenses.toFixed(2),
        totalSavings: (totalActualIncome - totalActualExpenses).toFixed(2),
        topCategories,
      },
    }
  },

  // ─── Global Categories ────────────────────────────────────────────────────────

  async getCategories(): Promise<BudgetCategoryView[]> {
    const cats = await budgetRepository.getCategories()
    return cats.map(c => ({
      id: c.id,
      slug: c.slug,
      label: c.label,
      color: c.color,
      isSystem: c.isSystem,
      isActive: c.isActive,
      sortOrder: c.sortOrder,
    }))
  },

  async getAllCategories(): Promise<BudgetCategoryView[]> {
    const cats = await budgetRepository.getAllCategories()
    return cats.map(c => ({
      id: c.id,
      slug: c.slug,
      label: c.label,
      color: c.color,
      isSystem: c.isSystem,
      isActive: c.isActive,
      sortOrder: c.sortOrder,
    }))
  },

  async createCategory(data: CreateBudgetCategoryDto): Promise<BudgetCategoryView> {
    const existing = await budgetRepository.getCategoryBySlug(data.slug)
    if (existing) throw new AppError('CONFLICT', `Kategoria ze slugiem "${data.slug}" już istnieje`)

    const cat = await budgetRepository.createCategory({ ...data, isSystem: false })
    return {
      id: cat.id,
      slug: cat.slug,
      label: cat.label,
      color: cat.color,
      isSystem: cat.isSystem,
      isActive: cat.isActive,
      sortOrder: cat.sortOrder,
    }
  },

  async updateCategory(id: string, data: UpdateBudgetCategoryDto): Promise<BudgetCategoryView> {
    const updated = await budgetRepository.updateCategory(id, data)
    if (!updated) throw new AppError('NOT_FOUND')
    return {
      id: updated.id,
      slug: updated.slug,
      label: updated.label,
      color: updated.color,
      isSystem: updated.isSystem,
      isActive: updated.isActive,
      sortOrder: updated.sortOrder,
    }
  },

  async deleteCategory(id: string) {
    const cat = await budgetRepository.getCategoryById(id)
    if (!cat) throw new AppError('NOT_FOUND')
    if (cat.isSystem) throw new AppError('FORBIDDEN', 'Nie można usunąć systemowej kategorii')
    const result = await budgetRepository.deleteCategory(id)
    if (result.count === 0) throw new AppError('NOT_FOUND')
  },
}

// ─── Helper: bookDueSubscriptionsForPeriod ───────────────────────────────────
//
// Lazy booking: wywoływany przy każdym getPeriodDetail.
// Zaksięgowuje subskrypcje, których nextBillingDate już minęła, ale jeszcze nie mają
// transakcji w tym okresie. Idempotentne — sprawdza istniejące sourceId przed zapisem.

async function bookDueSubscriptionsForPeriod(
  periodId: string,
  userId: string,
  year: number,
  month: number
): Promise<void> {
  const today = new Date()
  const periodStart = new Date(year, month - 1, 1)
  // Jeśli okres jest w przyszłości — nic nie rób
  if (periodStart > today) return

  const periodEnd = new Date(year, month, 0)
  const upperBound = today < periodEnd ? today : periodEnd

  const { subscriptionRepository } = await import('@/modules/subscriptions/subscriptions.repository')
  const dueSubs = await subscriptionRepository.getActiveForPeriod(userId, periodStart, upperBound)
  if (dueSubs.length === 0) return

  const alreadyBooked = await budgetRepository.getBookedSubscriptionSourceIds(periodId)
  const toBook = dueSubs.filter(sub => !alreadyBooked.has(sub.id))
  if (toBook.length === 0) return

  await budgetRepository.createManyTransactions(
    toBook.map(sub => ({
      periodId,
      userId,
      date: sub.nextBillingDate,
      title: sub.name,
      amount: sub.amount,
      category: sub.category,
      source: 'SUBSCRIPTION' as const,
      sourceId: sub.id,
    }))
  )
  await Promise.all(toBook.map(sub => {
    const next = advanceBillingDate(sub.nextBillingDate, sub.billingCycle)
    return subscriptionRepository.updateNextBillingDate(sub.id, userId, next)
  }))
}

