import { requireAuth } from '@/lib/auth'
import { apiSuccess, apiError } from '@/lib/api-response'
import { withRateLimit } from '@/lib/rate-limit'
import { AppError } from '@/types/common.types'
import { subscriptionService } from '@/modules/subscriptions/subscriptions.service'

export async function POST() {
  try {
    const session = await requireAuth()
    return withRateLimit(session.userId, async () => {
      const result = await subscriptionService.processDueSubscriptions(session.userId)
      return apiSuccess(result)
    })
  } catch (err) {
    if (err instanceof AppError) {
      const status = err.code === 'UNAUTHORIZED' ? 401 : 500
      return apiError(err.code, status)
    }
    console.error('[POST /api/subscriptions/process-due]', err)
    return apiError('INTERNAL_ERROR', 500)
  }
}
