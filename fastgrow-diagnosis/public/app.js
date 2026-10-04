import { AXES, BRAND, COMPANY_FIELDS, QUESTIONS } from "./config.js";
import { computeResult } from "./diagnosis.js";

const app = document.getElementById("app");
const AXIS_LABEL = Object.fromEntries(AXES.map((a) => [a.id, a.label]));

const state = {
  company: { name: "", url: "", phase: "", target: "", headcount: "" },
  answers: Array(QUESTIONS.length).fill(null),
  current: 0,
  analysis: null,
  result: null,
};

const esc = (v) =>
  String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

function render(html) {
  app.innerHTML = html;
  window.scrollTo({ top: 0, behavior: "smooth" });
}

document.querySelectorAll("[data-bind]").forEach((el) => {
  el.textContent = BRAND[el.dataset.bind] ?? el.textContent;
});

// --- イントロ ------------------------------------------------------------
function renderIntro() {
  render(`
    <section class="hero">
      <p class="eyebrow">${esc(BRAND.mediaName)} ${esc(BRAND.title)}</p>
      <h1>${esc(BRAND.catchCopy).replace(/\n/g, "<br />")}</h1>
      <p class="lead">${esc(BRAND.lead)}</p>
      <ul class="axis-chips">
        ${AXES.map((a, i) => `<li><span class="num">${i + 1}</span>${esc(a.label)}</li>`).join("")}
      </ul>
      <div class="hero-points">
        <div><strong>10問</strong><span>の質問に回答</span></div>
        <div><strong>HP</strong><span>を自動で分析</span></div>
        <div><strong>課題と打ち手</strong><span>をその場で表示</span></div>
      </div>
      <button class="btn btn-primary btn-lg" data-action="start">無料で診断をはじめる</button>
    </section>
  `);
}

// --- 企業情報 ------------------------------------------------------------
function selectField(name, label, options, value, required = false) {
  return `
    <label class="field">
      <span class="field-label">${esc(label)}${required ? '<em class="req">必須</em>' : ""}</span>
      <select name="${name}" ${required ? "required" : ""}>
        <option value="">選択してください</option>
        ${options.map((o) => `<option ${o === value ? "selected" : ""}>${esc(o)}</option>`).join("")}
      </select>
    </label>`;
}

function renderCompany() {
  const c = state.company;
  render(`
    <section class="card">
      <p class="step-label">STEP 1 / 2</p>
      <h2>まずは会社について教えてください</h2>
      <form id="company-form" class="form" novalidate>
        <label class="field">
          <span class="field-label">会社名<em class="req">必須</em></span>
          <input name="name" required maxlength="100" value="${esc(c.name)}" placeholder="例：株式会社FastGrow" />
        </label>
        <label class="field">
          <span class="field-label">コーポレートサイト／採用サイトのURL<em class="opt">任意・推奨</em></span>
          <input name="url" type="url" inputmode="url" maxlength="500" value="${esc(c.url)}" placeholder="https://example.co.jp" />
          <span class="hint">入力いただくと、HPの内容も自動で分析して診断に反映します。</span>
        </label>
        <div class="grid-2">
          ${selectField("phase", "事業フェーズ", COMPANY_FIELDS.phases, c.phase)}
          ${selectField("headcount", "今後1年の採用予定人数", COMPANY_FIELDS.headcounts, c.headcount)}
        </div>
        ${selectField("target", "最も採用したい人材", COMPANY_FIELDS.targets, c.target)}
        <p class="form-error" hidden></p>
        <div class="actions">
          <button type="button" class="btn btn-ghost" data-action="intro">戻る</button>
          <button type="submit" class="btn btn-primary">質問に進む</button>
        </div>
      </form>
    </section>
  `);
  document.getElementById("company-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.target));
    const error = e.target.querySelector(".form-error");
    if (!data.name.trim()) {
      error.textContent = "会社名を入力してください。";
      error.hidden = false;
      return;
    }
    if (data.url.trim() && !/^(https?:\/\/)?[^\s.]+\.[^\s]+$/i.test(data.url.trim())) {
      error.textContent = "URLの形式が正しくありません。";
      error.hidden = false;
      return;
    }
    state.company = { ...state.company, ...data, name: data.name.trim(), url: data.url.trim() };
    state.current = 0;
    renderQuestion();
  });
}

