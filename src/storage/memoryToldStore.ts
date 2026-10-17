import type { ToldStore } from './toldStore';

/** Non-persistent store for tests and as a fallback if SQLite fails to open. */
export function createMemoryToldStore(): ToldStore {
  const ids = new Set<string>();
  return {
    has: (poiId) => ids.has(poiId),
    count: () => ids.size,
    async add(poiId) {
      ids.add(poiId);
    },
    async clear() {
      ids.clear();
    },
  };
}
