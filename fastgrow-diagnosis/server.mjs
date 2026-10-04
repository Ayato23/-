import fs from "node:fs";
import fsp from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { analyzeSite } from "./lib/analyze-site.mjs";
import { aiEnabled, generateAiReview } from "./lib/ai-review.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.join(here, "public");
const DATA_DIR = path.join(here, "data");
const PORT = Number(process.env.PORT || 3000);
const MAX_BODY = 64 * 1024;

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".json": "application/json; charset=utf-8",
};

// --- 簡易レート制限（HP取得とAI呼び出しはコストがかかるため） -------------
const hits = new Map();
function rateLimited(ip, limit = 10, windowMs = 10 * 60 * 1000) {
  const now = Date.now();
  const list = (hits.get(ip) || []).filter((t) => now - t < windowMs);
  list.push(now);
  hits.set(ip, list);
  return list.length > limit;
}

function clientIp(req) {
  const fwd = req.headers["x-forwarded-for"];
  return (typeof fwd === "string" && fwd.split(",")[0].trim()) || req.socket.remoteAddress || "";
}

function sendJson(res, status, body) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
  res.end(JSON.stringify(body));
}

async function readJson(req) {
  let size = 0;
  const chunks = [];
  for await (const chunk of req) {
    size += chunk.length;
    if (size > MAX_BODY) throw Object.assign(new Error("リクエストが大きすぎます"), { status: 413 });
    chunks.push(chunk);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
  } catch {
    throw Object.assign(new Error("不正なJSONです"), { status: 400 });
  }
}

const str = (v, max = 200) => String(v ?? "").slice(0, max).trim();

function sanitizeAnswers(list) {
  if (!Array.isArray(list)) return [];
  return list.slice(0, 20).map((a) => ({
    axis: str(a?.axis, 20),
    question: str(a?.question, 200),
    answer: str(a?.answer, 200),
    score: Math.max(0, Math.min(3, Number(a?.score) || 0)),
  }));
}

function sanitizeCompany(c) {
  return {
    name: str(c?.name, 100),
    url: str(c?.url, 500),
    phase: str(c?.phase, 50),
    target: str(c?.target, 100),
    headcount: str(c?.headcount, 50),
  };
}

// --- POST /api/analyze --------------------------------------------------
async function handleAnalyze(req, res) {
  if (rateLimited(clientIp(req))) {
    return sendJson(res, 429, { error: "短時間にリクエストが集中しています。しばらくしてからお試しください。" });
  }
  const body = await readJson(req);
  const company = sanitizeCompany(body.company);
  const answers = sanitizeAnswers(body.answers);

  let site = null;
  let siteError = null;
  if (company.url) {
    try {
      site = await analyzeSite(company.url);
    } catch (err) {
      siteError = err instanceof Error ? err.message : "HPを解析できませんでした";
    }
  }

  let aiReview = null;
  let aiError = null;
  if (aiEnabled()) {
    try {
      aiReview = await generateAiReview({ company, answers, site });
    } catch (err) {
      console.error("[ai-review]", err);
      aiError = "AIレビューの生成に失敗しました";
    }
  }

  const { _pagesForAi, ...publicSite } = site || {};
  sendJson(res, 200, {
    site: site ? publicSite : null,
    siteError,
    aiReview,
    aiError,
  });
}

// --- POST /api/leads ----------------------------------------------------
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function handleLead(req, res) {
  if (rateLimited(`lead:${clientIp(req)}`, 5)) {
    return sendJson(res, 429, { error: "送信回数が多すぎます。しばらくしてからお試しください。" });
  }
  const body = await readJson(req);
  const lead = {
    receivedAt: new Date().toISOString(),
    contact: {
      name: str(body.contact?.name, 50),
      email: str(body.contact?.email, 200),
      phone: str(body.contact?.phone, 30),
      role: str(body.contact?.role, 50),
      message: str(body.contact?.message, 1000),
    },
    company: sanitizeCompany(body.company),
    result: {
      total: Number(body.result?.total) || 0,
      rank: str(body.result?.rank, 2),
      type: str(body.result?.type, 50),
      axisScores: body.result?.axisScores && typeof body.result.axisScores === "object"
        ? Object.fromEntries(Object.entries(body.result.axisScores).slice(0, 10).map(([k, v]) => [str(k, 20), Number(v) || 0]))
        : {},
    },
    answers: sanitizeAnswers(body.answers),
  };

  if (!lead.contact.name || !EMAIL_RE.test(lead.contact.email) || !lead.company.name) {
    return sendJson(res, 400, { error: "会社名・お名前・メールアドレスを正しく入力してください。" });
  }
  if (body.consent !== true) {
    return sendJson(res, 400, { error: "個人情報の取り扱いへの同意が必要です。" });
  }

  await fsp.mkdir(DATA_DIR, { recursive: true });
  await fsp.appendFile(path.join(DATA_DIR, "leads.jsonl"), `${JSON.stringify(lead)}\n`);

  if (process.env.LEAD_WEBHOOK_URL) {
    const text =
      `【採用ブランディング診断】新規リード\n` +
      `${lead.company.name} / ${lead.contact.name}（${lead.contact.role || "役職未入力"}）\n` +
      `${lead.contact.email}\n` +
      `スコア: ${lead.result.total}点（${lead.result.rank}） タイプ: ${lead.result.type}\n` +
      `HP: ${lead.company.url || "-"}`;
    fetch(process.env.LEAD_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, lead }),
    }).catch((err) => console.error("[lead-webhook]", err));
  }

  sendJson(res, 200, { ok: true });
}

// --- 静的ファイル ---------------------------------------------------------
async function serveStatic(req, res) {
  const pathname = decodeURIComponent(new URL(req.url, "http://localhost").pathname);
  const filePath = path.normalize(path.join(PUBLIC_DIR, pathname === "/" ? "index.html" : pathname));
  if (!filePath.startsWith(PUBLIC_DIR + path.sep)) {
    res.writeHead(403).end();
    return;
  }
  try {
    const stat = await fsp.stat(filePath);
    if (!stat.isFile()) throw new Error("not a file");
    res.writeHead(200, { "Content-Type": MIME[path.extname(filePath)] || "application/octet-stream" });
    fs.createReadStream(filePath).pipe(res);
  } catch {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" }).end("Not Found");
  }
}

const server = http.createServer(async (req, res) => {
  try {
    if (req.method === "POST" && req.url === "/api/analyze") return await handleAnalyze(req, res);
    if (req.method === "POST" && req.url === "/api/leads") return await handleLead(req, res);
    if (req.method === "GET" && req.url === "/api/config") {
      return sendJson(res, 200, { aiEnabled: aiEnabled() });
    }
    if (req.method === "GET" || req.method === "HEAD") return await serveStatic(req, res);
    res.writeHead(405).end();
  } catch (err) {
    console.error(err);
    sendJson(res, err.status || 500, { error: err.status ? err.message : "サーバーエラーが発生しました" });
  }
});

server.listen(PORT, () => {
  console.log(`FastGrow 採用ブランディング診断: http://localhost:${PORT}`);
  console.log(`AIレビュー: ${aiEnabled() ? "有効" : "無効（ANTHROPIC_API_KEY 未設定）"}`);
});
