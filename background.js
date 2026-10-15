import { analyze } from "./analyze.js";

function hostOf(url) {
  try {
    const u = new URL(url);
    return /^https?:$/.test(u.protocol) ? u.hostname : null;
  } catch {
    return null;
  }
}

async function isAllowed(host) {
  const [{ allowlist = [] }, { sessionAllow = [] }] = await Promise.all([
    chrome.storage.local.get("allowlist"),
    chrome.storage.session.get("sessionAllow"),
  ]);
  return allowlist.includes(host) || sessionAllow.includes(host);
}

async function updateBadge(tabId, url) {
  const host = hostOf(url);
  if (!host) {
    await chrome.action.setBadgeText({ tabId, text: "" });
    await chrome.action.setTitle({ tabId, title: "IDN Guard" });
    return;
  }
  const r = analyze(host);
  if (r.level === "high" && !(await isAllowed(host))) {
    await chrome.action.setBadgeBackgroundColor({ tabId, color: "#d93025" });
    await chrome.action.setBadgeText({ tabId, text: "!" });
  } else if (r.isIdn) {
    await chrome.action.setBadgeBackgroundColor({ tabId, color: "#e37400" });
    await chrome.action.setBadgeText({ tabId, text: "IDN" });
  } else {
    await chrome.action.setBadgeText({ tabId, text: "" });
  }
  await chrome.action.setTitle({ tabId, title: `IDN Guard\n${r.ascii}` });
}

// 同じタブ・同じURLで警告ページへの差し替えが二重に走らないようにする
const recentlyBlocked = new Map(); // tabId -> { url, at }

// 危険度「高」のIDNなら警告ページへ差し替える
async function guard(tabId, url) {
  if (tabId == null || tabId < 0) return;
  const host = hostOf(url);
  if (!host) return;
  const r = analyze(host);
  if (r.level !== "high" || (await isAllowed(host))) return;

  const last = recentlyBlocked.get(tabId);
  if (last && last.url === url && Date.now() - last.at < 3000) return;
  recentlyBlocked.set(tabId, { url, at: Date.now() });

  const warn = chrome.runtime.getURL("warning.html") + "?u=" + encodeURIComponent(url);
  try {
    await chrome.tabs.update(tabId, { url: warn });
  } catch {
    // タブが既に閉じられている場合など
  }
}

// ① 読み込み開始前：URL入力・リンククリック・リロード・戻る／進む
chrome.webNavigation.onBeforeNavigate.addListener((d) => {
  if (d.frameId === 0) guard(d.tabId, d.url);
});

// ② 読み込み確定時：サーバー側リダイレクト（短縮URLなど）の最終的な行き先
chrome.webNavigation.onCommitted.addListener((d) => {
  if (d.frameId === 0) guard(d.tabId, d.url);
});

// ③ タブのURL変化：先読み（プリレンダー）されたページが表示に切り替わった場合など
chrome.tabs.onUpdated.addListener((tabId, info, tab) => {
  if (info.url) guard(tabId, info.url);
  if (info.url || info.status === "loading") updateBadge(tabId, tab.url ?? "");
});

chrome.tabs.onRemoved.addListener((tabId) => recentlyBlocked.delete(tabId));

// 許可リストが変わったら全タブのバッジを更新
chrome.storage.onChanged.addListener(async () => {
  for (const tab of await chrome.tabs.query({})) {
    if (tab.id != null) updateBadge(tab.id, tab.url ?? "");
  }
});
