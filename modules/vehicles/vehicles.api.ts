// Re-export for module discovery.
// Actual Route Handlers live in /app/api/vehicles/**
export { vehicleService, insuranceService, inspectionService, serviceVisitService, maintenanceService, vinLookupService, vehicleCostsService } from './vehicles.service'
export { vehicleRepository, insuranceRepository, inspectionRepository, serviceVisitRepository, maintenanceRepository } from './vehicles.repository'
