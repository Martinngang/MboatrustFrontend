/** Default construction-materials catalogue taxonomy — shown as suggestions
 * throughout the inventory UI (category picker, subcategory picker), never
 * enforced server-side (InventoryItem.category/subcategory are free
 * strings, see the backend model) — a quincaillerie owner can always type
 * something new instead, which is exactly the "extensible" requirement:
 * the default list exists to make browsing/picking fast, not to gate what
 * can be stocked. */
export interface CategoryTaxonomyEntry {
  category: string
  subcategories: string[]
}

export const CATEGORY_TAXONOMY: CategoryTaxonomyEntry[] = [
  { category: 'Cement & Concrete', subcategories: ['Cement', 'Concrete blocks', 'Aggregates (sand/gravel)', 'Reinforcement steel', 'Admixtures'] },
  { category: 'Roofing', subcategories: ['Roofing sheets', 'Ridge caps', 'Roofing nails & screws', 'Insulation', 'Gutters & downpipes'] },
  { category: 'Plumbing', subcategories: ['Pipes & fittings', 'Taps & valves', 'Sanitary ware', 'Water tanks', 'Pumps'] },
  { category: 'Electrical', subcategories: ['Cables & wires', 'Switches & sockets', 'Circuit breakers & panels', 'Lighting', 'Conduits & trunking'] },
  { category: 'Timber & Carpentry', subcategories: ['Timber & lumber', 'Plywood & MDF', 'Doors & frames', 'Windows', 'Hinges & handles'] },
  { category: 'Masonry & Structural', subcategories: ['Bricks & blocks', 'Steel structures', 'Scaffolding', 'Formwork'] },
  { category: 'Paint & Finishing', subcategories: ['Paints & primers', 'Tiles', 'Adhesives & grout', 'Varnish & sealants'] },
  { category: 'Tools & Equipment', subcategories: ['Hand tools', 'Power tools', 'Safety equipment (PPE)', 'Measuring tools'] },
  { category: 'Hardware & Fasteners', subcategories: ['Nails, screws & bolts', 'Locks & security', 'Fencing', 'Wire mesh'] },
  { category: 'Sanitation & Water', subcategories: ['Septic tanks', 'Water treatment', 'Drainage'] },
]

export const CATEGORY_NAMES = CATEGORY_TAXONOMY.map((c) => c.category)

export function subcategoriesFor(category: string): string[] {
  return CATEGORY_TAXONOMY.find((c) => c.category === category)?.subcategories ?? []
}

/** Matches the project categories a funder actually picks from when
 * creating a project (see FunderScreens.tsx) — letting a product be tagged
 * with which project types it suits. */
export const PROJECT_CATEGORIES = ['Water & Sanitation', 'Education', 'Healthcare', 'Infrastructure', 'Agriculture', 'Housing']

export const UNIT_SUGGESTIONS = ['bag', 'sheet', 'meter', 'unit', 'roll', 'litre', 'kg', 'box', 'pack', 'length', 'truckload', 'pair']
