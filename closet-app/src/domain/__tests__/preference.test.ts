import { buildPreference, pairKey, preferenceScore } from '../preference';
import type { Outfit } from '../types';

const outfit = (itemIds: string[], extra: Partial<Outfit>): Outfit => ({
  id: itemIds.join(''),
  itemIds,
  source: 'auto',
  rejected: false,
  createdAt: '2026-11-01T00:00:00Z',
  ...extra,
});

it('pairKey sorts ids', () => {
  expect(pairKey('b', 'a')).toBe('a|b');
});

it('5 stars adds +2 to items and pairs', () => {
  const p = buildPreference([outfit(['a', 'b'], { rating: 5 })]);
  expect(p.item.a).toBe(2);
  expect(p.pair['a|b']).toBe(2);
});

it('rejected adds -2 even when rated', () => {
  const p = buildPreference([outfit(['a', 'b'], { rating: 5 }), outfit(['a', 'c'], { rating: 5, rejected: true })]);
  expect(p.item.a).toBe(0);
  expect(p.pair['a|c']).toBe(-2);
});

it('3 stars and unrated outfits change nothing', () => {
  const p = buildPreference([outfit(['a', 'b'], { rating: 3 }), outfit(['a', 'b'], {})]);
  expect(p.item).toEqual({});
  expect(p.pair).toEqual({});
});

it('preferenceScore sums item and pair scores', () => {
  const p = buildPreference([outfit(['a', 'b'], { rating: 4 })]);
  expect(preferenceScore(['a', 'b'], p)).toBe(1 + 1 + 1);
});
