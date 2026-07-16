// The shape of one co-investor row, matching the `co_investors` table.
// Kept in its own file so the page, the card, and the form fields can all
// import the same type without importing each other.
export type CoInvestor = {
  id: string
  name: string
  fund_name: string | null
  email: string | null
  thesis_stages: string[] | null
  thesis_sectors: string[] | null
  thesis_geographies: string[] | null
  check_size_min: number | null
  check_size_max: number | null
  // Manual warmth OVERRIDE (1–5). Null means "automatic": computed from the
  // deal-flow ratio — see auto-warmth.ts.
  warmth: number | null
  notes: string | null
}
