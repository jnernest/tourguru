import * as SQLite from 'expo-sqlite';

/** Remembers which places have already been narrated, across app restarts. */
export interface ToldStore {
  has(poiId: string): boolean;
  /** Places discovered so far, for the discovery badges. */
  count(): number;
  add(poiId: string, at: number): Promise<void>;
  clear(): Promise<void>;
}

const DB_NAME = 'tourguide.db';

export async function openToldStore(): Promise<ToldStore> {
  const db = await SQLite.openDatabaseAsync(DB_NAME);
  await db.execAsync(
    'CREATE TABLE IF NOT EXISTS told (poi_id TEXT PRIMARY KEY NOT NULL, told_at INTEGER NOT NULL);',
  );
  const rows = await db.getAllAsync<{ poi_id: string }>('SELECT poi_id FROM told');
  const ids = new Set(rows.map((r) => r.poi_id));

  return {
    has: (poiId) => ids.has(poiId),
    count: () => ids.size,
    async add(poiId, at) {
      ids.add(poiId);
      await db.runAsync('INSERT OR REPLACE INTO told (poi_id, told_at) VALUES (?, ?)', poiId, at);
    },
    async clear() {
      ids.clear();
      await db.runAsync('DELETE FROM told');
    },
  };
}
