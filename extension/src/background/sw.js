// Linux.do 收藏增强 - Service Worker
// 负责数据持久化、AI 调用协调、消息处理

import { openDB, getOne, putOne, getAll, putMany, clearAll } from '../lib/idb.js';
import { classifyBatch, updatePostTags } from '../lib/classify.js';
import { MSG, PRESET_TAGS, TAG_TYPE, DEFAULT_SETTINGS } from '../lib/types.js';
import { logger } from '../lib/logger.js';

// 初始化
chrome.runtime.onInstalled.addListener(async () => {
  logger.info('service worker installed');
  
  // 初始化 IndexedDB
  try {
    await openDB();
    await initializeTags();
    await initializeSettings();
    logger.info('IndexedDB initialized');
  } catch (error) {
    logger.error('Failed to initialize IndexedDB:', error);
  }
});

chrome.runtime.onStartup?.addListener?.(() => {
  logger.info('service worker started');
});

// 快捷键命令处理
chrome.commands.onCommand.addListener(async (command) => {
  if (command !== 'toggle-panel') return;
  
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) return;
  
  try {
    await chrome.tabs.sendMessage(tab.id, { type: MSG.TOGGLE_PANEL });
  } catch (err) {
    logger.debug('content not ready, try injecting', err);
    try {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['src/content/content.js'],
      });
      await chrome.tabs.sendMessage(tab.id, { type: MSG.TOGGLE_PANEL });
    } catch (e2) {
      logger.error('inject/send failed', e2);
    }
  }
});

// 消息处理
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (!msg || !msg.type) return;
  
  handleMessage(msg, sender)
    .then(result => sendResponse({ ok: true, data: result }))
    .catch(error => sendResponse({ ok: false, error: error.message }));
  
  return true; // 异步响应
});

/**
 * 统一消息处理器
 */
async function handleMessage(msg, sender) {
  const { type, payload } = msg;
  
  switch (type) {
    case MSG.GET_SETTINGS:
      return await getSettings();
    
    case MSG.SAVE_SETTINGS:
      return await saveSettings(payload);
    
    case MSG.LIST_TAGS:
      return await listTags();
    
    case MSG.UPSERT_TAG:
      return await upsertTag(payload);
    
    case MSG.DELETE_TAG:
      return await deleteTag(payload);
    
    case MSG.CLASSIFY_BATCH:
      return await handleClassifyBatch(payload, sender);
    
    case MSG.UPDATE_POST_TAGS:
      return await handleUpdatePostTags(payload);
    
    case MSG.EXPORT_JSON:
      return await exportData(payload);
    
    case MSG.IMPORT_JSON:
      return await importData(payload);
    
    case 'CLEAR_ALL_DATA':
      await clearAll();
      return { success: true };
    
    default:
      throw new Error(`Unknown message type: ${type}`);
  }
}

/**
 * 获取设置
 */
async function getSettings() {
  const stored = await chrome.storage.local.get(DEFAULT_SETTINGS);
  return { ...DEFAULT_SETTINGS, ...stored };
}

/**
 * 保存设置
 */
async function saveSettings(partial) {
  await chrome.storage.local.set(partial);
  return { success: true };
}

/**
 * 列出所有标签
 */
async function listTags() {
  const tags = await getAll('tags');
  return tags;
}

/**
 * 创建或更新标签
 */
async function upsertTag(tag) {
  const { name, type = TAG_TYPE.USER, enabled = true, weight = 0 } = tag;
  
  if (!name || !name.trim()) {
    throw new Error('Tag name is required');
  }
  
  await putOne('tags', {
    name: name.trim(),
    type,
    enabled,
    weight,
  });
  
  return { success: true };
}

/**
 * 删除标签
 */
async function deleteTag({ name }) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('tags', 'readwrite');
    const req = tx.objectStore('tags').delete(name);
    req.onsuccess = () => resolve({ success: true });
    req.onerror = () => reject(req.error);
  });
}

/**
 * 处理批量分类请求
 */
async function handleClassifyBatch(payload, sender) {
  const { posts } = payload;
  const settings = await getSettings();
  
  // 发送进度更新到 content script
  const sendProgress = (progress) => {
    if (sender.tab?.id) {
      chrome.tabs.sendMessage(sender.tab.id, {
        type: MSG.PROGRESS,
        payload: progress,
      }).catch(() => {});
    }
  };
  
  const results = await classifyBatch(posts, settings, sendProgress);
  
  // 通知数据更新
  if (sender.tab?.id) {
    chrome.tabs.sendMessage(sender.tab.id, {
      type: MSG.DATA_UPDATED,
      payload: { scope: 'classifies' },
    }).catch(() => {});
  }
  
  return results;
}

/**
 * 处理更新帖子标签请求
 */
async function handleUpdatePostTags(payload) {
  const { postId, userTags } = payload;
  await updatePostTags(postId, userTags);
  return { success: true };
}

/**
 * 导出数据
 */
async function exportData({ scope = 'all' }) {
  const data = {
    version: 1,
    exportedAt: new Date().toISOString(),
    scope,
  };
  
  if (scope === 'all' || scope === 'posts') {
    data.posts = await getAll('posts');
    data.classifies = await getAll('classifies');
  }
  
  if (scope === 'all' || scope === 'tags') {
    data.tags = await getAll('tags');
  }
  
  if (scope === 'all' || scope === 'settings') {
    data.settings = await getSettings();
  }
  
  return data;
}

/**
 * 导入数据
 */
async function importData({ data, mode = 'merge' }) {
  if (mode === 'replace') {
    await clearAll();
  }
  
  if (data.posts && Array.isArray(data.posts)) {
    await putMany('posts', data.posts);
  }
  
  if (data.classifies && Array.isArray(data.classifies)) {
    await putMany('classifies', data.classifies);
  }
  
  if (data.tags && Array.isArray(data.tags)) {
    await putMany('tags', data.tags);
  }
  
  if (data.settings) {
    await saveSettings(data.settings);
  }
  
  return { success: true };
}

/**
 * 初始化预制标签
 */
async function initializeTags() {
  const existing = await getAll('tags');
  const existingNames = new Set(existing.map(t => t.name));
  
  const presetTags = PRESET_TAGS
    .filter(name => !existingNames.has(name))
    .map(name => ({
      name,
      type: TAG_TYPE.PRESET,
      enabled: true,
      weight: 0,
    }));
  
  if (presetTags.length > 0) {
    await putMany('tags', presetTags);
    logger.info(`Initialized ${presetTags.length} preset tags`);
  }
}

/**
 * 初始化默认设置
 */
async function initializeSettings() {
  const stored = await chrome.storage.local.get(Object.keys(DEFAULT_SETTINGS));
  const needsInit = Object.keys(DEFAULT_SETTINGS).some(key => !(key in stored));
  
  if (needsInit) {
    await chrome.storage.local.set(DEFAULT_SETTINGS);
    logger.info('Initialized default settings');
  }
}
