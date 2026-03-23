import { requireAuth } from '@/lib/auth'
import { apiSuccess, apiError } from '@/lib/api-response'
import { withRateLimit } from '@/lib/rate-limit'
import { AppError } from '@/types/common.types'
import { serviceVisitService } from '@/modules/vehicles/vehicles.service'
import { createServiceVisitSchema, serviceVisitCursorSchema } from '@/modules/vehicles/vehicles.schema'
import { vehicleRepository } from '@/modules/vehicles/vehicles.repository'

export async function GET(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const session = await requireAuth()
    const { slug } = await params
    const vehicle = await vehicleRepository.getBySlug(slug, session.userId)
    if (!vehicle) return apiError('NOT_FOUND', 404)
    const id = vehicle.id
    const url = new URL(req.url)
    const query = serviceVisitCursorSchema.safeParse({
      cursor: url.searchParams.get('cursor') ?? undefined,
      limit: url.searchParams.get('limit') ?? undefined,
    })
    if (!query.success) return apiError('VALIDATION_ERROR', 400, query.error)

    const result = await serviceVisitService.getMany(
      id,
      session.userId,
      query.data.cursor,
      query.data.limit
    )
    return apiSuccess(result)
  } catch (err) {
    if (err instanceof AppError) {
      const status = err.code === 'UNAUTHORIZED' ? 401 : err.code === 'NOT_FOUND' ? 404 : 500
      return apiError(err.code, status)
    }
    console.error('[GET /api/vehicles/[slug]/service-visits]', err)
    return apiError('INTERNAL_ERROR', 500)
  }
}

export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const session = await requireAuth()
    const { slug } = await params
    const vehicle = await vehicleRepository.getBySlug(slug, session.userId)
    if (!vehicle) return apiError('NOT_FOUND', 404)
    const id = vehicle.id
    return withRateLimit(session.userId, async () => {
      const body = await req.json()
      const validated = createServiceVisitSchema.safeParse(body)
      if (!validated.success) return apiError('VALIDATION_ERROR', 400, validated.error)

      const visit = await serviceVisitService.create(validated.data, id, session.userId)
      return apiSuccess(visit, 201)
    })
  } catch (err) {
    if (err instanceof AppError) {
      const status = err.code === 'UNAUTHORIZED' ? 401 : err.code === 'NOT_FOUND' ? 404 : 500
      return apiError(err.code, status)
    }
    console.error('[POST /api/vehicles/[slug]/service-visits]', err)
    return apiError('INTERNAL_ERROR', 500)
  }
}
