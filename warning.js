import { analyze } from "./analyze.js";

const $ = (id) => document.getElementById(id);
const target = new URLSearchParams(location.search).get("u") ?? "";

let url;
try {
  url = new URL(target);
  if (!/^https?:$/.test(url.protocol)) throw new Error();
} catch {
  url = null;
}

if (!url) {
  $("ascii").textContent = "（URLを読み取れませんでした）";
  $("once").disabled = $("always").disabled = true;
} else {
  const r = analyze(url.hostname);
  $("unicode").textContent = r.unicode;
  $("ascii").textContent = r.ascii;
  $("url").textContent = url.href;
  for (const reason of r.reasons) {
    const li = document.createElement("li");
    li.textContent = reason;
    $("reasons").append(li);
  }
}

$("close").onclick = async () => {
  const tab = await chrome.tabs.getCurrent();
  if (tab?.id != null) chrome.tabs.remove(tab.id);
};

$("once").onclick = async () => {
  const { sessionAllow = [] } = await chrome.storage.session.get("sessionAllow");
  await chrome.storage.session.set({ sessionAllow: [...new Set([...sessionAllow, url.hostname])] });
  location.replace(url.href);
};

$("always").onclick = async () => {
  if (!confirm(`${url.hostname} を常に許可しますか？\n本物のサイトだと確信できる場合だけ許可してください。`)) return;
  const { allowlist = [] } = await chrome.storage.local.get("allowlist");
  await chrome.storage.local.set({ allowlist: [...new Set([...allowlist, url.hostname])] });
  location.replace(url.href);
};