// --- 設問 ----------------------------------------------------------------
function renderQuestion() {
  const i = state.current;
  const q = QUESTIONS[i];
  const axis = AXES.find((a) => a.id === q.axis);
  const progress = Math.round((i / QUESTIONS.length) * 100);
  render(`
    <section class="card question">
      <div class="progress" role="progressbar" aria-valuenow="${progress}" aria-valuemin="0" aria-valuemax="100">
        <div class="progress-bar" style="width:${progress}%"></div>
      </div>
      <div class="q-meta">
        <span class="step-label">STEP 2 / 2　Q${i + 1} / ${QUESTIONS.length}</span>
        <span class="axis-tag">${esc(axis.label)}</span>
      </div>
      <h2 class="q-text">${esc(q.text)}</h2>
      <div class="options" role="radiogroup">
        ${q.options
          .map(
            (o, idx) => `
          <button type="button" class="option ${state.answers[i] === idx ? "selected" : ""}" role="radio"
            aria-checked="${state.answers[i] === idx}" data-action="answer" data-index="${idx}">
            <span class="option-mark">${String.fromCharCode(65 + idx)}</span>
            <span>${esc(o.label)}</span>
          </button>`,
          )
          .join("")}
      </div>
      <div class="actions">
        <button type="button" class="btn btn-ghost" data-action="prev">戻る</button>
        ${
          state.answers[i] !== null
            ? `<button type="button" class="btn btn-primary" data-action="next">${i === QUESTIONS.length - 1 ? "診断結果を見る" : "次へ"}</button>`
            : ""
        }
      </div>
    </section>
  `);
}

function goNext() {
  if (state.current < QUESTIONS.length - 1) {
    state.current += 1;
    renderQuestion();
  } else {
    runDiagnosis();
  }
}

// --- 解析中 --------------------------------------------------------------
async function runDiagnosis() {
  const steps = [
    "回答を集計しています",
    state.company.url ? "HPの情報を取得しています" : null,
    state.company.url ? "採用ブランディングのシグナルを分析しています" : null,
    "課題と打ち手を整理しています",
  ].filter(Boolean);

  render(`
    <section class="card loading">
      <div class="spinner" aria-hidden="true"></div>
      <h2>診断中です…</h2>
      <ol class="loading-steps">
        ${steps.map((s, i) => `<li data-step="${i}">${esc(s)}</li>`).join("")}
      </ol>
    </section>
  `);
  let stepIndex = 0;
  const mark = () => {
    const el = app.querySelector(`[data-step="${stepIndex}"]`);
    if (el) el.classList.add("done");
    stepIndex = Math.min(stepIndex + 1, steps.length - 1);
  };
  mark();
  const timer = setInterval(mark, 2200);

  const answersPayload = QUESTIONS.map((q, i) => ({
    axis: q.axis,
    question: q.text,
    answer: q.options[state.answers[i]].label,
    score: q.options[state.answers[i]].score,
  }));

  let analysis = { site: null, siteError: null, aiReview: null, aiError: null };
  try {
    const res = await fetch("/api/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ company: state.company, answers: answersPayload }),
    });
    const body = await res.json();
    if (res.ok) analysis = body;
    else analysis.siteError = body.error || "解析に失敗しました";
  } catch {
    analysis.siteError = state.company.url ? "サーバーに接続できなかったため、HP分析をスキップしました" : null;
  }
  clearInterval(timer);

  state.analysis = analysis;
  state.result = computeResult(state.answers, analysis.site?.axisScores ?? null);
  renderResult();
}

