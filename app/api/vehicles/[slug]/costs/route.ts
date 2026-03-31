import { requireAuth } from '@/lib/auth'
import { apiSuccess, apiError } from '@/lib/api-response'
import { AppError } from '@/types/common.types'
import { vehicleCostsService } from '@/modules/vehicles/vehicles.service'
import { vehicleCostsQuerySchema } from '@/modules/vehicles/vehicles.schema'
import { vehicleRepository } from '@/modules/vehicles/vehicles.repository'

export async function GET(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const session = await requireAuth()
    const { slug } = await params
    const vehicle = await vehicleRepository.getBySlug(slug, session.userId)
    if (!vehicle) return apiError('NOT_FOUND', 404)
    const id = vehicle.id
    const url = new URL(req.url)
    const query = vehicleCostsQuerySchema.safeParse({
      year: url.searchParams.get('year') ?? undefined,
    })
    if (!query.success) return apiError('VALIDATION_ERROR', 400, query.error)

    const costs = await vehicleCostsService.getCosts(id, session.userId, query.data.year)
    return apiSuccess(costs)
  } catch (err) {
    if (err instanceof AppError) {
      const status = err.code === 'UNAUTHORIZED' ? 401 : err.code === 'NOT_FOUND' ? 404 : 500
      return apiError(err.code, status)
    }
    console.error('[GET /api/vehicles/[slug]/costs]', err)
    return apiError('INTERNAL_ERROR', 500)
  }
}
