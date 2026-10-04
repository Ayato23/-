import assert from "node:assert/strict";
import test from "node:test";
import { parseHtml, scoreSignals } from "../lib/analyze-site.mjs";
import { isBlockedAddress, normalizeUrl } from "../lib/fetch-site.mjs";

const HTML = `<!doctype html><html><head>
<title>株式会社サンプル</title>
<meta name="description" content="サンプルの説明">
<meta property="og:image" content="https://example.com/og.png">
</head><body>
<h1>ミッション：働くを、もっと面白く。</h1>
<a href="/recruit">採用情報</a>
<a href="https://herp.careers/v1/sample">募集職種</a>
<a href="https://x.com/sample_inc">X</a>
<a href="/news">ニュース</a>
<script>var ignored = "社員インタビュー";</script>
</body></html>`;

test("HTMLからシグナルを抽出できる", () => {
  const parsed = parseHtml(HTML, "https://example.com/");
  assert.equal(parsed.title, "株式会社サンプル");
  assert.ok(!parsed.text.includes("ignored"), "script内は本文に含めない");
  const { signals, axisScores } = scoreSignals({
    text: parsed.text,
    links: parsed.links,
    meta: parsed,
    recruitPageFound: true,
  });
  const found = Object.fromEntries(signals.map((s) => [s.id, s.found]));
  assert.equal(found.mission, true);
  assert.equal(found.job_platform, true);
  assert.equal(found.sns, true);
  assert.equal(found.ogp, true);
  assert.equal(found.member_interview, false);
  assert.equal(axisScores.ops, 100);
});

test("内部ネットワーク宛てのアドレスはブロックする", () => {
  for (const ip of ["127.0.0.1", "10.1.2.3", "172.16.0.1", "192.168.1.1", "169.254.169.254", "::1", "::ffff:127.0.0.1", "fd00::1"]) {
    assert.equal(isBlockedAddress(ip), true, ip);
  }
  assert.equal(isBlockedAddress("93.184.216.34"), false);
  assert.throws(() => normalizeUrl("http://127.0.0.1/"));
  assert.throws(() => normalizeUrl("file:///etc/passwd"));
  assert.throws(() => normalizeUrl("https://example.com:8080/"));
  assert.equal(normalizeUrl("example.com").href, "https://example.com/");
});
