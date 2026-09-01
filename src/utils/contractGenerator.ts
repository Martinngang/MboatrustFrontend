/**
 * Bilingual Cameroon / OHADA Legal Construction Contract & Escrow Certificate Engine
 */

export interface ContractData {
  contractReference: string
  funderName: string
  funderCountry: string
  contractorName: string
  contractorRegistration: string
  projectName: string
  location: string
  totalBudgetXaf: number
  milestones: { title: string; amountXaf: number; durationDays: number }[]
  escrowTrustee: string
  arbitrationJurisdiction: string
  generatedDate: string
  cryptographicHash: string
}

export function generateContractData(params: {
  funderName: string
  funderCountry?: string
  contractorName: string
  contractorRegistration?: string
  projectName: string
  location: string
  totalBudgetXaf: number
  milestones?: { title: string; amountXaf: number; durationDays: number }[]
}): ContractData {
  const contractReference = `MBT-OHADA-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`
  const defaultMilestones = params.milestones && params.milestones.length > 0
    ? params.milestones
    : [
        { title: 'Foundation, Earthworks & Rebar Casting', amountXaf: Math.round(params.totalBudgetXaf * 0.35), durationDays: 30 },
        { title: 'Superstructure Masonry & Slab Pouring', amountXaf: Math.round(params.totalBudgetXaf * 0.35), durationDays: 45 },
        { title: 'Roofing, Carpentry & Waterproofing', amountXaf: Math.round(params.totalBudgetXaf * 0.20), durationDays: 20 },
        { title: 'Finishing, Plumbing & Final Handover', amountXaf: Math.round(params.totalBudgetXaf * 0.10), durationDays: 25 },
      ]

  // Simulated SHA-256 cryptographic seal
  const cryptographicHash = `0x${Array.from({ length: 32 }, () => Math.floor(Math.random() * 16).toString(16)).join('').toUpperCase()}`

  return {
    contractReference,
    funderName: params.funderName,
    funderCountry: params.funderCountry || 'France / Diaspora',
    contractorName: params.contractorName,
    contractorRegistration: params.contractorRegistration || 'RC/DLA/2021/B/1892',
    projectName: params.projectName,
    location: params.location,
    totalBudgetXaf: params.totalBudgetXaf,
    milestones: defaultMilestones,
    escrowTrustee: 'MboaTrust Escrow Fiduciaire (BEAC Parity Regulation)',
    arbitrationJurisdiction: 'Centre d’Arbitrage du GICAM / OHADA Court of Justice',
    generatedDate: new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' }),
    cryptographicHash,
  }
}
