// Linux.do 收藏增强 - 选项页（骨架版）

const $ = (sel) => document.querySelector(sel);

const inputs = {
  provider: $('#provider'),
  apiBase: $('#apiBase'),
  apiKey: $('#apiKey'),
  model: $('#model'),
};

const PROVIDER_DEFAULTS = {
  openai: { base: 'https://api.openai.com/v1', model: 'gpt-4o-mini' },
  openrouter: { base: 'https://openrouter.ai/api/v1', model: 'openai/gpt-4o-mini' },
  azure: { base: 'https://your-azure-openai-endpoint/openai', model: 'gpt-4o-mini' },
  deepseek: { base: 'https://api.deepseek.com/v1', model: 'deepseek-chat' },
  moonshot: { base: 'https://api.moonshot.cn/v1', model: 'moonshot-v1-8k' },
  groq: { base: 'https://api.groq.com/openai/v1', model: 'llama-3.1-70b-versatile' },
  custom: { base: '', model: '' },
};

async function load() {
  const res = await chrome.storage.local.get({ provider: 'custom', apiBase: '', apiKey: '', model: '' });
  inputs.provider.value = res.provider || 'custom';
  inputs.apiBase.value = res.apiBase || '';
  inputs.apiKey.value = res.apiKey || '';
  inputs.model.value = res.model || '';
}

inputs.provider?.addEventListener('change', () => {
  const p = inputs.provider.value;
  const d = PROVIDER_DEFAULTS[p] || PROVIDER_DEFAULTS.custom;
  if (!inputs.apiBase.value) inputs.apiBase.value = d.base;
  if (!inputs.model.value) inputs.model.value = d.model;
});

async function save(e) {
  e?.preventDefault?.();
  const partial = {
    provider: inputs.provider.value,
    apiBase: inputs.apiBase.value.trim(),
    apiKey: inputs.apiKey.value.trim(),
    model: inputs.model.value.trim(),
  };
  await ensureApiPermission(partial.apiBase);
  await chrome.storage.local.set(partial);
  showToast('已保存');
}

async function reset() {
  await chrome.storage.local.remove(['provider','apiBase', 'apiKey', 'model']);
  await load();
  showToast('已清除');
}

async function testConnection() {
  const apiBase = inputs.apiBase.value.trim();
  const apiKey = inputs.apiKey.value.trim();
  const model = inputs.model.value.trim();
  if (!apiBase || !apiKey || !model) {
    showToast('请先填写 API Base/Key/Model');
    return;
  }
  try {
    await ensureApiPermission(apiBase);
    const url = new URL('/chat/completions', apiBase).toString();
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: 'ping' },
          { role: 'user', content: 'ping' }
        ],
        max_tokens: 4
      })
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    showToast('连接成功');
  } catch (e) {
    console.debug('[test] failed', e);
    showToast(`连接失败：${e.message || e}`);
  }
}

async function ensureApiPermission(apiBase) {
  try {
    const origin = new URL(apiBase).origin + '/*';
    if (!chrome.permissions?.request) return;
    await new Promise((resolve) => {
      chrome.permissions.request({ origins: [origin] }, () => resolve());
    });
  } catch {}
}

function showToast(text) {
  const t = document.createElement('div');
  t.textContent = text;
  Object.assign(t.style, {
    position: 'fixed', right: '16px', bottom: '16px', background: 'rgba(0,0,0,.75)', color: '#fff',
    padding: '8px 12px', borderRadius: '8px', zIndex: 999999
  });
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 1600);
}

$('#form').addEventListener('submit', save);
$('#reset').addEventListener('click', reset);
$('#test')?.addEventListener('click', testConnection);

load();
