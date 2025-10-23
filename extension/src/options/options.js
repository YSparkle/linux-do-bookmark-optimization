// Linux.do 收藏增强 - 选项页（骨架版 + 可选域名授权）

const $ = (sel) => document.querySelector(sel);

const inputs = {
  apiBase: $('#apiBase'),
  apiKey: $('#apiKey'),
  model: $('#model'),
};

async function load() {
  const res = await chrome.storage.local.get({ apiBase: '', apiKey: '', model: '' });
  inputs.apiBase.value = res.apiBase || '';
  inputs.apiKey.value = res.apiKey || '';
  inputs.model.value = res.model || '';
}

async function save(e) {
  e?.preventDefault?.();
  const partial = {
    apiBase: inputs.apiBase.value.trim(),
    apiKey: inputs.apiKey.value.trim(),
    model: inputs.model.value.trim(),
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
  await chrome.storage.local.remove(['apiBase', 'apiKey', 'model']);
  await load();
  showToast('已清除');
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

load();
