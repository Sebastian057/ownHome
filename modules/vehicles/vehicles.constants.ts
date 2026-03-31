// ─── UI display constants for vehicles module ────────────────────────────────
// Extracted from vehicles.ui.tsx — single source of truth for labels and options

export const FUEL_TYPE_LABELS: Record<string, string> = {
  petrol: 'Benzyna',
  diesel: 'Diesel',
  lpg: 'LPG',
  electric: 'Elektryczny',
  hybrid: 'Hybryda',
  hydrogen: 'Wodór',
}

export const TRANSMISSION_LABELS: Record<string, string> = {
  manual: 'Manualna',
  automatic: 'Automatyczna',
  semi_automatic: 'Półautomat',
  cvt: 'CVT',
}

export const INSURANCE_TYPE_OPTIONS = [
  { value: 'oc', label: 'OC' },
  { value: 'ac', label: 'AC' },
  { value: 'assistance', label: 'Assistance' },
  { value: 'nnw', label: 'NNW' },
  { value: 'other', label: 'Inne' },
] as const

export const INSPECTION_RESULT_LABELS: Record<string, string> = {
  passed: 'Pozytywny',
  passed_with_defects: 'Z usterkami',
  failed: 'Negatywny',
}

export const MAINTENANCE_LOG_CATEGORIES = [
  'Olej silnikowy',
  'Pasek rozrządu',
  'Łańcuch rozrządu',
  'Hamulce przód',
  'Hamulce tył',
  'Płyn hamulcowy',
  'Olej skrzyni biegów',
  'Płyn chłodzący',
  'Świece zapłonowe',
  'Świece żarowe',
  'Filtr powietrza',
  'Filtr kabinowy',
  'Filtr paliwa',
  'Płyn wspomagania',
  'Akumulator',
  'Opony letnie',
  'Opony zimowe',
  'Opony całoroczne',
  'Sprzęgło',
  'Zawieszenie przód',
  'Zawieszenie tył',
  'Rozrząd',
  'Inne',
] as const

export const CURRENCIES = ['PLN', 'EUR', 'USD', 'GBP'] as const

export type Currency = (typeof CURRENCIES)[number]
export type InsuranceTypeValue = (typeof INSURANCE_TYPE_OPTIONS)[number]['value']
export type MaintenanceLogCategory = (typeof MAINTENANCE_LOG_CATEGORIES)[number]
