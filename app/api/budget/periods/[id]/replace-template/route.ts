import { requireAuth } from '@/lib/auth'
import { apiSuccess, apiError } from '@/lib/api-response'
import { withRateLimit } from '@/lib/rate-limit'
import { budgetService } from '@/modules/budget/budget.service'
import { AppError } from '@/types/common.types'

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAuth()
    return withRateLimit(session.userId, async () => {
      const { id } = await params

      try {
        const period = await budgetService.replaceWithTemplate(id, session.userId)
        return apiSuccess(period)
      } catch (err) {
        if (err instanceof AppError) {
          if (err.code === 'NOT_FOUND') return apiError('NOT_FOUND', 404)
        }
        throw err
      }
    })
  } catch (err) {
    if (err instanceof AppError) {
      if (err.code === 'UNAUTHORIZED') return apiError('UNAUTHORIZED', 401)
    }
    throw err
  }
}
