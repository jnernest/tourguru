export const INTERESTS = ['history', 'architecture', 'art', 'religion', 'war', 'people', 'nature'] as const;
export type Interest = (typeof INTERESTS)[number];

export const TONES = ['standard', 'kids', 'expert', 'fun'] as const;
export type Tone = (typeof TONES)[number];

export interface Settings {
  interests: Interest[];
  tone: Tone;
  speechRate: number;
  voiceId: string | null;
  autoTalk: boolean;
  backgroundGuiding: boolean;
  aiEnabled: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  interests: [],
  tone: 'standard',
  speechRate: 1,
  voiceId: null,
  autoTalk: true,
  backgroundGuiding: false,
  aiEnabled: true,
};

export const MIN_SPEECH_RATE = 0.6;
export const MAX_SPEECH_RATE = 1.6;

const isBool = (v: unknown): v is boolean => typeof v === 'boolean';

/** Stored settings, field by field; anything invalid or missing falls back to its default. */
export function parseSettings(json: string | null): Settings {
  let raw: Partial<Record<keyof Settings, unknown>> = {};
  try {
    raw = json ? (JSON.parse(json) as typeof raw) : {};
  } catch {
    return DEFAULT_SETTINGS;
  }
  const d = DEFAULT_SETTINGS;
  const rate = typeof raw.speechRate === 'number' ? raw.speechRate : d.speechRate;
  return {
    interests: Array.isArray(raw.interests)
      ? raw.interests.filter((i): i is Interest => (INTERESTS as readonly unknown[]).includes(i))
      : d.interests,
    tone: (TONES as readonly unknown[]).includes(raw.tone) ? (raw.tone as Tone) : d.tone,
    speechRate: Math.min(MAX_SPEECH_RATE, Math.max(MIN_SPEECH_RATE, rate)),
    voiceId: typeof raw.voiceId === 'string' ? raw.voiceId : d.voiceId,
    autoTalk: isBool(raw.autoTalk) ? raw.autoTalk : d.autoTalk,
    backgroundGuiding: isBool(raw.backgroundGuiding) ? raw.backgroundGuiding : d.backgroundGuiding,
    aiEnabled: isBool(raw.aiEnabled) ? raw.aiEnabled : d.aiEnabled,
  };
}

/** Changes that alter what the narration says, for keying cached stories. */
export function narrationKey(settings: Settings): string {
  return `${settings.tone}|${[...settings.interests].sort().join(',')}`;
}
