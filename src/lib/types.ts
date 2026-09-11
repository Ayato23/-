export const LOCATION_PRESETS = ['デスク', '車内', '仮眠スペース', 'その他'] as const;
export type LocationPreset = (typeof LOCATION_PRESETS)[number];

export const POSTURES = ['座位', '半横臥', 'その他'] as const;
export type Posture = (typeof POSTURES)[number];

export interface NapLog {
  id: string;
  date: string; // YYYY-MM-DD
  start_time: string; // HH:MM
  duration_minutes: number;
  location_tag: string; // preset label or free text
  posture: Posture;
  pre_nap_sleepiness: number; // 1-5
  post_nap_focus: number; // 1-5
  post_nap_sleepiness: number; // 1-5
  post_nap_mood?: number; // 1-5, optional
  created_at: string; // ISO timestamp
}

export type NapLogDraft = Omit<NapLog, 'id' | 'created_at'>;

export interface SleepLog {
  id: string;
  date: string; // YYYY-MM-DD
  bedtime: string; // HH:MM
  wake_time: string; // HH:MM
  sleep_hours: number;
  target_sleep_hours: number;
  sleep_debt: number; // target_sleep_hours - sleep_hours
  created_at: string; // ISO timestamp
}

export type SleepLogDraft = Omit<SleepLog, 'id' | 'created_at' | 'sleep_hours' | 'sleep_debt'> & {
  /** Pass to override the auto-computed value (manual entry). */
  sleep_hours_override?: number;
};
