export type OpenState = 'open' | 'closed' | 'unknown';

const DAYS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'] as const;
const TIME_RANGE = /^(\d{1,2}):(\d{2})-(\d{1,2}):(\d{2})$/;

interface Rule {
  days: Set<number>;
  ranges: [number, number][] | 'off';
}

function parseDays(spec: string): Set<number> | null {
  const days = new Set<number>();
  for (const part of spec.split(',')) {
    const [from, to] = part.split('-').map((d) => DAYS.indexOf(d.trim() as (typeof DAYS)[number]));
    if (from === -1 || to === -1) return null;
    const end = to ?? from;
    for (let d = from; ; d = (d + 1) % 7) {
      days.add(d);
      if (d === end) break;
    }
  }
  return days;
}

function parseRanges(spec: string): Rule['ranges'] | null {
  if (spec === 'off' || spec === 'closed') return 'off';
  const ranges: [number, number][] = [];
  for (const part of spec.split(',')) {
    const m = TIME_RANGE.exec(part.trim());
    if (!m) return null;
    ranges.push([Number(m[1]) * 60 + Number(m[2]), Number(m[3]) * 60 + Number(m[4])]);
  }
  return ranges;
}

function parseRule(text: string): Rule | null {
  const match = /^((?:Mo|Tu|We|Th|Fr|Sa|Su)[A-Za-z,\- ]*?)\s+(.+)$/.exec(text.trim());
  const daySpec = match ? match[1].replace(/\s/g, '') : 'Mo-Su';
  const days = parseDays(daySpec);
  const ranges = parseRanges((match ? match[2] : text).trim());
  return days && ranges ? { days, ranges } : null;
}

/** Common OpenStreetMap opening_hours forms only; anything else is 'unknown' rather than a guess. */
export function openState(spec: string, now: Date): OpenState {
  const text = spec.trim();
  if (text === '24/7') return 'open';
  if (/PH|SH|sunrise|sunset|week|\[|"|\+/.test(text)) return 'unknown';
  const rules = text.split(';').map(parseRule);
  if (rules.some((r) => r === null)) return 'unknown';
  const day = (now.getDay() + 6) % 7;
  const minutes = now.getHours() * 60 + now.getMinutes();
  const today = (rules as Rule[]).filter((r) => r.days.has(day)).at(-1);
  if (!today || today.ranges === 'off') return 'closed';
  const open = today.ranges.some(([from, to]) => (to > from ? minutes >= from && minutes < to : minutes >= from || minutes < to));
  return open ? 'open' : 'closed';
}
