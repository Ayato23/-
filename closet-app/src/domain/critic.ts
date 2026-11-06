import { BASE_COLORS, BASIC_COLORS } from './catalog';
import { outfitColors } from './color';
import { OCCASION_RULES, outfitViolations } from './occasionRules';
import { TASTE_PROFILES } from './tasteProfiles';
import type { Ctx, Item } from './types';
import { clothingWarmth, isRainy, warmthTarget } from './weather';

export type Breakdown = { color: number; occasion: number; weather: number; taste: number; silhouette: number };

export const MAX: Breakdown = { color: 25, occasion: 25, weather: 20, taste: 15, silhouette: 15 };

export const BREAKDOWN_LABELS: Record<keyof Breakdown, string> = {
  color: '色の調和',
  occasion: '場面との合い方',
  weather: '天気・気温',
  taste: 'テイストの統一感',
  silhouette: 'シルエット',
};

export interface Swap {
  fromItemId: string;
  toItemId: string;
  gain: number;
}

export interface Evaluation {
  total: number;
  breakdown: Breakdown;
  comments: string[];
  violations: string[];
  swaps: Swap[];
}

const clamp = (v: number, max: number) => Math.max(0, Math.min(max, v));
const colorLabel = (id: string) => BASE_COLORS.find((c) => c.id === id)?.label ?? id;

function scoreColor(items: Item[], comments: string[]): number {
  const colors = outfitColors(items);
  let s = MAX.color;
  if (colors.length === 4) s -= 8;
  if (colors.length >= 5) s -= 15;
  const accents = colors.filter((c) => !BASIC_COLORS.includes(c));
  if (accents.length >= 2) s -= 6;
  const patterned = items.filter((i) => i.pattern !== 'solid').length;
  if (patterned >= 2) s -= 5;
  if (colors.length >= 4) comments.push(`色が${colors.length}色あり散らかって見えます。3色以内にまとめると締まります`);
  else if (accents.length >= 2) comments.push(`差し色(${accents.map(colorLabel).join('・')})が重なっています。1色に絞るとまとまります`);
  else if (patterned >= 2) comments.push('柄物が2点以上あります。柄は1点にすると落ち着きます');
  return clamp(s, MAX.color);
}

function scoreOccasion(items: Item[], ctx: Ctx, comments: string[], violations: string[]): number {
  const rule = OCCASION_RULES[ctx.occasion];
  const v = outfitViolations(items, ctx.occasion, ctx.profile);
  violations.push(...v);
  if (v.length > 0) {
    comments.push(`この場面では避けたい点があります: ${v.join('、')}`);
    return 0;
  }
  if (!rule.formality) return MAX.occasion;
  const [lo, hi] = rule.formality;
  let gap = 0;
  for (const i of items) {
    if (i.formality < lo) gap += lo - i.formality;
    else if (i.formality > hi) gap += i.formality - hi;
  }
  if (gap > 0) {
    const tooCasual = items.some((i) => i.formality < lo);
    comments.push(tooCasual ? 'この場面には少しカジュアルすぎるアイテムがあります' : 'この場面には少しかしこまりすぎです');
  }
  return clamp(MAX.occasion - gap * 4, MAX.occasion);
}

function scoreWeather(items: Item[], ctx: Ctx, comments: string[]): number {
  const w = ctx.weather;
  const target = warmthTarget(w, OCCASION_RULES[ctx.occasion].warmthOffset);
  const sum = clothingWarmth(items);
  let s = MAX.weather;
  if (sum < target.min) {
    s -= (target.min - sum) * 4;
    comments.push('予想気温に対して寒そうです。暖かいアウターや厚手の服を足しましょう');
  } else if (sum > target.max) {
    s -= (sum - target.max) * 4;
    comments.push('予想気温に対して暑そうです。薄手の服に替えましょう');
  }
  const shoes = items.filter((i) => i.category === 'shoes');
  if (isRainy(w)) {
    for (const sh of shoes) {
      if (sh.material === 'suede' || sh.material === 'canvas') {
        s -= 10;
        comments.push('雨予報なのでスエード・キャンバスの靴は避けたいです');
      } else if (!sh.waterResistant) {
        s -= 6;
        comments.push('雨予報です。撥水の靴だと安心です');
      }
    }
  }
  if (w.snow && !shoes.some((sh) => sh.waterResistant)) {
    s -= 12;
    comments.push('雪予報です。防水の靴を選びましょう');
  }
  return clamp(s, MAX.weather);
}

