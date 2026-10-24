import { distanceMeters, type LatLon } from '../geo/geo';

export interface DiaryPlace {
  id: string;
  title: string;
  at: number;
  narration: string;
  imageUrl: string | null;
  url: string;
}

export interface Walk {
  id: string;
  startedAt: number;
  endedAt: number | null;
  distanceM: number;
  places: DiaryPlace[];
}

const MIN_STEP_M = 8;

export function startWalk(now: number): Walk {
  return { id: String(now), startedAt: now, endedAt: null, distanceM: 0, places: [] };
}

export function addStep(walk: Walk, from: LatLon | null, to: LatLon): Walk {
  const step = from ? distanceMeters(from, to) : 0;
  return step >= MIN_STEP_M ? { ...walk, distanceM: walk.distanceM + step } : walk;
}

export function addPlace(walk: Walk, place: DiaryPlace): Walk {
  if (!walk.places.some((p) => p.id === place.id)) return { ...walk, places: [...walk.places, place] };
  return { ...walk, places: walk.places.map((p) => (p.id === place.id ? { ...p, narration: place.narration } : p)) };
}

function formatKm(m: number): string {
  return m < 1000 ? `${Math.round(m)} m` : `${(m / 1000).toFixed(1)} km`;
}

function firstSentence(text: string): string {
  return /^[^.!?।]+[.!?।]/.exec(text)?.[0] ?? text.slice(0, 160);
}

/** Plain-text summary for the share sheet. */
export function walkSummary(walk: Walk): string {
  const minutes = walk.endedAt ? Math.round((walk.endedAt - walk.startedAt) / 60_000) : null;
  const header = `🚶 My TourGuide walk: ${walk.places.length} ${walk.places.length === 1 ? 'place' : 'places'} · ${formatKm(walk.distanceM)}${minutes !== null ? ` · ${minutes} min` : ''}`;
  const lines = walk.places.map((p, i) => `${i + 1}. ${p.title}: ${firstSentence(p.narration)}\n   ${p.url}`);
  return [header, ...lines].join('\n');
}
