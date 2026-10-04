// public/ のソースから、claude.ai Artifact として公開できる単一HTMLを生成する。
// 使い方: node artifact/build.mjs <出力先.html>
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => fs.readFileSync(path.join(root, p), "utf8");
const toScript = (src) =>
  src
    .replace(/^import .*;\n/gm, "")
    .replace(/^export (const|function|async function) /gm, "$1 ");

const out = process.argv[2] || path.join(root, "dist", "fastgrow-diagnosis.html");
const html = `<title>FastGrow 採用ブランディング診断</title>
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;500;700;900&display=swap" rel="stylesheet" />
<style>
${read("public/styles.css")}
</style>
<header class="site-header">
  <div class="container header-inner">
    <span class="logo" data-bind="mediaName">FastGrow</span>
    <span class="header-title" data-bind="title">採用ブランディング診断</span>
  </div>
</header>
<main id="app" class="container" aria-live="polite"></main>
<footer class="site-footer">
  <div class="container">
    <small>本診断は回答内容と入力いただいた情報をもとにした簡易診断です。</small>
  </div>
</footer>
<script>
${read("artifact/backend.js")}
</script>
<script type="module">
${toScript(read("public/config.js"))}
${toScript(read("public/diagnosis.js"))}
${toScript(read("public/app.js"))}
</script>
`;
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, html);
console.log(`wrote ${out} (${html.length} chars)`);
