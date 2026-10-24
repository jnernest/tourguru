import Storage from 'expo-sqlite/kv-store';

export function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = Storage.getItemSync(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function writeJson(key: string, value: unknown): void {
  Storage.setItemSync(key, JSON.stringify(value));
}
