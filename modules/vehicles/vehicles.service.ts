import { AppError } from '@/types/common.types'
import { eventEmitter } from '@/lib/event-emitter'
import { Redis } from '@upstash/redis'
import {
  vehicleRepository,
  insuranceRepository,
  inspectionRepository,
  serviceVisitRepository,
  serviceVisitFileRepository,
  maintenanceRepository,
  maintenanceLogRepository,
} from './vehicles.repository'
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
  ApplyAiSuggestionsDto,
  MaintenanceStatus,
  MaintenanceInterval,
  MaintenanceItemWithStatus,
  VehicleListItem,
  VehicleDetail,
  InsuranceView,
  InspectionView,
  ServiceVisitView,
  ServiceVisitFileView,
  MaintenanceLogEntry,
  VehicleCostsSummary,
  VinLookupResult,
  CreateMaintenanceLogDto,
  UpdateMaintenanceLogDto,
  RenewInsuranceDto,
} from './vehicles.types'
import type { MaintenanceItemType, VehicleMaintenanceItem } from '@prisma/client'

// ─── Maintenance intervals (constants, not DB) ────────────────────────────────

const MAINTENANCE_INTERVALS: Record<MaintenanceItemType, MaintenanceInterval> = {
  oil_change: { km: 15000, months: 12 },
  timing_belt: { km: 120000, months: 60 },
  timing_chain: { km: 200000 },
  brakes_front: { months: 24 },
  brakes_rear: { months: 36 },
  brake_fluid: { months: 24 },
  gearbox_oil: { km: 60000 },
  coolant: { months: 24 },
  spark_plugs: { km: 30000, months: 36 },
  glow_plugs: { km: 60000 },
  air_filter: { km: 30000 },
  cabin_filter: { km: 20000, months: 12 },
  fuel_filter: { km: 30000 },
  power_steering_fluid: { km: 60000 },
  battery: { months: 48 },
  tires_summer: {},
  tires_winter: {},
  tires_all_season: {},
  clutch: { km: 120000 },
  suspension_front: { km: 80000 },
  suspension_rear: { km: 80000 },
  other: {},
}

const UPCOMING_KM_THRESHOLD = 2000
const UPCOMING_DAYS_THRESHOLD = 30

// ─── Date helpers (no date-fns dependency) ────────────────────────────────────

function addMonths(date: Date, months: number): Date {
  const d = new Date(date)
  d.setMonth(d.getMonth() + months)
  return d
}

function differenceInDays(future: Date, from: Date): number {
  return Math.floor((future.getTime() - from.getTime()) / (1000 * 60 * 60 * 24))
}

// ─── Maintenance status computation ──────────────────────────────────────────

function computeMaintenanceStatus(
  item: VehicleMaintenanceItem,
  currentMileage: number
): { status: MaintenanceStatus; daysUntilDue: number | null; kmUntilDue: number | null } {
  const interval = MAINTENANCE_INTERVALS[item.type]
  const now = new Date()
  let daysUntilDue: number | null = null
  let kmUntilDue: number | null = null

  // Check by km
  if (interval.km && item.lastServiceMileage != null) {
    const nextKm = item.lastServiceMileage + interval.km
    const diff = nextKm - currentMileage
    kmUntilDue = diff
    if (diff <= 0) return { status: 'overdue', daysUntilDue: null, kmUntilDue: diff }
    if (diff <= UPCOMING_KM_THRESHOLD) return { status: 'upcoming', daysUntilDue: null, kmUntilDue: diff }
  }

  // Check by date (computed from lastServiceDate + interval)
  if (interval.months && item.lastServiceDate) {
    const nextDate = addMonths(item.lastServiceDate, interval.months)
    const diffDays = differenceInDays(nextDate, now)
    daysUntilDue = diffDays
    if (diffDays <= 0) return { status: 'overdue', daysUntilDue: diffDays, kmUntilDue }
    if (diffDays <= UPCOMING_DAYS_THRESHOLD) return { status: 'upcoming', daysUntilDue: diffDays, kmUntilDue }
  }

  // Check by manually set nextServiceDate
  if (item.nextServiceDate) {
    const diffDays = differenceInDays(item.nextServiceDate, now)
    daysUntilDue = diffDays
    if (diffDays <= 0) return { status: 'overdue', daysUntilDue: diffDays, kmUntilDue }
    if (diffDays <= UPCOMING_DAYS_THRESHOLD) return { status: 'upcoming', daysUntilDue: diffDays, kmUntilDue }
  }

  if (!item.lastServiceDate && !item.lastServiceMileage && !item.nextServiceDate) {
    return { status: 'unknown', daysUntilDue: null, kmUntilDue: null }
  }

  return { status: 'ok', daysUntilDue, kmUntilDue }
}

