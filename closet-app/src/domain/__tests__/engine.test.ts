import { enumerate, suggest, type SuggestInput } from '../engine';
import { outfitViolations } from '../occasionRules';
import type { Item, Occasion, Outfit, WearLog } from '../types';
import { ctx, makeItem, mens, standardCloset, weather } from './fixtures';

const input = (partial: Partial<SuggestInput> = {}): SuggestInput => ({
  closet: standardCloset(),
  ctx: ctx(),
  outfits: [],
  wearLogs: [],
  ...partial,
});

const itemsOf = (closet: Item[], ids: string[]) => ids.map((id) => closet.find((i) => i.id === id)!);

describe('occasion rules are never violated', () => {
  const cases: [Occasion, ReturnType<typeof weather>][] = [
    ['weddingGuest', weather()],
    ['funeral', weather()],
    ['snowEvent', weather({ tempMax: 2, tempMin: -4, snow: true })],
    ['rain', weather({ precipProb: 90 })],
  ];
  it.each(cases)('%s', (occasion, w) => {
    const closet = standardCloset();
    const res = suggest(input({ closet, ctx: ctx({ occasion, weather: w }) }));
    expect(res.candidates.length).toBeGreaterThan(0);
    for (const c of res.candidates) {
      expect(outfitViolations(itemsOf(closet, c.itemIds), occasion, mens)).toEqual([]);
    }
  });
});

it('excludes items in the laundry', () => {
  const closet = standardCloset().map((i) => (i.id === 'teeG' ? { ...i, status: 'laundry' as const } : i));
  const all = enumerate(input({ closet }));
  expect(all.some((c) => c.itemIds.includes('teeG'))).toBe(false);
});

it('always includes the hero item', () => {
  const res = suggest(input({ heroItemId: 'chinos' }));
  expect(res.candidates.length).toBeGreaterThan(0);
  for (const c of res.candidates) expect(c.itemIds).toContain('chinos');
});

it('keeps the three suggestions diverse', () => {
  const { candidates } = suggest(input());
  expect(candidates).toHaveLength(3);
  for (let i = 0; i < candidates.length; i++) {
    for (let j = i + 1; j < candidates.length; j++) {
      const shared = candidates[i].itemIds.filter((id) => candidates[j].itemIds.includes(id));
      expect(shared.length).toBeLessThanOrEqual(1);
    }
  }
});

describe('preference', () => {
  const rated = (extra: Partial<Outfit>): Outfit => ({
    id: 'o1',
    itemIds: ['teeG', 'jeans'],
    source: 'auto',
    rejected: false,
    createdAt: '2026-11-01T00:00:00Z',
    ...extra,
  });
  const hasBoth = (ids: string[]) => ids.includes('teeG') && ids.includes('jeans');

  it('a 5-star outfit moves its pair to the top', () => {
    expect(hasBoth(suggest(input()).candidates[0].itemIds)).toBe(false);
    const { candidates } = suggest(input({ outfits: [rated({ rating: 5 })] }));
    expect(hasBoth(candidates[0].itemIds)).toBe(true);
  });
  it('a rejected outfit knocks the default winner out of first place', () => {
    const winner = (ids: string[]) => ids.includes('knitN') && ids.includes('jeans');
    expect(winner(suggest(input()).candidates[0].itemIds)).toBe(true);
    const { candidates } = suggest(input({ outfits: [rated({ itemIds: ['knitN', 'jeans'], rejected: true })] }));
    expect(winner(candidates[0].itemIds)).toBe(false);
  });
});

it('subtracts 5 points per item worn in the last 7 days', () => {
  const outfits: Outfit[] = [{ id: 'w', itemIds: ['teeG'], source: 'manual', rejected: false, createdAt: '' }];
  const wearLogs: WearLog[] = [{ id: 'l', outfitId: 'w', date: '2026-11-05' }];
  const key = (ids: string[]) => [...ids].sort().join();
  const before = enumerate(input());
  const after = enumerate(input({ outfits, wearLogs }));
  const target = before.find((c) => c.itemIds.includes('teeG'))!;
  const same = after.find((c) => key(c.itemIds) === key(target.itemIds))!;
  expect(target.score - same.score).toBe(5);
});

it('reports missing shoes without throwing', () => {
  const closet = standardCloset().filter((i) => i.category !== 'shoes');
  const res = suggest(input({ closet }));
  expect(res.candidates).toEqual([]);
  expect(res.missing).toContain('靴が未登録です');
});

it('handles an empty closet', () => {
  const res = suggest(input({ closet: [] }));
  expect(res.candidates).toEqual([]);
  expect(res.missing.length).toBeGreaterThan(0);
});

it('keeps season-less items in summer but drops winter-only ones', () => {
  const closet = [
    ...standardCloset(),
    makeItem({ id: 'winterTee', category: 'tops', colors: ['white'], seasons: ['winter'], formality: 2 }),
  ];
  const all = enumerate(input({ closet, ctx: ctx({ today: '2026-07-10', weather: weather({ tempMax: 31, tempMin: 24 }) }) }));
  expect(all.some((c) => c.itemIds.includes('winterTee'))).toBe(false);
  expect(all.some((c) => c.itemIds.includes('teeG'))).toBe(true);
});

it('ignores outfits that reference deleted items', () => {
  const outfits: Outfit[] = [{ id: 'x', itemIds: ['ghost', 'teeG'], source: 'auto', rating: 5, rejected: false, createdAt: '' }];
  const wearLogs: WearLog[] = [{ id: 'l', outfitId: 'missing', date: '2026-11-05' }];
  expect(() => suggest(input({ outfits, wearLogs, heroItemId: 'ghost' }))).not.toThrow();
});

describe('review fixes', () => {
  it('says items are out of season instead of unregistered', () => {
    const closet = standardCloset().map((i) => ({ ...i, seasons: ['summer' as const] }));
    const res = suggest(input({ closet }));
    expect(res.missing.join()).not.toContain('未登録');
    expect(res.missing.join()).toContain('季節');
  });
  it('says shoes are in the laundry instead of unregistered', () => {
    const closet = standardCloset().map((i) => (i.category === 'shoes' ? { ...i, status: 'laundry' as const } : i));
    const res = suggest(input({ closet }));
    expect(res.missing.join()).not.toContain('未登録');
    expect(res.missing.join()).toContain('洗濯中');
  });
  it('always includes a bag chosen as the hero', () => {
    const closet = [
      ...standardCloset(),
      makeItem({ id: 'pinkBag', category: 'bag', subcategory: 'shoulder', colors: ['pink'], pattern: 'print' }),
    ];
    const { candidates } = suggest(input({ closet, heroItemId: 'pinkBag' }));
    expect(candidates.length).toBeGreaterThan(0);
    for (const c of candidates) expect(c.itemIds).toContain('pinkBag');
  });
});
