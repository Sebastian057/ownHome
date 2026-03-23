import { requireAuth } from '@/lib/auth'
import { apiSuccess, apiError } from '@/lib/api-response'
import { withRateLimit } from '@/lib/rate-limit'
import { AppError } from '@/types/common.types'
import { confirmPaymentSchema } from '@/modules/obligations/obligations.schema'
import { obligationService } from '@/modules/obligations/obligations.service'

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAuth()
    const { id } = await params
    return withRateLimit(session.userId, async () => {
      const body = await req.json()
      const validated = confirmPaymentSchema.safeParse(body)
      if (!validated.success) return apiError('VALIDATION_ERROR', 400, validated.error.flatten())

      // year/month come from query params — UI always knows which month it's operating on
      const { searchParams } = new URL(req.url)
      const year = Number(searchParams.get('year') ?? new Date().getFullYear())
      const month = Number(searchParams.get('month') ?? new Date().getMonth() + 1)
      const payment = await obligationService.confirmPayment(id, session.userId, year, month, validated.data)
      return apiSuccess(payment)
    })
  } catch (err) {
    if (err instanceof AppError) {
      const status = err.code === 'UNAUTHORIZED' ? 401 : err.code === 'NOT_FOUND' ? 404 : err.code === 'CONFLICT' ? 409 : 500
      return apiError(err.code, status, err.message)
    }
    console.error('[POST /api/recurring/[id]/confirm]', err)
    return apiError('INTERNAL_ERROR', 500)
  }
}
