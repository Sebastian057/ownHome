import { requireAuth } from '@/lib/auth'
import { apiSuccess, apiError } from '@/lib/api-response'
import { withRateLimit } from '@/lib/rate-limit'
import { AppError } from '@/types/common.types'
import { createTransactionSchema, transactionsQuerySchema } from '@/modules/budget/budget.schema'
import { budgetService } from '@/modules/budget/budget.service'
import type { TransactionSource } from '@prisma/client'

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAuth()
    const { id } = await params
    const { searchParams } = new URL(req.url)
    const query = transactionsQuerySchema.safeParse({
      category: searchParams.get('category') ?? undefined,
      source: searchParams.get('source') ?? undefined,
    })
    if (!query.success) return apiError('VALIDATION_ERROR', 400, query.error.flatten())

    const transactions = await budgetService.listTransactions(id, session.userId, {
      category: query.data.category,
      source: query.data.source as TransactionSource | undefined,
    })
    return apiSuccess(transactions)
  } catch (err) {
    if (err instanceof AppError) {
      const status = err.code === 'UNAUTHORIZED' ? 401 : err.code === 'NOT_FOUND' ? 404 : 500
      return apiError(err.code, status)
    }
    console.error('[GET /api/budget/periods/[id]/transactions]', err)
    return apiError('INTERNAL_ERROR', 500)
  }
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAuth()
    const { id } = await params
    return withRateLimit(session.userId, async () => {
      const body = await req.json()
      const validated = createTransactionSchema.safeParse(body)
      if (!validated.success) return apiError('VALIDATION_ERROR', 400, validated.error.flatten())

      const tx = await budgetService.createTransaction(id, session.userId, validated.data)
      return apiSuccess(tx, 201)
    })
  } catch (err) {
    if (err instanceof AppError) {
      const status = err.code === 'UNAUTHORIZED' ? 401 : err.code === 'NOT_FOUND' ? 404 : 500
      return apiError(err.code, status)
    }
    console.error('[POST /api/budget/periods/[id]/transactions]', err)
    return apiError('INTERNAL_ERROR', 500)
  }
}
