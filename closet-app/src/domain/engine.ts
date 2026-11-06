import { seasonOf } from './catalog';
import { evaluate, type Evaluation } from './critic';
import { activeRequirements, OCCASION_RULES, outfitViolations, violations } from './occasionRules';
import { buildPreference, preferenceScore, type Preference } from './preference';
import type { Category, Ctx, Item, Outfit, WearLog } from './types';
import { needsOuter } from './weather';

export interface Candidate {
  itemIds: string[];
  score: number;
  evaluation: Evaluation;
}

export interface SuggestInput {
  closet: Item[];
  ctx: Ctx;
  outfits: Outfit[];
  wearLogs: WearLog[];
  heroItemId?: string;
  /** カテゴリごとに組み合わせに使う上位件数(既定 8) */
  topN?: number;
}

export interface SuggestResult {
  candidates: Candidate[];
  missing: string[];
}

const RECENT_DAYS = 7;
const RECENT_PENALTY = 5;
const PREF_WEIGHT = 3;

function daysBetween(a: string, b: string): number {
  return Math.round((Date.parse(`${a}T00:00:00Z`) - Date.parse(`${b}T00:00:00Z`)) / 86400000);
}

function recentlyWorn(outfits: Outfit[], wearLogs: WearLog[], today: string): Set<string> {
  const byId = new Map(outfits.map((o) => [o.id, o]));
  const worn = new Set<string>();
  for (const log of wearLogs) {
    const d = daysBetween(today, log.date);
    if (d < 0 || d > RECENT_DAYS) continue;
    byId.get(log.outfitId)?.itemIds.forEach((id) => worn.add(id));
  }
  return worn;
}

interface Prepared {
  pool: Item[];
  hero?: Item;
  pref: Preference;
  worn: Set<string>;
  missing: string[];
}

function prepare(input: SuggestInput): Prepared {
  const { closet, ctx } = input;
  const season = seasonOf(ctx.today);
  const missing: string[] = [];
  const usable = (i: Item) => i.status === 'available' && violations(i, ctx.occasion, ctx.profile).length === 0;
  let hero = input.heroItemId ? closet.find((i) => i.id === input.heroItemId) : undefined;
  if (hero && !usable(hero)) {
    missing.push('主役に選んだ服は、この場面か状態(洗濯中など)のため使えません');
    hero = undefined;
  }
  const pool = closet.filter((i) => usable(i) && (i.seasons.length === 0 || i.seasons.includes(season) || i.id === hero?.id));
  return {
    pool,
    hero,
    pref: buildPreference(input.outfits),
    worn: recentlyWorn(input.outfits, input.wearLogs, ctx.today),
    missing,
  };
}

function preferBonus(items: Item[], ctx: Ctx): number {
  const rules = OCCASION_RULES[ctx.occasion].prefer;
  let b = 0;
  for (const i of items) for (const r of rules) if (r.test(i, ctx.profile)) b += r.bonus;
  return b;
}

function scoreOf(items: Item[], ev: Evaluation, ctx: Ctx, p: Prepared): number {
  const ids = items.map((i) => i.id);
  const wornCount = ids.filter((id) => p.worn.has(id)).length;
  return ev.total + preferenceScore(ids, p.pref) * PREF_WEIGHT + preferBonus(items, ctx) - wornCount * RECENT_PENALTY;
}

/** 単体の点数: 組み合わせ前の絞り込み用 */
function singleScore(item: Item, ctx: Ctx, p: Prepared): number {
  const ev = evaluate([item], ctx);
  return ev.breakdown.taste + ev.breakdown.occasion + (p.pref.item[item.id] ?? 0) * PREF_WEIGHT + preferBonus([item], ctx) - (p.worn.has(item.id) ? RECENT_PENALTY : 0);
}

function topOf(p: Prepared, ctx: Ctx, category: Category, n: number): Item[] {
  if (p.hero?.category === category) return [p.hero];
  return p.pool
    .filter((i) => i.category === category)
    .map((i) => ({ i, s: singleScore(i, ctx, p) }))
    .sort((a, b) => b.s - a.s)
    .slice(0, n)
    .map((x) => x.i);
}

