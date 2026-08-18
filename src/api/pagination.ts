// Shared primitive for the `{page,limit}` → `{page,limit,total}` contract
// every backend list endpoint already speaks (contractorProfileController,
// projectController, landListingController, bidController) — confirmed no
// frontend hook was passing those params before this, so every Browse
// screen silently capped at the backend's default limit. Deliberately just
// the getNextPageParam math, not a fully generic fetch wrapper: several of
// these screens' item-mapping is async (per-item rating-summary lookups),
// so each screen keeps its own useInfiniteQuery call and only shares this.
export interface PageMeta {
  page: number
  limit: number
  total: number
}

export function getNextPageParam(lastPage: { meta: PageMeta }): number | undefined {
  const { page, limit, total } = lastPage.meta
  return page * limit < total ? page + 1 : undefined
}
