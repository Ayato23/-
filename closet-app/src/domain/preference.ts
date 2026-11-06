import type { Outfit } from './types';

export interface Preference {
  item: Record<string, number>;
  pair: Record<string, number>;
}

export function pairKey(a: string, b: string): string {
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}

const RATING_POINTS: Record<number, number> = { 5: 2, 4: 1, 3: 0, 2: -1, 1: -2 };

export function outfitPoints(o: Outfit): number {
  if (o.rejected) return -2;
  if (o.rating === undefined) return 0;
  return RATING_POINTS[o.rating] ?? 0;
}

export function buildPreference(outfits: Outfit[]): Preference {
  const pref: Preference = { item: {}, pair: {} };
  for (const o of outfits) {
    const pts = outfitPoints(o);
    if (pts === 0) continue;
    const ids = [...new Set(o.itemIds)];
    for (const id of ids) pref.item[id] = (pref.item[id] ?? 0) + pts;
    for (let i = 0; i < ids.length; i++) {
      for (let j = i + 1; j < ids.length; j++) {
        const k = pairKey(ids[i], ids[j]);
        pref.pair[k] = (pref.pair[k] ?? 0) + pts;
      }
    }
  }
  return pref;
}

export function preferenceScore(itemIds: string[], pref: Preference): number {
  let s = 0;
  for (const id of itemIds) s += pref.item[id] ?? 0;
  for (let i = 0; i < itemIds.length; i++) {
    for (let j = i + 1; j < itemIds.length; j++) s += pref.pair[pairKey(itemIds[i], itemIds[j])] ?? 0;
  }
  return s;
}
