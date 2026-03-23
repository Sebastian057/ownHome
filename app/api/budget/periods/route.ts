import { requireAuth } from '@/lib/auth'
import { apiSuccess, apiError } from '@/lib/api-response'
import { withRateLimit } from '@/lib/rate-limit'
import { AppError } from '@/types/common.types'
import { createPeriodSchema, periodsQuerySchema } from '@/modules/budget/budget.schema'
import { budgetService } from '@/modules/budget/budget.service'

export async function GET(req: Request) {
  try {
    const session = await requireAuth()
    const { searchParams } = new URL(req.url)
    const query = periodsQuerySchema.safeParse({
      year: searchParams.get('year') ?? undefined,
      month: searchParams.get('month') ?? undefined,
    })
    if (!query.success) return apiError('VALIDATION_ERROR', 400, query.error.flatten())

    // If both year and month provided → return full detail for that month
    if (query.data.year !== undefined && query.data.month !== undefined) {
      const detail = await budgetService.getPeriodByYearMonth(query.data.year, query.data.month, session.userId)
      return apiSuccess(detail)
    }

    const periods = await budgetService.listPeriods(session.userId, query.data.year)
    return apiSuccess(periods)
  } catch (err) {
    if (err instanceof AppError) return apiError(err.code, err.code === 'UNAUTHORIZED' ? 401 : 500)
    console.error('[GET /api/budget/periods]', err)
    return apiError('INTERNAL_ERROR', 500)
  }
}

export async function POST(req: Request) {
  try {
    const session = await requireAuth()
    return withRateLimit(session.userId, async () => {
      const body = await req.json()
      const validated = createPeriodSchema.safeParse(body)
      if (!validated.success) return apiError('VALIDATION_ERROR', 400, validated.error.flatten())

      const period = await budgetService.createPeriod(validated.data, session.userId)
      return apiSuccess(period, 201)
    })
  } catch (err) {
    if (err instanceof AppError) {
      const status = err.code === 'UNAUTHORIZED' ? 401 : err.code === 'CONFLICT' ? 409 : 500
      return apiError(err.code, status, err.details)
    }
    console.error('[POST /api/budget/periods]', err)
    return apiError('INTERNAL_ERROR', 500)
  }
}
