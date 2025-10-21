// Linux.do 收藏增强 - Service Worker（骨架版）
// - 处理 commands 快捷键：向活动标签页发送消息以切换面板
// - 预留设置读写接口（chrome.storage.local）

const MSG_TOGGLE = 'TOGGLE_PANEL';

chrome.runtime.onInstalled.addListener(() => {
  console.log('[ldbe] service worker installed');
});

chrome.runtime.onActivate?.addListener?.(() => {
  console.log('[ldbe] service worker activated');
});

chrome.commands.onCommand.addListener(async (command) => {
  if (command !== 'toggle-panel') return;
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) return;
  try {
    await chrome.tabs.sendMessage(tab.id, { type: MSG_TOGGLE });
  } catch (err) {
    // 若 content 尚未注入（如采用按需注入），可在此动态注入
    // 这里保留静默失败，避免报错干扰用户
    console.debug('[ldbe] toggle message failed (content not ready?)', err);
  }
});

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (!msg || !msg.type) return;
  if (msg.type === 'GET_SETTINGS') {
    chrome.storage.local.get({ apiBase: '', apiKey: '', model: '' }, (res) => {
      sendResponse({ ok: true, data: res });
    });
    return true;
  }
  if (msg.type === 'SAVE_SETTINGS') {
    const partial = msg.payload || {};
    chrome.storage.local.set(partial, () => {
      sendResponse({ ok: true });
    });
    return true;
  }
});
