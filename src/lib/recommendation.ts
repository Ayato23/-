import { getTimeOfDayBucket, type TimeOfDayBucket } from '@/lib/date';
import type { NapLog } from '@/lib/types';

/** Bayesian shrinkage strength: a group behaves as if it had K extra naps at the overall mean. */
export const SHRINKAGE_K = 3;
/** Below this many rated naps we fall back to the general (science-based) guideline. */
export const MIN_NAPS_FOR_PERSONAL = 3;
/** Groups with fewer naps than this are not considered as recommendation candidates. */
const MIN_GROUP_SIZE = 2;
/** Sample counts at or above these thresholds raise the confidence level. */
const MEDIUM_CONFIDENCE_N = 5;
const HIGH_CONFIDENCE_N = 10;

export type ConfidenceLevel = 'low' | 'medium' | 'high';

export const CONFIDENCE_LABELS: Record<ConfidenceLevel, string> = {
  low: '低',
  medium: '中',
  high: '高',
};

export type DurationBucket = '〜12分' | '13〜22分' | '23〜35分' | '36分〜';

export interface NapConditions {
  location?: string;
  timeOfDay?: TimeOfDayBucket;
  duration?: DurationBucket;
}

export interface NapRecommendation {
  /** 'personal' = derived from the user's records, 'default' = general guideline (cold start). */
  kind: 'personal' | 'default';
  conditions: NapConditions;
  /** Human-readable conditions, e.g. "デスク・午後・13〜22分". */
  label: string;
  /** Shrunk expected performance score (1-5). null for the general guideline. */
  expectedScore: number | null;
  /** Raw (unshrunk) average score of the matching naps. null for the general guideline. */
  rawMean: number | null;
  /** The user's overall mean score. null when there are no rated naps. */
  overallMean: number | null;
  sampleCount: number;
  confidence: ConfidenceLevel;
  reason: string;
}

export interface PatternScore {
  conditions: NapConditions;
  label: string;
  sampleCount: number;
  rawMean: number;
  expectedScore: number;
}

/** Performance score (1-5) of a single nap: (集中力 + (6-眠気)) / 2. */
export function napPerformanceScore(nap: NapLog): number {
  return (nap.post_nap_focus + (6 - nap.post_nap_sleepiness)) / 2;
}

function isRatingValid(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 1 && value <= 5;
}

/** Naps with usable post-nap ratings. */
export function ratedNaps(naps: NapLog[]): NapLog[] {
  return naps.filter((n) => isRatingValid(n.post_nap_focus) && isRatingValid(n.post_nap_sleepiness));
}

export function getDurationBucket(minutes: number): DurationBucket {
  if (minutes <= 12) return '〜12分';
  if (minutes <= 22) return '13〜22分';
  if (minutes <= 35) return '23〜35分';
  return '36分〜';
}

export function confidenceForSampleCount(n: number): ConfidenceLevel {
  if (n >= HIGH_CONFIDENCE_N) return 'high';
  if (n >= MEDIUM_CONFIDENCE_N) return 'medium';
  return 'low';
}

/** weighted = (n*mean + k*globalMean) / (n+k) */
export function shrinkMean(mean: number, n: number, globalMean: number, k: number = SHRINKAGE_K): number {
  return (n * mean + k * globalMean) / (n + k);
}

