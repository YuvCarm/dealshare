// The single source of truth for which deal fields CAN be shared in a packet.
//
// Both the "new packet" form (to draw the checkboxes with the right defaults)
// and the server action (to validate what actually gets saved) import this
// list, so they can never disagree.
//
//   defaultOn: true  → shared unless you untick it (basic, public-ish info)
//   defaultOn: false → private until you explicitly opt in
//
// Note: `founder_consent` is deliberately NOT here — it's internal bookkeeping
// about the founder, never something to show a co-investor.
//
// This list has a SQL twin: shareable_field_keys() in migration 0011. The
// database filters every share-reading function against it, so a field added
// here won't actually reach recipients until it's added there too (edit the
// array in 0011 and re-run that file).
export const SHAREABLE_FIELDS = [
  { key: 'company_name', label: 'Company name', defaultOn: true },
  { key: 'one_liner', label: 'One-liner', defaultOn: true },
  { key: 'website', label: 'Website', defaultOn: true },
  { key: 'sector', label: 'Sector', defaultOn: true },
  { key: 'geography', label: 'Geography', defaultOn: true },
  { key: 'company_stage', label: 'Stage', defaultOn: true },
  { key: 'round_size', label: 'Round size', defaultOn: true },
  { key: 'round_status', label: 'Round status', defaultOn: true },
  { key: 'round_type', label: 'Round type', defaultOn: true },
  { key: 'lead_investor', label: 'Lead investor', defaultOn: true },
  { key: 'valuation_or_cap', label: 'Valuation / cap', defaultOn: false },
  { key: 'committed_so_far', label: 'Committed so far', defaultOn: false },
  { key: 'your_fund_status', label: 'Your fund status', defaultOn: false },
  { key: 'kpis', label: 'KPIs', defaultOn: false },
  { key: 'deck_url', label: 'Deck URL', defaultOn: false },
  { key: 'notes', label: 'Notes', defaultOn: false },
] as const

export type ShareableFieldKey = (typeof SHAREABLE_FIELDS)[number]['key']

// The keys that start ticked when you first select a deal.
export const DEFAULT_ON_KEYS: ShareableFieldKey[] = SHAREABLE_FIELDS.filter(
  (f) => f.defaultOn
).map((f) => f.key)
