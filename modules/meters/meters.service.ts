import { AppError } from '@/types/common.types'
import { eventEmitter } from '@/lib/event-emitter'
import { metersRepository } from './meters.repository'
import type {
  MeterType,
  MeterReading,
  MeterReadingWithConsumption,
  MeterSummary,
  SparklinePoint,
  MonthlyConsumption,
  CreateReadingDto,
  UpdateReadingDto,
  ListReadingsQuery,
} from './meters.types'

import type { PaginationMeta } from '@/types/common.types'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function toNumber(value: unknown): number {
  if (typeof value === 'number') return value
  if (typeof value === 'string') return parseFloat(value)
  // Prisma Decimal has toString()
  if (value !== null && value !== undefined && typeof (value as { toString(): string }).toString === 'function') {
    return parseFloat((value as { toString(): string }).toString())
  }
  return 0
}

function formatReadingDate(date: Date): string {
  return `${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getFullYear()).slice(-2)}`
}

/** Median of an array of numbers. Returns 0 for empty arrays. */
function median(values: number[]): number {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

function computeConsumptionAndAnomaly(
  readings: MeterReading[],
  extraOlderReading: MeterReading | null
): MeterReadingWithConsumption[] {
  // readings sorted DESC (newest first), extraOlderReading is just before the last one
  const allReadings = extraOlderReading ? [...readings, extraOlderReading] : readings

  return readings.map((reading, index) => {
    const olderReading = allReadings[index + 1] ?? null
    const consumption =
      olderReading !== null ? toNumber(reading.value) - toNumber(olderReading.value) : null

    // Anomaly: consumption > 3× median of previous readings' consumptions
    let isAnomaly = false
    if (consumption !== null && consumption > 0) {
      const prevConsumptions: number[] = []
      for (let i = index + 1; i < allReadings.length - 1; i++) {
        const next = allReadings[i + 1]
        if (next) {
          const c = toNumber(allReadings[i].value) - toNumber(next.value)
          if (c > 0) prevConsumptions.push(c)
        }
      }
      if (prevConsumptions.length >= 2) {
        const med = median(prevConsumptions)
        isAnomaly = consumption > med * 3
      }
    }

    return {
      ...reading,
      value: toNumber(reading.value).toFixed(3),
      consumption,
      isAnomaly,
    }
  })
}

// ─── Service ─────────────────────────────────────────────────────────────────

export const metersService = {
  async getManyReadings(
    userId: string,
    filters: ListReadingsQuery
  ): Promise<{ readings: MeterReadingWithConsumption[]; meta: PaginationMeta }> {
    // Fetch one extra record beyond the page to compute consumption for the last item
    const { readings, total } = await metersRepository.getManyReadings(userId, {
      ...filters,
      limit: filters.limit + 1,
    })

    const isExtraFetched = readings.length > filters.limit
    const pageReadings = isExtraFetched ? readings.slice(0, filters.limit) : readings
    const extraOlderReading = isExtraFetched ? (readings[filters.limit] ?? null) : null

    const readingsWithConsumption = computeConsumptionAndAnomaly(
      pageReadings as unknown as MeterReading[],
      extraOlderReading as unknown as MeterReading | null
    )

    return {
      readings: readingsWithConsumption,
      meta: {
        page: filters.page,
        limit: filters.limit,
        total,
        hasNext: filters.page * filters.limit < total,
      },
    }
  },

  async getMeterSummary(userId: string, type: MeterType): Promise<MeterSummary> {
    // Fetch 8 recent readings to build sparkline with 7 consumption points
    const recent = await metersRepository.getRecentReadings(userId, type, 8)

    if (recent.length === 0) {
      return {
        latestValue: null,
        latestDate: null,
        currentMonthConsumption: null,
        previousMonthConsumption: null,
        sparklineData: [],
      }
    }

    // Build sparkline: pair each reading with the one before it
    const sparklineData: SparklinePoint[] = []
    for (let i = 0; i < recent.length - 1; i++) {
      const consumption = toNumber(recent[i].value) - toNumber(recent[i + 1].value)
      if (consumption >= 0) {
        sparklineData.unshift({
          date: formatReadingDate(recent[i].readingDate),
          consumption: Math.round(consumption * 1000) / 1000,
        })
      }
    }

    // Current and previous month consumption (last 2 sparkline points)
    const currentMonthConsumption = sparklineData.at(-1)?.consumption ?? null
    const previousMonthConsumption = sparklineData.at(-2)?.consumption ?? null

    return {
      latestValue: toNumber(recent[0].value),
      latestDate: recent[0].readingDate,
      currentMonthConsumption,
      previousMonthConsumption,
      sparklineData,
    }
  },

  async createReading(
    data: CreateReadingDto,
    userId: string
  ): Promise<MeterReadingWithConsumption> {
    const { before, after } = await metersRepository.getAdjacentReadings(
      userId,
      data.type,
      data.readingDate
    )

    if (before && toNumber(data.value) <= toNumber(before.value)) {
      throw new AppError(
        'VALIDATION_ERROR',
        'Wartość musi być wyższa niż poprzedni odczyt (' +
          toNumber(before.value).toFixed(3) + ')'
      )
    }

    if (after && toNumber(data.value) >= toNumber(after.value)) {
      throw new AppError(
        'VALIDATION_ERROR',
        'Wartość musi być niższa niż następny odczyt (' +
          toNumber(after.value).toFixed(3) + ')'
      )
    }

    const created = await metersRepository.create(data, userId)
    await eventEmitter.emit('meter.reading.created', { readingId: created.id, type: data.type }, userId)

    const consumption =
      before !== null ? toNumber(created.value) - toNumber(before.value) : null

    return {
      ...created,
      value: toNumber(created.value).toFixed(3),
      consumption,
      isAnomaly: false,
    }
  },

  async updateReading(
    id: string,
    userId: string,
    data: UpdateReadingDto
  ): Promise<void> {
    const existing = await metersRepository.getById(id, userId)
    if (!existing) throw new AppError('NOT_FOUND')

    const newDate = data.readingDate ?? existing.readingDate
    const newValue = data.value ?? toNumber(existing.value)

    const { before, after } = await metersRepository.getAdjacentReadings(
      userId,
      existing.type,
      newDate,
      id
    )

    if (before && toNumber(newValue) <= toNumber(before.value)) {
      throw new AppError(
        'VALIDATION_ERROR',
        'Wartość musi być wyższa niż poprzedni odczyt (' +
          toNumber(before.value).toFixed(3) + ')'
      )
    }

    if (after && toNumber(newValue) >= toNumber(after.value)) {
      throw new AppError(
        'VALIDATION_ERROR',
        'Wartość musi być niższa niż następny odczyt (' +
          toNumber(after.value).toFixed(3) + ')'
      )
    }

    await metersRepository.update(id, userId, data)
  },

  async deleteReading(id: string, userId: string): Promise<void> {
    const existing = await metersRepository.getById(id, userId)
    if (!existing) throw new AppError('NOT_FOUND')
    await metersRepository.softDelete(id, userId)
    await eventEmitter.emit('meter.reading.deleted', { readingId: id }, userId)
  },

  async getConsumptionByYear(
    userId: string,
    type: MeterType,
    year: number
  ): Promise<MonthlyConsumption[]> {
    const yearStart = new Date(year, 0, 1)
    const yearEnd = new Date(year, 11, 31, 23, 59, 59)

    const [yearReadings, prevReading] = await Promise.all([
      metersRepository.getReadingsInRange(userId, type, yearStart, yearEnd),
      metersRepository.getLastReadingBefore(userId, type, yearStart),
    ])

    const allReadings = prevReading ? [prevReading, ...yearReadings] : yearReadings

    const LABELS = ['Sty', 'Lut', 'Mar', 'Kwi', 'Maj', 'Cze', 'Lip', 'Sie', 'Wrz', 'Paź', 'Lis', 'Gru']
    const months: MonthlyConsumption[] = LABELS.map((label, i) => ({
      month: i + 1,
      label,
      consumption: null,
    }))

    for (let i = 1; i < allReadings.length; i++) {
      const current = allReadings[i]
      const previous = allReadings[i - 1]
      const consumption = toNumber(current.value) - toNumber(previous.value)

      // Consumption is attributed to the month when it STARTED (previous reading's month).
      // Exception: if previous reading is from before this year (anchor from prev year),
      // attribute to the current reading's month (first data point of the year).
      const prevDate = new Date(previous.readingDate)
      const monthIndex =
        prevDate.getFullYear() < year
          ? new Date(current.readingDate).getMonth()
          : prevDate.getMonth()

      if (months[monthIndex].consumption === null) {
        months[monthIndex].consumption = Math.round(consumption * 1000) / 1000
      } else {
        months[monthIndex].consumption = Math.round((months[monthIndex].consumption! + consumption) * 1000) / 1000
      }
    }

    return months
  },
}
