import type { RankedPoi } from '../pois/poiRanker';

/** Narrate anything this close, regardless of direction. */
export const NEAR_RADIUS_M = 60;
/** Narrate places this close if they are ahead of the walker. */
export const AHEAD_RADIUS_M = 120;
/**
 * Someone standing or sitting still is usually looking at something. Big sights (palaces,
 * parks) carry a single Wikipedia coordinate that is often 100–200 m from where people stand.
 */
export const STILL_RADIUS_M = 200;

function closeEnough(r: RankedPoi, standingStill: boolean): boolean {
  return (
    r.distanceM <= NEAR_RADIUS_M ||
    (r.ahead && r.distanceM <= AHEAD_RADIUS_M) ||
    (standingStill && r.distanceM <= STILL_RADIUS_M)
  );
}

/** Best untold place that is close enough to start talking about, or null. */
export function selectCandidate(
  ranked: RankedPoi[],
  isTold: (poiId: string) => boolean,
  standingStill = false,
): RankedPoi | null {
  return ranked.find((r) => !isTold(r.poi.id) && closeEnough(r, standingStill)) ?? null;
}

/**
 * GPS jitters, especially between tall buildings. Only accept a candidate once it has
 * won on `required` consecutive fixes.
 */
export class StabilityGate {
  private lastId: string | null = null;
  private hits = 0;

  constructor(private readonly required: number) {}

  accept(candidateId: string | null): boolean {
    if (candidateId === null || candidateId !== this.lastId) {
      this.lastId = candidateId;
      this.hits = candidateId === null ? 0 : 1;
    } else {
      this.hits += 1;
    }
    return candidateId !== null && this.hits >= this.required;
  }

  reset(): void {
    this.lastId = null;
    this.hits = 0;
  }
}
