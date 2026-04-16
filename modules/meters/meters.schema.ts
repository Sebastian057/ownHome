import { z } from 'zod'

export const createReadingSchema = z.object({
  type: z.enum(['WATER', 'ELECTRICITY', 'GAS']),
  value: z.number().positive(),
  readingDate: z.coerce.date(),
  notes: z.string().trim().max(500).optional(),
})

export const updateReadingSchema = z.object({
  value: z.number().positive().optional(),
  readingDate: z.coerce.date().optional(),
  notes: z.string().trim().max(500).nullable().optional(),
})

export const listReadingsQuerySchema = z.object({
  type: z.enum(['WATER', 'ELECTRICITY', 'GAS']).optional(),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})

export const meterSummaryQuerySchema = z.object({
  type: z.enum(['WATER', 'ELECTRICITY', 'GAS']),
})
