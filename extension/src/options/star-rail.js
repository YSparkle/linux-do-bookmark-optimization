// 星穹铁道 · 策略规划（Alpha）

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));

const state = {
  files: [], // { name, dataUrl }
  lastResult: null,
  settings: null,
};

const DEFAULT_SYSTEM_PROMPT = `你是“崩坏：星穹铁道”的专业战斗策划AI。目标：
1) 从多张截图中读取所有信息（角色、光锥、遗器、行迹、行迹加点、技能简述与详细描述、敌人列表与弱点、环境/关卡Buff等）。
2) 对每个“角色”进行完整建模：等级、攻击/生命/防御/速度/暴击/爆伤/击破效果/效果命中/效果抵抗/能量、遗器套装效果、光锥效果、行迹与关键节点、星魂、共鸣（若有）。
3) 对每个“敌人/Boss/小怪”建模：等级、生命/防御、弱点、词缀、机制（护盾、护盾值、行动条、增益/减益）、可能触发的特殊效果。
4) 基于游戏实际规则自行计算所有关键数值：速度分层与调速、回能（受击/施放/击破等来源）、回合推进（含我方与敌方行动条）、伤害期望（带暴击概率）、击破与易伤收益、Buff/Debuff持续与覆盖、嘲讽/嘲笑与被集火概率等。
5) 产出两套策略：
   - 凹（允许通过控制受击对象、卡行动、故意吃技能等来达成最佳回合/能量循环）
   - 不凹（追求高稳定性，尽量不依赖受击博弈）
6) 每套策略分别覆盖：
   - 刷材料：尽量在最少“总行动次数/回合数”内击破通关；允许牺牲稳定性以换取更快速度。
   - 深渊/虚构叙事：结合Buff/加成，制定“最少回合击破”或“最高积分”的回合计划。
7) 输出严格JSON，字段：
{
  "extracted": {
    "characters": [
      {"name":"", "level":0, "stats": {"atk":0, "hp":0, "def":0, "spd":0, "critRate":0, "critDmg":0, "break":0, "effHit":0, "effRes":0, "energy":0},
       "relics": [{"set":"","slots":{"head":"","hands":"","body":"","feet":"","planarSphere":"","linkRope":""}}],
       "lightcone": {"name":"","superimpose":0,"desc":""},
       "traces": {"basic":"","skill":"","ult":"","talent":"","major_nodes":["..."]},
       "eidolons": 0
      }
    ],
    "enemies": [
      {"name":"","level":0, "weakness":[""], "stats":{"hp":0,"def":0}, "affixes":[""], "notes":""}
    ],
    "environment": {"buffs":[""], "notes":""}
  },
  "mode": "farm|abyss|custom",
  "computed": { "speed_tuning": "文字说明或表格", "damage_model": "关键公式与期望值摘要" },
  "plans": {
    "roll": {
      "farm": {"turns": 0, "sequence": ["按键/释放顺序与时机"], "notes":"关键博弈点与成功判定"},
      "abyss": {"turns": 0, "sequence": ["..."], "notes":"..."},
      "custom": {"goal":"若选择了自定义模式，说明目标","sequence":["..."]}
    },
    "noroll": {
      "farm": {"turns": 0, "sequence": ["..."], "notes":"稳定性优先"},
      "abyss": {"turns": 0, "sequence": ["..."], "notes":"..."},
      "custom": {"goal":"...","sequence":["..."]}
    }
  }
}
要求：
- 严格输出JSON，禁止额外解释文字。
- 遇到不清晰的地方，先在 extracted.notes 里记录“缺失项/不确定项”，并合理假设后继续计算，并标注假设对结论的影响。
- 识图时必须逐张阅读，并解析“简述”与“详细描述”。`;

async function loadSettings() {
  const s = await chrome.storage.local.get({ provider:'custom', apiBase:'', apiKey:'', model:'', sr_sessions: [] });
  state.settings = s;
  renderHistory(s.sr_sessions || []);
}

function toast(text) {
  const t = document.createElement('div');
  t.textContent = text;
  Object.assign(t.style, { position:'fixed', right:'16px', bottom:'16px', background:'rgba(0,0,0,.8)', color:'#fff', padding:'8px 12px', borderRadius:'8px', zIndex:999999 });
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 1800);
}

function onFilesSelected(files) {
  state.files = [];
  const preview = $('#preview');
  preview.innerHTML = '';
  for (const f of files) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const url = e.target.result;
      state.files.push({ name: f.name, dataUrl: url });
      const img = new Image();
      img.src = url;
      preview.appendChild(img);
    };
    reader.readAsDataURL(f);
  }
}

function setupDropzone() {
  const dz = $('#dropzone');
  const fi = $('#fileInput');
  dz.addEventListener('dragover', (e) => { e.preventDefault(); dz.classList.add('drag'); });
  dz.addEventListener('dragleave', () => dz.classList.remove('drag'));
  dz.addEventListener('drop', (e) => {
    e.preventDefault(); dz.classList.remove('drag');
    const files = e.dataTransfer.files;
    onFilesSelected(files);
  });
  fi.addEventListener('change', (e) => onFilesSelected(e.target.files));
}

async function ensurePermission(apiBase) {
  try {
    const origin = new URL(apiBase).origin + '/*';
    await new Promise((resolve) => chrome.permissions?.request?.({ origins: [origin] }, () => resolve()));
  } catch {}
}

