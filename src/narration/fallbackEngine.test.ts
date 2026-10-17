import { describe, expect, it, vi } from 'vitest';

import { poiNorth } from '../testing/poiFactory';
import { ClaudeEngine, type CompleteFn } from './claudeEngine';
import { ExtractiveEngine } from './extractiveEngine';
import { FallbackEngine } from './fallbackEngine';

const poi = poiNorth('1', 0, { title: 'Old Tower', summary: 'A tower. It is old.' });

describe('ClaudeEngine', () => {
  it('sends the grounded prompt and returns the model text', async () => {
    const complete = vi.fn<CompleteFn>(async () => 'Here stands the Old Tower.');
    await expect(new ClaudeEngine(complete).narrate(poi, 'en')).resolves.toBe(
      'Here stands the Old Tower.',
    );
    expect(complete.mock.calls[0][0].user).toContain('A tower. It is old.');
  });
});

describe('FallbackEngine', () => {
  it('uses the primary engine and reports success', async () => {
    const report = vi.fn();
    const engine = new FallbackEngine(
      new ClaudeEngine(async () => 'AI text'),
      new ExtractiveEngine(),
      report,
    );
    await expect(engine.narrate(poi, 'en')).resolves.toBe('AI text');
    expect(report).toHaveBeenCalledWith(null);
  });

  it('falls back to the plain summary when the primary fails, and reports why', async () => {
    const report = vi.fn();
    const offline = new Error('Network request failed');
    const engine = new FallbackEngine(
      new ClaudeEngine(async () => {
        throw offline;
      }),
      new ExtractiveEngine(),
      report,
    );
    const onTheRight = { distanceM: 40, direction: 'right' as const };
    await expect(engine.narrate(poi, 'en', onTheRight)).resolves.toMatch(
      /^(On your right is|Look to your right:) Old Tower\.? A tower\. It is old\.$/,
    );
    expect(report).toHaveBeenCalledWith(offline);
  });

  it('passes where the place is on to the primary engine', async () => {
    const complete = vi.fn<CompleteFn>(async () => 'AI text');
    await new FallbackEngine(new ClaudeEngine(complete), new ExtractiveEngine()).narrate(poi, 'en', {
      distanceM: 60,
      direction: 'left',
    });
    expect(complete.mock.calls[0][0].user).toContain("Position: about 60 metres, on the listener's left");
  });
});
