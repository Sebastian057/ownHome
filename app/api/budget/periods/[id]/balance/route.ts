import { requireAuth } from '@/lib/auth'
import { apiSuccess, apiError } from '@/lib/api-response'
import { withRateLimit } from '@/lib/rate-limit'
import { budgetService } from '@/modules/budget/budget.service'
import { updateBalanceSchema } from '@/modules/budget/budget.schema'
import { AppError } from '@/types/common.types'

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAuth()
    return withRateLimit(session.userId, async () => {
      const { id } = await params

      const body = await req.json()
      const validated = updateBalanceSchema.safeParse(body)
      if (!validated.success) return apiError('VALIDATION_ERROR', 400, validated.error)

      try {
        const period = await budgetService.updateBalance(id, session.userId, validated.data)
        return apiSuccess(period)
      } catch (err) {
        if (err instanceof AppError) {
          if (err.code === 'NOT_FOUND') return apiError('NOT_FOUND', 404)
        }
        throw err
      }
    })
  } catch (err) {
    if (err instanceof AppError) {
      if (err.code === 'UNAUTHORIZED') return apiError('UNAUTHORIZED', 401)
    }
    throw err
  }
}
