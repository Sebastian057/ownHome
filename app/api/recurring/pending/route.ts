import { requireAuth } from '@/lib/auth'
import { apiSuccess, apiError } from '@/lib/api-response'
import { AppError } from '@/types/common.types'
import { pendingQuerySchema } from '@/modules/obligations/obligations.schema'
import { obligationService } from '@/modules/obligations/obligations.service'

export async function GET(req: Request) {
  try {
    const session = await requireAuth()
    const { searchParams } = new URL(req.url)

    const query = pendingQuerySchema.safeParse({
      year: searchParams.get('year'),
      month: searchParams.get('month'),
    })
    if (!query.success) return apiError('VALIDATION_ERROR', 400, query.error.flatten())

    const items = await obligationService.getMonthView(session.userId, query.data.year, query.data.month)
    return apiSuccess(items)
  } catch (err) {
    if (err instanceof AppError) {
      const status = err.code === 'UNAUTHORIZED' ? 401 : err.code === 'VALIDATION_ERROR' ? 400 : 500
      return apiError(err.code, status, err.message)
    }
    console.error('[GET /api/recurring/pending]', err)
    return apiError('INTERNAL_ERROR', 500)
  }
}
