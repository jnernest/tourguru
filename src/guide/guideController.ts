import { errorText, log, roundedCoords } from '../diagnostics/log';
import { bearingDegrees, distanceMeters, relativeDirection } from '../geo/geo';
import { LANGUAGES, type LanguageCode } from '../i18n/languages';
import type { Fix } from '../location/fix';
import {
  NO_CONTEXT,
  type NarrationContext,
  type NarrationDepth,
  type NarrationEngine,
} from '../narration/NarrationEngine';
import { rankPois, type RankedPoi } from '../pois/poiRanker';
import type { Poi, PoiSource } from '../pois/types';
import type { ToldStore } from '../storage/toldStore';
import type { Speaker } from '../voice/speaker';
import { DEFAULT_SETTINGS, type Settings } from '../settings/settings';
import { badgeEarned } from './discovery';
import { selectCandidate, StabilityGate } from './trigger';

export const FETCH_RADIUS_M = 500;
export const REFETCH_DISTANCE_M = 150;
export const MAX_ACCURACY_M = 50;
export const COOLDOWN_MS = 15_000;
export const STABLE_FIXES = 2;

export type GuideStatus = 'idle' | 'narrating';

export interface GuideSnapshot {
  status: GuideStatus;
  nearby: RankedPoi[];
  current: Poi | null;
  narration: string | null;
  gpsAccuracyM: number | null;
  gpsWeak: boolean;
  position: Fix | null;
  discoveredIds: string[];
  discoveredTotal: number;
  badge: string | null;
  error: string | null;
}

export const INITIAL_SNAPSHOT: GuideSnapshot = {
  status: 'idle',
  nearby: [],
  current: null,
  narration: null,
  gpsAccuracyM: null,
  gpsWeak: false,
  position: null,
  discoveredIds: [],
  discoveredTotal: 0,
  badge: null,
  error: null,
};

export interface GuideDeps {
  source: PoiSource;
  engine: NarrationEngine;
  speaker: Speaker;
  told: ToldStore;
  canTranslate: boolean;
  autoDepth?: NarrationDepth;
  settings?: () => Settings;
  now: () => number;
  onChange: (snapshot: GuideSnapshot) => void;
}

export class GuideController {
  private pois: Poi[] = [];
  private fetchCenter: Fix | null = null;
  private lastFix: Fix | null = null;
  private busy = false;
  private lastNarrationEnd = Number.NEGATIVE_INFINITY;
  private narration: Promise<void> = Promise.resolve();
  private readonly gate = new StabilityGate(STABLE_FIXES);
  private snapshot: GuideSnapshot = INITIAL_SNAPSHOT;

  constructor(
    private readonly deps: GuideDeps,
    private lang: LanguageCode,
  ) {}

  private get autoDepth(): NarrationDepth {
    return this.deps.autoDepth ?? 'brief';
  }

  private get settings(): Settings {
    return this.deps.settings?.() ?? DEFAULT_SETTINGS;
  }

  get state(): GuideSnapshot {
    return this.snapshot;
  }

  async onLocation(fix: Fix): Promise<void> {
    const weak = fix.accuracyM !== null && fix.accuracyM > MAX_ACCURACY_M;
    if (weak !== this.snapshot.gpsWeak || this.snapshot.gpsAccuracyM === null) {
      const accuracy = fix.accuracyM === null ? '?' : Math.round(fix.accuracyM);
      log(weak ? 'warn' : 'info', `GPS ${weak ? 'weak' : 'ok'} ±${accuracy} m at ${roundedCoords(fix.lat, fix.lon)}`);
    }
    this.update({ gpsAccuracyM: fix.accuracyM, gpsWeak: weak });
    if (this.busy || weak) {
      return;
    }
    this.busy = true;
    this.lastFix = fix;
    try {
      await this.refreshPoisIfNeeded(fix);
      const ranked = rankPois(this.pois, fix, FETCH_RADIUS_M);
      this.update({ nearby: ranked, position: fix, ...this.discovery(ranked) });
      const standingStill = fix.heading === null;
      const speakable = this.deps.canTranslate ? ranked : ranked.filter((r) => r.poi.lang === this.lang);
      const candidate = selectCandidate(speakable, (id) => this.deps.told.has(id), standingStill);
      if (this.gate.accept(candidate?.poi.id ?? null) && candidate && this.settings.autoTalk && this.canNarrate()) {
        this.narration = this.narrate(candidate.poi, this.autoDepth);
      }
    } finally {
      this.busy = false;
    }
  }

  // Phones often send no new fix while still; a timer lets the gate and cooldown progress.
  async reevaluate(): Promise<void> {
    if (this.lastFix) {
      await this.onLocation(this.lastFix);
    }
  }

