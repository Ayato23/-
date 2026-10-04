import assert from "node:assert/strict";
import test from "node:test";
import { computeResult } from "../public/diagnosis.js";

test("全問最高評価なら S ランク・確立型", () => {
  const r = computeResult(Array(10).fill(0));
  assert.equal(r.total, 100);
  assert.equal(r.rank, "S");
  assert.equal(r.typeKey, "established");
  assert.deepEqual(r.priorities, []);
  assert.equal(r.solutions[0].axis, "reach");
});

test("最も弱い観点でタイプが決まる", () => {
  // Q3,Q4（経営者発信）だけ最低評価
  const answers = [0, 0, 3, 3, 0, 0, 0, 0, 0, 0];
  const r = computeResult(answers);
  assert.equal(r.axisScores.leader, 0);
  assert.equal(r.typeKey, "leader");
  assert.equal(r.priorities[0].axis, "leader");
});

test("HPスコアは30%で合算される", () => {
  const answers = Array(10).fill(3); // 設問は全観点0点
  const site = { vision: 100, leader: 100, people: 100, reach: 100, ops: 100 };
  const r = computeResult(answers, site);
  assert.equal(r.axisScores.vision, 30);
  assert.equal(r.rank, "D");
});
