import { requireAuth } from '@/lib/auth'
import { apiSuccess, apiError } from '@/lib/api-response'
import { withRateLimit } from '@/lib/rate-limit'
import { updateBudgetCategorySchema } from '@/modules/budget/budget.schema'
import { budgetService } from '@/modules/budget/budget.service'
import { profileRepository } from '@/modules/profile/module.repository'
import { AppError } from '@/types/common.types'

async function requireAdmin(userId: string): Promise<boolean> {
  const profile = await profileRepository.getByUserId(userId)
  return profile?.role === 'admin'
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAuth()
    return withRateLimit(session.userId, async () => {
      if (!(await requireAdmin(session.userId))) return apiError('FORBIDDEN', 403)

      const { id } = await params
      const body = await req.json()
      const validated = updateBudgetCategorySchema.safeParse(body)
      if (!validated.success) return apiError('VALIDATION_ERROR', 400, validated.error)

      try {
        const category = await budgetService.updateCategory(id, validated.data)
        return apiSuccess(category)
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

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAuth()
    return withRateLimit(session.userId, async () => {
      if (!(await requireAdmin(session.userId))) return apiError('FORBIDDEN', 403)

      const { id } = await params

      try {
        await budgetService.deleteCategory(id)
        return apiSuccess({ deleted: true })
      } catch (err) {
        if (err instanceof AppError) {
          if (err.code === 'NOT_FOUND') return apiError('NOT_FOUND', 404)
          if (err.code === 'FORBIDDEN') return apiError('FORBIDDEN', 403, err.message)
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