function enrichMaintenanceItem(
  item: VehicleMaintenanceItem,
  currentMileage: number
): MaintenanceItemWithStatus {
  const { status, daysUntilDue, kmUntilDue } = computeMaintenanceStatus(item, currentMileage)
  return {
    id: item.id,
    vehicleId: item.vehicleId,
    type: item.type,
    lastServiceDate: item.lastServiceDate,
    lastServiceMileage: item.lastServiceMileage,
    nextServiceDate: item.nextServiceDate,
    nextServiceMileage: item.nextServiceMileage,
    status,
    daysUntilDue,
    kmUntilDue,
    notes: item.notes,
    updatedByVisitId: item.updatedByVisitId,
  }
}

// ─── Budget integration helper ────────────────────────────────────────────────
// Service-to-service call — never import budgetRepository directly (CLAUDE.md §2.2)

async function createBudgetTransaction(
  payload: { amount: number; currency: string; category: string; date: Date; description?: string },
  userId: string,
  tags: string[]
): Promise<string | null> {
  try {
    const { budgetService } = await import('@/modules/budget/budget.service')
    return budgetService.recordExternalTransaction(
      {
        date: payload.date,
        title: payload.description ?? 'Koszt pojazdu',
        amount: payload.amount,
        currency: payload.currency,
        category: payload.category,
        tags,
      },
      userId
    )
  } catch {
    // Budget integration is best-effort — don't fail the vehicle operation
    return null
  }
}

// ─── Insurance status helper ──────────────────────────────────────────────────

function computeInsuranceRecordStatus(endDate: Date): InsuranceView['status'] {
  const now = new Date()
  const diffDays = differenceInDays(endDate, now)
  if (diffDays < 0) return 'expired'
  if (diffDays <= 30) return 'expiring'
  return 'active'
}

// ─── View mappers ─────────────────────────────────────────────────────────────

function mapInsuranceView(ins: {
  id: string; vehicleId: string; provider: string; policyNumber: string | null
  types: string[]; amount: unknown; currency: string; startDate: Date; endDate: Date
  transactionId: string | null; notes: string | null; createdAt: Date
}): InsuranceView {
  return {
    id: ins.id,
    vehicleId: ins.vehicleId,
    provider: ins.provider,
    policyNumber: ins.policyNumber,
    types: ins.types,
    amount: Number(ins.amount).toFixed(2),
    currency: ins.currency,
    startDate: ins.startDate.toISOString().slice(0, 10),
    endDate: ins.endDate.toISOString().slice(0, 10),
    status: computeInsuranceRecordStatus(ins.endDate),
    transactionId: ins.transactionId,
    notes: ins.notes,
    createdAt: ins.createdAt.toISOString(),
  }
}

function mapInspectionView(insp: {
  id: string; vehicleId: string; date: Date; nextDate: Date | null
  stationName?: string | null; mileageAtService: number | null; result: string; cost: unknown | null; currency: string
  transactionId: string | null; notes: string | null; createdAt: Date
}): InspectionView {
  return {
    id: insp.id,
    vehicleId: insp.vehicleId,
    date: insp.date.toISOString().slice(0, 10),
    nextDate: insp.nextDate?.toISOString().slice(0, 10) ?? null,
    stationName: insp.stationName ?? null,
    mileageAtService: insp.mileageAtService,
    result: insp.result as InspectionView['result'],
    cost: insp.cost != null ? Number(insp.cost).toFixed(2) : null,
    currency: insp.currency,
    transactionId: insp.transactionId,
    notes: insp.notes,
    createdAt: insp.createdAt.toISOString(),
  }
}

function mapServiceVisitFileView(f: {
  id: string; visitId: string; fileName: string; fileUrl: string
  fileType: string; mimeType: string; sizeBytes: number; createdAt: Date
}): ServiceVisitFileView {
  return {
    id: f.id,
    visitId: f.visitId,
    fileName: f.fileName,
    fileUrl: f.fileUrl,
    fileType: f.fileType as 'image' | 'pdf',
    mimeType: f.mimeType,
    sizeBytes: f.sizeBytes,
    createdAt: f.createdAt.toISOString(),
  }
}

