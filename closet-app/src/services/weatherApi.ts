import * as Location from 'expo-location';

import type { WeatherSnapshot } from '@/domain/types';

type Daily = {
  time: string[];
  temperature_2m_max: (number | null)[];
  temperature_2m_min: (number | null)[];
  precipitation_probability_max?: (number | null)[];
  snowfall_sum?: (number | null)[];
};

export function parseForecast(json: unknown): WeatherSnapshot[] {
  const daily = (json as { daily?: Daily } | null)?.daily;
  if (!daily || !Array.isArray(daily.time) || !Array.isArray(daily.temperature_2m_max) || !Array.isArray(daily.temperature_2m_min)) {
    return [];
  }
  return daily.time.map((date, i) => ({
    date,
    tempMax: daily.temperature_2m_max[i] ?? 20,
    tempMin: daily.temperature_2m_min[i] ?? 12,
    precipProb: daily.precipitation_probability_max?.[i] ?? 0,
    snow: (daily.snowfall_sum?.[i] ?? 0) > 0,
    manual: false,
  }));
}

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('timeout')), ms);
    p.then(
      (v) => {
        clearTimeout(t);
        resolve(v);
      },
      (e) => {
        clearTimeout(t);
        reject(e);
      },
    );
  });
}

export async function fetchForecast(lat: number, lon: number, timeoutMs = 10000): Promise<WeatherSnapshot[]> {
  const params = [
    `latitude=${lat.toFixed(3)}`,
    `longitude=${lon.toFixed(3)}`,
    'daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,snowfall_sum',
    'timezone=auto',
    'forecast_days=4',
  ].join('&');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`, { signal: controller.signal });
    if (!res.ok) throw new Error(`天気の取得に失敗しました (${res.status})`);
    return parseForecast(await res.json());
  } finally {
    clearTimeout(timer);
  }
}

export async function getCurrentCoords(timeoutMs = 8000): Promise<{ lat: number; lon: number } | null> {
  try {
    const pos = await withTimeout(
      (async () => {
        const perm = await Location.requestForegroundPermissionsAsync();
        if (perm.status !== 'granted') return null;
        return Location.getCurrentPositionAsync({});
      })(),
      timeoutMs,
    );
    if (!pos) return null;
    return { lat: pos.coords.latitude, lon: pos.coords.longitude };
  } catch {
    return null;
  }
}

export function DEFAULT_WEATHER(date: string): WeatherSnapshot {
  return { date, tempMax: 22, tempMin: 16, precipProb: 0, snow: false, manual: true };
}
