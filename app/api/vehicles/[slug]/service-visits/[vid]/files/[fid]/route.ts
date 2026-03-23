import { requireAuth } from '@/lib/auth'
import { apiSuccess, apiError } from '@/lib/api-response'
import { withRateLimit } from '@/lib/rate-limit'
import { AppError } from '@/types/common.types'
import { serviceVisitFileService } from '@/modules/vehicles/vehicles.service'
import { vehicleRepository } from '@/modules/vehicles/vehicles.repository'

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ slug: string; vid: string; fid: string }> }
) {
  try {
    const session = await requireAuth()
    const { slug, fid } = await params
    const vehicle = await vehicleRepository.getBySlug(slug, session.userId)
    if (!vehicle) return apiError('NOT_FOUND', 404)
    return withRateLimit(session.userId, async () => {
      await serviceVisitFileService.deleteFile(fid, session.userId)
      return apiSuccess(null)
    })
  } catch (err) {
    if (err instanceof AppError) {
      const status = err.code === 'UNAUTHORIZED' ? 401 : err.code === 'NOT_FOUND' ? 404 : 500
      return apiError(err.code, status)
    }
    console.error('[DELETE /api/vehicles/[slug]/service-visits/[vid]/files/[fid]]', err)
    return apiError('INTERNAL_ERROR', 500)
  }
}
