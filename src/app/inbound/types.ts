// The shape of one inbound deal row (a deal another fund shared WITH you),
// matching the `inbound_deals` table, plus the joined co-investor's name.
// Kept in its own file so the page, the cards, and the forms can all import
// the same types without importing each other.

// The three statuses the database allows (the `inbound_status` enum), with
// the friendlier labels shown in the UI.
export const INBOUND_STATUSES = [
  { value: 'interested', label: 'Interested' },
  { value: 'passed', label: 'Passed' },
  { value: 'meeting_booked', label: 'Meeting booked' },
] as const

export type InboundStatus = (typeof INBOUND_STATUSES)[number]['value']

export function statusLabel(status: string): string {
  return INBOUND_STATUSES.find((s) => s.value === status)?.label ?? status
}

export type InboundDeal = {
  id: string
  created_at: string
  company_name: string
  status: InboundStatus
  notes: string | null
  co_investor_id: string | null
  // Joined through the foreign key; null if the co-investor was deleted.
  co_investors: { id: string; name: string; fund_name: string | null } | null
}

// The slice of a co-investor the "shared by" dropdown needs.
export type CoInvestorOption = { id: string; name: string; fund_name: string | null }
