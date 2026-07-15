// The shape of one inbound deal row (a deal another fund shared WITH you),
// matching the `inbound_deals` table, plus the joined co-investor's name.
// Kept in its own file so the page, the cards, and the forms can all import
// the same types without importing each other.

import type { ShareableFieldKey } from '@/app/packets/fields'

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

// The slice of a co-investor the page needs: the "shared by" dropdown uses
// id/name/fund_name; the in-app section also uses email to match a sharer's
// address back to a name in your rolodex.
export type CoInvestorOption = {
  id: string
  name: string
  fund_name: string | null
  email: string | null
}

// ---- In-app shares (a co-investor shared a deal with you INSIDE DealShare) --
// These come from the `inbound_deal_shares()` database function, not a table
// the recipient can read directly. Each deal arrives already trimmed to the
// fields the sharer chose, so every field is optional here.
export type InAppSharedDeal = Partial<
  Record<ShareableFieldKey, string | number | boolean | null>
>

export type InAppShare = {
  share_id: string
  created_at: string
  // The sharer's email (lowercased). Used to group shares by co-investor and,
  // where the recipient has that person in their rolodex, to show their name.
  from_email: string
  included_fields: string[]
  deal: InAppSharedDeal
}
