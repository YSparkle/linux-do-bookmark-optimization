// Linux.do 收藏增强 - 选项页（骨架版）

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
  showToast('已保存');
}

async function reset() {
  await chrome.storage.local.remove(['apiBase', 'apiKey', 'model']);
  await load();
  showToast('已清除');
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

load();
