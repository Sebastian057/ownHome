import { z } from 'zod'

// ─── Shared sub-schema ────────────────────────────────────────────────────────

const createTransactionPayloadSchema = z.object({
  amount: z.number().positive(),
  currency: z.string().length(3).default('PLN'),
  category: z.string().trim().min(1).max(50),
  date: z.coerce.date(),
  description: z.string().trim().max(500).optional(),
})

// ─── Vehicle ──────────────────────────────────────────────────────────────────

export const createVehicleSchema = z.object({
  name: z.string().trim().min(1).max(100),
  licensePlate: z.string().trim().min(1).max(20),
  photoUrl: z.string().url().optional(),
  vin: z.string().trim().length(17).optional(),
  make: z.string().trim().max(100).optional(),
  model: z.string().trim().max(100).optional(),
  year: z
    .number()
    .int()
    .min(1900)
    .max(new Date().getFullYear() + 1)
    .optional(),
  color: z.string().trim().max(50).optional(),
  engineType: z.string().trim().max(50).optional(),
  engineCapacity: z.string().trim().max(20).optional(),
  fuelType: z.enum(['petrol', 'diesel', 'lpg', 'electric', 'hybrid', 'hydrogen']).optional(),
  transmissionType: z.enum(['manual', 'automatic', 'semi_automatic', 'cvt']).optional(),
  bodyType: z.string().trim().max(50).optional(),
  mileage: z.number().int().min(0).default(0),
  registrationExpiry: z.coerce.date().optional(),
})

export const updateVehicleSchema = createVehicleSchema.partial()

// ─── Insurance ────────────────────────────────────────────────────────────────

export const createInsuranceSchema = z.object({
  provider: z.string().trim().min(1).max(200),
  policyNumber: z.string().trim().max(100).optional(),
  types: z.array(z.enum(['oc', 'ac', 'assistance', 'nnw', 'other'])).min(1),
  amount: z.number().positive(),
  currency: z.string().length(3).default('PLN'),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  notes: z.string().trim().max(2000).nullish(),
  createTransaction: createTransactionPayloadSchema.optional(),
})

export const updateInsuranceSchema = createInsuranceSchema
  .partial()
  .omit({ createTransaction: true })

// ─── Inspection ───────────────────────────────────────────────────────────────

export const createInspectionSchema = z.object({
  date: z.coerce.date(),
  nextDate: z.coerce.date().optional(),
  stationName: z.string().trim().max(300).optional(),
  mileageAtService: z.number().int().min(0).optional(),
  result: z.enum(['passed', 'passed_with_defects', 'failed']),
  cost: z.number().positive().optional(),
  currency: z.string().length(3).default('PLN'),
  notes: z.string().trim().max(2000).nullish(),
  createTransaction: createTransactionPayloadSchema.optional(),
})

export const updateInspectionSchema = createInspectionSchema
  .partial()
  .omit({ createTransaction: true })

// ─── Service visit ────────────────────────────────────────────────────────────

export const createServiceVisitSchema = z.object({
  date: z.coerce.date(),
  shopName: z.string().trim().max(200).optional(),
  mileageAtService: z.number().int().min(0).optional(),
  totalCost: z.number().positive().optional(),
  currency: z.string().length(3).default('PLN'),
  notes: z.string().trim().max(5000).nullish(),
  createTransaction: createTransactionPayloadSchema.optional(),
})

export const updateServiceVisitSchema = createServiceVisitSchema
  .partial()
  .omit({ createTransaction: true })

// ─── Maintenance ──────────────────────────────────────────────────────────────

export const updateMaintenanceItemSchema = z.object({
  lastServiceDate: z.coerce.date().optional(),
  lastServiceMileage: z.number().int().min(0).optional(),
  nextServiceDate: z.coerce.date().optional(),
  nextServiceMileage: z.number().int().min(0).optional(),
  notes: z.string().trim().max(2000).nullish(),
})

// ─── AI suggestions ───────────────────────────────────────────────────────────

export const applyAiSuggestionsSchema = z.object({
  suggestions: z
    .array(
      z.object({
        type: z.enum([
          'oil_change',
          'timing_belt',
          'timing_chain',
          'brakes_front',
          'brakes_rear',
          'brake_fluid',
          'gearbox_oil',
          'coolant',
          'spark_plugs',
          'glow_plugs',
          'air_filter',
          'cabin_filter',
          'fuel_filter',
          'power_steering_fluid',
          'battery',
          'tires_summer',
          'tires_winter',
          'tires_all_season',
          'clutch',
          'suspension_front',
          'suspension_rear',
          'other',
        ]),
        lastServiceDate: z.coerce.date().optional(),
        lastServiceMileage: z.number().int().min(0).optional(),
      })
    )
    .min(1),
})

// ─── Maintenance log ──────────────────────────────────────────────────────────

export const createMaintenanceLogSchema = z.object({
  category: z.string().trim().min(1).max(100),
  label: z.string().trim().max(200).optional(),
  date: z.coerce.date(),
  mileage: z.number().int().nonnegative().optional(),
  cost: z.number().positive().optional(),
  currency: z.string().length(3).default('PLN'),
  notes: z.string().trim().max(2000).nullish(),
})

export const updateMaintenanceLogSchema = createMaintenanceLogSchema.partial()

// ─── Renew insurance ──────────────────────────────────────────────────────────

export const renewInsuranceSchema = z.object({
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  amount: z.number().positive().optional(),
})

// ─── VIN lookup ───────────────────────────────────────────────────────────────

export const vinLookupSchema = z.object({
  vin: z.string().trim().length(17),
})

// ─── Query params ─────────────────────────────────────────────────────────────

export const serviceVisitCursorSchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
})

export const vehicleCostsQuerySchema = z.object({
  year: z.coerce.number().int().min(2000).max(2100).default(new Date().getFullYear()),
})
