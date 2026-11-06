import { enumerate, suggest, type SuggestInput } from './engine';
import { activeRequirements, violations } from './occasionRules';
import { STAPLES } from './staples';
import type { Item, Occasion, Outfit, Profile, WeatherSnapshot } from './types';

export interface Suggestion {
  id: string;
  label: string;
  reason: string;
  searchKeyword: string;
  gain?: number;
}

const STRUCTURAL: { match: string; label: string; keyword: string }[] = [
  { match: '靴', label: '靴(まずは合わせやすい1足)', keyword: 'レザースニーカー 白 / 革靴 黒' },
  { match: 'トップス', label: 'トップスとボトムス', keyword: '白シャツ 無地 / スラックス 黒' },
  { match: 'アウター', label: 'この気温に合うアウター', keyword: 'ウールコート / ダウンジャケット' },
];

export function missingFor(input: SuggestInput): Suggestion[] {
  const { ctx, closet } = input;
  const out: Suggestion[] = [];
  const res = suggest(input);
  for (const m of res.missing) {
    const s = STRUCTURAL.find((x) => m.includes(x.match) && !m.includes('手持ち'));
    if (s) out.push({ id: `missing:${s.match}`, label: s.label, reason: m, searchKeyword: s.keyword });
  }
  const usable = closet.filter((i) => violations(i, ctx.occasion, ctx.profile).length === 0);
  const reqs = [...activeRequirements(ctx.occasion, ctx.profile, 'require'), ...activeRequirements(ctx.occasion, ctx.profile, 'wishes')];
  for (const r of reqs) {
    if (usable.some((i) => r.test(i, ctx.profile))) continue;
    out.push({ id: `req:${r.id}`, label: r.label, reason: `この場面では${r.label}があると安心です`, searchKeyword: r.searchKeyword });
  }
  return out;
}

const RANK_OCCASIONS: Occasion[] = ['everyday', 'office', 'date', 'weddingGuest', 'rain'];
const GOOD_SCORE = 70;

function weatherFor(occasion: Occasion, today: string): WeatherSnapshot {
  return { date: today, tempMax: 22, tempMin: 14, precipProb: occasion === 'rain' ? 80 : 10, snow: false, manual: true };
}

function goodCount(closet: Item[], profile: Profile, today: string, outfits: Outfit[]): number {
  let n = 0;
  for (const occasion of RANK_OCCASIONS) {
    const ctx = { occasion, taste: 'kireime' as const, weather: weatherFor(occasion, today), profile, today };
    n += enumerate({ closet, ctx, outfits, wearLogs: [], topN: 4 }).filter((c) => c.evaluation.total >= GOOD_SCORE).length;
  }
  return n;
}

export function rankStaples(closet: Item[], profile: Profile, today: string, outfits: Outfit[]): Suggestion[] {
  const base = goodCount(closet, profile, today, outfits);
  const staples = STAPLES.filter((s) => profile.style === 'unisex' || s.styles.includes(profile.style));
  const results: Suggestion[] = [];
  for (const s of staples) {
    const virtual: Item = { ...s.item, id: `staple:${s.id}`, photoUri: '', status: 'available', createdAt: '' };
    const gain = goodCount([...closet, virtual], profile, today, outfits) - base;
    if (gain <= 0) continue;
    results.push({ id: s.id, label: s.label, reason: `新たに${gain}コーデ組めます`, searchKeyword: s.searchKeyword, gain });
  }
  return results.sort((a, b) => b.gain! - a.gain!).slice(0, 5);
}
