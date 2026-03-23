import { requireAuth } from '@/lib/auth'
import { apiSuccess, apiError } from '@/lib/api-response'
import { withRateLimit } from '@/lib/rate-limit'
import { AppError } from '@/types/common.types'
import { vehicleService } from '@/modules/vehicles/vehicles.service'
import { createVehicleSchema } from '@/modules/vehicles/vehicles.schema'

export async function GET() {
  try {
    const session = await requireAuth()
    const vehicles = await vehicleService.getMany(session.userId)
    return apiSuccess(vehicles)
  } catch (err) {
    if (err instanceof AppError) {
      return apiError(err.code, err.code === 'UNAUTHORIZED' ? 401 : 500)
    }
    console.error('[GET /api/vehicles]', err)
    return apiError('INTERNAL_ERROR', 500)
  }
}

export async function POST(req: Request) {
  try {
    const session = await requireAuth()
    return withRateLimit(session.userId, async () => {
      const body = await req.json()
      const validated = createVehicleSchema.safeParse(body)
      if (!validated.success) return apiError('VALIDATION_ERROR', 400, validated.error)

      const vehicle = await vehicleService.create(validated.data, session.userId)
      return apiSuccess(vehicle, 201)
    })
  } catch (err) {
    if (err instanceof AppError) {
      return apiError(err.code, err.code === 'UNAUTHORIZED' ? 401 : 500)
    }
    console.error('[POST /api/vehicles]', err)
    return apiError('INTERNAL_ERROR', 500)
  }
}
