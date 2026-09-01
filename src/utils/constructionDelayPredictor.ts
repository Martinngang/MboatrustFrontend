/**
 * AI Construction Delay & Cameroon Weather Predictor Engine
 *
 * Models Cameroon's tropical rainfall zones, concrete curing vulnerabilities,
 * and supply-chain logistics to predict milestone schedule risks.
 */

export interface WeatherRiskAnalysis {
  region: string
  zoneType: 'Equatorial Monsoon (High Rain)' | 'Sudano-Sahelian (Dry)' | 'High Plateau (Moderate Rain)'
  monthlyRainfallMm: number
  riskLevel: 'Low' | 'Medium' | 'High' | 'Severe'
  predictedDelayDays: number
  curingVulnerability: string
  supplyChainLeadTimeDays: number
  recommendedEscrowBufferXaf: number
  mitigationTips: string[]
}

// Cameroon monthly precipitation indices (mm rainfall per month)
const CAMEROON_REGIONAL_RAINFALL: Record<string, number[]> = {
  // Littoral (Douala) - 4,000mm/yr (Monsoon peaks Jul-Oct)
  Littoral: [35, 65, 180, 240, 310, 480, 750, 820, 680, 420, 140, 45],
  // Centre (Yaoundé) - 1,600mm/yr (Bi-modal: Apr-May & Sep-Nov)
  Centre: [20, 50, 140, 190, 210, 150, 75, 90, 230, 290, 130, 25],
  // Sud (Kribi / Ebolowa) - Heavy coastal rain
  Sud: [50, 85, 190, 260, 320, 380, 520, 610, 580, 410, 170, 60],
  // Ouest (Bafoussam) - Highland rain (Jun-Oct)
  Ouest: [15, 30, 110, 160, 190, 220, 280, 310, 290, 210, 60, 15],
  // Nord / Extrême-Nord (Garoua / Maroua) - Sahelian (short rain Jul-Aug)
  Nord: [0, 0, 5, 25, 70, 110, 210, 260, 160, 40, 2, 0],
}

export function predictConstructionDelay(
  regionName: string,
  milestoneType: 'foundation' | 'framing' | 'roofing' | 'finishing',
  targetMonthIndex: number = new Date().getMonth() // 0-11
): WeatherRiskAnalysis {
  const region = CAMEROON_REGIONAL_RAINFALL[regionName] ? regionName : 'Centre'
  const monthlyRain = CAMEROON_REGIONAL_RAINFALL[region][targetMonthIndex]

  let riskLevel: WeatherRiskAnalysis['riskLevel'] = 'Low'
  let predictedDelayDays = 0
  let curingVulnerability = 'Optimal curing conditions with minimal weather interruption.'

  if (monthlyRain > 450) {
    riskLevel = 'Severe'
    predictedDelayDays = milestoneType === 'foundation' ? 14 : milestoneType === 'roofing' ? 18 : 10
    curingVulnerability = 'Severe wash-out risk for fresh concrete. Torrential rainfall may flood foundation trenches.'
  } else if (monthlyRain > 220) {
    riskLevel = 'High'
    predictedDelayDays = milestoneType === 'foundation' ? 8 : milestoneType === 'roofing' ? 10 : 5
    curingVulnerability = 'High moisture impairs masonry setting. Sand & gravel delivery trucks may stall on laterite roads.'
  } else if (monthlyRain > 100) {
    riskLevel = 'Medium'
    predictedDelayDays = 3
    curingVulnerability = 'Moderate showers. Covered curing tarpaulins recommended.'
  }

  const zoneType =
    region === 'Littoral' || region === 'Sud'
      ? 'Equatorial Monsoon (High Rain)'
      : region === 'Nord'
      ? 'Sudano-Sahelian (Dry)'
      : 'High Plateau (Moderate Rain)'

  const mitigationTips: string[] = []
  if (riskLevel === 'Severe' || riskLevel === 'High') {
    mitigationTips.push('Schedule concrete pours early morning before afternoon equatorial downpours.')
    mitigationTips.push('Pre-order 100% of cement bags to on-site dry storage to avoid supply-chain road cuts.')
    mitigationTips.push('Use fast-setting CEM II 42.5R cement with plasticizer additives.')
    mitigationTips.push('Dig perimeter trenches with submersible water dewatering pumps.')
  } else {
    mitigationTips.push('Standard schedule on track. Standard curing water spray 2x daily.')
    mitigationTips.push('Maintain standard 7-day material delivery buffers.')
  }

  return {
    region,
    zoneType,
    monthlyRainfallMm: monthlyRain,
    riskLevel,
    predictedDelayDays,
    curingVulnerability,
    supplyChainLeadTimeDays: riskLevel === 'Severe' ? 7 : riskLevel === 'High' ? 4 : 2,
    recommendedEscrowBufferXaf: riskLevel === 'Severe' ? 500000 : riskLevel === 'High' ? 250000 : 0,
    mitigationTips,
  }
}
