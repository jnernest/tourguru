import { describe, expect, it, vi } from 'vitest';

import type { Fix } from '../location/fix';
import { ExtractiveEngine } from '../narration/extractiveEngine';
import type { Poi, PoiSource } from '../pois/types';
import { createMemoryToldStore } from '../storage/memoryToldStore';
import { ORIGIN, poiNorth } from '../testing/poiFactory';
import type { Speaker } from '../voice/speaker';
import { COOLDOWN_MS, GuideController, MAX_ACCURACY_M, type GuideDeps } from './guideController';

const M_PER_DEG_LAT = 111_195;

function fixAt(metresNorth: number, overrides: Partial<Fix> = {}): Fix {
  return {
    lat: ORIGIN.lat + metresNorth / M_PER_DEG_LAT,
    lon: ORIGIN.lon,
    heading: null,
    accuracyM: 5,
    timestamp: 0,
    ...overrides,
  };
}

function setup(pois: Poi[], { canTranslate = false } = {}) {
  let clock = 1_000_000;
  const spoken: { text: string; locale: string }[] = [];
  const speaker: Speaker = {
    speak: vi.fn(async (text: string, locale: string) => {
      spoken.push({ text, locale });
      return 'done' as const;
    }),
    stop: vi.fn(async () => undefined),
  };
  const source: PoiSource = { nearby: vi.fn(async () => pois) };
  const deps: GuideDeps = {
    source,
    engine: new ExtractiveEngine(),
    speaker,
    told: createMemoryToldStore(),
    canTranslate,
    now: () => clock,
    onChange: vi.fn(),
  };
  const controller = new GuideController(deps, 'en');
  /** Two fixes at the same spot = one stable reading. */
  const settleAt = async (metresNorth: number) => {
    await controller.onLocation(fixAt(metresNorth));
    await controller.onLocation(fixAt(metresNorth));
    await controller.whenIdle();
  };
  return {
    controller,
    deps,
    spoken,
    settleAt,
    advance: (ms: number) => {
      clock += ms;
    },
  };
}

