import { analyze } from "./analyze.js";

const $ = (id) => document.getElementById(id);

const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
let host = null;
try {
  const u = new URL(tab?.url ?? "");
  if (/^https?:$/.test(u.protocol)) host = u.hostname;
} catch {}

if (!host) {
  $("status").textContent = "このページは対象外です";
} else {
  const r = analyze(host);
  $("ascii").textContent = r.ascii;
  if (r.isIdn) {
    $("unicodeWrap").hidden = false;
    $("unicode").textContent = r.unicode;
  }
  const { allowlist = [] } = await chrome.storage.local.get("allowlist");
  const allowed = allowlist.includes(host);

  const st = $("status");
  if (r.level === "high") {
    st.textContent = allowed ? "⚠ 危険の疑い（許可リスト登録済み）" : "⚠ フィッシングの疑いがあります";
    st.className = "status high";
  } else if (r.isIdn) {
    st.textContent = "IDN（国際化ドメイン）です";
    st.className = "status caution";
  } else {
    st.textContent = "✓ 通常のASCIIドメインです";
    st.className = "status ok";
  }
  for (const reason of r.reasons) {
    const li = document.createElement("li");
    li.textContent = reason;
    $("reasons").append(li);
  }

  if (r.level === "high") {
    $("actions").hidden = false;
    const btn = $("toggle");
    btn.textContent = allowed ? "許可リストから外す" : "許可リストに追加";
    btn.onclick = async () => {
      const next = allowed ? allowlist.filter((h) => h !== host) : [...allowlist, host];
      await chrome.storage.local.set({ allowlist: next });
      window.close();
    };
  }
}