function mapServiceVisitView(visit: {
  id: string; vehicleId: string; date: Date; shopName: string | null
  mileageAtService: number | null; totalCost: unknown | null; currency: string
  transactionId: string | null; notes: string | null; aiSuggestions: unknown | null
  aiAppliedAt: Date | null; createdAt: Date
  files: Array<{ id: string; visitId: string; fileName: string; fileUrl: string; fileType: string; mimeType: string; sizeBytes: number; createdAt: Date }>
}): ServiceVisitView {
  return {
    id: visit.id,
    vehicleId: visit.vehicleId,
    date: visit.date.toISOString().slice(0, 10),
    shopName: visit.shopName,
    mileageAtService: visit.mileageAtService,
    totalCost: visit.totalCost != null ? Number(visit.totalCost).toFixed(2) : null,
    currency: visit.currency,
    transactionId: visit.transactionId,
    notes: visit.notes,
    aiSuggestions: visit.aiSuggestions as ServiceVisitView['aiSuggestions'],
    aiAppliedAt: visit.aiAppliedAt?.toISOString() ?? null,
    createdAt: visit.createdAt.toISOString(),
    files: visit.files.map(mapServiceVisitFileView),
  }
}

// ─── Insurance status for list ────────────────────────────────────────────────

function computeInsuranceStatus(
  endDate: Date | null
): { status: VehicleListItem['insuranceStatus']; endDate: string | null } {
  if (!endDate) return { status: 'none', endDate: null }
  const now = new Date()
  const diffDays = differenceInDays(endDate, now)
  if (diffDays < 0) return { status: 'expired', endDate: endDate.toISOString().slice(0, 10) }
  if (diffDays <= 30) return { status: 'expiring_soon', endDate: endDate.toISOString().slice(0, 10) }
  return { status: 'ok', endDate: endDate.toISOString().slice(0, 10) }
}

// ─── VIN lookup ───────────────────────────────────────────────────────────────

function createRedisClient(): Redis | null {
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) return null
  try {
    return Redis.fromEnv()
  } catch {
    return null
  }
}

const NHTSA_FIELD_MAP: Record<string, keyof VinLookupResult> = {
  Make: 'make',
  Model: 'model',
  'Model Year': 'year',
  'Engine Displacement (L)': 'engineCapacity',
  'Fuel Type - Primary': 'fuelType',
  'Transmission Style': 'transmissionType',
  'Body Class': 'bodyType',
}

// ─── Slug helpers ─────────────────────────────────────────────────────────────

function toBaseSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove diacritics (ą→a, ę→e, etc.)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    || 'pojazd'
}

async function generateUniqueSlug(name: string, userId: string, excludeId?: string): Promise<string> {
  const base = toBaseSlug(name)
  // Check if base slug is free
  const existing = await vehicleRepository.getBySlug(base, userId)
  if (!existing || existing.id === excludeId) return base
  // Try base-2, base-3, ...
  for (let i = 2; i <= 99; i++) {
    const candidate = `${base}-${i}`
    const conflict = await vehicleRepository.getBySlug(candidate, userId)
    if (!conflict || conflict.id === excludeId) return candidate
  }
  return `${base}-${Date.now()}`
}

// ─── Vehicle service ──────────────────────────────────────────────────────────

