import { requireAuth } from '@/lib/auth'
import { apiSuccess, apiError } from '@/lib/api-response'
import { withRateLimit } from '@/lib/rate-limit'
import { AppError } from '@/types/common.types'
import { vehicleService } from '@/modules/vehicles/vehicles.service'
import { vehicleRepository } from '@/modules/vehicles/vehicles.repository'

export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const session = await requireAuth()
    const { slug } = await params
    const vehicle = await vehicleRepository.getBySlug(slug, session.userId)
    if (!vehicle) return apiError('NOT_FOUND', 404)
    const id = vehicle.id
    return withRateLimit(session.userId, async () => {
      const formData = await req.formData()
      const file = formData.get('file')
      if (!(file instanceof File)) return apiError('VALIDATION_ERROR', 400)

      const result = await vehicleService.uploadPhoto(id, session.userId, file)
      return apiSuccess(result)
    })
  } catch (err) {
    if (err instanceof AppError) {
      const status = err.code === 'UNAUTHORIZED' ? 401 : err.code === 'NOT_FOUND' ? 404 : 500
      return apiError(err.code, status)
    }
    console.error('[POST /api/vehicles/[slug]/photo]', err)
    return apiError('INTERNAL_ERROR', 500)
  }
}