describe('GuideController', () => {
  it('narrates a nearby place once the reading is stable', async () => {
    const t = setup([poiNorth('a', 30, { title: 'Old Tower' })]);
    await t.controller.onLocation(fixAt(0));
    expect(t.spoken).toHaveLength(0);
    await t.controller.onLocation(fixAt(0));
    await t.controller.whenIdle();
    expect(t.spoken).toEqual([{ text: expect.stringContaining('Old Tower'), locale: 'en-US' }]);
    expect(t.controller.state).toMatchObject({
      status: 'idle',
      current: { id: 'a' },
      narration: t.spoken[0].text,
    });
  });

  it('never repeats a place', async () => {
    const t = setup([poiNorth('a', 30)]);
    await t.settleAt(0);
    t.advance(COOLDOWN_MS * 10);
    await t.settleAt(0);
    expect(t.spoken).toHaveLength(1);
  });

  it('waits for the cooldown before the next place', async () => {
    const t = setup([poiNorth('a', 10), poiNorth('b', 20)]);
    await t.settleAt(0);
    await t.settleAt(0);
    expect(t.spoken).toHaveLength(1);
    t.advance(COOLDOWN_MS);
    await t.settleAt(0);
    expect(t.spoken).toHaveLength(2);
  });

  it('ignores inaccurate fixes', async () => {
    const t = setup([poiNorth('a', 10)]);
    const vague = fixAt(0, { accuracyM: MAX_ACCURACY_M + 1 });
    await t.controller.onLocation(vague);
    await t.controller.onLocation(vague);
    expect(t.deps.source.nearby).not.toHaveBeenCalled();
    expect(t.spoken).toHaveLength(0);
  });

  it('re-queries only after moving far enough', async () => {
    const t = setup([]);
    await t.controller.onLocation(fixAt(0));
    await t.controller.onLocation(fixAt(100));
    expect(t.deps.source.nearby).toHaveBeenCalledTimes(1);
    await t.controller.onLocation(fixAt(200));
    expect(t.deps.source.nearby).toHaveBeenCalledTimes(2);
  });

  it('re-queries in the new language after a language switch', async () => {
    const t = setup([]);
    await t.controller.onLocation(fixAt(0));
    t.controller.setLanguage('de');
    await t.controller.onLocation(fixAt(0));
    expect(t.deps.source.nearby).toHaveBeenLastCalledWith(expect.anything(), 500, 'de');
  });

  it('keeps the previous list and reports the error when a fetch fails', async () => {
    const t = setup([poiNorth('a', 300)]);
    await t.controller.onLocation(fixAt(0));
    vi.mocked(t.deps.source.nearby).mockRejectedValueOnce(new Error('offline'));
    await t.controller.onLocation(fixAt(200));
    expect(t.controller.state.error).toBe('offline');
    expect(t.controller.state.nearby.map((r) => r.poi.id)).toEqual(['a']);
  });

  it('speaks while sitting still with a single GPS fix, via periodic re-evaluation', async () => {
    // Schönbrunn: the palace article is pinned ~135 m from where visitors sit.
    const t = setup([poiNorth('palace', 135, { title: 'Schönbrunn Palace' })]);
    await t.controller.onLocation(fixAt(0)); // the only fix the phone sends
    expect(t.spoken).toHaveLength(0);
    await t.controller.reevaluate();
    await t.controller.whenIdle();
    expect(t.spoken[0].text).toContain('Schönbrunn Palace');
  });

  it('reports a weak GPS signal instead of silently ignoring it', async () => {
    const t = setup([poiNorth('a', 10)]);
    await t.controller.onLocation(fixAt(0, { accuracyM: 80 }));
    expect(t.controller.state).toMatchObject({ gpsAccuracyM: 80, gpsWeak: true });
    await t.controller.onLocation(fixAt(0, { accuracyM: 8 }));
    expect(t.controller.state).toMatchObject({ gpsAccuracyM: 8, gpsWeak: false });
  });

  it('tells about the best untold place on request, however far', async () => {
    const t = setup([poiNorth('far', 400, { title: 'Far Tower' })]);
    await t.controller.onLocation(fixAt(0));
    await t.controller.tellAbout();
    expect(t.spoken[0].text).toContain('Far Tower');
    await t.controller.tellAbout();
    expect(t.controller.state.error).toBe('You have heard about every place nearby.');
  });

  it('tells about a tapped place even if already told, ignoring the cooldown', async () => {
    const t = setup([poiNorth('a', 10, { title: 'Old Tower' }), poiNorth('b', 300, { title: 'Bridge' })]);
    await t.settleAt(0);
    await t.controller.tellAbout('b');
    await t.controller.tellAbout('a');
    expect(t.spoken.map((s) => s.text.match(/Old Tower|Bridge/)?.[0])).toEqual(['Old Tower', 'Bridge', 'Old Tower']);
  });

  it('without AI, auto-narrates only places in the chosen language', async () => {
    const t = setup([
      poiNorth('museum', 10, { title: 'Kindermuseum', lang: 'de' }),
      poiNorth('palace', 40, { title: 'Schönbrunn Palace', lang: 'en' }),
    ]);
    await t.settleAt(0);
    expect(t.spoken).toHaveLength(1);
    expect(t.spoken[0].text).toContain('Schönbrunn Palace');
  });

  it('with AI, auto-narrates local-language places too', async () => {
    const t = setup([poiNorth('museum', 10, { title: 'Kindermuseum', lang: 'de' })], { canTranslate: true });
    await t.settleAt(0);
    expect(t.controller.state.current?.id).toBe('museum');
  });

  it('tracks discoveries around the user and awards the first badge', async () => {
    const t = setup([poiNorth('a', 10), poiNorth('b', 300)]);
    await t.settleAt(0);
    expect(t.controller.state).toMatchObject({
      discoveredIds: ['a'],
      discoveredTotal: 1,
      badge: 'First discovery',
      position: expect.objectContaining({ lat: expect.any(Number) }),
    });
    await t.controller.tellAbout('b');
    expect(t.controller.state).toMatchObject({ discoveredTotal: 2, badge: null });
    expect(t.controller.state.discoveredIds.sort()).toEqual(['a', 'b']);
  });

  it('skip stops the speaker', async () => {
    const t = setup([]);
    await t.controller.skip();
    expect(t.deps.speaker.stop).toHaveBeenCalled();
  });
});