export const vehicleService = {
  async getMany(userId: string): Promise<VehicleListItem[]> {
    const vehicles = await vehicleRepository.getMany(userId)
    return vehicles.map((v) => {
      const latestInsurance = v.insurances[0] ?? null
      const { status: insuranceStatus, endDate: insuranceEndDate } = computeInsuranceStatus(
        latestInsurance?.endDate ?? null
      )
      const latestInspection = v.inspections[0] ?? null
      const nextInspectionDate = latestInspection?.nextDate
        ? latestInspection.nextDate.toISOString().slice(0, 10)
        : null
      return {
        id: v.id,
        slug: v.slug,
        name: v.name,
        licensePlate: v.licensePlate,
        photoUrl: v.photoUrl,
        make: v.make,
        model: v.model,
        year: v.year,
        mileage: v.mileage,
        insuranceStatus,
        insuranceEndDate,
        nextInspectionDate,
      }
    })
  },

  async getBySlug(slug: string, userId: string): Promise<VehicleDetail> {
    const v = await vehicleRepository.getBySlugFull(slug, userId)
    if (!v) throw new AppError('NOT_FOUND')

    const maintenanceItems = v.maintenanceItems.map((item) =>
      enrichMaintenanceItem(item, v.mileage)
    )

    return {
      id: v.id,
      slug: v.slug,
      userId: v.userId,
      name: v.name,
      licensePlate: v.licensePlate,
      photoUrl: v.photoUrl,
      vin: v.vin,
      make: v.make,
      model: v.model,
      year: v.year,
      color: v.color,
      engineType: v.engineType,
      engineCapacity: v.engineCapacity,
      fuelType: v.fuelType,
      transmissionType: v.transmissionType,
      bodyType: v.bodyType,
      mileage: v.mileage,
      registrationExpiry: v.registrationExpiry?.toISOString().slice(0, 10) ?? null,
      createdAt: v.createdAt.toISOString(),
      updatedAt: v.updatedAt.toISOString(),
      insurances: v.insurances.map(mapInsuranceView),
      inspections: v.inspections.map(mapInspectionView),
      serviceVisits: v.serviceVisits.map(mapServiceVisitView),
      maintenanceItems,
    }
  },

  async getById(id: string, userId: string): Promise<VehicleDetail> {
    const v = await vehicleRepository.getByIdFull(id, userId)
    if (!v) throw new AppError('NOT_FOUND')

    const maintenanceItems = v.maintenanceItems.map((item) =>
      enrichMaintenanceItem(item, v.mileage)
    )

    return {
      id: v.id,
      slug: v.slug,
      userId: v.userId,
      name: v.name,
      licensePlate: v.licensePlate,
      photoUrl: v.photoUrl,
      vin: v.vin,
      make: v.make,
      model: v.model,
      year: v.year,
      color: v.color,
      engineType: v.engineType,
      engineCapacity: v.engineCapacity,
      fuelType: v.fuelType,
      transmissionType: v.transmissionType,
      bodyType: v.bodyType,
      mileage: v.mileage,
      registrationExpiry: v.registrationExpiry?.toISOString().slice(0, 10) ?? null,
      createdAt: v.createdAt.toISOString(),
      updatedAt: v.updatedAt.toISOString(),
      insurances: v.insurances.map(mapInsuranceView),
      inspections: v.inspections.map(mapInspectionView),
      serviceVisits: v.serviceVisits.map(mapServiceVisitView),
      maintenanceItems,
    }
  },

  async create(data: CreateVehicleDto, userId: string) {
    const slug = await generateUniqueSlug(data.name, userId)
    const vehicle = await vehicleRepository.create({ ...data, slug }, userId)

    // Auto-create all maintenance items
    const allTypes: MaintenanceItemType[] = [
      'oil_change', 'timing_belt', 'timing_chain', 'brakes_front', 'brakes_rear',
      'brake_fluid', 'gearbox_oil', 'coolant', 'spark_plugs', 'glow_plugs',
      'air_filter', 'cabin_filter', 'fuel_filter', 'power_steering_fluid', 'battery',
      'tires_summer', 'tires_winter', 'tires_all_season', 'clutch',
      'suspension_front', 'suspension_rear', 'other',
    ]
    await maintenanceRepository.createMany(
      allTypes.map((type) => ({ vehicleId: vehicle.id, userId, type }))
    )

    await eventEmitter.emit('vehicle.created', { vehicleId: vehicle.id }, userId)
    return vehicle
  },

  async update(id: string, data: UpdateVehicleDto, userId: string) {
    // Regenerate slug if name changes
    const updateData: UpdateVehicleDto & { slug?: string } = { ...data }
    if (data.name) {
      updateData.slug = await generateUniqueSlug(data.name, userId, id)
    }
    const updated = await vehicleRepository.update(id, userId, updateData)
    if (!updated) throw new AppError('NOT_FOUND')
    await eventEmitter.emit('vehicle.updated', { vehicleId: id }, userId)
    return updated
  },

  async delete(id: string, userId: string) {
    const vehicle = await vehicleRepository.getById(id, userId)
    if (!vehicle) throw new AppError('NOT_FOUND')
    await vehicleRepository.softDelete(id, userId)
    await eventEmitter.emit('vehicle.deleted', { vehicleId: id }, userId)
  },

  async uploadPhoto(vehicleId: string, userId: string, file: File) {
    const vehicle = await vehicleRepository.getById(vehicleId, userId)
    if (!vehicle) throw new AppError('NOT_FOUND')

    const { createSupabaseAdminClient } = await import('@/lib/supabase-server')
    const supabase = await createSupabaseAdminClient()

    const ext = file.name.split('.').pop() ?? 'jpg'
    const path = `${userId}/${vehicleId}/${Date.now()}.${ext}`
    const { error } = await supabase.storage.from('vehicle-photos').upload(path, file, { upsert: true, contentType: file.type })
    if (error) {
      console.error('[uploadPhoto] Supabase storage error:', error)
      throw new AppError('INTERNAL_ERROR')
    }

    const { data: { publicUrl } } = supabase.storage.from('vehicle-photos').getPublicUrl(path)
    await vehicleRepository.update(vehicleId, userId, { photoUrl: publicUrl })
    return { photoUrl: publicUrl }
  },
}

// ─── Insurance service ────────────────────────────────────────────────────────

