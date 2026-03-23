import type { BillingCycle, TransactionSource, RecurringStatus } from '@prisma/client'
import type { z } from 'zod'
import type {
  createPeriodSchema,
  createTransactionSchema,
  updateTransactionSchema,
  updateIncomeSchema,
  bulkUpdatePlansSchema,
  bulkUpdateTemplateExpensesSchema,
  createTemplateIncomeSchema,
  updateTemplateIncomeSchema,
  createIncomeSchema,
  annualQuerySchema,
  updateTemplateCurrencySchema,
  createBudgetCategorySchema,
  updateBudgetCategorySchema,
} from './budget.schema'

// BudgetCategory jest teraz globalną tabelą (nie enum) — slugi w postaci string
export type BudgetCategory = string
export type { BillingCycle, TransactionSource, RecurringStatus }

// DTOs — inferowane z Zod
export type CreatePeriodDto = z.infer<typeof createPeriodSchema>
export type CreateTransactionDto = z.infer<typeof createTransactionSchema>
export type UpdateTransactionDto = z.infer<typeof updateTransactionSchema>
export type UpdateIncomeDto = z.infer<typeof updateIncomeSchema>
export type CreateIncomeDto = z.infer<typeof createIncomeSchema>
export type BulkUpdatePlansDto = z.infer<typeof bulkUpdatePlansSchema>
export type BulkUpdateTemplateExpensesDto = z.infer<typeof bulkUpdateTemplateExpensesSchema>
export type CreateTemplateIncomeDto = z.infer<typeof createTemplateIncomeSchema>
export type UpdateTemplateIncomeDto = z.infer<typeof updateTemplateIncomeSchema>
export type AnnualQueryDto = z.infer<typeof annualQuerySchema>
export type UpdateTemplateCurrencyDto = z.infer<typeof updateTemplateCurrencySchema>
export type CreateBudgetCategoryDto = z.infer<typeof createBudgetCategorySchema>
export type UpdateBudgetCategoryDto = z.infer<typeof updateBudgetCategorySchema>

// Widok globalnej kategorii budżetowej
export interface BudgetCategoryView {
  id: string
  slug: string
  label: string
  color: string
  isSystem: boolean
  isActive: boolean
  sortOrder: number
}

// View types — zwracane przez API
export interface BudgetSummary {
  plannedIncome: string
  actualIncome: string
  carryOver: string
  totalPlannedBudget: string
  plannedExpenses: string
  actualExpenses: string
  balance: string
  byCategory: CategorySummaryItem[]
}

export interface CategorySummaryItem {
  category: string
  label: string
  color: string
  planned: string
  actual: string
  difference: string
}

export interface BudgetPeriodListItem {
  id: string
  year: number
  month: number
  currency: string
  closedAt: string | null
}

export interface BudgetTemplateView {
  id: string
  currency: string
  incomes: TemplateIncomeView[]
  expenses: TemplateExpenseView[]
}

export interface TemplateIncomeView {
  id: string
  title: string
  amount: string
  sortOrder: number
}

export interface TemplateExpenseView {
  id: string
  category: string
  label: string
  color: string
  amount: string
}

export interface BudgetIncomeView {
  id: string
  title: string
  planned: string
  actual: string | null
  sortOrder: number
}

export interface BudgetCategoryPlanView {
  id: string
  category: string
  label: string
  color: string
  planned: string
}

export interface TransactionView {
  id: string
  date: string
  title: string
  amount: string
  category: string
  source: TransactionSource
  sourceId: string | null
  tags: string[]
}

export interface RecurringPaymentView {
  id: string
  templateId: string
  templateName: string
  dueDate: string
  amount: string
  category: string
  status: RecurringStatus
}

export interface BudgetPeriodDetail {
  id: string
  year: number
  month: number
  currency: string
  carryOverAmount: string
  closedAt: string | null
  incomes: BudgetIncomeView[]
  categoryPlans: BudgetCategoryPlanView[]
  transactions: TransactionView[]
  pendingPayments: RecurringPaymentView[]
  summary: BudgetSummary
}

export interface AnnualSummary {
  year: number
  months: MonthSummary[]
  yearSummary: {
    totalPlannedIncome: string
    totalActualIncome: string
    totalPlannedExpenses: string
    totalActualExpenses: string
    totalSavings: string
    topCategories: Array<{ category: string; label: string; total: string }>
  }
}

export interface MonthSummary {
  month: number
  plannedIncome: string
  actualIncome: string
  plannedExpenses: string
  actualExpenses: string
  balance: string
  byCategory: CategorySummaryItem[]
}