function scoreTaste(items: Item[], ctx: Ctx, comments: string[]): number {
  if (items.length === 0) return 0;
  const tp = TASTE_PROFILES[ctx.taste];
  let total = 0;
  for (const i of items) {
    const c = i.colors[0] ? tp.colors[i.colors[0]] ?? 0 : 0;
    const p = tp.patterns[i.pattern] ?? 0;
    const m = tp.materials[i.material] ?? 0;
    const t = i.tastes.includes(ctx.taste) ? 1 : 0;
    total += (c + p + m + t) / 4;
  }
  const avg = total / items.length;
  const s = ((avg + 1) / 2) * MAX.taste;
  if (avg < 0.25) comments.push('選んだテイストから外れたアイテムが混ざっています');
  return clamp(s, MAX.taste);
}

function scoreSilhouette(items: Item[], ctx: Ctx, comments: string[]): number {
  const top = items.find((i) => i.category === 'tops');
  const bottom = items.find((i) => i.category === 'bottoms');
  const outer = items.find((i) => i.category === 'outer');
  let s = MAX.silhouette;
  if (top?.volume === 'loose' && bottom?.volume === 'loose') {
    s -= 6;
    comments.push('上下ともゆったりで重たく見えます。どちらかをすっきりさせましょう');
  }
  const h = ctx.profile.heightCm;
  if (h !== undefined && h < 160 && outer?.length === 'long' && bottom?.length === 'long') {
    s -= 4;
    comments.push('ロング丈どうしで背が低く見えやすいです。どちらかを短めに');
  }
  const body = ctx.profile.bodyType;
  if (body === 'solid' && top?.volume === 'slim' && bottom?.volume === 'slim') {
    s -= 3;
    comments.push('上下とも細身だと体格が強調されます。少しゆとりのある服を');
  }
  if (body === 'slim' && top?.volume === 'loose' && bottom?.volume === 'loose') s -= 3;
  return clamp(s, MAX.silhouette);
}

function evaluateCore(items: Item[], ctx: Ctx): Evaluation {
  const comments: string[] = [];
  const violations: string[] = [];
  const breakdown: Breakdown = {
    color: scoreColor(items, comments),
    occasion: scoreOccasion(items, ctx, comments, violations),
    weather: scoreWeather(items, ctx, comments),
    taste: scoreTaste(items, ctx, comments),
    silhouette: scoreSilhouette(items, ctx, comments),
  };
  const total = Math.round(Object.values(breakdown).reduce((a, b) => a + b, 0));
  return { total, breakdown, comments: [...new Set(comments)], violations, swaps: [] };
}

export function evaluate(items: Item[], ctx: Ctx, closet?: Item[]): Evaluation {
  const result = evaluateCore(items, ctx);
  if (!closet) return result;
  const inOutfit = new Set(items.map((i) => i.id));
  const swaps: Swap[] = [];
  for (const from of items) {
    for (const to of closet) {
      if (to.category !== from.category || to.status !== 'available' || inOutfit.has(to.id)) continue;
      const replaced = items.map((i) => (i.id === from.id ? to : i));
      const gain = evaluateCore(replaced, ctx).total - result.total;
      if (gain > 0) swaps.push({ fromItemId: from.id, toItemId: to.id, gain });
    }
  }
  result.swaps = swaps.sort((a, b) => b.gain - a.gain).slice(0, 3);
  return result;
}

export const ruleCritic = { evaluate };
