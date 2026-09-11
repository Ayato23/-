import AsyncStorage from '@react-native-async-storage/async-storage';

const TARGET_SLEEP_HOURS_KEY = '@nap_optimizer/target_sleep_hours';
export const DEFAULT_TARGET_SLEEP_HOURS = 7;

export async function getTargetSleepHours(): Promise<number> {
  const raw = await AsyncStorage.getItem(TARGET_SLEEP_HOURS_KEY);
  const value = raw ? Number(raw) : NaN;
  return Number.isFinite(value) && value > 0 ? value : DEFAULT_TARGET_SLEEP_HOURS;
}

export async function setTargetSleepHours(hours: number): Promise<void> {
  await AsyncStorage.setItem(TARGET_SLEEP_HOURS_KEY, String(hours));
}
