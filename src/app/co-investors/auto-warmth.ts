// Automatic warmth: computed from the reciprocity ratio — deals they sent you
// divided by deals you sent them. The more deal flow someone returns relative
// to what you send them, the warmer the relationship reads.
//
// The buckets (the "balanced" mapping — even reciprocity already reads warm):
//
//   ratio ≥ 2    → 5  they send you at least double what you send them
//   ratio ≥ 1    → 4  even, or better
//   ratio ≥ 0.5  → 3  they return at least half
//   ratio > 0    → 2  a little comes back
//   ratio = 0    → 1  one-way street: you send, nothing comes back
//
// No history in either direction → null ("no data yet" — the dots render
// empty). A hand-set warmth on the co-investor row overrides this everywhere;
// callers apply that with `investor.warmth ?? autoWarmth(sent, received)`.
export function autoWarmth(sent: number, received: number): number | null {
  if (sent === 0 && received === 0) return null
  if (received === 0) return 1
  // They've sent you deals and you've sent none back — maximal generosity,
  // and dividing by zero wouldn't bucket, so it's handled before the ratio.
  if (sent === 0) return 5
  const ratio = received / sent
  if (ratio >= 2) return 5
  if (ratio >= 1) return 4
  if (ratio >= 0.5) return 3
  return 2
}
