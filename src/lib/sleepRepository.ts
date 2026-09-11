import { computeSleepHours } from '@/lib/date';
import { generateId, getList, setList } from '@/lib/storage';
import type { SleepLog, SleepLogDraft } from '@/lib/types';

const SLEEP_LOGS_KEY = '@nap_optimizer/sleep_logs';

export async function getAllSleepLogs(): Promise<SleepLog[]> {
  const logs = await getList<SleepLog>(SLEEP_LOGS_KEY);
  return logs.sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export async function addSleepLog(draft: SleepLogDraft): Promise<SleepLog> {
  const { sleep_hours_override, ...rest } = draft;
  const logs = await getList<SleepLog>(SLEEP_LOGS_KEY);
  const sleepHours = sleep_hours_override ?? computeSleepHours(draft.bedtime, draft.wake_time) ?? 0;
  const log: SleepLog = {
    ...rest,
    sleep_hours: sleepHours,
    sleep_debt: Math.round((draft.target_sleep_hours - sleepHours) * 100) / 100,
    id: generateId(),
    created_at: new Date().toISOString(),
  };
  const withoutSameDate = logs.filter((l) => l.date !== draft.date);
  await setList(SLEEP_LOGS_KEY, [...withoutSameDate, log]);
  return log;
}

export async function deleteSleepLog(id: string): Promise<void> {
  const logs = await getList<SleepLog>(SLEEP_LOGS_KEY);
  await setList(
    SLEEP_LOGS_KEY,
    logs.filter((l) => l.id !== id),
  );
}

export async function getSleepLogByDate(date: string): Promise<SleepLog | undefined> {
  const logs = await getAllSleepLogs();
  return logs.find((l) => l.date === date);
}

export async function getSleepLogsSince(dates: string[]): Promise<SleepLog[]> {
  const dateSet = new Set(dates);
  const logs = await getAllSleepLogs();
  return logs.filter((l) => dateSet.has(l.date));
}
