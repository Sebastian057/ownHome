import { requireAuth } from '@/lib/auth'
import { apiSuccess, apiError } from '@/lib/api-response'
import { withRateLimit } from '@/lib/rate-limit'
import { AppError } from '@/types/common.types'
import { createRecurringTemplateSchema } from '@/modules/obligations/obligations.schema'
import { obligationService } from '@/modules/obligations/obligations.service'

export async function GET() {
  try {
    const session = await requireAuth()
    const templates = await obligationService.getMany(session.userId)
    return apiSuccess(templates)
  } catch (err) {
    if (err instanceof AppError) return apiError(err.code, err.code === 'UNAUTHORIZED' ? 401 : 500)
    console.error('[GET /api/recurring]', err)
    return apiError('INTERNAL_ERROR', 500)
  }
}

export async function POST(req: Request) {
  try {
    const session = await requireAuth()
    return withRateLimit(session.userId, async () => {
      const body = await req.json()
      const validated = createRecurringTemplateSchema.safeParse(body)
      if (!validated.success) return apiError('VALIDATION_ERROR', 400, validated.error.flatten())

      const template = await obligationService.create(validated.data, session.userId)
      return apiSuccess(template, 201)
    })
  } catch (err) {
    if (err instanceof AppError) return apiError(err.code, err.code === 'UNAUTHORIZED' ? 401 : 500)
    console.error('[POST /api/recurring]', err)
    return apiError('INTERNAL_ERROR', 500)
  }
}
