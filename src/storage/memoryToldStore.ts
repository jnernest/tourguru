import type { ToldStore } from './toldStore';

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
