import { toUnicode } from "./punycode.js";

const SCRIPTS = [
  "Latin", "Cyrillic", "Greek", "Han", "Hiragana", "Katakana", "Hangul", "Bopomofo",
  "Arabic", "Hebrew", "Thai", "Armenian", "Georgian", "Devanagari",
];
const SCRIPT_RE = Object.fromEntries(SCRIPTS.map((s) => [s, new RegExp(`\\p{Script=${s}}`, "u")]));

// 正当に混在しうる組み合わせ（日本語・韓国語・中国語＋ラテン文字）
const ALLOWED_COMBOS = [
  ["Latin", "Han", "Hiragana", "Katakana"],
  ["Latin", "Han", "Hangul"],
  ["Latin", "Han", "Bopomofo"],
];

// ラテン文字と見分けにくい文字 → 見た目が近いラテン文字
const LOOKALIKE = {
  // キリル文字
  "а": "a", "е": "e", "о": "o", "р": "p", "с": "c", "у": "y", "х": "x",
  "і": "i", "ј": "j", "ѕ": "s", "ԁ": "d", "һ": "h", "ԛ": "q", "ԝ": "w",
  "ӏ": "l", "ү": "y", "ɡ": "g", "ь": "b", "п": "n", "т": "t", "к": "k", "м": "m",
  // ギリシャ文字
  "α": "a", "ο": "o", "ν": "v", "ρ": "p", "ι": "i", "κ": "k", "υ": "u", "ε": "e",
  "τ": "t", "χ": "x", "γ": "y",
  // ラテン拡張
  "ı": "i", "ɑ": "a", "ȷ": "j", "ɩ": "i", "ʀ": "r", "ɴ": "n", "ꞵ": "b",
  // 数字
  "0": "o", "1": "l",
};
// 「見た目がラテン文字そのもの」とみなす文字（ь п т к м など紛らわしさが弱いものは除外）
const STRONG_LOOKALIKE = new Set(
  "аеорсухіјѕԁһԛԝӏүαονριυε".split("")
);

const BRANDS = [
  "google", "gmail", "youtube", "apple", "icloud", "microsoft", "outlook", "office",
  "live", "amazon", "paypal", "facebook", "instagram", "twitter", "netflix", "github",
  "linkedin", "dropbox", "yahoo", "rakuten", "mercari", "docomo", "softbank", "paypay",
  "line", "mufg", "smbc", "mizuho", "resona", "jcb", "visa", "mastercard", "binance",
  "coinbase", "metamask", "steam", "discord", "openai", "chatgpt", "claude", "anthropic",
];

function scriptOf(ch) {
  if (/[0-9\-]/.test(ch) || /\p{M}/u.test(ch)) return null;
  for (const s of SCRIPTS) if (SCRIPT_RE[s].test(ch)) return s;
  if (/\p{Script=Common}|\p{Script=Inherited}/u.test(ch)) return null;
  return "Other";
}

export function skeleton(label) {
  return [...label.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase()]
    .map((ch) => LOOKALIKE[ch] ?? ch)
    .join("");
}

/**
 * @param {string} asciiHost  URL から得たホスト名（Chrome では IDN は xn-- 形式）
 * @returns {{ascii:string, unicode:string, isIdn:boolean, level:'none'|'caution'|'high', reasons:string[]}}
 */
export function analyze(asciiHost) {
  const ascii = asciiHost.toLowerCase();
  const labels = ascii.split(".");
  const result = { ascii, unicode: ascii, isIdn: false, level: "none", reasons: [] };
  if (!labels.some((l) => l.startsWith("xn--"))) return result;

  result.isIdn = true;
  result.level = "caution";
  const reasons = new Set(["国際化ドメイン名（IDN）です"]);
  const high = (msg) => { result.level = "high"; reasons.add(msg); };

  try {
    result.unicode = toUnicode(ascii);
  } catch {
    high("punycode を解読できません（不正な形式）");
    result.reasons = [...reasons];
    return result;
  }

  for (const label of result.unicode.split(".")) {
    if (/^[\x00-\x7f]*$/.test(label)) continue;
    const chars = [...label];
    const scripts = [...new Set(chars.map(scriptOf).filter(Boolean))];

    if (scripts.length > 1 && !ALLOWED_COMBOS.some((c) => scripts.every((s) => c.includes(s)))) {
      high(`複数の文字種が混在しています：${scripts.join(" + ")}（${label}）`);
    }
    if (
      scripts.some((s) => s === "Cyrillic" || s === "Greek") &&
      chars.every((ch) => /[0-9\-]/.test(ch) || /\p{Script=Latin}/u.test(ch) || STRONG_LOOKALIKE.has(ch))
    ) {
      high(`ラテン文字に見える文字だけで構成されています（${label}）`);
    }
    const sk = skeleton(label);
    if (BRANDS.includes(sk)) {
      high(`有名サービス「${sk}」と見た目がほぼ同じです`);
    }
    if (scripts.includes("Other")) {
      reasons.add(`判定対象外の文字種を含みます（${label}）`);
    }
  }

  result.reasons = [...reasons];
  return result;
}
