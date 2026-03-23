import { requireAuth } from '@/lib/auth'
import { apiSuccess, apiError } from '@/lib/api-response'
import { withRateLimit } from '@/lib/rate-limit'
import { AppError } from '@/types/common.types'
import { updateIncomeSchema } from '@/modules/budget/budget.schema'
import { budgetService } from '@/modules/budget/budget.service'

export async function PUT(req: Request, { params }: { params: Promise<{ id: string; incomeId: string }> }) {
  try {
    const session = await requireAuth()
    const { id, incomeId } = await params
    return withRateLimit(session.userId, async () => {
      const body = await req.json()
      const validated = updateIncomeSchema.safeParse(body)
      if (!validated.success) return apiError('VALIDATION_ERROR', 400, validated.error.flatten())

      const income = await budgetService.updateIncome(incomeId, id, session.userId, validated.data)
      return apiSuccess(income)
    })
  } catch (err) {
    if (err instanceof AppError) {
      const status = err.code === 'UNAUTHORIZED' ? 401 : err.code === 'NOT_FOUND' ? 404 : 500
      return apiError(err.code, status)
    }
    console.error('[PUT /api/budget/periods/[id]/incomes/[incomeId]]', err)
    return apiError('INTERNAL_ERROR', 500)
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string; incomeId: string }> }) {
  try {
    const session = await requireAuth()
    const { id, incomeId } = await params
    return withRateLimit(session.userId, async () => {
      await budgetService.deleteIncome(incomeId, id, session.userId)
      return apiSuccess(null)
    })
  } catch (err) {
    if (err instanceof AppError) {
      const status = err.code === 'UNAUTHORIZED' ? 401 : err.code === 'NOT_FOUND' ? 404 : 500
      return apiError(err.code, status)
    }
    console.error('[DELETE /api/budget/periods/[id]/incomes/[incomeId]]', err)
    return apiError('INTERNAL_ERROR', 500)
  }
}
