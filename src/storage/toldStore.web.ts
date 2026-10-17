import type { ToldStore } from './toldStore';

// Web build only (Metro picks *.web.ts for web). expo-sqlite on web needs WASM bundling and
// COOP/COEP headers; localStorage is plenty for a list of place ids.

export type { ToldStore } from './toldStore';

const STORAGE_KEY = 'walkguide.told';

export async function openToldStore(): Promise<ToldStore> {
  const ids = new Set<string>(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]') as string[]);
  const save = () => localStorage.setItem(STORAGE_KEY, JSON.stringify([...ids]));

  return {
    has: (poiId) => ids.has(poiId),
    count: () => ids.size,
    async add(poiId) {
      ids.add(poiId);
      save();
    },
    async clear() {
      ids.clear();
      save();
    },
  };
}
