import { requireAuth } from '@/lib/auth'
import { apiSuccess, apiError } from '@/lib/api-response'
import { withRateLimit } from '@/lib/rate-limit'
import { AppError } from '@/types/common.types'
import { bulkUpdateTemplateExpensesSchema } from '@/modules/budget/budget.schema'
import { budgetService } from '@/modules/budget/budget.service'

export async function GET() {
  try {
    const session = await requireAuth()
    const template = await budgetService.getTemplate(session.userId)
    return apiSuccess(template.expenses)
  } catch (err) {
    if (err instanceof AppError) return apiError(err.code, err.code === 'UNAUTHORIZED' ? 401 : 404)
    console.error('[GET /api/budget/template/expenses]', err)
    return apiError('INTERNAL_ERROR', 500)
  }
}

export async function PUT(req: Request) {
  try {
    const session = await requireAuth()
    return withRateLimit(session.userId, async () => {
      const body = await req.json()
      const validated = bulkUpdateTemplateExpensesSchema.safeParse(body)
      if (!validated.success) return apiError('VALIDATION_ERROR', 400, validated.error.flatten())

      await budgetService.bulkUpdateTemplateExpenses(session.userId, validated.data)
      const template = await budgetService.getTemplate(session.userId)
      return apiSuccess(template.expenses)
    })
  } catch (err) {
    if (err instanceof AppError) return apiError(err.code, err.code === 'UNAUTHORIZED' ? 401 : 500)
    console.error('[PUT /api/budget/template/expenses]', err)
    return apiError('INTERNAL_ERROR', 500)
  }
}
