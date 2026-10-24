import type { Poi } from '../pois/types';

const MAX_STORY_CHARS = 400;

function shorten(text: string): string {
  if (text.length <= MAX_STORY_CHARS) return text;
  const cut = text.slice(0, MAX_STORY_CHARS);
  const end = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf('! '), cut.lastIndexOf('? '));
  return end > 0 ? cut.slice(0, end + 1) : `${cut.trimEnd()}…`;
}

export function placeCardText(poi: Poi, narration: string | null): string {
  const lines = [`📍 ${poi.title}`];
  if (narration) lines.push(shorten(narration));
  if (poi.image) lines.push(`📷 ${poi.image.url}`);
  lines.push(poi.url, '— shared from TourGuide');
  return lines.join('\n\n');
}
