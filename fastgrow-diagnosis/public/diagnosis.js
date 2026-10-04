// 診断のスコア計算（UIに依存しない純粋関数。サーバー側のテストからも読み込む）
import { AXES, QUESTIONS, RANKS, TYPES, WEIGHTS, AXIS_COMMENTS, SOLUTIONS } from "./config.js";

export function questionAxisScores(answerIndexes) {
  const scores = {};
  for (const axis of AXES) {
    const items = QUESTIONS.map((q, i) => ({ q, i })).filter(({ q }) => q.axis === axis.id);
    const max = items.length * 3;
    const sum = items.reduce((acc, { q, i }) => acc + (q.options[answerIndexes[i]]?.score ?? 0), 0);
    scores[axis.id] = Math.round((sum / max) * 100);
  }
  return scores;
}

export function bandOf(score) {
  if (score >= 70) return "high";
  if (score >= 40) return "mid";
  return "low";
}

export function computeResult(answerIndexes, siteAxisScores = null) {
  const qScores = questionAxisScores(answerIndexes);
  const axisScores = {};
  for (const axis of AXES) {
    const q = qScores[axis.id];
    axisScores[axis.id] = siteAxisScores
      ? Math.round(q * WEIGHTS.questions + (siteAxisScores[axis.id] ?? 0) * WEIGHTS.site)
      : q;
  }
  const values = AXES.map((a) => axisScores[a.id]);
  const total = Math.round(values.reduce((a, b) => a + b, 0) / values.length);
  const rank = RANKS.find((r) => total >= r.min);

  // 弱い順。同点の場合は AXES の定義順（ビジョン→経営者→…）を優先
  const sorted = [...AXES].sort((a, b) => axisScores[a.id] - axisScores[b.id]);
  const weakest = sorted[0];
  const typeKey = values.every((v) => v >= 70) ? "established" : weakest.id;

  const priorities = sorted
    .filter((a) => axisScores[a.id] < 70)
    .slice(0, 3)
    .map((a) => ({ axis: a.id, label: a.label, score: axisScores[a.id] }));

  // 提案は弱い観点から最大3つ。全観点が強い場合は「認知」を推す
  const solutionAxes = priorities.length ? priorities.map((p) => p.axis) : ["reach"];

  return {
    total,
    rank: rank.rank,
    rankLabel: rank.label,
    typeKey,
    type: TYPES[typeKey],
    axisScores,
    questionScores: qScores,
    comments: Object.fromEntries(AXES.map((a) => [a.id, AXIS_COMMENTS[a.id][bandOf(axisScores[a.id])]])),
    priorities,
    solutions: solutionAxes.map((axis) => ({ axis, ...SOLUTIONS[axis] })),
  };
}