async function analyze() {
  const { apiBase, apiKey, model } = state.settings || {};
  if (!apiBase || !apiKey || !model) { toast('请先在设置页填写 API 信息'); return; }
  if (!state.files.length) { toast('请先上传至少一张截图'); return; }

  await ensurePermission(apiBase);

  const sys = ($('#systemPrompt').value || '').trim() || DEFAULT_SYSTEM_PROMPT;
  const mode = ($$('input[name="mode"]:checked')[0]?.value) || 'farm';

  const messages = [
    { role: 'system', content: sys },
    { role: 'user', content: [
      { type: 'text', text: `模式: ${mode}。请读取所有截图，先提取与计算，再给出凹/不凹两套策略。输出严格JSON。` },
      ...state.files.map(f => ({ type: 'image_url', image_url: { url: f.dataUrl } }))
    ] }
  ];

  const url = new URL('/chat/completions', apiBase).toString();
  const body = {
    model,
    messages,
    temperature: 0,
    response_format: { type: 'json_object' }
  };

  setBusy(true);
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify(body)
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const content = data?.choices?.[0]?.message?.content || '';
    const json = safeParseJSON(content);
    if (!json) throw new Error('AI 返回非 JSON');
    state.lastResult = json;
    await saveSession(json, state.files);
    renderResult(json);
    toast('识别完成');
  } catch (e) {
    console.debug('[sr] analyze failed', e);
    toast(`识别失败：${e.message || e}`);
  } finally {
    setBusy(false);
  }
}

function safeParseJSON(s) {
  if (!s) return null;
  let t = String(s).trim();
  const fence = /^```[a-zA-Z]*\n([\s\S]*?)\n```$/;
  const m = t.match(fence); if (m) t = m[1];
  try { return JSON.parse(t); } catch { return null; }
}

async function saveSession(json, files) {
  const s = await chrome.storage.local.get({ sr_sessions: [] });
  const ts = Date.now();
  const entry = { id: ts, ts, mode: json?.mode || '', summary: summarize(json), result: json, files: files.map(f => ({ name: f.name })) };
  const next = [entry, ...s.sr_sessions].slice(0, 20);
  await chrome.storage.local.set({ sr_sessions: next });
  renderHistory(next);
}

function summarize(json) {
  try {
    const chars = json?.extracted?.characters?.map?.(c => c.name)?.filter(Boolean) || [];
    const enemies = json?.extracted?.enemies?.map?.(e => e.name)?.filter(Boolean) || [];
    return `角色：${chars.join('、')}\n敌人：${enemies.join('、')}`;
  } catch { return ''; }
}

function renderHistory(list) {
  const box = $('#history');
  box.innerHTML = '';
  for (const it of list) {
    const d = document.createElement('div');
    d.className = 'item';
    d.innerHTML = `<h4>${new Date(it.ts).toLocaleString()} · 模式：${it.mode || '-'} </h4><div>${escapeHTML(it.summary || '')}</div>`;
    d.addEventListener('click', () => renderResult(it.result));
    box.appendChild(d);
  }
}

function renderResult(json) {
  $('#result').hidden = false;
  $('#summary').textContent = `共识别角色 ${json?.extracted?.characters?.length || 0} 名，敌人 ${json?.extracted?.enemies?.length || 0} 个。\n` + (json?.computed?.speed_tuning ? `调速：${json.computed.speed_tuning}` : '');

  // 角色
  const ch = json?.extracted?.characters || [];
  const chLines = ch.map(c => {
    const s = c.stats || {}; const rel = c.relics?.[0]?.set || '';
    return `• ${c.name} Lv${c.level || ''}  SPD ${s.spd || '?'}  ATK ${s.atk || '?'}  CR ${s.critRate || '?'}  CD ${s.critDmg || '?'}\n  套装：${rel}  光锥：${c.lightcone?.name || ''}`;
  }).join('\n\n');
  $('#characters').textContent = chLines || '—';

  // 敌人
  const en = json?.extracted?.enemies || [];
  const enLines = en.map(e => `• ${e.name} Lv${e.level || ''}  弱点：${(e.weakness||[]).join('/')}  词缀：${(e.affixes||[]).join('/')}\n  备注：${e.notes||''}`).join('\n\n');
  $('#enemies').textContent = enLines || '—';

  renderPlans(json);
}

function renderPlans(json) {
  const rollMode = ($$('input[name="roll"]:checked')[0]?.value) || 'roll';
  const plans = json?.plans?.[rollMode] || {};
  const mode = json?.mode || 'farm';
  const current = plans[mode] || plans['farm'] || plans['abyss'] || {};
  const seq = (current.sequence || []).map((s, i) => `${i+1}. ${s}`).join('\n');
  const txt = `方案：${rollMode === 'roll' ? '凹' : '不凹'}  ·  目标：${mode}\n回合数（期望）：${current.turns ?? '-'}\n步骤：\n${seq}\n\n备注：${current.notes || ''}`;
  $('#plans').textContent = txt;
}

function setBusy(busy) {
  const btn = $('#analyze');
  btn.disabled = !!busy;
  btn.textContent = busy ? '识别中…' : '识图 + 计算策略';
}

function escapeHTML(s) {
  return String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
}

function bindEvents() {
  setupDropzone();
  $('#analyze').addEventListener('click', analyze);
  $('#clear').addEventListener('click', () => { state.files = []; $('#preview').innerHTML=''; $('#result').hidden=true; });
  $('#export').addEventListener('click', async () => {
    if (!state.lastResult) { toast('没有可导出的结果'); return; }
    const blob = new Blob([JSON.stringify(state.lastResult, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `star-rail-plan-${Date.now()}.json`;
    a.click(); URL.revokeObjectURL(url);
  });
  $$('input[name="roll"]').forEach(r => r.addEventListener('change', () => { if (state.lastResult) renderPlans(state.lastResult); }));
}

(async function main() {
  bindEvents();
  await loadSettings();
})();
