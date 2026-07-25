import { createContext, useContext, useState, type ReactNode } from 'react'

// ── Skill verification / certification ──────────────────────────────────────────
export type CertificationStatus = 'pending' | 'verified' | 'rejected'

export interface Certification {
  id: string
  contractorId: string
  name: string
  issuer: string
  dateUploaded: string
  status: CertificationStatus
}

// ── Contractor availability calendar ─────────────────────────────────────────────
export type AvailabilityStatus = 'available' | 'unavailable'

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

// ── Seed data ────────────────────────────────────────────────────────────────────
const SEED_CERTIFICATIONS: Certification[] = [
  { id: 'cert1', contractorId: 'c1', name: 'Certified Mason — Cameroon Board of Engineers', issuer: 'CBE', dateUploaded: '2 Mar 2026', status: 'verified' },
  { id: 'cert2', contractorId: 'c1', name: 'Solar Installation Certificate', issuer: 'REEEP', dateUploaded: '18 Jun 2026', status: 'pending' },
]

const SEED_AVAILABILITY: Record<string, Record<string, AvailabilityStatus>> = {
  c1: {
    '2026-07-27': 'unavailable',
    '2026-07-28': 'unavailable',
    '2026-08-03': 'unavailable',
  },
}

interface MarketplaceContextValue {
  certifications: Certification[]
  addCertification: (contractorId: string, name: string, issuer: string) => Certification
  decideCertification: (certId: string, status: 'verified' | 'rejected') => void

  availability: Record<string, Record<string, AvailabilityStatus>>
  toggleAvailability: (contractorId: string, date: string) => void
}

const MarketplaceContext = createContext<MarketplaceContextValue>({} as MarketplaceContextValue)

let idCounter = 1000
const nextId = () => `cert${idCounter++}`

export function MarketplaceProvider({ children }: { children: ReactNode }) {
  const [certifications, setCertifications] = useState<Certification[]>(SEED_CERTIFICATIONS)
  const [availability, setAvailability] = useState<Record<string, Record<string, AvailabilityStatus>>>(SEED_AVAILABILITY)

  const addCertification = (contractorId: string, name: string, issuer: string) => {
    const created: Certification = { id: nextId(), contractorId, name, issuer, dateUploaded: 'Just now', status: 'pending' }
    setCertifications((cs) => [created, ...cs])
    return created
  }
  const decideCertification = (certId: string, status: 'verified' | 'rejected') => {
    setCertifications((cs) => cs.map((c) => (c.id === certId ? { ...c, status } : c)))
  }

  const toggleAvailability = (contractorId: string, date: string) => {
    setAvailability((a) => {
      const forContractor = { ...(a[contractorId] ?? {}) }
      forContractor[date] = forContractor[date] === 'unavailable' ? 'available' : 'unavailable'
      if (forContractor[date] === 'available') delete forContractor[date] // "available" is the default — only store exceptions
      return { ...a, [contractorId]: forContractor }
    })
  }

  return (
    <MarketplaceContext.Provider value={{ certifications, addCertification, decideCertification, availability, toggleAvailability }}>
      {children}
    </MarketplaceContext.Provider>
  )
}

export const useMarketplace = () => useContext(MarketplaceContext)
