// RFC 3492 Punycode デコーダ（xn-- ラベル → Unicode）
const BASE = 36, T_MIN = 1, T_MAX = 26, SKEW = 38, DAMP = 700;
const INITIAL_BIAS = 72, INITIAL_N = 128;

function adapt(delta, numPoints, firstTime) {
  delta = firstTime ? Math.floor(delta / DAMP) : delta >> 1;
  delta += Math.floor(delta / numPoints);
  let k = 0;
  while (delta > ((BASE - T_MIN) * T_MAX) >> 1) {
    delta = Math.floor(delta / (BASE - T_MIN));
    k += BASE;
  }
  return k + Math.floor(((BASE - T_MIN + 1) * delta) / (delta + SKEW));
}

function digitOf(c) {
  if (c >= 48 && c <= 57) return c - 22; // 0-9 → 26-35
  if (c >= 65 && c <= 90) return c - 65; // A-Z
  if (c >= 97 && c <= 122) return c - 97; // a-z
  return BASE;
}

export function decodeLabel(input) {
  const output = [];
  let i = 0, n = INITIAL_N, bias = INITIAL_BIAS;
  let basic = input.lastIndexOf("-");
  if (basic < 0) basic = 0;
  for (let j = 0; j < basic; j++) {
    const c = input.charCodeAt(j);
    if (c >= 0x80) throw new Error("invalid punycode");
    output.push(c);
  }
  for (let idx = basic > 0 ? basic + 1 : 0; idx < input.length; ) {
    const oldi = i;
    for (let w = 1, k = BASE; ; k += BASE) {
      if (idx >= input.length) throw new Error("invalid punycode");
      const digit = digitOf(input.charCodeAt(idx++));
      if (digit >= BASE) throw new Error("invalid punycode");
      i += digit * w;
      const t = k <= bias ? T_MIN : k >= bias + T_MAX ? T_MAX : k - bias;
      if (digit < t) break;
      w *= BASE - t;
    }
    const len = output.length + 1;
    bias = adapt(i - oldi, len, oldi === 0);
    n += Math.floor(i / len);
    i %= len;
    if (n > 0x10ffff) throw new Error("invalid punycode");
    output.splice(i++, 0, n);
  }
  return String.fromCodePoint(...output);
}

export function toUnicode(host) {
  return host
    .split(".")
    .map((l) => (l.toLowerCase().startsWith("xn--") ? decodeLabel(l.slice(4).toLowerCase()) : l))
    .join(".");
}
