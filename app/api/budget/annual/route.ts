import { requireAuth } from '@/lib/auth'
import { apiSuccess, apiError } from '@/lib/api-response'
import { AppError } from '@/types/common.types'
import { annualQuerySchema } from '@/modules/budget/budget.schema'
import { budgetService } from '@/modules/budget/budget.service'

export async function GET(req: Request) {
  try {
    const session = await requireAuth()
    const { searchParams } = new URL(req.url)
    const query = annualQuerySchema.safeParse({ year: searchParams.get('year') ?? undefined })
    if (!query.success) return apiError('VALIDATION_ERROR', 400, query.error.flatten())

    const annual = await budgetService.getAnnual(session.userId, query.data)
    return apiSuccess(annual)
  } catch (err) {
    if (err instanceof AppError) {
      const status = err.code === 'UNAUTHORIZED' ? 401 : err.code === 'VALIDATION_ERROR' ? 400 : 500
      return apiError(err.code, status)
    }
    console.error('[GET /api/budget/annual]', err)
    return apiError('INTERNAL_ERROR', 500)
  }
}