// --- 結果 ----------------------------------------------------------------
function radarSvg(scores, compare) {
  const size = 320;
  const c = size / 2;
  const r = 110;
  const n = AXES.length;
  const point = (i, v) => {
    const angle = -Math.PI / 2 + (2 * Math.PI * i) / n;
    return [c + Math.cos(angle) * r * (v / 100), c + Math.sin(angle) * r * (v / 100)];
  };
  const poly = (vals) => vals.map((v, i) => point(i, v).join(",")).join(" ");
  const grid = [25, 50, 75, 100]
    .map((lv) => `<polygon class="radar-grid" points="${poly(AXES.map(() => lv))}" />`)
    .join("");
  const spokes = AXES.map((_, i) => {
    const [x, y] = point(i, 100);
    return `<line class="radar-grid" x1="${c}" y1="${c}" x2="${x}" y2="${y}" />`;
  }).join("");
  const labels = AXES.map((a, i) => {
    const [x, y] = point(i, 128);
    const anchor = Math.abs(x - c) < 4 ? "middle" : x > c ? "start" : "end";
    return `<text class="radar-label" x="${x}" y="${y}" text-anchor="${anchor}" dominant-baseline="middle">${esc(a.short)}</text>
            <text class="radar-value" x="${x}" y="${y + 16}" text-anchor="${anchor}" dominant-baseline="middle">${scores[a.id]}</text>`;
  }).join("");
  const comparePoly = compare
    ? `<polygon class="radar-compare" points="${poly(AXES.map((a) => compare[a.id] ?? 0))}" />`
    : "";
  return `
    <svg viewBox="-50 -10 ${size + 100} ${size + 30}" class="radar" role="img" aria-label="5観点のスコア">
      ${grid}${spokes}${comparePoly}
      <polygon class="radar-area" points="${poly(AXES.map((a) => scores[a.id]))}" />
      ${AXES.map((a, i) => {
        const [x, y] = point(i, scores[a.id]);
        return `<circle class="radar-dot" cx="${x}" cy="${y}" r="4" />`;
      }).join("")}
      ${labels}
    </svg>`;
}

function siteSection() {
  const { site, siteError } = state.analysis;
  if (!state.company.url) {
    return `
      <section class="card">
        <h3>HP分析</h3>
        <p class="muted">URLが未入力のため、HP分析は行っていません。URLを入力して再診断すると、より精度の高い結果が得られます。</p>
      </section>`;
  }
  if (!site) {
    return `
      <section class="card">
        <h3>HP分析</h3>
        <p class="muted">${esc(siteError || "HPを分析できませんでした")}。設問の回答のみで診断しています。</p>
      </section>`;
  }
  const byAxis = AXES.map((a) => ({ axis: a, items: site.signals.filter((s) => s.axis === a.id) }));
  const missing = site.signals.filter((s) => !s.found);
  return `
    <section class="card">
      <h3>HP分析の結果</h3>
      <p class="muted small">分析したページ：${site.pagesAnalyzed
        .map((p) => `<a href="${esc(p.url)}" target="_blank" rel="noopener noreferrer">${esc(p.title || p.url)}</a>`)
        .join("、")}</p>
      ${
        site.thinContent
          ? `<p class="notice">ページ本文をほとんど取得できませんでした（JavaScriptで描画されるサイトの可能性があります）。HP分析の結果は参考値としてご覧ください。</p>`
          : ""
      }
      <div class="signal-grid">
        ${byAxis
          .map(
            ({ axis, items }) => `
          <div class="signal-group">
            <h4>${esc(axis.label)}<span class="signal-score">${site.axisScores[axis.id]}</span></h4>
            <ul class="signals">
              ${items
                .map(
                  (s) => `<li class="${s.found ? "found" : "missing"}">
                    <span class="signal-icon" aria-hidden="true">${s.found ? "✓" : "—"}</span>
                    <span>${esc(s.label)}</span>
                    <span class="visually-hidden">${s.found ? "検出" : "未検出"}</span>
                  </li>`,
                )
                .join("")}
            </ul>
          </div>`,
          )
          .join("")}
      </div>
      ${
        missing.length
          ? `<details class="missing-details">
              <summary>HP上で見つからなかった情報と改善のヒント（${missing.length}件）</summary>
              <ul>${missing.map((s) => `<li><strong>${esc(s.label)}</strong>：${esc(s.advice)}</li>`).join("")}</ul>
            </details>`
          : ""
      }
    </section>`;
}

