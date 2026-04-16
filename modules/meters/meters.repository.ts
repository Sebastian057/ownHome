import { prisma } from '@/lib/prisma'
import type { MeterType } from './meters.types'
import type { CreateReadingDto, UpdateReadingDto } from './meters.types'

export const metersRepository = {
  async getManyReadings(
    userId: string,
    filters: {
      type?: MeterType
      dateFrom?: Date
      dateTo?: Date
      page: number
      limit: number
    }
  ) {
    const where = {
      userId,
      deletedAt: null,
      ...(filters.type && { type: filters.type }),
      ...(filters.dateFrom || filters.dateTo
        ? {
            readingDate: {
              ...(filters.dateFrom && { gte: filters.dateFrom }),
              ...(filters.dateTo && { lte: filters.dateTo }),
            },
          }
        : {}),
    }

    const [readings, total] = await prisma.$transaction([
      prisma.meterReading.findMany({
        where,
        orderBy: { readingDate: 'desc' },
        skip: (filters.page - 1) * filters.limit,
        take: filters.limit,
      }),
      prisma.meterReading.count({ where }),
    ])

    return { readings, total }
  },

  async getRecentReadings(userId: string, type: MeterType, limit: number) {
    return prisma.meterReading.findMany({
      where: { userId, type, deletedAt: null },
      orderBy: { readingDate: 'desc' },
      take: limit,
    })
  },

  /** Zwraca odczyt bezpośrednio przed i bezpośrednio po podanej dacie. */
  async getAdjacentReadings(
    userId: string,
    type: MeterType,
    date: Date,
    excludeId?: string
  ) {
    const baseWhere = {
      userId,
      type,
      deletedAt: null,
      ...(excludeId ? { id: { not: excludeId } } : {}),
    }

    const [before, after] = await Promise.all([
      prisma.meterReading.findFirst({
        where: { ...baseWhere, readingDate: { lt: date } },
        orderBy: { readingDate: 'desc' },
      }),
      prisma.meterReading.findFirst({
        where: { ...baseWhere, readingDate: { gt: date } },
        orderBy: { readingDate: 'asc' },
      }),
    ])

    return { before, after }
  },

  async getById(id: string, userId: string) {
    return prisma.meterReading.findFirst({
      where: { id, userId, deletedAt: null },
    })
  },

  async create(data: CreateReadingDto, userId: string) {
    return prisma.meterReading.create({
      data: {
        userId,
        type: data.type,
        value: data.value,
        readingDate: data.readingDate,
        notes: data.notes ?? null,
      },
    })
  },

  async update(id: string, userId: string, data: UpdateReadingDto) {
    return prisma.meterReading.updateMany({
      where: { id, userId, deletedAt: null },
      data: {
        ...(data.value !== undefined && { value: data.value }),
        ...(data.readingDate !== undefined && { readingDate: data.readingDate }),
        ...(data.notes !== undefined && { notes: data.notes }),
      },
    })
  },

  async softDelete(id: string, userId: string) {
    return prisma.meterReading.updateMany({
      where: { id, userId, deletedAt: null },
      data: { deletedAt: new Date() },
    })
  },

  async getReadingsInRange(userId: string, type: MeterType, from: Date, to: Date) {
    return prisma.meterReading.findMany({
      where: { userId, type, deletedAt: null, readingDate: { gte: from, lte: to } },
      orderBy: { readingDate: 'asc' },
    })
  },

  async getLastReadingBefore(userId: string, type: MeterType, date: Date) {
    return prisma.meterReading.findFirst({
      where: { userId, type, deletedAt: null, readingDate: { lt: date } },
      orderBy: { readingDate: 'desc' },
    })
  },
}
