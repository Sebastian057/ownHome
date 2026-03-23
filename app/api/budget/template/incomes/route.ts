import { requireAuth } from '@/lib/auth'
import { apiSuccess, apiError } from '@/lib/api-response'
import { withRateLimit } from '@/lib/rate-limit'
import { AppError } from '@/types/common.types'
import { createTemplateIncomeSchema } from '@/modules/budget/budget.schema'
import { budgetService } from '@/modules/budget/budget.service'

export async function GET() {
  try {
    const session = await requireAuth()
    const template = await budgetService.getTemplate(session.userId)
    return apiSuccess(template.incomes)
  } catch (err) {
    if (err instanceof AppError) return apiError(err.code, err.code === 'UNAUTHORIZED' ? 401 : 404)
    console.error('[GET /api/budget/template/incomes]', err)
    return apiError('INTERNAL_ERROR', 500)
  }
}

export async function POST(req: Request) {
  try {
    const session = await requireAuth()
    return withRateLimit(session.userId, async () => {
      const body = await req.json()
      const validated = createTemplateIncomeSchema.safeParse(body)
      if (!validated.success) return apiError('VALIDATION_ERROR', 400, validated.error.flatten())

      const income = await budgetService.createTemplateIncome(session.userId, validated.data)
      return apiSuccess(income, 201)
    })
  } catch (err) {
    if (err instanceof AppError) return apiError(err.code, err.code === 'UNAUTHORIZED' ? 401 : 500)
    console.error('[POST /api/budget/template/incomes]', err)
    return apiError('INTERNAL_ERROR', 500)
  }
}
