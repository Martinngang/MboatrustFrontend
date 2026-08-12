// ── Material cost estimator (static reference data) ──────────────────────────────
export const MATERIALS: { name: string; unit: string; low: number; high: number }[] = [
  { name: 'Cement (50kg bag)', unit: 'per bag', low: 5500, high: 6500 },
  { name: 'Reinforcement steel (12mm)', unit: 'per rod', low: 4800, high: 5600 },
  { name: 'Roofing sheets (aluminium, 2m)', unit: 'per sheet', low: 3200, high: 4200 },
  { name: 'Sand', unit: 'per truckload', low: 35000, high: 50000 },
  { name: 'Gravel', unit: 'per truckload', low: 40000, high: 55000 },
  { name: 'Timber (2x4)', unit: 'per length', low: 1800, high: 2600 },
  { name: 'Cement blocks (15cm)', unit: 'per unit', low: 350, high: 500 },
  { name: 'PVC pipe (110mm, 3m)', unit: 'per length', low: 4500, high: 6000 },
]

export const REGIONS = ['Centre', 'Littoral', 'North West', 'South West', 'West', 'Far North', 'North', 'Adamawa', 'East', 'South']

const REGION_MULTIPLIER: Record<string, number> = {
  Centre: 1.0, Littoral: 1.05, 'North West': 0.95, 'South West': 0.97, West: 0.93,
  'Far North': 1.15, North: 1.12, Adamawa: 1.08, East: 1.1, South: 1.02,
}

export function estimateMaterialPrice(materialName: string, region: string) {
  const material = MATERIALS.find((m) => m.name === materialName) ?? MATERIALS[0]
  const multiplier = REGION_MULTIPLIER[region] ?? 1
  return {
    unit: material.unit,
    low: Math.round((material.low * multiplier) / 50) * 50,
    high: Math.round((material.high * multiplier) / 50) * 50,
  }
}