function build(input: SuggestInput): { candidates: Candidate[]; missing: string[]; prepared: Prepared } {
  const { ctx } = input;
  const n = input.topN ?? 8;
  const p = prepare(input);
  const missing = [...p.missing];
  const tops = topOf(p, ctx, 'tops', n);
  const bottoms = topOf(p, ctx, 'bottoms', n);
  const onepieces = topOf(p, ctx, 'onepiece', n);
  const shoes = topOf(p, ctx, 'shoes', n);
  const outers = topOf(p, ctx, 'outer', n);

  const heroCat = p.hero?.category;
  const bases: Item[][] = [];
  if (heroCat !== 'onepiece') for (const t of tops) for (const b of bottoms) bases.push([t, b]);
  if (heroCat !== 'tops' && heroCat !== 'bottoms') for (const o of onepieces) bases.push([o]);

  if (bases.length === 0) missing.push('トップスとボトムス(またはワンピース)が未登録です');
  if (shoes.length === 0) missing.push('靴が未登録です');

  const offset = OCCASION_RULES[ctx.occasion].warmthOffset;
  const outerRequired = needsOuter(ctx.weather, offset) || heroCat === 'outer';
  if (outerRequired && outers.length === 0) missing.push('この気温に合うアウターが未登録です');
  const outerOptions: (Item | undefined)[] =
    outers.length === 0 ? [undefined] : outerRequired ? outers : [undefined, ...outers];

  const reqs = activeRequirements(ctx.occasion, ctx.profile);
  for (const r of reqs) {
    if (!p.pool.some((i) => r.test(i, ctx.profile))) missing.push(`${r.label}が手持ちにありません`);
  }

  const candidates: Candidate[] = [];
  if (shoes.length > 0) {
    for (const base of bases) {
      for (const outer of outerOptions) {
        for (const shoe of shoes) {
          const items = outer ? [outer, ...base, shoe] : [...base, shoe];
          if (!reqs.every((r) => items.some((i) => r.test(i, ctx.profile)))) continue;
          if (outfitViolations(items, ctx.occasion, ctx.profile).length > 0) continue;
          const ev = evaluate(items, ctx);
          candidates.push({ itemIds: items.map((i) => i.id), score: scoreOf(items, ev, ctx, p), evaluation: ev });
        }
      }
    }
  }
  candidates.sort((a, b) => b.score - a.score);
  return { candidates, missing: [...new Set(missing)], prepared: p };
}

export function enumerate(input: SuggestInput): Candidate[] {
  return build(input).candidates;
}

function addExtras(c: Candidate, input: SuggestInput, p: Prepared): Candidate {
  const { ctx } = input;
  const byId = new Map(input.closet.map((i) => [i.id, i]));
  let items = c.itemIds.map((id) => byId.get(id)!).filter(Boolean);
  let best = c;
  for (const cat of ['bag', 'accessory'] as Category[]) {
    const pick = topOf(p, ctx, cat, 1)[0];
    if (!pick) continue;
    const next = [...items, pick];
    if (outfitViolations(next, ctx.occasion, ctx.profile).length > 0) continue;
    const ev = evaluate(next, ctx);
    if (ev.total < best.evaluation.total) continue;
    items = next;
    best = { itemIds: next.map((i) => i.id), score: scoreOf(next, ev, ctx, p), evaluation: ev };
  }
  return best;
}

export function suggest(input: SuggestInput): SuggestResult {
  const { candidates, missing, prepared } = build(input);
  const chosen: Candidate[] = [];
  for (const c of candidates) {
    if (chosen.length >= 3) break;
    const diverse = chosen.every((x) => x.itemIds.filter((id) => c.itemIds.includes(id)).length <= 1);
    if (diverse) chosen.push(c);
  }
  return { candidates: chosen.map((c) => addExtras(c, input, prepared)), missing };
}

export const ruleEngine = { suggest };
