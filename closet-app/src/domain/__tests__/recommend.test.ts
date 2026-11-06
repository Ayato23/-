import { missingFor, rankStaples } from '../recommend';
import { ctx, makeItem, mens, standardCloset, weather } from './fixtures';

it('suggests shoes when none are owned', () => {
  const closet = standardCloset().filter((i) => i.category !== 'shoes');
  const res = missingFor({ closet, ctx: ctx(), outfits: [], wearLogs: [] });
  expect(res.some((s) => s.label.includes('靴'))).toBe(true);
});

it('suggests water-resistant shoes for rain when none are owned', () => {
  const closet = standardCloset().filter((i) => !(i.category === 'shoes' && i.waterResistant));
  const res = missingFor({ closet, ctx: ctx({ occasion: 'rain', weather: weather({ precipProb: 80 }) }), outfits: [], wearLogs: [] });
  expect(res.some((s) => s.searchKeyword.includes('撥水'))).toBe(true);
});

it('suggests nothing for rain when water-resistant shoes and outer exist', () => {
  const res = missingFor({ closet: standardCloset(), ctx: ctx({ occasion: 'rain' }), outfits: [], wearLogs: [] });
  expect(res.filter((s) => s.searchKeyword.includes('撥水 レザー'))).toEqual([]);
});

describe('rankStaples', () => {
  const closet = standardCloset().filter((i) => i.category !== 'tops' || i.id === 'teeB');
  const res = rankStaples(closet, mens, '2026-11-06', []);
  it('returns positive gains in descending order', () => {
    expect(res.length).toBeGreaterThan(0);
    for (const s of res) expect(s.gain).toBeGreaterThan(0);
    for (let i = 1; i < res.length; i++) expect(res[i - 1].gain!).toBeGreaterThanOrEqual(res[i].gain!);
  });
  it('returns at most 5 items with a reason', () => {
    expect(res.length).toBeLessThanOrEqual(5);
    expect(res[0].reason).toMatch(/新たに\d+コーデ組めます/);
  });
});

it('does not recommend a staple the user already owns (same type and main color)', () => {
  const closet = [
    makeItem({ id: 'shirtW', category: 'tops', subcategory: 'shirt', colors: ['white'], formality: 4 }),
    makeItem({ id: 'knitN', category: 'tops', subcategory: 'knit', colors: ['navy'], material: 'wool', warmth: 3, formality: 3 }),
    makeItem({ id: 'slacks', category: 'bottoms', subcategory: 'slacks', colors: ['charcoal'], material: 'wool', formality: 4 }),
    makeItem({ id: 'jeans', category: 'bottoms', subcategory: 'jeans', colors: ['blue'], material: 'denim', formality: 2 }),
    makeItem({ id: 'leather', category: 'shoes', subcategory: 'leatherShoes', colors: ['black'], material: 'leather', formality: 4 }),
    makeItem({ id: 'sneakers', category: 'shoes', subcategory: 'sneakers', colors: ['white'], material: 'canvas', formality: 2 }),
    makeItem({ id: 'jacket', category: 'outer', subcategory: 'tailoredJacket', colors: ['navy'], material: 'wool', warmth: 3, formality: 4 }),
  ];
  const ids = rankStaples(closet, mens, '2026-11-06', []).map((s) => s.id);
  expect(ids).not.toContain('blackLeather');
  expect(ids).not.toContain('navyJacket');
  expect(ids).not.toContain('whiteShirt');
});

it('does not tell the user to buy shoes that are only in the laundry', () => {
  const closet = standardCloset().map((i) => (i.category === 'shoes' ? { ...i, status: 'laundry' as const } : i));
  const res = missingFor({ closet, ctx: ctx(), outfits: [], wearLogs: [] });
  expect(res.some((s) => s.id.startsWith('missing:'))).toBe(false);
});
