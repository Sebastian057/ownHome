import { requireAuth } from '@/lib/auth'
import { apiSuccess, apiError } from '@/lib/api-response'
import { withRateLimit } from '@/lib/rate-limit'
import { createBudgetCategorySchema } from '@/modules/budget/budget.schema'
import { budgetService } from '@/modules/budget/budget.service'
import { AppError } from '@/types/common.types'

export async function GET() {
  try {
    await requireAuth()
    const categories = await budgetService.getAllCategories()
    return apiSuccess(categories)
  } catch (err) {
    if (err instanceof AppError) {
      if (err.code === 'UNAUTHORIZED') return apiError('UNAUTHORIZED', 401)
    }
    throw err
  }
}

export async function POST(req: Request) {
  try {
    const session = await requireAuth()
    return withRateLimit(session.userId, async () => {
      const body = await req.json()
      const validated = createBudgetCategorySchema.safeParse(body)
      if (!validated.success) return apiError('VALIDATION_ERROR', 400, validated.error)

      try {
        const category = await budgetService.createCategory(validated.data)
        return apiSuccess(category, 201)
      } catch (err) {
        if (err instanceof AppError) {
          if (err.code === 'CONFLICT') return apiError('CONFLICT', 409, err.message)
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