export const insuranceService = {
  async getMany(vehicleId: string, userId: string): Promise<InsuranceView[]> {
    const vehicle = await vehicleRepository.getById(vehicleId, userId)
    if (!vehicle) throw new AppError('NOT_FOUND')
    const items = await insuranceRepository.getMany(vehicleId, userId)
    return items.map(mapInsuranceView)
  },

  async create(data: CreateInsuranceDto, vehicleId: string, userId: string): Promise<InsuranceView> {
    const vehicle = await vehicleRepository.getById(vehicleId, userId)
    if (!vehicle) throw new AppError('NOT_FOUND')

    let transactionId: string | null = null
    if (data.createTransaction) {
      transactionId = await createBudgetTransaction(
        data.createTransaction,
        userId,
        ['vehicle', vehicleId, 'insurance']
      )
    }

    const { createTransaction: _, ...insuranceData } = data
    const insurance = await insuranceRepository.create(
      { ...insuranceData, transactionId },
      vehicleId,
      userId
    )

    await eventEmitter.emit(
      'vehicle.insurance.created',
      { insuranceId: insurance.id, vehicleId, provider: insurance.provider },
      userId
    )
    return mapInsuranceView(insurance)
  },

  async update(
    id: string,
    vehicleId: string,
    data: UpdateInsuranceDto,
    userId: string
  ): Promise<InsuranceView> {
    const existing = await insuranceRepository.getById(id, vehicleId, userId)
    if (!existing) throw new AppError('NOT_FOUND')
    const updated = await insuranceRepository.update(id, vehicleId, userId, data)
    if (!updated) throw new AppError('NOT_FOUND')
    return mapInsuranceView(updated)
  },

  async renew(
    id: string,
    vehicleId: string,
    data: RenewInsuranceDto,
    userId: string
  ): Promise<InsuranceView> {
    const existing = await insuranceRepository.getById(id, vehicleId, userId)
    if (!existing) throw new AppError('NOT_FOUND')

    const updateData: UpdateInsuranceDto = {
      startDate: data.startDate,
      endDate: data.endDate,
      ...(data.amount !== undefined && { amount: data.amount }),
    }
    const updated = await insuranceRepository.update(id, vehicleId, userId, updateData)
    if (!updated) throw new AppError('NOT_FOUND')

    await eventEmitter.emit(
      'vehicle.insurance.renewed',
      { insuranceId: id, vehicleId },
      userId
    )
    return mapInsuranceView(updated)
  },

  async delete(id: string, vehicleId: string, userId: string) {
    const existing = await insuranceRepository.getById(id, vehicleId, userId)
    if (!existing) throw new AppError('NOT_FOUND')
    await insuranceRepository.softDelete(id, vehicleId, userId)
  },
}

// ─── Inspection service ────────────────────────────────────────────────────────

export const inspectionService = {
  async getMany(vehicleId: string, userId: string): Promise<InspectionView[]> {
    const vehicle = await vehicleRepository.getById(vehicleId, userId)
    if (!vehicle) throw new AppError('NOT_FOUND')
    const items = await inspectionRepository.getMany(vehicleId, userId)
    return items.map(mapInspectionView)
  },

  async create(data: CreateInspectionDto, vehicleId: string, userId: string): Promise<InspectionView> {
    const vehicle = await vehicleRepository.getById(vehicleId, userId)
    if (!vehicle) throw new AppError('NOT_FOUND')

    let transactionId: string | null = null
    if (data.createTransaction) {
      transactionId = await createBudgetTransaction(
        data.createTransaction,
        userId,
        ['vehicle', vehicleId, 'inspection']
      )
    }

    const { createTransaction: _, ...inspectionData } = data
    const inspection = await inspectionRepository.create(
      { ...inspectionData, transactionId },
      vehicleId,
      userId
    )

    await eventEmitter.emit(
      'vehicle.inspection.created',
      { inspectionId: inspection.id, vehicleId, result: inspection.result },
      userId
    )
    return mapInspectionView(inspection)
  },

  async update(
    id: string,
    vehicleId: string,
    data: UpdateInspectionDto,
    userId: string
  ): Promise<InspectionView> {
    const existing = await inspectionRepository.getById(id, vehicleId, userId)
    if (!existing) throw new AppError('NOT_FOUND')
    const updated = await inspectionRepository.update(id, vehicleId, userId, data)
    if (!updated) throw new AppError('NOT_FOUND')
    return mapInspectionView(updated)
  },

  async delete(id: string, vehicleId: string, userId: string) {
    const existing = await inspectionRepository.getById(id, vehicleId, userId)
    if (!existing) throw new AppError('NOT_FOUND')
    await inspectionRepository.softDelete(id, vehicleId, userId)
  },
}

// ─── Service visit service ────────────────────────────────────────────────────

