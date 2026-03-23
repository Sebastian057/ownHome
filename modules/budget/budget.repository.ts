import { prisma } from '@/lib/prisma'
import type {
  TransactionSource,
  CreatePeriodDto,
  CreateIncomeDto,
  UpdateIncomeDto,
  CreateTransactionDto,
  UpdateTransactionDto,
  CreateTemplateIncomeDto,
  UpdateTemplateIncomeDto,
  BulkUpdateTemplateExpensesDto,
  BulkUpdatePlansDto,
  CreateBudgetCategoryDto,
  UpdateBudgetCategoryDto,
} from './budget.types'
import type { Prisma } from '@prisma/client'

// ─── Template ─────────────────────────────────────────────────────────────────

export const budgetRepository = {
  async getOrCreateTemplate(userId: string) {
    const existing = await prisma.budgetTemplate.findUnique({
      where: { userId },
      include: { incomes: { orderBy: { sortOrder: 'asc' } }, expenses: true },
    })
    if (existing) return existing

    return prisma.budgetTemplate.create({
      data: { userId },
      include: { incomes: true, expenses: true },
    })
  },

  async updateTemplateCurrency(userId: string, currency: string) {
    return prisma.budgetTemplate.update({
      where: { userId },
      data: { currency },
      include: { incomes: { orderBy: { sortOrder: 'asc' } }, expenses: true },
    })
  },

  async createTemplateIncome(userId: string, templateId: string, data: CreateTemplateIncomeDto) {
    return prisma.budgetTemplateIncome.create({
      data: { templateId, userId, ...data },
    })
  },

  async updateTemplateIncome(id: string, userId: string, data: UpdateTemplateIncomeDto) {
    const rows = await prisma.budgetTemplateIncome.updateMany({
      where: { id, userId },
      data,
    })
    if (rows.count === 0) return null
    return prisma.budgetTemplateIncome.findFirst({ where: { id, userId } })
  },

  async deleteTemplateIncome(id: string, userId: string) {
    return prisma.budgetTemplateIncome.deleteMany({ where: { id, userId } })
  },

  async getTemplateIncomes(userId: string, templateId: string) {
    return prisma.budgetTemplateIncome.findMany({
      where: { templateId, userId },
      orderBy: { sortOrder: 'asc' },
    })
  },

  async getTemplateExpenses(userId: string, templateId: string) {
    return prisma.budgetTemplateExpense.findMany({
      where: { templateId, userId },
    })
  },

  async bulkUpsertTemplateExpenses(userId: string, templateId: string, data: BulkUpdateTemplateExpensesDto) {
    const ops = data.expenses.map((e) =>
      prisma.budgetTemplateExpense.upsert({
        where: { templateId_category: { templateId, category: e.category } },
        create: { templateId, userId, category: e.category, amount: e.amount },
        update: { amount: e.amount },
      })
    )
    return prisma.$transaction(ops)
  },

  // ─── Period ─────────────────────────────────────────────────────────────────

  async getPeriodOwnership(id: string, userId: string) {
    return prisma.budgetPeriod.findFirst({ where: { id, userId }, select: { id: true } })
  },

  async getPeriodByYearMonth(year: number, month: number, userId: string) {
    return prisma.budgetPeriod.findFirst({ where: { userId, year, month } })
  },

  async getPeriodByYearMonthFull(year: number, month: number, userId: string) {
    return prisma.budgetPeriod.findFirst({
      where: { userId, year, month },
      include: {
        incomes: { orderBy: { sortOrder: 'asc' } },
        categoryPlans: true,
        transactions: { where: { deletedAt: null }, orderBy: { date: 'desc' } },
      },
    })
  },

  async listPeriods(userId: string, year?: number) {
    const where: Prisma.BudgetPeriodWhereInput = { userId }
    if (year !== undefined) where.year = year

    return prisma.budgetPeriod.findMany({
      where,
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
    })
  },

  async getCategoryPlan(periodId: string, userId: string, category: string) {
    return prisma.budgetCategoryPlan.findFirst({ where: { periodId, userId, category } })
  },

  async createPeriod(data: Pick<CreatePeriodDto, 'year' | 'month' | 'carryOverAmount'> & { userId: string }) {
    return prisma.budgetPeriod.create({ data })
  },

  async getPeriodDetail(id: string, userId: string) {
    return prisma.budgetPeriod.findFirst({
      where: { id, userId },
      include: {
        incomes: { orderBy: { sortOrder: 'asc' } },
        categoryPlans: true,
        transactions: {
          where: { deletedAt: null },
          orderBy: { date: 'desc' },
        },
      },
    })
  },

  async deletePeriod(id: string, userId: string) {
    return prisma.budgetPeriod.deleteMany({ where: { id, userId } })
  },

  async deleteAllPeriodData(periodId: string, userId: string) {
    return prisma.$transaction([
      prisma.budgetIncome.deleteMany({ where: { periodId, userId } }),
      prisma.budgetCategoryPlan.deleteMany({ where: { periodId, userId } }),
      prisma.transaction.deleteMany({ where: { periodId, userId } }),
    ])
  },

  async closePeriod(id: string, userId: string) {
    return prisma.budgetPeriod.updateMany({
      where: { id, userId },
      data: { closedAt: new Date() },
    })
  },

  // ─── Income ──────────────────────────────────────────────────────────────────

  async createIncome(periodId: string, userId: string, data: CreateIncomeDto) {
    return prisma.budgetIncome.create({ data: { periodId, userId, ...data } })
  },

  async createManyIncomes(items: Array<{
    periodId: string; userId: string; title: string
    planned: number | Prisma.Decimal; actual: null; sortOrder: number
  }>) {
    return prisma.budgetIncome.createMany({ data: items })
  },

  async listIncomes(periodId: string, userId: string) {
    return prisma.budgetIncome.findMany({
      where: { periodId, userId },
      orderBy: { sortOrder: 'asc' },
    })
  },

  async updateIncome(id: string, periodId: string, userId: string, data: UpdateIncomeDto) {
    const rows = await prisma.budgetIncome.updateMany({
      where: { id, periodId, userId },
      data,
    })
    if (rows.count === 0) return null
    return prisma.budgetIncome.findFirst({ where: { id, userId } })
  },

  async deleteIncome(id: string, periodId: string, userId: string) {
    return prisma.budgetIncome.deleteMany({ where: { id, periodId, userId } })
  },

  // ─── Category Plans ──────────────────────────────────────────────────────────

  async listCategoryPlans(periodId: string, userId: string) {
    return prisma.budgetCategoryPlan.findMany({ where: { periodId, userId } })
  },

  async createManyCategoryPlans(items: Array<{
    periodId: string; userId: string; category: string; planned: number | Prisma.Decimal
  }>) {
    return prisma.budgetCategoryPlan.createMany({ data: items })
  },

  async bulkUpsertCategoryPlans(periodId: string, userId: string, data: BulkUpdatePlansDto) {
    const ops = data.plans.map((p) =>
      prisma.budgetCategoryPlan.upsert({
        where: { periodId_category: { periodId, category: p.category } },
        create: { periodId, userId, category: p.category, planned: p.planned },
        update: { planned: p.planned },
      })
    )
    return prisma.$transaction(ops)
  },

  // ─── Transactions ────────────────────────────────────────────────────────────

  async listTransactions(
    periodId: string,
    userId: string,
    filters: { category?: string; source?: TransactionSource }
  ) {
    return prisma.transaction.findMany({
      where: {
        periodId,
        userId,
        deletedAt: null,
        ...(filters.category && { category: filters.category }),
        ...(filters.source && { source: filters.source }),
      },
      orderBy: { date: 'desc' },
    })
  },

  async createTransaction(
    periodId: string,
    userId: string,
    data: CreateTransactionDto & { source?: TransactionSource; sourceId?: string }
  ) {
    return prisma.transaction.create({
      data: {
        periodId,
        userId,
        date: new Date(data.date),
        title: data.title,
        amount: data.amount,
        category: data.category,
        source: data.source ?? 'MANUAL',
        sourceId: data.sourceId ?? null,
        tags: data.tags ?? [],
      },
    })
  },

  async createManyTransactions(items: Array<{
    periodId: string
    userId: string
    date: Date
    title: string
    amount: number | Prisma.Decimal
    category: string
    source: TransactionSource
    sourceId: string
  }>) {
    return prisma.transaction.createMany({ data: items })
  },

  async getTransaction(id: string, periodId: string, userId: string) {
    return prisma.transaction.findFirst({
      where: { id, periodId, userId, deletedAt: null },
    })
  },

  async updateTransaction(id: string, periodId: string, userId: string, data: UpdateTransactionDto) {
    const updateData: Prisma.TransactionUpdateInput = {}
    if (data.date !== undefined) updateData.date = new Date(data.date)
    if (data.title !== undefined) updateData.title = data.title
    if (data.amount !== undefined) updateData.amount = data.amount
    if (data.category !== undefined) updateData.category = data.category
    if (data.tags !== undefined) updateData.tags = data.tags

    const rows = await prisma.transaction.updateMany({
      where: { id, periodId, userId, deletedAt: null, source: 'MANUAL' },
      data: updateData,
    })
    if (rows.count === 0) return null
    return prisma.transaction.findFirst({ where: { id, userId } })
  },

  async softDeleteTransaction(id: string, periodId: string, userId: string) {
    return prisma.transaction.updateMany({
      where: { id, periodId, userId, deletedAt: null },
      data: { deletedAt: new Date() },
    })
  },

  async findTransactionBySource(periodId: string, sourceId: string, source: TransactionSource) {
    return prisma.transaction.findFirst({
      where: { periodId, sourceId, source, deletedAt: null },
      select: { id: true },
    })
  },

  async sumTransactionsByCategory(periodId: string, userId: string, category: string) {
    const result = await prisma.transaction.aggregate({
      where: { periodId, userId, category, deletedAt: null },
      _sum: { amount: true },
    })
    return Number(result._sum?.amount ?? 0)
  },

  // ─── Annual ──────────────────────────────────────────────────────────────────

  async getPeriodsForYear(userId: string, year: number) {
    return prisma.budgetPeriod.findMany({
      where: { userId, year },
      orderBy: { month: 'asc' },
      include: {
        incomes: true,
        categoryPlans: true,
        transactions: { where: { deletedAt: null } },
      },
    })
  },

  // ─── Global Categories (bez userId) ─────────────────────────────────────────

  async getCategories() {
    return prisma.budgetCategory.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    })
  },

  async getAllCategories() {
    return prisma.budgetCategory.findMany({
      orderBy: [{ isActive: 'desc' }, { sortOrder: 'asc' }],
    })
  },

  async getCategoryBySlug(slug: string) {
    return prisma.budgetCategory.findFirst({ where: { slug } })
  },

  async getCategoryById(id: string) {
    return prisma.budgetCategory.findFirst({ where: { id } })
  },

  async createCategory(data: CreateBudgetCategoryDto & { isSystem?: boolean }) {
    return prisma.budgetCategory.create({ data })
  },

  async updateCategory(id: string, data: UpdateBudgetCategoryDto) {
    const rows = await prisma.budgetCategory.updateMany({ where: { id }, data })
    if (rows.count === 0) return null
    return prisma.budgetCategory.findFirst({ where: { id } })
  },

  async deleteCategory(id: string) {
    // Tylko nieisystemowe kategorie można usunąć
    return prisma.budgetCategory.deleteMany({ where: { id, isSystem: false } })
  },
}
