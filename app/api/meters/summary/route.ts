import { requireAuth } from '@/lib/auth'
import { apiSuccess, apiError } from '@/lib/api-response'
import { AppError } from '@/types/common.types'
import { meterSummaryQuerySchema } from '@/modules/meters/meters.schema'
import { metersService } from '@/modules/meters/meters.service'
import type { MeterType } from '@/modules/meters/meters.types'

export async function GET(req: Request) {
  try {
    const session = await requireAuth()
    const { searchParams } = new URL(req.url)

    const query = meterSummaryQuerySchema.safeParse({ type: searchParams.get('type') })
    if (!query.success) return apiError('VALIDATION_ERROR', 400, query.error.flatten())

    const summary = await metersService.getMeterSummary(session.userId, query.data.type as MeterType)
    return apiSuccess(summary)
  } catch (err) {
    if (err instanceof AppError) return apiError(err.code, err.code === 'UNAUTHORIZED' ? 401 : 404)
    console.error('[GET /api/meters/summary]', err)
    return apiError('INTERNAL_ERROR', 500)
  }
}
