import { requireAuth } from '@/lib/auth'
import { apiSuccess, apiError } from '@/lib/api-response'
import { withRateLimit } from '@/lib/rate-limit'
import { AppError } from '@/types/common.types'
import { updateTransactionSchema } from '@/modules/budget/budget.schema'
import { budgetService } from '@/modules/budget/budget.service'

export async function PUT(req: Request, { params }: { params: Promise<{ id: string; txId: string }> }) {
  try {
    const session = await requireAuth()
    const { id, txId } = await params
    return withRateLimit(session.userId, async () => {
      const body = await req.json()
      const validated = updateTransactionSchema.safeParse(body)
      if (!validated.success) return apiError('VALIDATION_ERROR', 400, validated.error.flatten())

      const tx = await budgetService.updateTransaction(txId, id, session.userId, validated.data)
      return apiSuccess(tx)
    })
  } catch (err) {
    if (err instanceof AppError) {
      const status = err.code === 'UNAUTHORIZED' ? 401 : err.code === 'NOT_FOUND' ? 404 : err.code === 'FORBIDDEN' ? 403 : 500
      return apiError(err.code, status, err.message)
    }
    console.error('[PUT /api/budget/periods/[id]/transactions/[txId]]', err)
    return apiError('INTERNAL_ERROR', 500)
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string; txId: string }> }) {
  try {
    const session = await requireAuth()
    const { id, txId } = await params
    return withRateLimit(session.userId, async () => {
      await budgetService.deleteTransaction(txId, id, session.userId)
      return apiSuccess(null)
    })
  } catch (err) {
    if (err instanceof AppError) {
      const status = err.code === 'UNAUTHORIZED' ? 401 : err.code === 'NOT_FOUND' ? 404 : 500
      return apiError(err.code, status)
    }
    console.error('[DELETE /api/budget/periods/[id]/transactions/[txId]]', err)
    return apiError('INTERNAL_ERROR', 500)
  }
}
