import type { z } from 'zod'
import type {
  createReadingSchema,
  updateReadingSchema,
  listReadingsQuerySchema,
} from './meters.schema'

// Define locally — Prisma client may not expose this enum until TS server restarts
export type MeterType = 'WATER' | 'ELECTRICITY' | 'GAS'

export interface MeterReading {
  id: string
  userId: string
  type: MeterType
  value: string // Decimal serialized as string
  readingDate: Date
  notes: string | null
  createdAt: Date
  deletedAt: Date | null
}

export interface MeterReadingWithConsumption extends MeterReading {
  consumption: number | null // null for first reading of this type
  isAnomaly: boolean
}

export interface SparklinePoint {
  date: string // formatted 'MM.YY'
  consumption: number
}

export interface MeterSummary {
  latestValue: number | null
  latestDate: Date | null
  currentMonthConsumption: number | null
  previousMonthConsumption: number | null
  sparklineData: SparklinePoint[]
}

export interface MonthlyConsumption {
  month: number
  label: string
  consumption: number | null
}

export type CreateReadingDto = z.infer<typeof createReadingSchema>
export type UpdateReadingDto = z.infer<typeof updateReadingSchema>
export type ListReadingsQuery = z.infer<typeof listReadingsQuerySchema>
