import { requireAuth } from '@/lib/auth'
import { apiSuccess, apiError } from '@/lib/api-response'
import { AppError } from '@/types/common.types'
import { maintenanceService } from '@/modules/vehicles/vehicles.service'
import { vehicleRepository } from '@/modules/vehicles/vehicles.repository'

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const session = await requireAuth()
    const { slug } = await params
    const vehicle = await vehicleRepository.getBySlug(slug, session.userId)
    if (!vehicle) return apiError('NOT_FOUND', 404)
    const id = vehicle.id
    const items = await maintenanceService.getMany(id, session.userId)
    return apiSuccess(items)
  } catch (err) {
    if (err instanceof AppError) {
      const status = err.code === 'UNAUTHORIZED' ? 401 : err.code === 'NOT_FOUND' ? 404 : 500
      return apiError(err.code, status)
    }
    console.error('[GET /api/vehicles/[slug]/maintenance]', err)
    return apiError('INTERNAL_ERROR', 500)
  }
}
