import { requireAuth } from '@/lib/auth'
import { apiSuccess, apiError } from '@/lib/api-response'
import { withRateLimit } from '@/lib/rate-limit'
import { AppError } from '@/types/common.types'
import { createSubscriptionSchema, listSubscriptionsQuerySchema } from '@/modules/subscriptions/subscriptions.schema'
import { subscriptionService } from '@/modules/subscriptions/subscriptions.service'

export async function GET(req: Request) {
  try {
    const session = await requireAuth()
    const { searchParams } = new URL(req.url)
    const query = listSubscriptionsQuerySchema.safeParse({
      active: searchParams.get('active') ?? undefined,
      upcoming: searchParams.get('upcoming') ?? undefined,
    })
    if (!query.success) return apiError('VALIDATION_ERROR', 400, query.error.flatten())

    const subs = await subscriptionService.getMany(session.userId, {
      active: query.data.active,
      upcomingDays: query.data.upcoming,
    })
    return apiSuccess(subs)
  } catch (err) {
    if (err instanceof AppError) return apiError(err.code, err.code === 'UNAUTHORIZED' ? 401 : 500)
    console.error('[GET /api/subscriptions]', err)
    return apiError('INTERNAL_ERROR', 500)
  }
}

export async function POST(req: Request) {
  try {
    const session = await requireAuth()
    return withRateLimit(session.userId, async () => {
      const body = await req.json()
      const validated = createSubscriptionSchema.safeParse(body)
      if (!validated.success) return apiError('VALIDATION_ERROR', 400, validated.error.flatten())

      const sub = await subscriptionService.create(validated.data, session.userId)
      return apiSuccess(sub, 201)
    })
  } catch (err) {
    if (err instanceof AppError) return apiError(err.code, err.code === 'UNAUTHORIZED' ? 401 : 500)
    console.error('[POST /api/subscriptions]', err)
    return apiError('INTERNAL_ERROR', 500)
  }
}
