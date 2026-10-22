import { useCallback, useEffect, useRef, useState } from 'react';

import { createArticleLoader } from '../content/articleFetcher';
import { createEntityDescriber } from '../content/wikidata';
import { errorText, log } from '../diagnostics/log';
import { captureUncaughtErrors, shareDiagnostics } from '../diagnostics/share';
import { createMlKitTranslator } from '../translate/translator';
import type { LanguageCode } from '../i18n/languages';
import { lookupCountry, startLocationWatch } from '../location/locationService';
import { startSimulatedWalk } from '../location/simulatedWalk';
import { createAiProvider } from '../narration/aiProvider';
import { LlmEngine } from '../narration/llmEngine';
import { ExtractiveEngine } from '../narration/extractiveEngine';
import { FallbackEngine, type FallbackReporter } from '../narration/fallbackEngine';
import type { NarrationEngine } from '../narration/NarrationEngine';
import { createLocalLanguageResolver } from '../pois/localLanguage';
import { createMultiLanguageSource } from '../pois/multiLanguageSource';
import { createWikipediaSource } from '../pois/wikipediaSource';
import { planRoute, type RoutePlan } from '../route/planner';
import { createMemoryToldStore } from '../storage/memoryToldStore';
import { openToldStore, type ToldStore } from '../storage/toldStore';
import { expoSpeaker } from '../voice/speaker';
import { GuideController, INITIAL_SNAPSHOT, type GuideSnapshot } from './guideController';

/** How often to re-decide while the phone sends no new fixes (e.g. sitting still). */
const REEVALUATE_MS = 5_000;

const aiProvider = createAiProvider();
export const AI_NARRATION_ENABLED = aiProvider !== null;
/** "Gemini (gemini-3.5-flash-lite)" or null. */
export const AI_PROVIDER_LABEL = aiProvider?.label ?? null;
/** On-device translation; null on web and in Expo Go, where the native module is absent. */
const translator = createMlKitTranslator();
export const OFFLINE_TRANSLATION_AVAILABLE = translator !== null;

/**
 * The configured AI (Gemini free tier, Claude, …) when there is one; otherwise, or when it
 * fails (offline, free limit reached), the on-device pipeline: Wikidata key facts, extractive
 * summary, ML Kit translation.
 */
function createEngine(report: FallbackReporter, onTranslationFailed: (reason: string) => void): NarrationEngine {
  const loadText = createArticleLoader();
  const offline = new ExtractiveEngine({
    loadText,
    translator,
    describe: createEntityDescriber(),
    onTranslationFailed: (reason) => {
      log('error', `Offline translation failed: ${reason}`);
      onTranslationFailed(reason);
    },
  });
  if (!aiProvider) {
    return offline;
  }
  return new FallbackEngine(new LlmEngine(aiProvider.complete, loadText), offline, report);
}

function fallbackNotice(error: unknown | null): string | null {
  if (error === null) {
    return null;
  }
  const reason = errorText(error);
  log('warn', `AI narration unavailable, used offline summary: ${reason}`);
  return `AI narration unavailable (${reason}), so I read the summary instead.`;
}

captureUncaughtErrors();
log('info', `App started · AI=${AI_PROVIDER_LABEL ?? 'off'} · offlineTranslation=${OFFLINE_TRANSLATION_AVAILABLE}`);

async function openStoreOrFallback(): Promise<ToldStore> {
  try {
    return await openToldStore();
  } catch {
    return createMemoryToldStore();
  }
}

