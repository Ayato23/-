import type { Item, WeatherSnapshot } from './types';

const BANDS: { minTemp: number; min: number; max: number }[] = [
  { minTemp: 25, min: 2, max: 4 },
  { minTemp: 20, min: 3, max: 6 },
  { minTemp: 15, min: 5, max: 8 },
  { minTemp: 10, min: 7, max: 10 },
  { minTemp: 5, min: 9, max: 13 },
  { minTemp: -Infinity, min: 12, max: 99 },
];

export function averageTemp(w: WeatherSnapshot): number {
  return (w.tempMax + w.tempMin) / 2;
}

export function warmthTarget(w: WeatherSnapshot, offset = 0): { min: number; max: number } {
  const avg = averageTemp(w);
  const band = BANDS.find((b) => avg >= b.minTemp) ?? BANDS[BANDS.length - 1];
  return { min: band.min + offset, max: band.max + offset };
}

export function needsOuter(w: WeatherSnapshot, offset = 0): boolean {
  return warmthTarget(w, offset).min >= 6;
}

export function isRainy(w: WeatherSnapshot): boolean {
  return w.precipProb >= 50;
}

const CLOTHING = new Set(['tops', 'bottoms', 'outer', 'onepiece']);

export function clothingWarmth(items: Item[]): number {
  return items.filter((i) => CLOTHING.has(i.category)).reduce((s, i) => s + i.warmth, 0);
}