function aiSection() {
  const ai = state.analysis.aiReview;
  if (!ai) return "";
  return `
    <section class="card ai">
      <h3>専門家AIによる総評</h3>
      <p>${esc(ai.summary)}</p>
      <div class="ai-view">
        <h4>候補者から見た、いまの御社の印象</h4>
        <p>${esc(ai.candidate_view)}</p>
      </div>
      ${
        ai.strengths?.length
          ? `<h4>強み</h4><ul class="bullets">${ai.strengths.map((s) => `<li>${esc(s)}</li>`).join("")}</ul>`
          : ""
      }
      ${
        ai.issues?.length
          ? `<h4>優先して取り組むべき課題</h4>
             <ol class="issues">${ai.issues
               .map(
                 (i) => `<li><span class="axis-tag">${esc(AXIS_LABEL[i.axis] || i.axis)}</span>
                   <strong>${esc(i.title)}</strong><p>${esc(i.detail)}</p></li>`,
               )
               .join("")}</ol>`
          : ""
      }
      ${
        ai.actions?.length
          ? `<h4>具体的な打ち手（コンテンツ企画案）</h4>
             <ul class="actions-list">${ai.actions
               .map((a) => `<li><strong>${esc(a.title)}</strong><p>${esc(a.detail)}</p></li>`)
               .join("")}</ul>`
          : ""
      }
    </section>`;
}

function renderResult() {
  const r = state.result;
  const name = state.company.name;
  render(`
    <section class="card result-hero">
      <p class="eyebrow">${esc(name)} 様の診断結果</p>
      <div class="result-top">
        <div class="score-block">
          <div class="rank rank-${r.rank}">${r.rank}</div>
          <div>
            <div class="total"><span>${r.total}</span>/100</div>
            <div class="rank-label">${esc(r.rankLabel)}</div>
          </div>
        </div>
        <div class="type-block">
          <p class="type-caption">あなたの会社は…</p>
          <h1 class="type-name">${esc(r.type.name)}</h1>
          <p class="type-catch">${esc(r.type.catch)}</p>
        </div>
      </div>
      <p>${esc(r.type.description)}</p>
    </section>

    <section class="card">
      <h3>5つの観点別スコア</h3>
      <div class="chart-wrap">
        ${radarSvg(r.axisScores)}
        <ul class="axis-list">
          ${AXES.map(
            (a) => `
            <li>
              <div class="axis-row">
                <span>${esc(a.label)}</span>
                <strong>${r.axisScores[a.id]}</strong>
              </div>
              <div class="bar"><div class="bar-fill ${r.axisScores[a.id] < 40 ? "low" : r.axisScores[a.id] < 70 ? "mid" : "high"}" style="width:${r.axisScores[a.id]}%"></div></div>
              <p class="axis-comment">${esc(r.comments[a.id])}</p>
            </li>`,
          ).join("")}
        </ul>
      </div>
      ${state.analysis.site ? `<p class="muted small">※ 設問の回答（70%）とHP分析（30%）を合算したスコアです。</p>` : ""}
    </section>

    ${
      r.priorities.length
        ? `<section class="card">
            <h3>優先度の高い課題</h3>
            <ol class="priorities">
              ${r.priorities
                .map((p, i) => `<li><span class="p-num">${i + 1}</span><div><strong>${esc(p.label)}</strong>（${p.score}点）<p>${esc(r.comments[p.axis])}</p></div></li>`)
                .join("")}
            </ol>
          </section>`
        : ""
    }

    ${aiSection()}
    ${siteSection()}

    <section class="card solutions">
      <p class="eyebrow">RECOMMEND</p>
      <h3>${esc(BRAND.mediaName)}を活用した解決策</h3>
      <div class="solution-grid">
        ${r.solutions
          .map(
            (s) => `
          <article class="solution">
            <span class="axis-tag">${esc(AXIS_LABEL[s.axis])}</span>
            <h4>${esc(s.title)}</h4>
            <p>${esc(s.description)}</p>
          </article>`,
          )
          .join("")}
      </div>
    </section>

    <section class="card cta" id="cta">
      <h3>診断結果をもとに、無料で個別フィードバックします</h3>
      <p>編集部・採用広報の担当者が、御社の課題に合わせた記事企画やメディア活用プランをご提案します。</p>
      ${BRAND.documentUrl ? `<p><a class="btn btn-ghost" href="${esc(BRAND.documentUrl)}" target="_blank" rel="noopener noreferrer">媒体資料をダウンロード</a></p>` : ""}
      <form id="lead-form" class="form" novalidate>
        <div class="grid-2">
          <label class="field"><span class="field-label">お名前<em class="req">必須</em></span><input name="name" required maxlength="50" autocomplete="name" /></label>
          <label class="field"><span class="field-label">役職</span><input name="role" maxlength="50" autocomplete="organization-title" /></label>
          <label class="field"><span class="field-label">メールアドレス<em class="req">必須</em></span><input name="email" type="email" required maxlength="200" autocomplete="email" /></label>
          <label class="field"><span class="field-label">電話番号</span><input name="phone" type="tel" maxlength="30" autocomplete="tel" /></label>
        </div>
        <label class="field"><span class="field-label">ご相談内容</span><textarea name="message" rows="3" maxlength="1000" placeholder="例：経営者インタビュー記事について相談したい"></textarea></label>
        <label class="consent">
          <input type="checkbox" name="consent" />
          <span>${
            BRAND.privacyPolicyUrl
              ? `<a href="${esc(BRAND.privacyPolicyUrl)}" target="_blank" rel="noopener noreferrer">個人情報の取り扱い</a>に同意する`
              : "個人情報の取り扱いに同意する"
          }</span>
        </label>
        <p class="form-error" hidden></p>
        <button type="submit" class="btn btn-primary btn-lg">無料フィードバックを申し込む</button>
      </form>
    </section>

    <div class="actions center">
      <button type="button" class="btn btn-ghost" data-action="restart">もう一度診断する</button>
    </div>
  `);

  document.getElementById("lead-form").addEventListener("submit", submitLead);
}

