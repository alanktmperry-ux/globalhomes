/** Fisher-Yates shuffle. Returns a new array; does not mutate input. */
export function fisherYates<T>(arr: T[]): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

interface WithIdAndTier {
  id: string;
  boostTier: 'premier' | 'featured';
}

/**
 * Fills the 5 featured slots from shuffled pools.
 * Slots 1–3 → Premier (cascade Featured if Premier < 3).
 * Slots 4–5 → Featured remaining (cascade nothing if empty — slots just absent).
 * Returns featuredSlots (max 5) and standardListings with zone items removed.
 */
export function fillFeaturedSlots<T extends WithIdAndTier, S extends { id: string }>(
  premierPool: T[],
  featuredPool: T[],
  standardPool: S[],
): { featuredSlots: Array<T & { slotPosition: number }>; standardListings: S[] } {
  const shuffledPremier = fisherYates(premierPool);
  const shuffledFeatured = fisherYates(featuredPool);

  const slots: Array<T & { slotPosition: number }> = [];
  const usedIds = new Set<string>();

  const premierCandidates = [...shuffledPremier];
  const featuredCandidates = [...shuffledFeatured];

  // Fill slots 1–3: Premier first, cascade Featured when Premier pool is exhausted
  for (let slot = 1; slot <= 3; slot++) {
    if (premierCandidates.length > 0) {
      const item = premierCandidates.shift()!;
      slots.push({ ...item, slotPosition: slot });
      usedIds.add(item.id);
    } else if (featuredCandidates.length > 0) {
      const item = featuredCandidates.shift()!;
      slots.push({ ...item, slotPosition: slot });
      usedIds.add(item.id);
    }
  }

  // Fill slots 4–5: remaining Featured (those not already used in cascade above)
  for (let slot = 4; slot <= 5; slot++) {
    if (featuredCandidates.length > 0) {
      const item = featuredCandidates.shift()!;
      slots.push({ ...item, slotPosition: slot });
      usedIds.add(item.id);
    }
  }

  const standardListings = standardPool.filter(s => !usedIds.has(s.id));

  return { featuredSlots: slots, standardListings };
}
