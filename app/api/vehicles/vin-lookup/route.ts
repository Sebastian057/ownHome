import { requireAuth } from '@/lib/auth'
import { apiSuccess, apiError } from '@/lib/api-response'
import { withRateLimit } from '@/lib/rate-limit'
import { AppError } from '@/types/common.types'
import { vinLookupService } from '@/modules/vehicles/vehicles.service'
import { vinLookupSchema } from '@/modules/vehicles/vehicles.schema'

export async function POST(req: Request) {
  try {
    const session = await requireAuth()
    return withRateLimit(session.userId, async () => {
      const body = await req.json()
      const validated = vinLookupSchema.safeParse(body)
      if (!validated.success) return apiError('VALIDATION_ERROR', 400, validated.error)

      const result = await vinLookupService.lookup(validated.data.vin, session.userId)
      return apiSuccess(result)
    })
  } catch (err) {
    if (err instanceof AppError) {
      const status = err.code === 'UNAUTHORIZED' ? 401 : 500
      return apiError(err.code, status)
    }
    console.error('[POST /api/vehicles/vin-lookup]', err)
    return apiError('INTERNAL_ERROR', 500)
  }
}
