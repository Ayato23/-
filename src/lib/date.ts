function pad(n: number) {
  return n.toString().padStart(2, '0');
}

export function todayString(d: Date = new Date()): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function nowTimeString(d: Date = new Date()): string {
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const WEEKDAYS_JP = ['日', '月', '火', '水', '木', '金', '土'];

export function formatDateJP(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(d.getTime())) return dateStr;
  return `${d.getMonth() + 1}/${d.getDate()}(${WEEKDAYS_JP[d.getDay()]})`;
}

function timeToMinutes(time: string): number | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(time.trim());
  if (!match) return null;
  const h = Number(match[1]);
  const m = Number(match[2]);
  if (h < 0 || h > 23 || m < 0 || m > 59) return null;
  return h * 60 + m;
}

export function isValidTimeString(time: string): boolean {
  return timeToMinutes(time) !== null;
}

/** Computes hours slept between bedtime and wake_time, handling overnight crossing midnight. */
export function computeSleepHours(bedtime: string, wakeTime: string): number | null {
  const bed = timeToMinutes(bedtime);
  const wake = timeToMinutes(wakeTime);
  if (bed === null || wake === null) return null;
  let diff = wake - bed;
  if (diff <= 0) diff += 24 * 60;
  return Math.round((diff / 60) * 100) / 100;
}

export type TimeOfDayBucket = '朝' | '昼' | '午後' | '夕方' | '夜';

export function getTimeOfDayBucket(startTime: string): TimeOfDayBucket {
  const minutes = timeToMinutes(startTime);
  const hour = minutes === null ? 0 : Math.floor(minutes / 60);
  if (hour >= 5 && hour < 10) return '朝';
  if (hour >= 10 && hour < 14) return '昼';
  if (hour >= 14 && hour < 17) return '午後';
  if (hour >= 17 && hour < 21) return '夕方';
  return '夜';
}

/** Returns YYYY-MM-DD strings for the last `days` days, oldest first, ending today. */
export function lastNDays(days: number, end: Date = new Date()): string[] {
  const result: string[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(end);
    d.setDate(d.getDate() - i);
    result.push(todayString(d));
  }
  return result;
}
