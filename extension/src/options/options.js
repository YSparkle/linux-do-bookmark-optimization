// Linux.do 收藏增强 - 选项页（完整版）

const $ = (sel) => document.querySelector(sel);

const DEFAULT_SETTINGS = {
  apiBase: '',
  apiKey: '',
  model: 'gpt-4o-mini',
  aiConcurrency: 2,
  fetchConcurrency: 4,
  timeoutMs: 20000,
  retryMax: 3,
  bodyCharLimit: 8000,
  batchLimit: 100,
  enablePresetTags: true,
};

const inputs = {
  apiBase: $('#apiBase'),
  apiKey: $('#apiKey'),
  model: $('#model'),
  aiConcurrency: $('#aiConcurrency'),
  fetchConcurrency: $('#fetchConcurrency'),
  timeoutMs: $('#timeoutMs'),
  retryMax: $('#retryMax'),
  bodyCharLimit: $('#bodyCharLimit'),
  batchLimit: $('#batchLimit'),
  enablePresetTags: $('#enablePresetTags'),
};

async function load() {
  const res = await chrome.storage.local.get(DEFAULT_SETTINGS);
  inputs.apiBase.value = res.apiBase || '';
  inputs.apiKey.value = res.apiKey || '';
  inputs.model.value = res.model || '';
  inputs.aiConcurrency.value = res.aiConcurrency || 2;
  inputs.fetchConcurrency.value = res.fetchConcurrency || 4;
  inputs.timeoutMs.value = res.timeoutMs || 20000;
  inputs.retryMax.value = res.retryMax || 3;
  inputs.bodyCharLimit.value = res.bodyCharLimit || 8000;
  inputs.batchLimit.value = res.batchLimit || 100;
  inputs.enablePresetTags.checked = res.enablePresetTags !== false;
}

async function save(e) {
  e?.preventDefault?.();
  const partial = {
    apiBase: inputs.apiBase.value.trim(),
    apiKey: inputs.apiKey.value.trim(),
    model: inputs.model.value.trim(),
    aiConcurrency: parseInt(inputs.aiConcurrency.value, 10) || 2,
    fetchConcurrency: parseInt(inputs.fetchConcurrency.value, 10) || 4,
    timeoutMs: parseInt(inputs.timeoutMs.value, 10) || 20000,
    retryMax: parseInt(inputs.retryMax.value, 10) || 3,
    bodyCharLimit: parseInt(inputs.bodyCharLimit.value, 10) || 8000,
    batchLimit: parseInt(inputs.batchLimit.value, 10) || 100,
    enablePresetTags: inputs.enablePresetTags.checked,
  };
  await chrome.storage.local.set(partial);

  // 若填写了 API Base，尝试为该域名申请可选主机权限
  if (partial.apiBase) {
    try {
      const granted = await ensureHostPermission(partial.apiBase);
      if (!granted) {
        showToast('已保存，但未授予 API 域名权限，后续调用可能失败');
      } else {
        showToast('已保存，并授予 API 域名权限');
      }
      return;
    } catch {
      // 忽略异常，只提示已保存
    }
  }
  showToast('已保存');
}

async function reset() {
  await chrome.storage.local.set(DEFAULT_SETTINGS);
  await load();
  showToast('已恢复默认设置');
}

async function clearData() {
  if (!confirm('确定要清除所有本地数据（包括收藏、标签、分类等）？此操作不可恢复。')) {
    return;
  }
  
  try {
    await chrome.runtime.sendMessage({ type: 'CLEAR_ALL_DATA' });
    showToast('已清除所有数据');
  } catch (error) {
    showToast('清除失败：' + error.message);
  }
}

// 解析 apiBase → origins 通配（https://host:port/*）
function toOriginPattern(apiBase) {
  try {
    const u = new URL(apiBase);
    return `${u.origin}/*`;
  } catch {
    return '';
  }
}

async function ensureHostPermission(apiBase) {
  const origin = toOriginPattern(apiBase);
  if (!origin) return false;
  try {
    const has = await chrome.permissions.contains({ origins: [origin] });
    if (has) return true;
    const granted = await chrome.permissions.request({ origins: [origin] });
    return !!granted;
  } catch {
    return false;
  }
}

function showToast(text) {
  const t = document.createElement('div');
  t.textContent = text;
  Object.assign(t.style, {
    position: 'fixed', right: '16px', bottom: '16px', background: 'rgba(0,0,0,.75)', color: '#fff',
    padding: '8px 12px', borderRadius: '8px', zIndex: 999999
  });
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 2000);
}

$('#form').addEventListener('submit', save);
$('#reset').addEventListener('click', reset);
$('#clearData').addEventListener('click', clearData);

load();
