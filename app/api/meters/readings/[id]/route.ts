import { requireAuth } from '@/lib/auth'
import { apiSuccess, apiError } from '@/lib/api-response'
import { withRateLimit } from '@/lib/rate-limit'
import { AppError } from '@/types/common.types'
import { updateReadingSchema } from '@/modules/meters/meters.schema'
import { metersService } from '@/modules/meters/meters.service'

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAuth()
    return withRateLimit(session.userId, async () => {
      const { id } = await params
      const body = await req.json()
      const validated = updateReadingSchema.safeParse(body)
      if (!validated.success) return apiError('VALIDATION_ERROR', 400, validated.error.flatten())

      await metersService.updateReading(id, session.userId, validated.data)
      return apiSuccess(null)
    })
  } catch (err) {
    if (err instanceof AppError) {
      if (err.code === 'UNAUTHORIZED') return apiError(err.code, 401)
      if (err.code === 'NOT_FOUND') return apiError(err.code, 404)
      return apiError(err.code, 400)
    }
    console.error('[PATCH /api/meters/readings/[id]]', err)
    return apiError('INTERNAL_ERROR', 500)
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAuth()
    return withRateLimit(session.userId, async () => {
      const { id } = await params
      await metersService.deleteReading(id, session.userId)
      return apiSuccess(null)
    })
  } catch (err) {
    if (err instanceof AppError) {
      if (err.code === 'UNAUTHORIZED') return apiError(err.code, 401)
      if (err.code === 'NOT_FOUND') return apiError(err.code, 404)
      return apiError(err.code, 400)
    }
    console.error('[DELETE /api/meters/readings/[id]]', err)
    return apiError('INTERNAL_ERROR', 500)
  }
}
