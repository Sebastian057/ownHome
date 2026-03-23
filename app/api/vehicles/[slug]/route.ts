import { requireAuth } from '@/lib/auth'
import { apiSuccess, apiError } from '@/lib/api-response'
import { withRateLimit } from '@/lib/rate-limit'
import { AppError } from '@/types/common.types'
import { vehicleService } from '@/modules/vehicles/vehicles.service'
import { vehicleRepository } from '@/modules/vehicles/vehicles.repository'
import { updateVehicleSchema } from '@/modules/vehicles/vehicles.schema'

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const session = await requireAuth()
    const { slug } = await params
    const vehicle = await vehicleService.getBySlug(slug, session.userId)
    return apiSuccess(vehicle)
  } catch (err) {
    if (err instanceof AppError) {
      const status = err.code === 'UNAUTHORIZED' ? 401 : err.code === 'NOT_FOUND' ? 404 : 500
      return apiError(err.code, status)
    }
    console.error('[GET /api/vehicles/[slug]]', err)
    return apiError('INTERNAL_ERROR', 500)
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const session = await requireAuth()
    const { slug } = await params
    return withRateLimit(session.userId, async () => {
      const vehicle = await vehicleRepository.getBySlug(slug, session.userId)
      if (!vehicle) return apiError('NOT_FOUND', 404)

      const body = await req.json()
      const validated = updateVehicleSchema.safeParse(body)
      if (!validated.success) return apiError('VALIDATION_ERROR', 400, validated.error)

      const updated = await vehicleService.update(vehicle.id, validated.data, session.userId)
      return apiSuccess(updated)
    })
  } catch (err) {
    if (err instanceof AppError) {
      const status = err.code === 'UNAUTHORIZED' ? 401 : err.code === 'NOT_FOUND' ? 404 : 500
      return apiError(err.code, status)
    }
    console.error('[PATCH /api/vehicles/[slug]]', err)
    return apiError('INTERNAL_ERROR', 500)
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const session = await requireAuth()
    const { slug } = await params
    return withRateLimit(session.userId, async () => {
      const vehicle = await vehicleRepository.getBySlug(slug, session.userId)
      if (!vehicle) return apiError('NOT_FOUND', 404)

      await vehicleService.delete(vehicle.id, session.userId)
      return apiSuccess(null)
    })
  } catch (err) {
    if (err instanceof AppError) {
      const status = err.code === 'UNAUTHORIZED' ? 401 : err.code === 'NOT_FOUND' ? 404 : 500
      return apiError(err.code, status)
    }
    console.error('[DELETE /api/vehicles/[slug]]', err)
    return apiError('INTERNAL_ERROR', 500)
  }
}