export const serviceVisitService = {
  async getMany(vehicleId: string, userId: string, cursor?: string, limit = 20) {
    const vehicle = await vehicleRepository.getById(vehicleId, userId)
    if (!vehicle) throw new AppError('NOT_FOUND')

    const rows = await serviceVisitRepository.getMany(vehicleId, userId, cursor, limit)
    const hasNext = rows.length > limit
    const items = hasNext ? rows.slice(0, limit) : rows
    const nextCursor = hasNext ? items[items.length - 1]?.id : null

    return {
      items: items.map(mapServiceVisitView),
      nextCursor,
      hasNext,
    }
  },

  async create(
    data: CreateServiceVisitDto,
    vehicleId: string,
    userId: string
  ): Promise<ServiceVisitView> {
    const vehicle = await vehicleRepository.getById(vehicleId, userId)
    if (!vehicle) throw new AppError('NOT_FOUND')

    let transactionId: string | null = null
    if (data.createTransaction) {
      transactionId = await createBudgetTransaction(
        data.createTransaction,
        userId,
        ['vehicle', vehicleId, 'service']
      )
    }

    const { createTransaction: _, ...visitData } = data
    const visit = await serviceVisitRepository.create(
      { ...visitData, transactionId },
      vehicleId,
      userId
    )

    // Update vehicle mileage if higher
    if (data.mileageAtService && data.mileageAtService > vehicle.mileage) {
      await vehicleRepository.updateMileage(vehicleId, userId, data.mileageAtService)
    }

    await eventEmitter.emit(
      'vehicle.service_visit.created',
      { visitId: visit.id, vehicleId, hasNotes: Boolean(data.notes) },
      userId
    )

    return mapServiceVisitView(visit)
  },

  async update(
    id: string,
    vehicleId: string,
    data: UpdateServiceVisitDto,
    userId: string
  ): Promise<ServiceVisitView> {
    const existing = await serviceVisitRepository.getById(id, vehicleId, userId)
    if (!existing) throw new AppError('NOT_FOUND')
    const updated = await serviceVisitRepository.update(id, vehicleId, userId, data)
    if (!updated) throw new AppError('NOT_FOUND')
    return mapServiceVisitView(updated)
  },

  async delete(id: string, vehicleId: string, userId: string) {
    const existing = await serviceVisitRepository.getById(id, vehicleId, userId)
    if (!existing) throw new AppError('NOT_FOUND')
    await serviceVisitRepository.softDelete(id, vehicleId, userId)
  },
}

// ─── Service visit file service ───────────────────────────────────────────────

export const serviceVisitFileService = {
  async uploadFile(visitId: string, vehicleId: string, userId: string, file: File): Promise<ServiceVisitFileView> {
    const visit = await serviceVisitRepository.getById(visitId, vehicleId, userId)
    if (!visit) throw new AppError('NOT_FOUND')

    const ext = file.name.split('.').pop()?.toLowerCase() ?? 'bin'
    const fileType = file.type.startsWith('image/') ? 'image' : 'pdf'
    const path = `${userId}/${vehicleId}/service/${visitId}/${Date.now()}.${ext}`

    const { createSupabaseServerClient } = await import('@/lib/supabase-server')
    const supabase = await createSupabaseServerClient()
    const bytes = Buffer.from(await file.arrayBuffer())
    const { error } = await supabase.storage.from('vehicle-photos').upload(path, bytes, { contentType: file.type })
    if (error) throw new Error(error.message)

    const { data: { publicUrl } } = supabase.storage.from('vehicle-photos').getPublicUrl(path)

    const dbFile = await serviceVisitFileRepository.create({
      visitId,
      vehicleId,
      userId,
      fileName: file.name,
      fileUrl: publicUrl,
      fileType,
      mimeType: file.type,
      sizeBytes: file.size,
    })

    return mapServiceVisitFileView(dbFile)
  },

  async deleteFile(fileId: string, userId: string): Promise<void> {
    const file = await serviceVisitFileRepository.getById(fileId, userId)
    if (!file) throw new AppError('NOT_FOUND')
    await serviceVisitFileRepository.delete(fileId, userId)
  },
}

// ─── Maintenance service ──────────────────────────────────────────────────────

