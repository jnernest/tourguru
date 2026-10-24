import type { ToldStore } from './toldStore';

// expo-sqlite on web needs WASM and COOP/COEP headers; localStorage is plenty here.

export type { ToldStore } from './toldStore';

const STORAGE_KEY = 'tourguide.told';

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
