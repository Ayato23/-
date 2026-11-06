import AsyncStorage from '@react-native-async-storage/async-storage';

const PREFIX = 'closet:v1:';

async function backupCorrupt(raw: string): Promise<void> {
  try {
    await AsyncStorage.setItem(`${PREFIX}corrupt:${Date.now()}`, raw);
  } catch {
    // 退避に失敗しても起動は続ける
  }
}

export function createCollection<T extends { id: string }>(name: string) {
  const key = PREFIX + name;
  return {
    async load(): Promise<T[]> {
      const raw = await AsyncStorage.getItem(key);
      if (raw == null) return [];
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed as T[];
      } catch {
        // fallthrough
      }
      await backupCorrupt(raw);
      return [];
    },
    async save(list: T[]): Promise<void> {
      await AsyncStorage.setItem(key, JSON.stringify(list));
    },
  };
}

export async function loadValue<T>(name: string, fallback: T): Promise<T> {
  const raw = await AsyncStorage.getItem(PREFIX + name);
  if (raw == null) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    await backupCorrupt(raw);
    return fallback;
  }
}

export async function saveValue<T>(name: string, value: T): Promise<void> {
  await AsyncStorage.setItem(PREFIX + name, JSON.stringify(value));
}

export async function resetAll(): Promise<void> {
  const keys = await AsyncStorage.getAllKeys();
  await AsyncStorage.multiRemove(keys.filter((k) => k.startsWith(PREFIX)));
}

export function generateId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}
