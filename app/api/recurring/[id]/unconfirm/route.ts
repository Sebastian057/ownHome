import { requireAuth } from '@/lib/auth'
import { apiSuccess, apiError } from '@/lib/api-response'
import { withRateLimit } from '@/lib/rate-limit'
import { AppError } from '@/types/common.types'
import { z } from 'zod'
import { obligationService } from '@/modules/obligations/obligations.service'

const querySchema = z.object({
  year: z.coerce.number().int().min(2020).max(2100),
  month: z.coerce.number().int().min(1).max(12),
})

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAuth()
    const { id } = await params
    return withRateLimit(session.userId, async () => {
      const { searchParams } = new URL(req.url)
      const q = querySchema.safeParse({ year: searchParams.get('year'), month: searchParams.get('month') })
      if (!q.success) return apiError('VALIDATION_ERROR', 400, q.error.flatten())

      await obligationService.unconfirmPayment(id, session.userId, q.data.year, q.data.month)
      return apiSuccess({ reverted: true })
    })
  } catch (err) {
    if (err instanceof AppError) {
      const status = err.code === 'UNAUTHORIZED' ? 401 : err.code === 'NOT_FOUND' ? 404 : err.code === 'CONFLICT' ? 409 : 500
      return apiError(err.code, status, err.message)
    }
    console.error('[DELETE /api/recurring/[id]/unconfirm]', err)
    return apiError('INTERNAL_ERROR', 500)
  }
}
