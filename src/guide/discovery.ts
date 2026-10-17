/** Discovery badges: places heard about, in total. */
export const BADGES: { at: number; name: string }[] = [
  { at: 1, name: 'First discovery' },
  { at: 10, name: 'Explorer' },
  { at: 25, name: 'Pathfinder' },
  { at: 50, name: 'Local expert' },
  { at: 100, name: 'Master guide' },
];

export interface DiscoveryProgress {
  /** Highest badge earned, or null before the first discovery. */
  badge: string | null;
  /** Places still needed for the next badge, or null after the last one. */
  toNext: number | null;
  nextBadge: string | null;
}

export function discoveryProgress(total: number): DiscoveryProgress {
  const earned = BADGES.filter((b) => total >= b.at);
  const next = BADGES.find((b) => total < b.at) ?? null;
  return {
    badge: earned.at(-1)?.name ?? null,
    toNext: next ? next.at - total : null,
    nextBadge: next?.name ?? null,
  };
}

/** The badge just earned when the total goes from `before` to `after`, if any. */
export function badgeEarned(before: number, after: number): string | null {
  return BADGES.filter((b) => before < b.at && after >= b.at).at(-1)?.name ?? null;
}

/** "🏅 Explorer · 12 places discovered · 13 more for Pathfinder" */
export function discoveryLine(total: number, nearbyDiscovered: number, nearbyTotal: number): string {
  const { badge, toNext, nextBadge } = discoveryProgress(total);
  const parts = [
    nearbyTotal > 0 ? `Discovered ${nearbyDiscovered} of ${nearbyTotal} places around you` : null,
    `${total} in total`,
    badge ? `🏅 ${badge}` : null,
    toNext !== null && nextBadge ? `${toNext} more for ${nextBadge}` : null,
  ];
  return parts.filter(Boolean).join(' · ');
}
