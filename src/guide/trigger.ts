import type { RankedPoi } from '../pois/poiRanker';

export const NEAR_RADIUS_M = 60;
export const AHEAD_RADIUS_M = 120;
export const STILL_RADIUS_M = 200;

function closeEnough(r: RankedPoi, standingStill: boolean): boolean {
  return (
    r.distanceM <= NEAR_RADIUS_M ||
    (r.ahead && r.distanceM <= AHEAD_RADIUS_M) ||
    (standingStill && r.distanceM <= STILL_RADIUS_M)
  );
}

export function selectCandidate(
  ranked: RankedPoi[],
  isTold: (poiId: string) => boolean,
  standingStill = false,
): RankedPoi | null {
  return ranked.find((r) => !isTold(r.poi.id) && closeEnough(r, standingStill)) ?? null;
}

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
