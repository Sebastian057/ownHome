import { requireAuth } from '@/lib/auth'
import { apiSuccess, apiError } from '@/lib/api-response'
import { withRateLimit } from '@/lib/rate-limit'
import { AppError } from '@/types/common.types'
import { createReadingSchema, listReadingsQuerySchema } from '@/modules/meters/meters.schema'
import { metersService } from '@/modules/meters/meters.service'
import type { MeterType } from '@/modules/meters/meters.types'

export async function GET(req: Request) {
  try {
    const session = await requireAuth()
    const { searchParams } = new URL(req.url)

    const query = listReadingsQuerySchema.safeParse({
      type: searchParams.get('type') ?? undefined,
      dateFrom: searchParams.get('dateFrom') ?? undefined,
      dateTo: searchParams.get('dateTo') ?? undefined,
      page: searchParams.get('page') ?? undefined,
      limit: searchParams.get('limit') ?? undefined,
    })
    if (!query.success) return apiError('VALIDATION_ERROR', 400, query.error.flatten())

    const result = await metersService.getManyReadings(session.userId, {
      ...query.data,
      type: query.data.type as MeterType | undefined,
    })
    return apiSuccess(result.readings, 200, result.meta)
  } catch (err) {
    if (err instanceof AppError) return apiError(err.code, err.code === 'UNAUTHORIZED' ? 401 : 404)
    console.error('[GET /api/meters/readings]', err)
    return apiError('INTERNAL_ERROR', 500)
  }
}

export async function POST(req: Request) {
  try {
    const session = await requireAuth()
    return withRateLimit(session.userId, async () => {
      const body = await req.json()
      const validated = createReadingSchema.safeParse(body)
      if (!validated.success) return apiError('VALIDATION_ERROR', 400, validated.error.flatten())

      const reading = await metersService.createReading(validated.data, session.userId)
      return apiSuccess(reading, 201)
    })
  } catch (err) {
    if (err instanceof AppError) {
      if (err.code === 'UNAUTHORIZED') return apiError(err.code, 401)
      if (err.code === 'VALIDATION_ERROR') return apiError(err.code, 400, err.message)
      return apiError(err.code, 400)
    }
    console.error('[POST /api/meters/readings]', err)
    return apiError('INTERNAL_ERROR', 500)
  }
}
