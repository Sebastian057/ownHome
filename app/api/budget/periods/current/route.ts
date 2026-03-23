import { requireAuth } from '@/lib/auth'
import { apiSuccess, apiError } from '@/lib/api-response'
import { AppError } from '@/types/common.types'
import { budgetService } from '@/modules/budget/budget.service'

export async function GET() {
  try {
    const session = await requireAuth()
    const period = await budgetService.getCurrentPeriod(session.userId)
    return apiSuccess(period)
  } catch (err) {
    if (err instanceof AppError) {
      const status = err.code === 'UNAUTHORIZED' ? 401 : err.code === 'NOT_FOUND' ? 404 : 500
      return apiError(err.code, status)
    }
    console.error('[GET /api/budget/periods/current]', err)
    return apiError('INTERNAL_ERROR', 500)
  }
}
