import { prisma } from '@/lib/prisma'
import type {
  CreateVehicleDto,
  UpdateVehicleDto,
  CreateInsuranceDto,
  UpdateInsuranceDto,
  CreateInspectionDto,
  UpdateInspectionDto,
  CreateServiceVisitDto,
  UpdateServiceVisitDto,
  UpdateMaintenanceItemDto,
} from './vehicles.types'
import type { MaintenanceItemType, Prisma } from '@prisma/client'

// ─── Vehicle ──────────────────────────────────────────────────────────────────

export const vehicleRepository = {
  async getMany(userId: string) {
    return prisma.vehicle.findMany({
      where: { userId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
      include: {
        insurances: {
          where: { deletedAt: null },
          orderBy: { endDate: 'asc' },
          take: 1,
        },
        inspections: {
          where: { deletedAt: null },
          orderBy: { date: 'desc' },
          take: 1,
        },
      },
    })
  },

  async getById(id: string, userId: string) {
    return prisma.vehicle.findFirst({
      where: { id, userId, deletedAt: null },
    })
  },

  async getBySlug(slug: string, userId: string) {
    return prisma.vehicle.findFirst({
      where: { slug, userId, deletedAt: null },
    })
  },

  async getBySlugFull(slug: string, userId: string) {
    return prisma.vehicle.findFirst({
      where: { slug, userId, deletedAt: null },
      include: {
        insurances: {
          where: { deletedAt: null },
          orderBy: { endDate: 'desc' },
        },
        inspections: {
          where: { deletedAt: null },
          orderBy: { date: 'desc' },
        },
        serviceVisits: {
          where: { deletedAt: null },
          orderBy: { date: 'desc' },
          take: 10,
          include: {
            files: { orderBy: { createdAt: 'asc' } },
          },
        },
        maintenanceItems: {
          orderBy: { type: 'asc' },
        },
      },
    })
  },

  async getByIdFull(id: string, userId: string) {
    return prisma.vehicle.findFirst({
      where: { id, userId, deletedAt: null },
      include: {
        insurances: {
          where: { deletedAt: null },
          orderBy: { endDate: 'desc' },
        },
        inspections: {
          where: { deletedAt: null },
          orderBy: { date: 'desc' },
        },
        serviceVisits: {
          where: { deletedAt: null },
          orderBy: { date: 'desc' },
          take: 10,
          include: {
            files: { orderBy: { createdAt: 'asc' } },
          },
        },
        maintenanceItems: {
          orderBy: { type: 'asc' },
        },
      },
    })
  },

  async create(data: CreateVehicleDto & { slug: string }, userId: string) {
    return prisma.vehicle.create({
      data: {
        userId,
        name: data.name,
        slug: data.slug,
        licensePlate: data.licensePlate,
        photoUrl: data.photoUrl ?? null,
        vin: data.vin ?? null,
        make: data.make ?? null,
        model: data.model ?? null,
        year: data.year ?? null,
        color: data.color ?? null,
        engineType: data.engineType ?? null,
        engineCapacity: data.engineCapacity ?? null,
        fuelType: data.fuelType ?? null,
        transmissionType: data.transmissionType ?? null,
        bodyType: data.bodyType ?? null,
        mileage: data.mileage,
        registrationExpiry: data.registrationExpiry ?? null,
      },
    })
  },

  async update(id: string, userId: string, data: UpdateVehicleDto) {
    const rows = await prisma.vehicle.updateMany({
      where: { id, userId, deletedAt: null },
      data,
    })
    if (rows.count === 0) return null
    return prisma.vehicle.findFirst({ where: { id, userId } })
  },

  async updateMileage(id: string, userId: string, mileage: number) {
    return prisma.vehicle.updateMany({
      where: { id, userId, deletedAt: null },
      data: { mileage },
    })
  },

  async softDelete(id: string, userId: string) {
    return prisma.vehicle.updateMany({
      where: { id, userId, deletedAt: null },
      data: { deletedAt: new Date() },
    })
  },
}

// ─── Insurance ────────────────────────────────────────────────────────────────

export const insuranceRepository = {
  async getMany(vehicleId: string, userId: string) {
    return prisma.vehicleInsurance.findMany({
      where: { vehicleId, userId, deletedAt: null },
      orderBy: { endDate: 'desc' },
    })
  },

  async getById(id: string, vehicleId: string, userId: string) {
    return prisma.vehicleInsurance.findFirst({
      where: { id, vehicleId, userId, deletedAt: null },
    })
  },

  async create(
    data: Omit<CreateInsuranceDto, 'createTransaction'> & { transactionId?: string | null },
    vehicleId: string,
    userId: string
  ) {
    return prisma.vehicleInsurance.create({
      data: {
        vehicleId,
        userId,
        provider: data.provider,
        policyNumber: data.policyNumber ?? null,
        types: data.types,
        amount: data.amount,
        currency: data.currency,
        startDate: data.startDate,
        endDate: data.endDate,
        transactionId: data.transactionId ?? null,
        notes: data.notes ?? null,
      },
    })
  },

  async update(id: string, vehicleId: string, userId: string, data: UpdateInsuranceDto) {
    const rows = await prisma.vehicleInsurance.updateMany({
      where: { id, vehicleId, userId, deletedAt: null },
      data,
    })
    if (rows.count === 0) return null
    return prisma.vehicleInsurance.findFirst({ where: { id, userId } })
  },

  async softDelete(id: string, vehicleId: string, userId: string) {
    return prisma.vehicleInsurance.updateMany({
      where: { id, vehicleId, userId, deletedAt: null },
      data: { deletedAt: new Date() },
    })
  },

  async getExpiringBefore(date: Date, userId: string) {
    return prisma.vehicleInsurance.findMany({
      where: {
        userId,
        deletedAt: null,
        endDate: { lte: date },
      },
      include: { vehicle: { select: { name: true } } },
    })
  },
}

// ─── Inspection ───────────────────────────────────────────────────────────────

export const inspectionRepository = {
  async getMany(vehicleId: string, userId: string) {
    return prisma.vehicleInspection.findMany({
      where: { vehicleId, userId, deletedAt: null },
      orderBy: { date: 'desc' },
    })
  },

  async getById(id: string, vehicleId: string, userId: string) {
    return prisma.vehicleInspection.findFirst({
      where: { id, vehicleId, userId, deletedAt: null },
    })
  },

  async create(
    data: Omit<CreateInspectionDto, 'createTransaction'> & { transactionId?: string | null },
    vehicleId: string,
    userId: string
  ) {
    return prisma.vehicleInspection.create({
      data: {
        vehicleId,
        userId,
        date: data.date,
        nextDate: data.nextDate ?? null,
        mileageAtService: data.mileageAtService ?? null,
        result: data.result,
        cost: data.cost ?? null,
        currency: data.currency,
        transactionId: data.transactionId ?? null,
        notes: data.notes ?? null,
      },
    })
  },

  async update(id: string, vehicleId: string, userId: string, data: UpdateInspectionDto) {
    const rows = await prisma.vehicleInspection.updateMany({
      where: { id, vehicleId, userId, deletedAt: null },
      data,
    })
    if (rows.count === 0) return null
    return prisma.vehicleInspection.findFirst({ where: { id, userId } })
  },

  async softDelete(id: string, vehicleId: string, userId: string) {
    return prisma.vehicleInspection.updateMany({
      where: { id, vehicleId, userId, deletedAt: null },
      data: { deletedAt: new Date() },
    })
  },
}

// ─── Service visit ────────────────────────────────────────────────────────────

export const serviceVisitRepository = {
  async getMany(vehicleId: string, userId: string, cursor?: string, limit = 20) {
    return prisma.vehicleServiceVisit.findMany({
      where: { vehicleId, userId, deletedAt: null },
      orderBy: { date: 'desc' },
      take: limit + 1,
      ...(cursor && { cursor: { id: cursor }, skip: 1 }),
      include: {
        files: { orderBy: { createdAt: 'asc' } },
      },
    })
  },

  async getById(id: string, vehicleId: string, userId: string) {
    return prisma.vehicleServiceVisit.findFirst({
      where: { id, vehicleId, userId, deletedAt: null },
    })
  },

  async create(
    data: Omit<CreateServiceVisitDto, 'createTransaction'> & { transactionId?: string | null },
    vehicleId: string,
    userId: string
  ) {
    return prisma.vehicleServiceVisit.create({
      data: {
        vehicleId,
        userId,
        date: data.date,
        shopName: data.shopName ?? null,
        mileageAtService: data.mileageAtService ?? null,
        totalCost: data.totalCost ?? null,
        currency: data.currency,
        transactionId: data.transactionId ?? null,
        notes: data.notes ?? null,
      },
      include: {
        files: { orderBy: { createdAt: 'asc' } },
      },
    })
  },

  async update(id: string, vehicleId: string, userId: string, data: UpdateServiceVisitDto) {
    const rows = await prisma.vehicleServiceVisit.updateMany({
      where: { id, vehicleId, userId, deletedAt: null },
      data,
    })
    if (rows.count === 0) return null
    return prisma.vehicleServiceVisit.findFirst({
      where: { id, userId },
      include: { files: { orderBy: { createdAt: 'asc' } } },
    })
  },

  async saveAiSuggestions(id: string, userId: string, suggestions: Prisma.InputJsonValue) {
    return prisma.vehicleServiceVisit.updateMany({
      where: { id, userId },
      data: { aiSuggestions: suggestions },
    })
  },

  async markAiApplied(id: string, userId: string) {
    return prisma.vehicleServiceVisit.updateMany({
      where: { id, userId },
      data: { aiAppliedAt: new Date() },
    })
  },

  async softDelete(id: string, vehicleId: string, userId: string) {
    return prisma.vehicleServiceVisit.updateMany({
      where: { id, vehicleId, userId, deletedAt: null },
      data: { deletedAt: new Date() },
    })
  },
}

// ─── Service visit files ──────────────────────────────────────────────────────

export const serviceVisitFileRepository = {
  async getByVisitId(visitId: string, userId: string) {
    return prisma.vehicleServiceVisitFile.findMany({
      where: { visitId, userId },
      orderBy: { createdAt: 'asc' },
    })
  },

  async create(data: {
    visitId: string
    vehicleId: string
    userId: string
    fileName: string
    fileUrl: string
    fileType: string
    mimeType: string
    sizeBytes: number
  }) {
    return prisma.vehicleServiceVisitFile.create({ data })
  },

  async getById(id: string, userId: string) {
    return prisma.vehicleServiceVisitFile.findFirst({ where: { id, userId } })
  },

  async delete(id: string, userId: string) {
    return prisma.vehicleServiceVisitFile.deleteMany({ where: { id, userId } })
  },
}

// ─── Maintenance items ────────────────────────────────────────────────────────

export const maintenanceRepository = {
  async getMany(vehicleId: string, userId: string) {
    return prisma.vehicleMaintenanceItem.findMany({
      where: { vehicleId, userId },
      orderBy: { type: 'asc' },
    })
  },

  async getById(id: string, vehicleId: string, userId: string) {
    return prisma.vehicleMaintenanceItem.findFirst({
      where: { id, vehicleId, userId },
    })
  },

  async getByType(vehicleId: string, userId: string, type: MaintenanceItemType) {
    return prisma.vehicleMaintenanceItem.findFirst({
      where: { vehicleId, userId, type },
    })
  },

  async createMany(
    items: Array<{ vehicleId: string; userId: string; type: MaintenanceItemType }>
  ) {
    return prisma.vehicleMaintenanceItem.createMany({ data: items })
  },

  async update(id: string, vehicleId: string, userId: string, data: UpdateMaintenanceItemDto) {
    const rows = await prisma.vehicleMaintenanceItem.updateMany({
      where: { id, vehicleId, userId },
      data,
    })
    if (rows.count === 0) return null
    return prisma.vehicleMaintenanceItem.findFirst({ where: { id, userId } })
  },

  async batchUpdate(
    updates: Array<{
      vehicleId: string
      userId: string
      type: MaintenanceItemType
      lastServiceDate?: Date
      lastServiceMileage?: number
      updatedByVisitId?: string
    }>
  ) {
    return prisma.$transaction(
      updates.map((u) =>
        prisma.vehicleMaintenanceItem.updateMany({
          where: { vehicleId: u.vehicleId, userId: u.userId, type: u.type },
          data: {
            lastServiceDate: u.lastServiceDate,
            lastServiceMileage: u.lastServiceMileage,
            updatedByVisitId: u.updatedByVisitId,
          },
        })
      )
    )
  },
}

// ─── Maintenance log ──────────────────────────────────────────────────────────

export const maintenanceLogRepository = {
  async getMany(vehicleId: string, userId: string) {
    return prisma.vehicleMaintenanceLog.findMany({
      where: { vehicleId, userId, deletedAt: null },
      orderBy: { date: 'desc' },
    })
  },

  async getById(id: string, userId: string) {
    return prisma.vehicleMaintenanceLog.findFirst({
      where: { id, userId, deletedAt: null },
    })
  },

  async create(data: {
    vehicleId: string
    userId: string
    category: string
    label?: string | null
    date: Date
    mileage?: number | null
    cost?: number | null
    currency: string
    notes?: string | null
  }) {
    return prisma.vehicleMaintenanceLog.create({ data })
  },

  async update(
    id: string,
    userId: string,
    data: Partial<{
      category: string
      label: string | null
      date: Date
      mileage: number | null
      cost: number | null
      currency: string
      notes: string | null
    }>
  ) {
    return prisma.vehicleMaintenanceLog.updateMany({ where: { id, userId }, data })
  },

  async softDelete(id: string, userId: string) {
    return prisma.vehicleMaintenanceLog.updateMany({
      where: { id, userId },
      data: { deletedAt: new Date() },
    })
  },
}
