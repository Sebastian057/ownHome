import { z } from 'zod'
import { requireAuth } from '@/lib/auth'
import { apiSuccess, apiError } from '@/lib/api-response'
import { AppError } from '@/types/common.types'
import { metersService } from '@/modules/meters/meters.service'
import type { MeterType } from '@/modules/meters/meters.types'

const statsQuerySchema = z.object({
  type: z.enum(['WATER', 'ELECTRICITY', 'GAS']),
  year: z.coerce.number().int().min(2000).max(2100),
})

export async function GET(req: Request) {
  try {
    const session = await requireAuth()
    const { searchParams } = new URL(req.url)

    const validated = statsQuerySchema.safeParse({
      type: searchParams.get('type'),
      year: searchParams.get('year'),
    })
    if (!validated.success)
      return apiError('VALIDATION_ERROR', 400, validated.error.flatten())

    const data = await metersService.getConsumptionByYear(
      session.userId,
      validated.data.type as MeterType,
      validated.data.year
    )
    return apiSuccess(data)
  } catch (err) {
    if (err instanceof AppError)
      return apiError(err.code, err.code === 'UNAUTHORIZED' ? 401 : 404)
    console.error('[GET /api/meters/stats]', err)
    return apiError('INTERNAL_ERROR', 500)
  }
}
