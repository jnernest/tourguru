import { errorText, log, roundedCoords } from '../diagnostics/log';
import { bearingDegrees, distanceMeters, relativeDirection } from '../geo/geo';
import { LANGUAGES, type LanguageCode } from '../i18n/languages';
import type { Fix } from '../location/fix';
import { NO_CONTEXT, type NarrationContext, type NarrationEngine } from '../narration/NarrationEngine';
import { rankPois, type RankedPoi } from '../pois/poiRanker';
import type { Poi, PoiSource } from '../pois/types';
import type { ToldStore } from '../storage/toldStore';
import type { Speaker } from '../voice/speaker';
import { selectCandidate, StabilityGate } from './trigger';

export const FETCH_RADIUS_M = 500;
/** Re-query Wikipedia once the walker is this far from the last query centre. */
export const REFETCH_DISTANCE_M = 150;
/** Fixes worse than this are too vague to decide what the user is standing next to. */
export const MAX_ACCURACY_M = 50;
export const COOLDOWN_MS = 15_000;
export const STABLE_FIXES = 2;

export type GuideStatus = 'idle' | 'narrating';

export interface GuideSnapshot {
  status: GuideStatus;
  nearby: RankedPoi[];
  /** Place being narrated, or the last one narrated. */
  current: Poi | null;
  /** Text spoken (or being spoken) for `current`. */
  narration: string | null;
  /** Accuracy of the latest GPS fix in metres, null before the first fix. */
  gpsAccuracyM: number | null;
  /** True when the latest fix was too imprecise to use. */
  gpsWeak: boolean;
  error: string | null;
}

export const INITIAL_SNAPSHOT: GuideSnapshot = {
  status: 'idle',
  nearby: [],
  current: null,
  narration: null,
  gpsAccuracyM: null,
  gpsWeak: false,
  error: null,
};

export interface GuideDeps {
  source: PoiSource;
  engine: NarrationEngine;
  speaker: Speaker;
  told: ToldStore;
  /**
   * Whether the engine can narrate an article written in another language (AI on). If not,
   * automatic narration skips those places; they can still be tapped.
   */
  canTranslate: boolean;
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

  get state(): GuideSnapshot {
    return this.snapshot;
  }

  /** Feed every GPS fix here. Overlapping calls are dropped; the next fix catches up. */
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
      this.update({ nearby: ranked });
      const standingStill = fix.heading === null;
      const speakable = this.deps.canTranslate ? ranked : ranked.filter((r) => r.poi.lang === this.lang);
      const candidate = selectCandidate(speakable, (id) => this.deps.told.has(id), standingStill);
      if (this.gate.accept(candidate?.poi.id ?? null) && candidate && this.canNarrate()) {
        this.narration = this.narrate(candidate.poi);
      }
    } finally {
      this.busy = false;
    }
  }

  /**
   * Re-runs the decision with the last good fix. Phones often send no new fix while the user
   * sits still, so call this on a timer to let the stability gate and cooldown progress.
   */
  async reevaluate(): Promise<void> {
    if (this.lastFix) {
      await this.onLocation(this.lastFix);
    }
  }

  /**
   * Narrates a place on request, ignoring distance and cooldown: the given one, or else the
   * best-ranked place not told yet. Interrupts any narration in progress.
   */
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
    if (this.snapshot.status === 'narrating') {
      await this.skip();
      await this.narration;
    }
    this.narration = this.narrate(target.poi);
    await this.narration;
  }

  /** Stops the current narration. The place stays marked as told. */
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

  /** Resolves once any in-flight narration has finished. */
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

  /** Distance and side of the place as seen from the last fix, for "On your right is…". */
  private contextFor(poi: Poi): NarrationContext {
    const fix = this.lastFix;
    if (!fix) return NO_CONTEXT;
    return {
      distanceM: distanceMeters(fix, poi),
      direction: fix.heading === null ? null : relativeDirection(bearingDegrees(fix, poi), fix.heading),
    };
  }

  private async narrate(poi: Poi): Promise<void> {
    this.update({ status: 'narrating', current: poi, narration: null });
    log('info', `Narrating "${poi.title}" [${poi.lang}→${this.lang}]`);
    try {
      await this.deps.told.add(poi.id, this.deps.now());
      const text = await this.deps.engine.narrate(poi, this.lang, this.contextFor(poi));
      this.update({ narration: text });
      const outcome = await this.deps.speaker.speak(text, LANGUAGES[this.lang].ttsLocale);
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

/** "en:7 de:9" */
function countBy(values: string[]): string {
  const counts = new Map<string, number>();
  values.forEach((v) => counts.set(v, (counts.get(v) ?? 0) + 1));
  return [...counts].map(([k, n]) => `${k}:${n}`).join(' ') || 'none';
}
