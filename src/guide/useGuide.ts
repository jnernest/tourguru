import { useCallback, useEffect, useRef, useState } from 'react';

import { errorText, log } from '../diagnostics/log';
import { captureUncaughtErrors, shareDiagnostics } from '../diagnostics/share';
import type { LanguageCode } from '../i18n/languages';
import type { Fix } from '../location/fix';
import { startBackgroundWatch } from '../location/backgroundLocation';
import { startLocationWatch } from '../location/locationService';
import { startSimulatedWalk } from '../location/simulatedWalk';
import { LlmEngine } from '../narration/llmEngine';
import { ExtractiveEngine } from '../narration/extractiveEngine';
import { FallbackEngine, type FallbackReporter } from '../narration/fallbackEngine';
import type { NarrationEngine } from '../narration/NarrationEngine';
import { planRoute, type RoutePlan } from '../route/planner';
import type { Settings } from '../settings/settings';
import { loadSettings, saveSettings } from '../settings/settingsStore';
import { createMemoryToldStore } from '../storage/memoryToldStore';
import { openToldStore, type ToldStore } from '../storage/toldStore';
import { showNowPlaying, startMediaControls, type MediaAction } from '../voice/mediaControls';
import { expoSpeaker } from '../voice/speaker';
import { GuideController, INITIAL_SNAPSHOT, type GuideSnapshot } from './guideController';
import {
  AI_NARRATION_ENABLED,
  AI_PROVIDER_LABEL,
  aiProvider,
  describePlace,
  loadArticle,
  lookupBusinesses,
  OFFLINE_TRANSLATION_AVAILABLE,
  placeSource,
  translator,
} from './services';

const REEVALUATE_MS = 5_000;

export { AI_NARRATION_ENABLED, AI_PROVIDER_LABEL, OFFLINE_TRANSLATION_AVAILABLE } from './services';

function createEngine(report: FallbackReporter, onTranslationFailed: (reason: string) => void): NarrationEngine {
  const offline = new ExtractiveEngine({
    loadText: loadArticle,
    translator,
    describe: describePlace,
    onTranslationFailed: (reason) => {
      log('error', `Offline translation failed: ${reason}`);
      onTranslationFailed(reason);
    },
  });
  if (!aiProvider) {
    return offline;
  }
  return new FallbackEngine(new LlmEngine(aiProvider.complete, loadArticle), offline, report);
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

function onMediaAction(controller: GuideController, action: MediaAction): void {
  log('info', `Media button: ${action}`);
  if (action === 'next') void controller.skip();
  else if (action === 'previous') void controller.tellMore();
  else if (controller.state.status === 'narrating') void controller.skip();
  else void controller.tellAbout();
}

async function openStoreOrFallback(): Promise<ToldStore> {
  try {
    return await openToldStore();
  } catch {
    return createMemoryToldStore();
  }
}

export function useGuide(lang: LanguageCode) {
  const [snapshot, setSnapshot] = useState<GuideSnapshot>(INITIAL_SNAPSHOT);
  const [walking, setWalking] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);
  const [aiNotice, setAiNotice] = useState<string | null>(null);
  const [translationNotice, setTranslationNotice] = useState<string | null>(null);
  const [route, setRoute] = useState<RoutePlan | null>(null);
  const [settings, setSettings] = useState<Settings>(loadSettings);
  const settingsRef = useRef(settings);
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
          source: placeSource,
          engine: createEngine(
            (e) => setAiNotice(fallbackNotice(e)),
            (reason) => setTranslationNotice(`Offline translation failed: ${reason}`),
          ),
          speaker: expoSpeaker,
          told,
          canTranslate: AI_NARRATION_ENABLED || OFFLINE_TRANSLATION_AVAILABLE,
          autoDepth: AI_NARRATION_ENABLED ? 'story' : 'brief',
          settings: () => settingsRef.current,
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

  const beginWalk = useCallback(
    async (source: (controller: GuideController) => Promise<() => void> | (() => void)) => {
      const controller = controllerRef.current;
      if (!controller || stopWatchRef.current) return;
      setStartError(null);
      try {
        const stopSource = await source(controller);
        const timer = setInterval(() => void controller.reevaluate(), REEVALUATE_MS);
        const stopMedia = startMediaControls((action) => onMediaAction(controller, action));
        stopWatchRef.current = () => {
          clearInterval(timer);
          stopMedia();
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
      beginWalk((controller) => {
        const onFix = (fix: Fix) => void controller.onLocation(fix);
        return settingsRef.current.backgroundGuiding
          ? startBackgroundWatch(onFix)
          : startLocationWatch(onFix, (reason) => setStartError(reason));
      }),
    [beginWalk],
  );

  const { current, status } = snapshot;
  useEffect(() => {
    if (walking && current) showNowPlaying(current.title, status === 'narrating');
  }, [walking, current, status]);

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
  const tellAbout = useCallback((poiId?: string) => void controllerRef.current?.tellAbout(poiId), []);
  const tellMore = useCallback(() => void controllerRef.current?.tellMore(), []);
  const ask = useCallback((question: string) => void controllerRef.current?.ask(question), []);
  const resetHistory = useCallback(() => {
    void toldRef.current?.clear().then(() => controllerRef.current?.refreshDiscovery());
  }, []);
  const isTold = useCallback((poiId: string) => controllerRef.current?.isTold(poiId) ?? false, []);

  const planWalk = useCallback(async () => {
    const controller = controllerRef.current;
    const position = controller?.state.position;
    if (!controller || !position) {
      setStartError('Start a walk first, so I know where you are.');
      return;
    }
    const nearby = controller.state.nearby;
    const businesses = await lookupBusinesses(nearby.map((r) => r.poi.id));
    const plan = planRoute(position, nearby, (id) => controller.isTold(id), businesses);
    if (!plan) {
      setStartError('Not enough new places nearby for a walk yet. Try a bit further on.');
      return;
    }
    setStartError(null);
    log('info', `Planned walk: ${plan.stops.map((s) => s.title).join(' → ')} (${Math.round(plan.distanceM)} m, ~${plan.minutes} min)`);
    setRoute(plan);
  }, []);
  const endWalk = useCallback(() => setRoute(null), []);
  const updateSettings = useCallback((patch: Partial<Settings>) => {
    const next = { ...settingsRef.current, ...patch };
    settingsRef.current = next;
    setSettings(next);
    saveSettings(next);
  }, []);
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
    settings,
    updateSettings,
    planWalk,
    endWalk,
    isTold,
    start,
    startSimulated,
    stop,
    skip,
    tellAbout,
    tellMore,
    ask,
    resetHistory,
  };
}
