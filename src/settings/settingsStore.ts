import Storage from 'expo-sqlite/kv-store';

import { parseSettings, type Settings } from './settings';

const KEY = 'tourguide.settings';

export function loadSettings(): Settings {
  try {
    return parseSettings(Storage.getItemSync(KEY));
  } catch {
    return parseSettings(null);
  }
}

export function saveSettings(settings: Settings): void {
  Storage.setItemSync(KEY, JSON.stringify(settings));
}
