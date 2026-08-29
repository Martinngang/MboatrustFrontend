export interface ConstructionEstimateItem {
  id: string;
  name: string;
  category: 'cement' | 'sand_gravel' | 'steel' | 'masonry';
  quantity: number;
  unit: string;
  unitPrice: number;
  totalCost: number;
  specification: string;
}

export interface ConstructionEstimateResult {
  totalBuiltAreaSqm: number;
  floors: number;
  totalMaterialCostXaf: number;
  costPerSqm: number;
  items: ConstructionEstimateItem[];
}

export function calculateCameroonConstructionMaterials(
  surfaceAreaSqm: number,
  floors: number = 1,
  quality: 'standard' | 'premium' = 'standard'
): ConstructionEstimateResult {
  const area = Math.max(20, surfaceAreaSqm);
  const numFloors = Math.max(1, floors);
  const totalBuiltArea = area * numFloors;
  const qualityFactor = quality === 'premium' ? 1.15 : 1.0;

  const cementBags = Math.round(totalBuiltArea * 3.5 * qualityFactor);
  const cementPrice = 4950;

  const sandTrucks = Math.max(1, Math.round(totalBuiltArea * 0.08 * 10) / 10);
  const sandPrice = 85000;

  const gravelTrucks = Math.max(1, Math.round(totalBuiltArea * 0.10 * 10) / 10);
  const gravelPrice = 135000;

  const rebar12mmBars = Math.round(totalBuiltArea * 1.2 * qualityFactor);
  const rebar12mmPrice = 6800;

  const rebar8mmBars = Math.round(totalBuiltArea * 0.9 * qualityFactor);
  const rebar8mmPrice = 3200;

  const concreteBlocks = Math.round(totalBuiltArea * 18 * qualityFactor);
  const blockPrice = 350;

  const items: ConstructionEstimateItem[] = [
    {
      id: 'cement',
      name: 'Ciment Cimencam / Dangote 42.5R (50kg)',
      category: 'cement',
      quantity: cementBags,
      unit: 'bags',
      unitPrice: cementPrice,
      totalCost: cementBags * cementPrice,
      specification: 'Class 42.5R high resistance for structural reinforced concrete',
    },
    {
      id: 'blocks',
      name: 'Parpaings Vibrés Standard (15x20x40 cm)',
      category: 'masonry',
      quantity: concreteBlocks,
      unit: 'blocks',
      unitPrice: blockPrice,
      totalCost: concreteBlocks * blockPrice,
      specification: 'Machine-vibrated hollow cement blocks for elevation walls',
    },
    {
      id: 'rebar12',
      name: 'Fer à Béton FeE500 HA (12mm x 12m)',
      category: 'steel',
      quantity: rebar12mmBars,
      unit: 'bars',
      unitPrice: rebar12mmPrice,
      totalCost: rebar12mmBars * rebar12mmPrice,
      specification: 'High adhesion longitudinal structural reinforcement',
    },
    {
      id: 'rebar8',
      name: 'Fer à Béton FeE500 HA (8mm x 12m)',
      category: 'steel',
      quantity: rebar8mmBars,
      unit: 'bars',
      unitPrice: rebar8mmPrice,
      totalCost: rebar8mmBars * rebar8mmPrice,
      specification: 'Cadres et étriers pour poteaux et poutres',
    },
    {
      id: 'sand',
      name: 'Sable Fin de la Sanaga (Camion 10m³)',
      category: 'sand_gravel',
      quantity: sandTrucks,
      unit: 'trucks (10m³)',
      unitPrice: sandPrice,
      totalCost: Math.round(sandTrucks * sandPrice),
      specification: 'Washed river sand for mortar and fine concrete mix',
    },
    {
      id: 'gravel',
      name: 'Gravier Concassé 15/25 (Camion 10m³)',
      category: 'sand_gravel',
      quantity: gravelTrucks,
      unit: 'trucks (10m³)',
      unitPrice: gravelPrice,
      totalCost: Math.round(gravelTrucks * gravelPrice),
      specification: 'Crushed quarry stone 15/25 for foundation slabs and lintels',
    },
  ];

  const totalMaterialCostXaf = items.reduce((sum, item) => sum + item.totalCost, 0);
  const costPerSqm = Math.round(totalMaterialCostXaf / totalBuiltArea);

  return {
    totalBuiltAreaSqm: totalBuiltArea,
    floors: numFloors,
    totalMaterialCostXaf,
    costPerSqm,
    items,
  };
}