/** Wires the GuideController to real GPS, Wikipedia, TTS and SQLite. */
export function useGuide(lang: LanguageCode) {
  const [snapshot, setSnapshot] = useState<GuideSnapshot>(INITIAL_SNAPSHOT);
  const [walking, setWalking] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);
  /** Why the last narration used the plain summary instead of AI, if it did. */
  const [aiNotice, setAiNotice] = useState<string | null>(null);
  /** Why the last on-device translation failed, shown so the cause is visible on the phone. */
  const [translationNotice, setTranslationNotice] = useState<string | null>(null);
  /** The suggested walk, if the user asked for one. */
  const [route, setRoute] = useState<RoutePlan | null>(null);
  const controllerRef = useRef<GuideController | null>(null);
  const toldRef = useRef<ToldStore | null>(null);
  const stopWatchRef = useRef<(() => void) | null>(null);
  const langRef = useRef(lang);

  // Created once; later language changes go through setLanguage below.
  useEffect(() => {
    let cancelled = false;
    openStoreOrFallback().then((told) => {
      if (cancelled) return;
      toldRef.current = told;
      controllerRef.current = new GuideController(
        {
          // Local Wikipedia (e.g. German in Vienna) merged with the user's language.
          source: createMultiLanguageSource(
            createWikipediaSource(),
            createLocalLanguageResolver(lookupCountry),
          ),
          engine: createEngine(
            (e) => setAiNotice(fallbackNotice(e)),
            (reason) => setTranslationNotice(`Offline translation failed: ${reason}`),
          ),
          speaker: expoSpeaker,
          told,
          canTranslate: AI_NARRATION_ENABLED || OFFLINE_TRANSLATION_AVAILABLE,
          now: Date.now,
          onChange: setSnapshot,
        },
        langRef.current,
      );
    });
    return () => {
      cancelled = true;
      stopWatchRef.current?.();
    };
  }, []);

  useEffect(() => {
    // Read by the creation effect, in case the store opens after a language change.
    langRef.current = lang;
    controllerRef.current?.setLanguage(lang);
  }, [lang]);

  const stop = useCallback(() => {
    stopWatchRef.current?.();
    stopWatchRef.current = null;
    setWalking(false);
    void controllerRef.current?.skip();
  }, []);

  /** Starts feeding fixes from `source` (real GPS or a simulation) into the controller. */
  const beginWalk = useCallback(
    async (source: (controller: GuideController) => Promise<() => void> | (() => void)) => {
      const controller = controllerRef.current;
      if (!controller || stopWatchRef.current) return;
      setStartError(null);
      try {
        const stopSource = await source(controller);
        const timer = setInterval(() => void controller.reevaluate(), REEVALUATE_MS);
        stopWatchRef.current = () => {
          clearInterval(timer);
          stopSource();
        };
        setWalking(true);
      } catch (e) {
        setStartError(e instanceof Error ? e.message : String(e));
      }
    },
    [],
  );

  const start = useCallback(
    () =>
      beginWalk((controller) =>
        startLocationWatch(
          (fix) => void controller.onLocation(fix),
          (reason) => setStartError(reason),
        ),
      ),
    [beginWalk],
  );

  /** Replays a walk through Munich's old town; pauses while the guide is talking. */
  const startSimulated = useCallback(
    () =>
      beginWalk((controller) =>
        startSimulatedWalk((fix) => void controller.onLocation(fix), {
          isPaused: () => controller.state.status === 'narrating',
          onFinished: stop,
        }),
      ),
    [beginWalk, stop],
  );

  const skip = useCallback(() => void controllerRef.current?.skip(), []);
  /** Narrates `poiId`, or the best untold place nearby when omitted. */
  const tellAbout = useCallback((poiId?: string) => void controllerRef.current?.tellAbout(poiId), []);
  /** History and a fun fact about the place on the card. */
  const tellMore = useCallback(() => void controllerRef.current?.tellMore(), []);
  const resetHistory = useCallback(() => {
    void toldRef.current?.clear().then(() => controllerRef.current?.refreshDiscovery());
  }, []);
  const isTold = useCallback((poiId: string) => controllerRef.current?.isTold(poiId) ?? false, []);

  /** Plans a short walk past the best places around the user that they have not heard yet. */
  const planWalk = useCallback(() => {
    const controller = controllerRef.current;
    const position = controller?.state.position;
    if (!controller || !position) {
      setStartError('Start a walk first, so I know where you are.');
      return;
    }
    const plan = planRoute(position, controller.state.nearby, (id) => controller.isTold(id));
    if (!plan) {
      setStartError('Not enough new places nearby for a walk yet. Try a bit further on.');
      return;
    }
    setStartError(null);
    log('info', `Planned walk: ${plan.stops.map((s) => s.title).join(' → ')} (${Math.round(plan.distanceM)} m, ~${plan.minutes} min)`);
    setRoute(plan);
  }, []);
  const endWalk = useCallback(() => setRoute(null), []);
  const shareLog = useCallback(() => {
    shareDiagnostics({
      lang,
      ai: String(AI_NARRATION_ENABLED),
      offlineTranslation: String(OFFLINE_TRANSLATION_AVAILABLE),
      walking: String(walking),
    }).catch((e: unknown) => setStartError(`Could not share the log: ${errorText(e)}`));
  }, [lang, walking]);

  return {
    snapshot,
    walking,
    error: startError ?? snapshot.error,
    aiNotice,
    translationNotice,
    shareLog,
    route,
    planWalk,
    endWalk,
    isTold,
    start,
    startSimulated,
    stop,
    skip,
    tellAbout,
    tellMore,
    resetHistory,
  };
}