  async tellAbout(poiId?: string): Promise<void> {
    const { nearby } = this.snapshot;
    const target = poiId
      ? nearby.find((r) => r.poi.id === poiId)
      : nearby.find((r) => !this.deps.told.has(r.poi.id));
    if (!target) {
      const reason = nearby.length > 0 ? 'You have heard about every place nearby.' : 'No places found nearby yet.';
      this.update({ error: reason });
      return;
    }
    await this.interruptAndTell(target.poi, this.autoDepth);
  }

  async tellMore(): Promise<void> {
    const poi = this.snapshot.current;
    if (!poi) {
      this.update({ error: 'Nothing told yet: tap a place first.' });
      return;
    }
    await this.interruptAndTell(poi, 'story');
  }

  private async interruptAndTell(poi: Poi, depth: NarrationDepth): Promise<void> {
    if (this.snapshot.status === 'narrating') {
      await this.skip();
      await this.narration;
    }
    this.narration = this.narrate(poi, depth);
    await this.narration;
  }

  async skip(): Promise<void> {
    await this.deps.speaker.stop();
  }

  setLanguage(lang: LanguageCode): void {
    this.lang = lang;
    this.pois = [];
    this.fetchCenter = null;
    this.gate.reset();
    this.update({ nearby: [] });
  }

  isTold(poiId: string): boolean {
    return this.deps.told.has(poiId);
  }

  refreshDiscovery(): void {
    this.update({ ...this.discovery(this.snapshot.nearby), badge: null });
  }

  private discovery(nearby: RankedPoi[]): Pick<GuideSnapshot, 'discoveredIds' | 'discoveredTotal'> {
    return {
      discoveredIds: nearby.filter((r) => this.deps.told.has(r.poi.id)).map((r) => r.poi.id),
      discoveredTotal: this.deps.told.count(),
    };
  }

  whenIdle(): Promise<void> {
    return this.narration;
  }

  private canNarrate(): boolean {
    return (
      this.snapshot.status === 'idle' && this.deps.now() - this.lastNarrationEnd >= COOLDOWN_MS
    );
  }

  private async refreshPoisIfNeeded(fix: Fix): Promise<void> {
    if (this.fetchCenter && distanceMeters(this.fetchCenter, fix) < REFETCH_DISTANCE_M) {
      return;
    }
    try {
      this.pois = await this.deps.source.nearby(fix, FETCH_RADIUS_M, this.lang);
      this.fetchCenter = fix;
      this.update({ error: null });
      const byLang = countBy(this.pois.map((p) => p.lang));
      log('info', `Loaded ${this.pois.length} places near ${roundedCoords(fix.lat, fix.lon)} (${byLang})`);
    } catch (e) {
      // Keep the previous list; we retry on the next fix.
      log('error', `Loading places failed: ${errorText(e)}`);
      this.update({ error: errorText(e) });
    }
  }

  private contextFor(poi: Poi, depth: NarrationDepth): NarrationContext {
    const { interests, tone, aiEnabled } = this.settings;
    const fix = this.lastFix;
    const position = fix
      ? {
          distanceM: distanceMeters(fix, poi),
          direction: fix.heading === null ? null : relativeDirection(bearingDegrees(fix, poi), fix.heading),
        }
      : NO_CONTEXT;
    return { ...position, depth, interests, tone, offlineOnly: !aiEnabled };
  }

  private async markDiscovered(poi: Poi): Promise<void> {
    const before = this.deps.told.count();
    await this.deps.told.add(poi.id, this.deps.now());
    const badge = badgeEarned(before, this.deps.told.count());
    if (badge) log('info', `Badge earned: ${badge}`);
    this.update({ ...this.discovery(this.snapshot.nearby), badge });
  }

  private async narrate(poi: Poi, depth: NarrationDepth = 'brief'): Promise<void> {
    this.update({ status: 'narrating', current: poi, narration: null });
    log('info', `Narrating "${poi.title}" [${poi.lang}→${this.lang}, ${depth}]`);
    try {
      await this.markDiscovered(poi);
      const text = await this.deps.engine.narrate(poi, this.lang, this.contextFor(poi, depth));
      this.update({ narration: text });
      const { speechRate, voiceId } = this.settings;
      const outcome = await this.deps.speaker.speak(text, LANGUAGES[this.lang].ttsLocale, { rate: speechRate, voiceId });
      log(outcome === 'done' ? 'info' : 'warn', `Speech ${outcome} (${text.length} chars): ${text.slice(0, 120)}`);
    } catch (e) {
      log('error', `Narration failed for "${poi.title}": ${errorText(e)}`);
      this.update({ error: errorText(e) });
    } finally {
      this.lastNarrationEnd = this.deps.now();
      this.update({ status: 'idle' });
    }
  }

  private update(patch: Partial<GuideSnapshot>): void {
    this.snapshot = { ...this.snapshot, ...patch };
    this.deps.onChange(this.snapshot);
  }
}

function countBy(values: string[]): string {
  const counts = new Map<string, number>();
  values.forEach((v) => counts.set(v, (counts.get(v) ?? 0) + 1));
  return [...counts].map(([k, n]) => `${k}:${n}`).join(' ') || 'none';
}
