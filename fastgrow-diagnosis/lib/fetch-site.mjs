// 外部URLを安全に取得するためのユーティリティ。
// 任意のURLをサーバー側で取得するため、社内ネットワーク等へのアクセス（SSRF）を防ぐ。
import dns from "node:dns";
import http from "node:http";
import https from "node:https";
import net from "node:net";

const MAX_BYTES = 2 * 1024 * 1024;
const TIMEOUT_MS = 8000;
const MAX_REDIRECTS = 4;
const USER_AGENT =
  "Mozilla/5.0 (compatible; FastGrowBrandingDiagnosis/1.0; +https://www.fastgrow.jp/)";

const allowPrivate = () => process.env.ALLOW_PRIVATE_HOSTS === "1";

function ipv4ToInt(ip) {
  return ip.split(".").reduce((acc, octet) => (acc << 8) + Number(octet), 0) >>> 0;
}

const BLOCKED_V4 = [
  ["0.0.0.0", 8],
  ["10.0.0.0", 8],
  ["100.64.0.0", 10],
  ["127.0.0.0", 8],
  ["169.254.0.0", 16],
  ["172.16.0.0", 12],
  ["192.0.0.0", 24],
  ["192.0.2.0", 24],
  ["192.168.0.0", 16],
  ["198.18.0.0", 15],
  ["198.51.100.0", 24],
  ["203.0.113.0", 24],
  ["224.0.0.0", 4],
  ["240.0.0.0", 4],
].map(([base, bits]) => [ipv4ToInt(base), bits]);

export function isBlockedAddress(address) {
  if (net.isIPv4(address)) {
    const n = ipv4ToInt(address);
    return BLOCKED_V4.some(([base, bits]) => {
      const mask = bits === 0 ? 0 : (~0 << (32 - bits)) >>> 0;
      return (n & mask) === (base & mask);
    });
  }
  if (net.isIPv6(address)) {
    const a = address.toLowerCase();
    const mapped = a.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
    if (mapped) return isBlockedAddress(mapped[1]);
    return (
      a === "::" ||
      a === "::1" ||
      a.startsWith("fc") ||
      a.startsWith("fd") ||
      a.startsWith("fe8") ||
      a.startsWith("fe9") ||
      a.startsWith("fea") ||
      a.startsWith("feb") ||
      a.startsWith("ff") ||
      a.startsWith("64:ff9b:") ||
      a.startsWith("2001:db8")
    );
  }
  return true;
}

// 接続時のDNS解決結果を検査する（DNSリバインディング対策として、検査したIPにそのまま接続する）
function safeLookup(hostname, options, callback) {
  dns.lookup(hostname, { ...options, all: true }, (err, addresses) => {
    if (err) return callback(err);
    const list = Array.isArray(addresses) ? addresses : [{ address: addresses, family: 4 }];
    if (!allowPrivate() && list.some((entry) => isBlockedAddress(entry.address))) {
      return callback(new Error("このURLにはアクセスできません（内部ネットワーク宛て）"));
    }
    if (options.all) return callback(null, list);
    callback(null, list[0].address, list[0].family);
  });
}

export function normalizeUrl(input) {
  let raw = String(input || "").trim();
  if (!raw) throw new Error("URLが入力されていません");
  if (/^[a-z][a-z0-9+-]*:(?!\d)/i.test(raw) && !/^https?:\/\//i.test(raw)) {
    throw new Error("http または https のURLを入力してください");
  }
  if (!/^https?:\/\//i.test(raw)) raw = `https://${raw}`;
  const url = new URL(raw);
  if (!["http:", "https:"].includes(url.protocol)) {
    throw new Error("http または https のURLを入力してください");
  }
  if (url.username || url.password) throw new Error("認証情報を含むURLは使用できません");
  if (!allowPrivate() && url.port && !["80", "443"].includes(url.port)) {
    throw new Error("標準ポート以外のURLは使用できません");
  }
  if (!allowPrivate() && net.isIP(url.hostname.replace(/^\[|\]$/g, ""))) {
    if (isBlockedAddress(url.hostname.replace(/^\[|\]$/g, ""))) {
      throw new Error("このURLにはアクセスできません（内部ネットワーク宛て）");
    }
  }
  url.hash = "";
  return url;
}

function detectCharset(contentType, head) {
  const fromHeader = /charset=([\w-]+)/i.exec(contentType || "");
  if (fromHeader) return fromHeader[1].toLowerCase();
  const fromMeta = /<meta[^>]+charset=["']?([\w-]+)/i.exec(head);
  if (fromMeta) return fromMeta[1].toLowerCase();
  return "utf-8";
}

function decodeBody(buffer, contentType) {
  const head = buffer.subarray(0, 4096).toString("latin1");
  const charset = detectCharset(contentType, head);
  try {
    return new TextDecoder(charset).decode(buffer);
  } catch {
    return new TextDecoder("utf-8").decode(buffer);
  }
}

function requestOnce(url) {
  const client = url.protocol === "https:" ? https : http;
  return new Promise((resolve, reject) => {
    const req = client.request(
      url,
      {
        method: "GET",
        lookup: safeLookup,
        timeout: TIMEOUT_MS,
        headers: {
          "User-Agent": USER_AGENT,
          Accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.5",
          "Accept-Language": "ja,en;q=0.8",
          "Accept-Encoding": "identity",
        },
      },
      (res) => {
        const status = res.statusCode || 0;
        if (status >= 300 && status < 400 && res.headers.location) {
          res.resume();
          return resolve({ redirect: new URL(res.headers.location, url) });
        }
        const chunks = [];
        let size = 0;
        res.on("data", (chunk) => {
          size += chunk.length;
          if (size > MAX_BYTES) {
            req.destroy();
            // 上限までで打ち切って解析する（巨大ページ対策）
            return resolve({ status, contentType: res.headers["content-type"], buffer: Buffer.concat(chunks) });
          }
          chunks.push(chunk);
        });
        res.on("end", () =>
          resolve({ status, contentType: res.headers["content-type"], buffer: Buffer.concat(chunks) }),
        );
        res.on("error", reject);
      },
    );
    req.on("timeout", () => req.destroy(new Error("ページの取得がタイムアウトしました")));
    req.on("error", reject);
    req.end();
  });
}

export async function fetchPage(input) {
  let url = input instanceof URL ? input : normalizeUrl(input);
  for (let i = 0; i <= MAX_REDIRECTS; i++) {
    const result = await requestOnce(url);
    if (result.redirect) {
      url = normalizeUrl(result.redirect.href);
      continue;
    }
    if (result.status >= 400) {
      throw new Error(`ページを取得できませんでした（HTTP ${result.status}）`);
    }
    const contentType = String(result.contentType || "");
    if (contentType && !/html|xml|text\/plain/i.test(contentType)) {
      throw new Error("HTMLページではないため解析できません");
    }
    return { url: url.href, html: decodeBody(result.buffer, contentType) };
  }
  throw new Error("リダイレクトが多すぎます");
}
