import { generateId, getList, setList } from '@/lib/storage';
import type { NapLog, NapLogDraft } from '@/lib/types';

const NAP_LOGS_KEY = '@nap_optimizer/nap_logs';

export async function getAllNapLogs(): Promise<NapLog[]> {
  const logs = await getList<NapLog>(NAP_LOGS_KEY);
  return logs.sort((a, b) => b.created_at.localeCompare(a.created_at));
}

/** The most recently recorded nap, or undefined if none exists yet. */
export async function getLatestNapLog(): Promise<NapLog | undefined> {
  const logs = await getAllNapLogs();
  return logs[0];
}

export async function addNapLog(draft: NapLogDraft): Promise<NapLog> {
  const logs = await getList<NapLog>(NAP_LOGS_KEY);
  const log: NapLog = {
    ...draft,
    id: generateId(),
    created_at: new Date().toISOString(),
  };
  await setList(NAP_LOGS_KEY, [...logs, log]);
  return log;
}

export async function deleteNapLog(id: string): Promise<void> {
  const logs = await getList<NapLog>(NAP_LOGS_KEY);
  await setList(
    NAP_LOGS_KEY,
    logs.filter((l) => l.id !== id),
  );
}

export async function getNapLogsSince(dates: string[]): Promise<NapLog[]> {
  const dateSet = new Set(dates);
  const logs = await getAllNapLogs();
  return logs.filter((l) => dateSet.has(l.date));
}