export const maintenanceService = {
  async getMany(vehicleId: string, userId: string): Promise<MaintenanceItemWithStatus[]> {
    const vehicle = await vehicleRepository.getById(vehicleId, userId)
    if (!vehicle) throw new AppError('NOT_FOUND')
    const items = await maintenanceRepository.getMany(vehicleId, userId)
    return items.map((item) => enrichMaintenanceItem(item, vehicle.mileage))
  },

  async update(
    id: string,
    vehicleId: string,
    data: UpdateMaintenanceItemDto,
    userId: string
  ): Promise<MaintenanceItemWithStatus> {
    const vehicle = await vehicleRepository.getById(vehicleId, userId)
    if (!vehicle) throw new AppError('NOT_FOUND')
    const existing = await maintenanceRepository.getById(id, vehicleId, userId)
    if (!existing) throw new AppError('NOT_FOUND')
    const updated = await maintenanceRepository.update(id, vehicleId, userId, data)
    if (!updated) throw new AppError('NOT_FOUND')
    return enrichMaintenanceItem(updated, vehicle.mileage)
  },

  async applyAiSuggestions(
    visitId: string,
    vehicleId: string,
    data: ApplyAiSuggestionsDto,
    userId: string
  ) {
    const vehicle = await vehicleRepository.getById(vehicleId, userId)
    if (!vehicle) throw new AppError('NOT_FOUND')
    const visit = await serviceVisitRepository.getById(visitId, vehicleId, userId)
    if (!visit) throw new AppError('NOT_FOUND')

    await maintenanceRepository.batchUpdate(
      data.suggestions.map((s) => ({
        vehicleId,
        userId,
        type: s.type,
        lastServiceDate: s.lastServiceDate,
        lastServiceMileage: s.lastServiceMileage,
        updatedByVisitId: visitId,
      }))
    )

    await serviceVisitRepository.markAiApplied(visitId, userId)

    await eventEmitter.emit(
      'vehicle.maintenance.ai_suggestions_ready',
      { visitId, vehicleId, count: data.suggestions.length },
      userId
    )

    return maintenanceService.getMany(vehicleId, userId)
  },
}

// ─── Maintenance log service ──────────────────────────────────────────────────

export const maintenanceLogService = {
  async getMany(vehicleId: string, userId: string): Promise<MaintenanceLogEntry[]> {
    const vehicle = await vehicleRepository.getById(vehicleId, userId)
    if (!vehicle) throw new AppError('NOT_FOUND')
    const logs = await maintenanceLogRepository.getMany(vehicleId, userId)
    return logs.map((l) => ({
      id: l.id,
      vehicleId: l.vehicleId,
      category: l.category,
      label: l.label ?? l.category,
      date: l.date instanceof Date ? l.date.toISOString().slice(0, 10) : String(l.date),
      mileage: l.mileage,
      cost: l.cost != null ? l.cost.toString() : null,
      currency: l.currency,
      notes: l.notes,
      createdAt: l.createdAt.toISOString(),
    }))
  },

  async create(data: CreateMaintenanceLogDto, vehicleId: string, userId: string): Promise<MaintenanceLogEntry> {
    const vehicle = await vehicleRepository.getById(vehicleId, userId)
    if (!vehicle) throw new AppError('NOT_FOUND')
    const log = await maintenanceLogRepository.create({
      vehicleId,
      userId,
      category: data.category,
      label: data.label ?? null,
      date: data.date,
      mileage: data.mileage ?? null,
      cost: data.cost ?? null,
      currency: data.currency,
      notes: data.notes ?? null,
    })
    return {
      id: log.id,
      vehicleId: log.vehicleId,
      category: log.category,
      label: log.label ?? log.category,
      date: log.date instanceof Date ? log.date.toISOString().slice(0, 10) : String(log.date),
      mileage: log.mileage,
      cost: log.cost != null ? log.cost.toString() : null,
      currency: log.currency,
      notes: log.notes,
      createdAt: log.createdAt.toISOString(),
    }
  },

  async update(id: string, vehicleId: string, data: UpdateMaintenanceLogDto, userId: string): Promise<MaintenanceLogEntry> {
    const log = await maintenanceLogRepository.getById(id, userId)
    if (!log) throw new AppError('NOT_FOUND')
    await maintenanceLogRepository.update(id, userId, {
      ...(data.category !== undefined && { category: data.category }),
      ...(data.label !== undefined && { label: data.label ?? null }),
      ...(data.date !== undefined && { date: data.date }),
      ...(data.mileage !== undefined && { mileage: data.mileage ?? null }),
      ...(data.cost !== undefined && { cost: data.cost ?? null }),
      ...(data.currency !== undefined && { currency: data.currency }),
      ...(data.notes !== undefined && { notes: data.notes ?? null }),
    })
    const updated = await maintenanceLogRepository.getById(id, userId)
    if (!updated) throw new AppError('NOT_FOUND')
    return {
      id: updated.id,
      vehicleId: updated.vehicleId,
      category: updated.category,
      label: updated.label ?? updated.category,
      date: updated.date instanceof Date ? updated.date.toISOString().slice(0, 10) : String(updated.date),
      mileage: updated.mileage,
      cost: updated.cost != null ? updated.cost.toString() : null,
      currency: updated.currency,
      notes: updated.notes,
      createdAt: updated.createdAt.toISOString(),
    }
  },

  async delete(id: string, userId: string): Promise<void> {
    const log = await maintenanceLogRepository.getById(id, userId)
    if (!log) throw new AppError('NOT_FOUND')
    await maintenanceLogRepository.softDelete(id, userId)
  },
}

