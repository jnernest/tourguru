/**
 * In-memory diagnostic log, shared from the app via the system share sheet so problems on the
 * phone can be debugged without a USB cable. Never holds API keys; coordinates are rounded.
 */
export type LogLevel = 'info' | 'warn' | 'error';

export interface LogEntry {
  at: number;
  level: LogLevel;
  message: string;
}

const MAX_ENTRIES = 300;
const MAX_MESSAGE_CHARS = 2_000;
const entries: LogEntry[] = [];

export function log(level: LogLevel, message: string, now: number = Date.now()): void {
  entries.push({ at: now, level, message: message.slice(0, MAX_MESSAGE_CHARS) });
  if (entries.length > MAX_ENTRIES) {
    entries.splice(0, entries.length - MAX_ENTRIES);
  }
}

export function errorText(e: unknown): string {
  if (e instanceof Error) {
    const code = (e as Error & { code?: unknown }).code;
    const prefix = typeof code === 'string' && !e.message.includes(code) ? `${code}: ` : '';
    return `${prefix}${e.message}`;
  }
  return String(e);
}

/** ~100 m precision: enough to see which places were in range, not where someone lives. */
export function roundedCoords(lat: number, lon: number): string {
  return `${lat.toFixed(3)},${lon.toFixed(3)}`;
}

export function formatLog(header: string): string {
  const lines = entries.map((e) => `${new Date(e.at).toISOString()} ${e.level.toUpperCase()} ${e.message}`);
  return [header, ...lines].join('\n');
}

export function clearLog(): void {
  entries.length = 0;
}