async function submitLead(e) {
  e.preventDefault();
  const form = e.target;
  const data = Object.fromEntries(new FormData(form));
  const error = form.querySelector(".form-error");
  const showError = (msg) => {
    error.textContent = msg;
    error.hidden = false;
  };
  if (!data.name?.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email || "")) {
    return showError("お名前とメールアドレスを正しく入力してください。");
  }
  if (!data.consent) return showError("個人情報の取り扱いへの同意が必要です。");

  const button = form.querySelector("button[type=submit]");
  button.disabled = true;
  button.textContent = "送信中…";
  try {
    const r = state.result;
    const res = await fetch("/api/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contact: { name: data.name, role: data.role, email: data.email, phone: data.phone, message: data.message },
        consent: true,
        company: state.company,
        result: { total: r.total, rank: r.rank, type: r.type.name, axisScores: r.axisScores },
        answers: QUESTIONS.map((q, i) => ({
          axis: q.axis,
          question: q.text,
          answer: q.options[state.answers[i]].label,
          score: q.options[state.answers[i]].score,
        })),
      }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(body.error || "送信に失敗しました");
    document.getElementById("cta").innerHTML = `
      <h3>お申し込みありがとうございます</h3>
      <p>担当者より2営業日以内にご連絡いたします。診断結果をもとに、御社に合わせたご提案をお持ちします。</p>`;
  } catch (err) {
    button.disabled = false;
    button.textContent = "無料フィードバックを申し込む";
    showError(err.message);
  }
}

// --- イベント -------------------------------------------------------------
let advancing = false;
app.addEventListener("click", (e) => {
  const target = e.target.closest("[data-action]");
  if (!target) return;
  const action = target.dataset.action;
  if (action === "start") renderCompany();
  else if (action === "intro") renderIntro();
  else if (action === "answer") {
    if (advancing) return;
    advancing = true;
    state.answers[state.current] = Number(target.dataset.index);
    renderQuestion();
    // 選択の手応えを見せてから自動で次へ
    setTimeout(() => {
      advancing = false;
      goNext();
    }, 250);
  } else if (action === "next") goNext();
  else if (action === "prev") {
    if (state.current === 0) renderCompany();
    else {
      state.current -= 1;
      renderQuestion();
    }
  } else if (action === "restart") {
    state.answers = Array(QUESTIONS.length).fill(null);
    state.current = 0;
    state.analysis = null;
    state.result = null;
    renderCompany();
  }
});

renderIntro();