// ─── VIN lookup service ───────────────────────────────────────────────────────

export const vinLookupService = {
  async lookup(vin: string, userId: string): Promise<VinLookupResult> {
    const redis = createRedisClient()
    const cacheKey = `vin-lookup:${vin}`

    // Check cache (30-day TTL)
    if (redis) {
      try {
        const cached = await redis.get<VinLookupResult>(cacheKey)
        if (cached) return cached
      } catch {
        // Cache miss — continue
      }
    }

    // Call NHTSA VPIC API
    const url = `https://vpic.nhtsa.dot.gov/api/vehicles/decodevin/${vin}?format=json`
    let response: Response
    try {
      response = await fetch(url, { next: { revalidate: 0 } })
    } catch {
      throw new AppError('INTERNAL_ERROR')
    }

    if (!response.ok) throw new AppError('INTERNAL_ERROR')

    const json = (await response.json()) as {
      Results?: Array<{ Variable: string; Value: string | null }>
    }

    const result: VinLookupResult = {
      make: null,
      model: null,
      year: null,
      engineCapacity: null,
      fuelType: null,
      transmissionType: null,
      bodyType: null,
    }

    for (const entry of json.Results ?? []) {
      const field = NHTSA_FIELD_MAP[entry.Variable]
      if (field && entry.Value && entry.Value !== 'Not Applicable') {
        if (field === 'year') {
          const parsed = parseInt(entry.Value, 10)
          if (!isNaN(parsed)) result.year = parsed
        } else {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          ;(result as any)[field] = entry.Value
        }
      }
    }

    // Store in cache
    if (redis) {
      try {
        await redis.set(cacheKey, result, { ex: 30 * 24 * 60 * 60 })
      } catch {
        // Cache write failure is non-critical
      }
    }

    void userId // userId reserved for future per-user rate limiting
    return result
  },
}

// ─── Vehicle costs service (cross-module) ─────────────────────────────────────

export const vehicleCostsService = {
  async getCosts(vehicleId: string, userId: string, year: number): Promise<VehicleCostsSummary> {
    const vehicle = await vehicleRepository.getById(vehicleId, userId)
    if (!vehicle) throw new AppError('NOT_FOUND')

    const yearStart = new Date(year, 0, 1)
    const yearEnd = new Date(year, 11, 31)

    const [insurances, inspections, serviceVisits] = await Promise.all([
      insuranceRepository.getMany(vehicleId, userId),
      inspectionRepository.getMany(vehicleId, userId),
      serviceVisitRepository.getMany(vehicleId, userId),
    ])

    const inRange = (date: Date) => date >= yearStart && date <= yearEnd

    const insuranceCost = insurances
      .filter((i) => inRange(i.startDate))
      .reduce((sum, i) => sum + Number(i.amount), 0)

    const inspectionCost = inspections
      .filter((i) => inRange(i.date))
      .reduce((sum, i) => sum + Number(i.cost ?? 0), 0)

    const serviceCost = serviceVisits
      .filter((v) => inRange(v.date))
      .reduce((sum, v) => sum + Number(v.totalCost ?? 0), 0)

    // Monthly breakdown (all categories combined)
    const byMonthMap = new Map<number, number>()
    for (const ins of insurances.filter((i) => inRange(i.startDate))) {
      const m = ins.startDate.getMonth() + 1
      byMonthMap.set(m, (byMonthMap.get(m) ?? 0) + Number(ins.amount))
    }
    for (const insp of inspections.filter((i) => inRange(i.date))) {
      const m = insp.date.getMonth() + 1
      byMonthMap.set(m, (byMonthMap.get(m) ?? 0) + Number(insp.cost ?? 0))
    }
    for (const v of serviceVisits.filter((v) => inRange(v.date))) {
      const m = v.date.getMonth() + 1
      byMonthMap.set(m, (byMonthMap.get(m) ?? 0) + Number(v.totalCost ?? 0))
    }

    const byMonth = Array.from(byMonthMap.entries())
      .map(([month, cost]) => ({ month, cost }))
      .sort((a, b) => a.month - b.month)

    return {
      vehicleId,
      year,
      totalCost: insuranceCost + inspectionCost + serviceCost,
      currency: 'PLN',
      breakdown: {
        insurance: insuranceCost,
        inspections: inspectionCost,
        serviceVisits: serviceCost,
        other: 0,
      },
      byMonth,
    }
  },
}
