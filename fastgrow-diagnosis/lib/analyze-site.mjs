// 企業HPのHTMLから、採用ブランディングに関わるシグナルを抽出してスコア化する。
import { fetchPage, normalizeUrl } from "./fetch-site.mjs";

const ENTITIES = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };

function decodeEntities(text) {
  return text.replace(/&(#x?[0-9a-f]+|\w+);/gi, (m, code) => {
    if (code[0] === "#") {
      const n = code[1].toLowerCase() === "x" ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10);
      return Number.isFinite(n) ? String.fromCodePoint(n) : m;
    }
    return ENTITIES[code.toLowerCase()] ?? m;
  });
}

function stripTags(html) {
  return decodeEntities(
    html
      .replace(/<(script|style|noscript|svg|template)[\s\S]*?<\/\1>/gi, " ")
      .replace(/<!--[\s\S]*?-->/g, " ")
      .replace(/<[^>]+>/g, " "),
  )
    .replace(/\s+/g, " ")
    .trim();
}

function metaContent(html, key) {
  const re = new RegExp(
    `<meta[^>]+(?:name|property)=["']${key}["'][^>]*>`,
    "i",
  );
  const tag = re.exec(html)?.[0];
  if (!tag) return "";
  return decodeEntities(/content=["']([^"']*)["']/i.exec(tag)?.[1] || "").trim();
}

export function parseHtml(html, baseUrl) {
  const title = decodeEntities(/<title[^>]*>([\s\S]*?)<\/title>/i.exec(html)?.[1] || "").trim();
  const links = [];
  const linkRe = /<a\b[^>]*href=["']([^"'#][^"']*)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let m;
  while ((m = linkRe.exec(html))) {
    try {
      const href = new URL(decodeEntities(m[1]), baseUrl);
      if (!["http:", "https:"].includes(href.protocol)) continue;
      links.push({ href: href.href, text: stripTags(m[2]).slice(0, 80) });
    } catch {
      // 不正なURLは無視
    }
  }
  const headings = [];
  const hRe = /<h[1-3][^>]*>([\s\S]*?)<\/h[1-3]>/gi;
  while ((m = hRe.exec(html)) && headings.length < 40) {
    const t = stripTags(m[1]);
    if (t) headings.push(t.slice(0, 100));
  }
  return {
    title,
    description: metaContent(html, "description"),
    ogTitle: metaContent(html, "og:title"),
    ogDescription: metaContent(html, "og:description"),
    ogImage: metaContent(html, "og:image"),
    headings,
    links,
    text: stripTags(html),
  };
}

// --- シグナル定義 -------------------------------------------------------
// axis: vision / leader / people / reach / ops
// test: (ctx) => boolean。ctx.text は全ページの本文、ctx.links は全リンク
const has = (re) => (ctx) => re.test(ctx.text) || ctx.links.some((l) => re.test(l.text));
const linkTo = (re) => (ctx) => ctx.links.some((l) => re.test(l.href));

