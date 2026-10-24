import { parseSettings, type Settings } from './settings';

const KEY = 'tourguide.settings';

export function loadSettings(): Settings {
  return parseSettings(globalThis.localStorage?.getItem(KEY) ?? null);
}

export function saveSettings(settings: Settings): void {
  globalThis.localStorage?.setItem(KEY, JSON.stringify(settings));
}
