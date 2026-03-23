import { requireAuth } from '@/lib/auth'
import { apiSuccess, apiError } from '@/lib/api-response'
import { withRateLimit } from '@/lib/rate-limit'
import { AppError } from '@/types/common.types'
import { bulkUpdatePlansSchema } from '@/modules/budget/budget.schema'
import { budgetService } from '@/modules/budget/budget.service'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAuth()
    const { id } = await params
    const plans = await budgetService.listCategoryPlans(id, session.userId)
    return apiSuccess(plans)
  } catch (err) {
    if (err instanceof AppError) {
      const status = err.code === 'UNAUTHORIZED' ? 401 : err.code === 'NOT_FOUND' ? 404 : 500
      return apiError(err.code, status)
    }
    console.error('[GET /api/budget/periods/[id]/plans]', err)
    return apiError('INTERNAL_ERROR', 500)
  }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAuth()
    const { id } = await params
    return withRateLimit(session.userId, async () => {
      const body = await req.json()
      const validated = bulkUpdatePlansSchema.safeParse(body)
      if (!validated.success) return apiError('VALIDATION_ERROR', 400, validated.error.flatten())

      const plans = await budgetService.bulkUpsertCategoryPlans(id, session.userId, validated.data)
      return apiSuccess(plans)
    })
  } catch (err) {
    if (err instanceof AppError) {
      const status = err.code === 'UNAUTHORIZED' ? 401 : err.code === 'NOT_FOUND' ? 404 : 500
      return apiError(err.code, status)
    }
    console.error('[PUT /api/budget/periods/[id]/plans]', err)
    return apiError('INTERNAL_ERROR', 500)
  }
}