export const SIGNALS = [
  {
    id: "mission",
    axis: "vision",
    label: "ミッション・ビジョン・バリューの明示",
    test: has(/ミッション|ビジョン|バリュー|パーパス|存在意義|mission|vision|purpose|our values/i),
    advice: "MVVがHP上で見つからない／弱い状態です。候補者が『なぜこの会社なのか』を判断できる軸を言語化しましょう。",
  },
  {
    id: "ceo_message",
    axis: "vision",
    label: "代表メッセージ・創業ストーリー",
    test: has(/代表メッセージ|代表挨拶|トップメッセージ|ceo\s*message|創業(の|者)?(想い|ストーリー|背景)|founder/i),
    advice: "代表の想いや創業背景が読めるページがありません。経営者の原体験は最も強い採用コンテンツになります。",
  },
  {
    id: "business_story",
    axis: "vision",
    label: "事業・市場の成長ストーリー",
    test: has(/市場|業界(の|を)(変|課題)|成長(率|戦略)|事業(内容|戦略|領域)|資金調達|シリーズ[A-ZＡ-Ｚ]|business/i),
    advice: "事業の勝ち筋や市場の大きさが伝わる情報が不足しています。ハイレイヤー層は『勝てる事業か』を重視します。",
  },
  {
    id: "leadership",
    axis: "leader",
    label: "経営陣・役員プロフィール",
    test: has(/役員(紹介|一覧)|経営陣|経営チーム|leadership|management team|略歴|経歴|プロフィール/i),
    advice: "経営陣の顔ぶれ・経歴が見えません。『誰と働くか』の筆頭は経営陣です。",
  },
  {
    id: "media_coverage",
    axis: "leader",
    label: "メディア掲載・登壇実績",
    test: (ctx) =>
      has(/メディア掲載|掲載実績|取材|登壇|in the (news|media)|press coverage/i)(ctx) ||
      linkTo(/fastgrow\.jp|newspicks\.com|nikkei\.com|forbesjapan\.com|diamond\.jp|businessinsider\.jp|techcrunch|thebridge\.jp/i)(ctx),
    advice: "第三者メディアでの経営者露出が確認できません。外部メディアの記事は信頼性の担保として機能します。",
  },
  {
    id: "exec_sns",
    axis: "leader",
    label: "経営者の個人発信（note / X 等）",
    // 企業公式アカウントと区別するため、note か「代表・CEO」等の文脈を持つSNSリンクのみ数える
    test: (ctx) =>
      ctx.links.some(
        (l) =>
          /note\.com\/[^/]+/i.test(l.href) ||
          (/x\.com\/|twitter\.com\/|linkedin\.com\/in\//i.test(l.href) && /代表|ceo|cto|coo|founder|創業者|取締役/i.test(l.text)),
      ),
    advice: "経営者・役員個人の発信チャネルへの導線がありません。個人の思想に共感して応募する層を取りこぼしています。",
  },
  {
    id: "member_interview",
    axis: "people",
    label: "社員インタビュー・メンバー紹介",
    test: has(/社員インタビュー|メンバー(紹介|インタビュー)|社員紹介|interview|people|members|働く人/i),
    advice: "社員インタビューやメンバー紹介が見当たりません。候補者は入社後の自分を重ねられる『人』の情報を求めています。",
  },
  {
    id: "culture",
    axis: "people",
    label: "カルチャー・働き方・制度",
    test: has(/カルチャー|社風|組織文化|働き方|福利厚生|人事制度|評価制度|culture|benefits|カルチャーデック|culture\s*deck/i),
    advice: "カルチャーや働き方の情報が不足しています。カルチャーデック等で価値観・意思決定の仕方を開示しましょう。",
  },
  {
    id: "owned_media",
    axis: "people",
    label: "オウンドメディア・ブログ",
    test: (ctx) => linkTo(/note\.com|\/blog|\/magazine|\/media|\/stories|tech\.|zenn\.dev|qiita\.com|speakerdeck\.com/i)(ctx) || has(/ブログ|オウンドメディア|blog|magazine/i)(ctx),
    advice: "継続的な発信の場（ブログ・note等）がありません。単発ではなく蓄積型の情報発信が必要です。",
  },
  {
    id: "sns",
    axis: "reach",
    label: "企業公式SNSアカウント",
    test: linkTo(/x\.com|twitter\.com|facebook\.com|linkedin\.com|youtube\.com|instagram\.com|tiktok\.com/i),
    advice: "公式SNSへの導線がありません。候補者との接点を増やすチャネル設計が必要です。",
  },
  {
    id: "press",
    axis: "reach",
    label: "ニュース・プレスリリース",
    test: (ctx) => has(/プレスリリース|ニュース|お知らせ|news|press/i)(ctx) || linkTo(/prtimes\.jp/i)(ctx),
    advice: "ニュース・プレスリリースの発信が確認できません。成長の『動き』を見せることは候補者の安心材料になります。",
  },
  {
    id: "ogp",
    axis: "reach",
    label: "OGP（SNSシェア時の見え方）の設定",
    test: (ctx) => Boolean(ctx.meta.ogImage && (ctx.meta.ogDescription || ctx.meta.description)),
    advice: "OGP画像・説明文が未設定です。記事やページがSNSで拡散される際の第一印象を損ねています。",
  },
  {
    id: "recruit_page",
    axis: "ops",
    label: "採用ページの有無",
    test: (ctx) => ctx.recruitPageFound,
    advice: "トップページから採用ページへの導線が見つかりません。採用情報への到達性は最優先で改善すべき点です。",
  },
  {
    id: "job_platform",
    axis: "ops",
    label: "求人・ATS連携（Wantedly / HERP / HRMOS 等）",
    test: linkTo(/wantedly\.com|herp\.careers|hrmos\.co|talentio\.com|green-japan\.com|bizreach|jobs\.lever\.co|greenhouse\.io|ashbyhq\.com|youtrust\.jp|openwork\.jp|en-japan|doda|recruit\.jobcan|engage\.en-japan|indeed/i),
    advice: "募集要項・応募フォームへの導線（ATS・求人媒体）が確認できません。",
  },
  {
    id: "positions",
    axis: "ops",
    label: "募集職種・カジュアル面談の導線",
    test: has(/募集職種|募集中の(ポジション|職種)|職種一覧|open positions|求人一覧|カジュアル面談|casual\s*(talk|interview)|エントリー/i),
    advice: "募集職種やカジュアル面談への導線が不明確です。興味を持った候補者が次の行動に移れる設計が必要です。",
  },
];

export const AXES = ["vision", "leader", "people", "reach", "ops"];

const RECRUIT_RE = /recruit|career|jobs?\b|join|採用|求人|キャリア|仲間/i;
const ABOUT_RE = /about|company|corporate|会社概要|企業情報|私たちについて|会社情報|mission|vision/i;

function pickSubpages(links, origin, rootUrl) {
  const candidates = { recruit: null, about: null };
  for (const link of links) {
    let url;
    try {
      url = new URL(link.href);
    } catch {
      continue;
    }
    if (url.href === rootUrl) continue;
    const sameSite =
      url.hostname === origin.hostname ||
      url.hostname.endsWith(`.${origin.hostname.replace(/^www\./, "")}`);
    const target = `${url.pathname} ${link.text}`;
    if (!candidates.recruit && RECRUIT_RE.test(target) && sameSite) candidates.recruit = url.href;
    else if (!candidates.about && ABOUT_RE.test(target) && sameSite) candidates.about = url.href;
  }
  return candidates;
}

export function scoreSignals(ctx) {
  const results = SIGNALS.map((s) => ({
    id: s.id,
    axis: s.axis,
    label: s.label,
    found: Boolean(s.test(ctx)),
    advice: s.advice,
  }));
  const axisScores = {};
  for (const axis of AXES) {
    const list = results.filter((r) => r.axis === axis);
    axisScores[axis] = Math.round((list.filter((r) => r.found).length / list.length) * 100);
  }
  return { signals: results, axisScores };
}

// テキスト量が少ない＝JS描画サイトの可能性。精度が落ちる旨を結果に添える
const THIN_CONTENT_CHARS = 400;

export async function analyzeSite(inputUrl) {
  const rootUrl = normalizeUrl(inputUrl);
  const top = await fetchPage(rootUrl);
  const topParsed = parseHtml(top.html, top.url);
  const finalUrl = new URL(top.url);

  const sub = pickSubpages(topParsed.links, finalUrl, top.url);
  const subpageResults = await Promise.allSettled(
    Object.entries(sub)
      .filter(([, href]) => href)
      .map(async ([kind, href]) => {
        const page = await fetchPage(href);
        return { kind, url: page.url, parsed: parseHtml(page.html, page.url) };
      }),
  );
  const pages = [{ kind: "top", url: top.url, parsed: topParsed }];
  for (const r of subpageResults) if (r.status === "fulfilled") pages.push(r.value);

  const ctx = {
    text: pages.map((p) => `${p.parsed.title} ${p.parsed.headings.join(" ")} ${p.parsed.text}`).join("\n"),
    links: pages.flatMap((p) => p.parsed.links),
    meta: topParsed,
    recruitPageFound:
      Boolean(sub.recruit) ||
      topParsed.links.some((l) => RECRUIT_RE.test(`${l.href} ${l.text}`)),
  };

  const { signals, axisScores } = scoreSignals(ctx);
  const totalChars = pages.reduce((n, p) => n + p.parsed.text.length, 0);

  return {
    url: top.url,
    title: topParsed.ogTitle || topParsed.title,
    description: topParsed.ogDescription || topParsed.description,
    pagesAnalyzed: pages.map((p) => ({ kind: p.kind, url: p.url, title: p.parsed.title })),
    thinContent: totalChars < THIN_CONTENT_CHARS,
    signals,
    axisScores,
    // AIレビュー用の素材（クライアントには返さない）
    _pagesForAi: pages.map((p) => ({
      kind: p.kind,
      url: p.url,
      title: p.parsed.title,
      description: p.parsed.description,
      headings: p.parsed.headings,
      text: p.parsed.text,
    })),
  };
}
