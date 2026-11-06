import { missingFor, rankStaples } from '../recommend';
import { ctx, mens, standardCloset, weather } from './fixtures';

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
