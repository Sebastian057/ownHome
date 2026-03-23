import type { z } from 'zod'
import type { FuelType, InspectionResult, MaintenanceItemType, TransmissionType } from '@prisma/client'
import type {
  createVehicleSchema,
  updateVehicleSchema,
  createInsuranceSchema,
  updateInsuranceSchema,
  createInspectionSchema,
  updateInspectionSchema,
  createServiceVisitSchema,
  updateServiceVisitSchema,
  updateMaintenanceItemSchema,
  applyAiSuggestionsSchema,
  vinLookupSchema,
  createMaintenanceLogSchema,
  updateMaintenanceLogSchema,
  renewInsuranceSchema,
} from './vehicles.schema'

// Re-export Prisma enums for consumers
export type { FuelType, InspectionResult, MaintenanceItemType, TransmissionType }

// ─── DTOs (inferred from Zod) ─────────────────────────────────────────────────

export type CreateVehicleDto = z.infer<typeof createVehicleSchema>
export type UpdateVehicleDto = z.infer<typeof updateVehicleSchema>
export type CreateInsuranceDto = z.infer<typeof createInsuranceSchema>
export type UpdateInsuranceDto = z.infer<typeof updateInsuranceSchema>
export type CreateInspectionDto = z.infer<typeof createInspectionSchema>
export type UpdateInspectionDto = z.infer<typeof updateInspectionSchema>
export type CreateServiceVisitDto = z.infer<typeof createServiceVisitSchema>
export type UpdateServiceVisitDto = z.infer<typeof updateServiceVisitSchema>
export type UpdateMaintenanceItemDto = z.infer<typeof updateMaintenanceItemSchema>
export type ApplyAiSuggestionsDto = z.infer<typeof applyAiSuggestionsSchema>
export type VinLookupDto = z.infer<typeof vinLookupSchema>
export type CreateMaintenanceLogDto = z.infer<typeof createMaintenanceLogSchema>
export type UpdateMaintenanceLogDto = z.infer<typeof updateMaintenanceLogSchema>
export type RenewInsuranceDto = z.infer<typeof renewInsuranceSchema>

// ─── Domain types ─────────────────────────────────────────────────────────────

export type MaintenanceStatus = 'ok' | 'upcoming' | 'overdue' | 'unknown'

export interface MaintenanceInterval {
  km?: number
  months?: number
}

export interface MaintenanceItemWithStatus {
  id: string
  vehicleId: string
  type: MaintenanceItemType
  lastServiceDate: Date | null
  lastServiceMileage: number | null
  nextServiceDate: Date | null
  nextServiceMileage: number | null
  status: MaintenanceStatus
  daysUntilDue: number | null
  kmUntilDue: number | null
  notes: string | null
  updatedByVisitId: string | null
}

export interface AiMaintenanceSuggestion {
  type: MaintenanceItemType
  lastServiceDate?: Date
  lastServiceMileage?: number
  confidence: 'high' | 'medium' | 'low'
  reason: string
}

export interface VehicleCostsSummary {
  vehicleId: string
  year: number
  totalCost: number
  currency: string
  breakdown: {
    insurance: number
    inspections: number
    serviceVisits: number
    other: number
  }
  byMonth: Array<{
    month: number
    cost: number
  }>
}

// ─── View types (returned by API) ────────────────────────────────────────────

export interface VehicleListItem {
  id: string
  slug: string
  name: string
  licensePlate: string
  photoUrl: string | null
  make: string | null
  model: string | null
  year: number | null
  mileage: number
  insuranceStatus: 'ok' | 'expiring_soon' | 'expired' | 'none'
  insuranceEndDate: string | null
  nextInspectionDate: string | null
}

export interface VehicleDetail {
  id: string
  slug: string
  userId: string
  name: string
  licensePlate: string
  photoUrl: string | null
  vin: string | null
  make: string | null
  model: string | null
  year: number | null
  color: string | null
  engineType: string | null
  engineCapacity: string | null
  fuelType: FuelType | null
  transmissionType: TransmissionType | null
  bodyType: string | null
  mileage: number
  registrationExpiry: string | null
  createdAt: string
  updatedAt: string
  insurances: InsuranceView[]
  inspections: InspectionView[]
  serviceVisits: ServiceVisitView[]
  maintenanceItems: MaintenanceItemWithStatus[]
}

export interface InsuranceView {
  id: string
  vehicleId: string
  provider: string
  policyNumber: string | null
  types: string[]
  amount: string
  currency: string
  startDate: string
  endDate: string
  status: 'active' | 'expiring' | 'expired'
  transactionId: string | null
  notes: string | null
  createdAt: string
}

export interface InspectionView {
  id: string
  vehicleId: string
  date: string
  nextDate: string | null
  mileageAtService: number | null
  result: InspectionResult
  stationName: string | null
  cost: string | null
  currency: string
  transactionId: string | null
  notes: string | null
  createdAt: string
}

export interface ServiceVisitFileView {
  id: string
  visitId: string
  fileName: string
  fileUrl: string
  fileType: 'image' | 'pdf'
  mimeType: string
  sizeBytes: number
  createdAt: string
}

export interface ServiceVisitView {
  id: string
  vehicleId: string
  date: string
  shopName: string | null
  mileageAtService: number | null
  totalCost: string | null
  currency: string
  transactionId: string | null
  notes: string | null
  aiSuggestions: AiMaintenanceSuggestion[] | null
  aiAppliedAt: string | null
  createdAt: string
  files: ServiceVisitFileView[]
}

export interface MaintenanceLogEntry {
  id: string
  vehicleId: string
  category: string
  label: string
  date: string
  mileage: number | null
  cost: string | null
  currency: string
  notes: string | null
  createdAt: string
}

export interface VinLookupResult {
  make: string | null
  model: string | null
  year: number | null
  engineCapacity: string | null
  fuelType: string | null
  transmissionType: string | null
  bodyType: string | null
}

// ─── UI form state types ──────────────────────────────────────────────────────

/** Internal form state for VehicleFormDialog — all fields as strings for input binding */
export interface VehicleFormState {
  name: string
  licensePlate: string
  vin: string
  make: string
  model: string
  year: string
  color: string
  engineType: string
  engineCapacity: string
  fuelType: string
  transmissionType: string
  bodyType: string
  mileage: string
  registrationExpiry: string
}

export const EMPTY_VEHICLE_FORM: VehicleFormState = {
  name: '',
  licensePlate: '',
  vin: '',
  make: '',
  model: '',
  year: '',
  color: '',
  engineType: '',
  engineCapacity: '',
  fuelType: '',
  transmissionType: '',
  bodyType: '',
  mileage: '0',
  registrationExpiry: '',
}