function average(values: number[]): number {
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

export function conditionsLabel(conditions: NapConditions): string {
  return [conditions.location, conditions.timeOfDay, conditions.duration]
    .filter((v): v is string => v !== undefined)
    .join('・');
}

type Axis = keyof NapConditions;

/** Full combination first, then pairs, then single-axis fallbacks. */
const AXIS_SETS: Axis[][] = [
  ['location', 'timeOfDay', 'duration'],
  ['location', 'timeOfDay'],
  ['location', 'duration'],
  ['timeOfDay', 'duration'],
  ['location'],
  ['timeOfDay'],
  ['duration'],
];

function conditionsOf(nap: NapLog): Required<NapConditions> {
  return {
    location: nap.location_tag,
    timeOfDay: getTimeOfDayBucket(nap.start_time),
    duration: getDurationBucket(nap.duration_minutes),
  };
}

/**
 * Scores every pattern (each axis combination present in the data) with Bayesian shrinkage
 * toward the overall mean. Sorted by expected score desc, then sample count desc, then specificity.
 */
export function scorePatterns(naps: NapLog[], k: number = SHRINKAGE_K): PatternScore[] {
  const rated = ratedNaps(naps);
  if (rated.length === 0) return [];
  const globalMean = average(rated.map(napPerformanceScore));

  const groups = new Map<string, { conditions: NapConditions; scores: number[] }>();
  for (const nap of rated) {
    const all = conditionsOf(nap);
    const score = napPerformanceScore(nap);
    for (const axes of AXIS_SETS) {
      const conditions: NapConditions = {};
      for (const axis of axes) (conditions as Record<Axis, string>)[axis] = all[axis];
      const key = axes.map((a) => `${a}=${all[a]}`).join('|');
      const group = groups.get(key) ?? { conditions, scores: [] };
      group.scores.push(score);
      groups.set(key, group);
    }
  }

  const specificity = (c: NapConditions) => Object.keys(c).length;
  return Array.from(groups.values())
    .map(({ conditions, scores }) => {
      const mean = average(scores);
      return {
        conditions,
        label: conditionsLabel(conditions),
        sampleCount: scores.length,
        rawMean: round2(mean),
        expectedScore: round2(shrinkMean(mean, scores.length, globalMean, k)),
      };
    })
    .sort(
      (a, b) =>
        b.expectedScore - a.expectedScore ||
        b.sampleCount - a.sampleCount ||
        specificity(b.conditions) - specificity(a.conditions),
    );
}

function defaultRecommendation(ratedCount: number, overallMean: number | null): NapRecommendation {
  const remaining = Math.max(MIN_NAPS_FOR_PERSONAL - ratedCount, 1);
  return {
    kind: 'default',
    // 13〜15時 straddles the 昼/午後 buckets, so the time is expressed only in the label.
    conditions: { duration: '13〜22分' },
    label: '13〜15時ごろ・20分程度',
    expectedScore: null,
    rawMean: null,
    overallMean,
    sampleCount: ratedCount,
    confidence: 'low',
    reason:
      '【一般的な目安】13〜15時ごろに20分程度の仮眠をとると、深い睡眠に入る前に起きられるため目覚めのだるさが少なく、' +
      '集中力の回復に効果的とされています。デスクで座ったままの仮眠でも十分です。' +
      `あなたの記録に基づく結果ではありません。あと${remaining}回以上記録すると、あなた専用のおすすめを表示します。`,
  };
}

/** Returns the best nap pattern for this user, or a general guideline when data is insufficient. */
export function recommendNap(naps: NapLog[], k: number = SHRINKAGE_K): NapRecommendation {
  const rated = ratedNaps(naps);
  const overallMean = rated.length > 0 ? round2(average(rated.map(napPerformanceScore))) : null;
  if (rated.length < MIN_NAPS_FOR_PERSONAL || overallMean === null) {
    return defaultRecommendation(rated.length, overallMean);
  }

  const best = scorePatterns(rated, k).find((p) => p.sampleCount >= MIN_GROUP_SIZE);
  if (!best) return defaultRecommendation(rated.length, overallMean);

  const confidence = confidenceForSampleCount(best.sampleCount);
  // Compare the 1-decimal values that are actually displayed so the text adds up.
  const diff = Number(best.rawMean.toFixed(1)) - Number(overallMean.toFixed(1));
  const comparison =
    diff > 0
      ? `あなたの全体平均${overallMean.toFixed(1)}を${diff.toFixed(1)}上回っています。`
      : `全体平均(${overallMean.toFixed(1)})との差はまだ小さく、どの条件でも大きな違いは見られません。`;
  const confidenceNote =
    confidence === 'low'
      ? '記録数が少ないため参考値です。'
      : confidence === 'medium'
        ? 'もう少し記録が増えると精度が上がります。'
        : '';

  return {
    kind: 'personal',
    conditions: best.conditions,
    label: best.label,
    expectedScore: best.expectedScore,
    rawMean: best.rawMean,
    overallMean,
    sampleCount: best.sampleCount,
    confidence,
    reason: `「${best.label}」の仮眠は平均スコア${best.rawMean.toFixed(1)}(${best.sampleCount}回)で、${comparison}${confidenceNote}`,
  };
}
