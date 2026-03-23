import { requireAuth } from '@/lib/auth'
import { apiSuccess, apiError } from '@/lib/api-response'
import { withRateLimit } from '@/lib/rate-limit'
import { AppError } from '@/types/common.types'
import { insuranceService } from '@/modules/vehicles/vehicles.service'
import { updateInsuranceSchema } from '@/modules/vehicles/vehicles.schema'
import { vehicleRepository } from '@/modules/vehicles/vehicles.repository'

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ slug: string; iid: string }> }
) {
  try {
    const session = await requireAuth()
    const { slug, iid } = await params
    const vehicle = await vehicleRepository.getBySlug(slug, session.userId)
    if (!vehicle) return apiError('NOT_FOUND', 404)
    const id = vehicle.id
    return withRateLimit(session.userId, async () => {
      const body = await req.json()
      const validated = updateInsuranceSchema.safeParse(body)
      if (!validated.success) return apiError('VALIDATION_ERROR', 400, validated.error)

      const insurance = await insuranceService.update(iid, id, validated.data, session.userId)
      return apiSuccess(insurance)
    })
  } catch (err) {
    if (err instanceof AppError) {
      const status = err.code === 'UNAUTHORIZED' ? 401 : err.code === 'NOT_FOUND' ? 404 : 500
      return apiError(err.code, status)
    }
    console.error('[PATCH /api/vehicles/[slug]/insurance/[iid]]', err)
    return apiError('INTERNAL_ERROR', 500)
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ slug: string; iid: string }> }
) {
  try {
    const session = await requireAuth()
    const { slug, iid } = await params
    const vehicle = await vehicleRepository.getBySlug(slug, session.userId)
    if (!vehicle) return apiError('NOT_FOUND', 404)
    const id = vehicle.id
    return withRateLimit(session.userId, async () => {
      await insuranceService.delete(iid, id, session.userId)
      return apiSuccess(null)
    })
  } catch (err) {
    if (err instanceof AppError) {
      const status = err.code === 'UNAUTHORIZED' ? 401 : err.code === 'NOT_FOUND' ? 404 : 500
      return apiError(err.code, status)
    }
    console.error('[DELETE /api/vehicles/[slug]/insurance/[iid]]', err)
    return apiError('INTERNAL_ERROR', 500)
  }
}
