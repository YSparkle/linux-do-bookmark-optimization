// Linux.do 收藏增强 - 内容脚本（骨架版）
// 注入一个可开关的悬浮窗与按钮，支持 Ctrl/Cmd+K 快捷键与 Esc 关闭

(() => {
  const HOST_ID = 'ldbe-panel-host';
  const BTN_ID = 'ldbe-toggle-btn';
  const MSG_TOGGLE = 'TOGGLE_PANEL';

  // 监听来自 Service Worker 的切换消息（用于 commands 快捷键）
  try {
    chrome.runtime.onMessage.addListener((msg, _sender, _sendResponse) => {
      if (msg && msg.type === MSG_TOGGLE) {
        togglePanel();
      }
    });
  } catch {}

  // 安装页面快捷键：Ctrl/Cmd + K 切换；Esc 关闭；/ 聚焦搜索框
  window.addEventListener('keydown', (e) => {
    const key = String(e.key || '').toLowerCase();
    // 若正在输入框/文本域/可编辑区域内，除 Ctrl/Cmd+K 外不拦截
    const ae = document.activeElement;
    const isTyping = ae && (
      (ae.tagName === 'INPUT' && ae.getAttribute('type') !== 'checkbox') ||
      ae.tagName === 'TEXTAREA' ||
      (ae instanceof HTMLElement && ae.isContentEditable)
    );
    if ((e.ctrlKey || e.metaKey) && key === 'k') {
      e.preventDefault();
      togglePanel();
    } else if (key === 'escape') {
      hidePanel();
    } else if (!isTyping && !e.ctrlKey && !e.metaKey && key === '/') {
      const host = document.getElementById(HOST_ID);
      try {
        const input = host?.shadowRoot?.getElementById('ldbe-search');
        if (input) {
          e.preventDefault();
          input.focus();
        }
      } catch {}
    }
  }, true);

  // 初始化右下角浮动按钮
  ensureToggleButton();

  function ensureToggleButton() {
    if (document.getElementById(BTN_ID)) return;
    const btn = document.createElement('button');
    btn.id = BTN_ID;
    btn.textContent = '收藏增强';
    btn.title = 'Linux.do 收藏增强 (Ctrl/⌘+K)';
    Object.assign(btn.style, {
      position: 'fixed',
      right: '16px',
      bottom: '16px',
      zIndex: '2147483647',
      padding: '8px 12px',
      borderRadius: '8px',
      border: '1px solid rgba(0,0,0,.1)',
      background: 'rgba(255,255,255,.9)',
      backdropFilter: 'blur(8px)',
      color: '#111',
      fontSize: '12px',
      boxShadow: '0 2px 8px rgba(0,0,0,.15)',
      cursor: 'pointer'
    });
    btn.addEventListener('click', togglePanel);
    document.documentElement.appendChild(btn);
  }

  function ensureHost() {
    let host = document.getElementById(HOST_ID);
    if (host) return host;
    host = document.createElement('div');
    host.id = HOST_ID;
    host.style.all = 'initial'; // 减少与站点样式冲突
    host.style.position = 'fixed';
    host.style.inset = '0';
    host.style.zIndex = '2147483646';
    document.documentElement.appendChild(host);

    const shadow = host.attachShadow({ mode: 'open' });
    const wrapper = document.createElement('div');
    wrapper.setAttribute('part', 'wrapper');
    shadow.appendChild(styleElement());
    shadow.appendChild(wrapper);

    wrapper.innerHTML = panelHTML();
    wirePanelInteractions(shadow);

    return host;
  }

  function styleElement() {
    const s = document.createElement('style');
    s.textContent = `
    :host, * { box-sizing: border-box; }
    .overlay { position: fixed; inset: 0; background: rgba(0,0,0,.15); }
    .panel {
      position: fixed; left: 50%; top: 15%; transform: translateX(-50%);
      width: min(960px, calc(100vw - 32px));
      border-radius: 12px; background: rgba(250,250,252,.96); color: #111;
      box-shadow: 0 20px 40px rgba(0,0,0,.2), 0 1px 0 rgba(255,255,255,.4) inset;
      border: 1px solid rgba(0,0,0,.08);
      overflow: hidden;
    }
    .titlebar { display: flex; align-items: center; gap: 8px; padding: 10px 12px; background: rgba(255,255,255,.7); -webkit-backdrop-filter: blur(10px); backdrop-filter: blur(10px); border-bottom: 1px solid rgba(0,0,0,.06); user-select: none; cursor: move; }
    .dot { width: 11px; height: 11px; border-radius: 999px; border: 1px solid rgba(0,0,0,.15); }
    .dot.red { background: #ff5f57; }
    .dot.yellow { background: #ffbd2e; }
    .dot.green { background: #28c840; }
    .title { font-weight: 600; font-size: 13px; color: #111; margin-left: 4px; }
    .spacer { flex: 1; }
    .btn { appearance: none; border: 1px solid rgba(0,0,0,.1); background: #fff; color: #111; font-size: 12px; padding: 6px 10px; border-radius: 8px; cursor: pointer; }
    .btn:active { transform: translateY(1px); }

    .body { padding: 12px; display: grid; grid-template-rows: auto auto 1fr; gap: 10px; }
    .search { display: flex; align-items: center; gap: 8px; }
    .search input { width: 100%; padding: 10px 12px; border-radius: 10px; border: 1px solid rgba(0,0,0,.1); background: #fff; font-size: 13px; outline: none; }

    .tags { display: flex; align-items: center; flex-wrap: wrap; gap: 6px; }
    .chip { display: inline-flex; align-items: center; gap: 6px; padding: 4px 8px; border: 1px solid rgba(0,0,0,.1); border-radius: 999px; background: #fff; font-size: 12px; cursor: pointer; }
    .chip input { vertical-align: middle; }
    .chip.active { background: #eef6ff; border-color: #b5d3ff; }
    .chip .count { color: #666; font-size: 11px; }

    .list { height: 420px; overflow: auto; padding-right: 6px; }
    .row { padding: 10px 6px; border-bottom: 1px solid rgba(0,0,0,.06); border-left: 2px solid transparent; }
    .row.selected { background: #f4f6f8; border-left-color: #4c8bf5; }
    .tags-inline { display: inline-flex; gap: 6px; flex-wrap: wrap; }
    .tag { display: inline-block; padding: 2px 6px; font-size: 11px; border-radius: 999px; background: #eff1f3; color: #334; border: 1px solid rgba(0,0,0,.06); }

    .hint { font-size: 12px; color: #666; }
    .footer { padding: 10px 12px; border-top: 1px solid rgba(0,0,0,.06); font-size: 12px; color: #666; background: linear-gradient(to top, rgba(0,0,0,.02), transparent); }

    input[type="file"] { display: none; }
    `;
    return s;
  }

  function panelHTML() {
    return `
      <div class="overlay" part="overlay"></div>
      <div class="panel" role="dialog" aria-label="Linux.do 收藏增强">
        <div class="titlebar" part="titlebar" data-draggable="1">
          <div class="dot red" data-action="close" title="关闭 (Esc)"></div>
          <div class="dot yellow" data-action="minimize" title="最小化"></div>
          <div class="dot green" data-action="reload" title="刷新"></div>
          <div class="title">Linux.do 收藏增强（基础版）</div>
          <div class="spacer"></div>
          <button class="btn" data-action="export">导出</button>
          <button class="btn" data-action="import">导入</button>
          <button class="btn" data-action="clear-cache">清缓存</button>
          <button class="btn" data-action="settings">设置</button>
        </div>
        <div class="body" part="body">
          <div class="search">
            <input id="ldbe-search" type="search" placeholder="搜索标题 / 支持多标签 AND 筛选" />
          </div>
          <div class="tags" id="ldbe-tags"></div>
          <div class="list" id="ldbe-list">
            <div class="hint">这里将展示你在 linux.do 收藏的帖子。首次打开将自动加载并缓存，随后后台刷新。</div>
          </div>
          <input id="ldbe-import-file" type="file" accept="application/json" />
        </div>
        <div class="footer" part="footer">仅在 linux.do 收藏页运行 · 本地持久化（计划 IndexedDB） · 零上报</div>
      </div>
    `;
  }

  function wirePanelInteractions(shadowRoot) {
    const overlay = shadowRoot.querySelector('.overlay');
    const panel = shadowRoot.querySelector('.panel');
    const list = shadowRoot.getElementById('ldbe-list');
    const search = shadowRoot.getElementById('ldbe-search');
    const tagsEl = shadowRoot.getElementById('ldbe-tags');
    const fileInput = shadowRoot.getElementById('ldbe-import-file');

    let allItems = [];
    let loading = false;
    let selectedTags = new Set();
    let q = '';

    const CACHE_TTL_MS = 5 * 60 * 1000; // 5 分钟

    function getUsername() {
      const parts = location.pathname.split('/').filter(Boolean);
      const idx = parts.indexOf('u');
      return idx >= 0 && parts[idx + 1] ? parts[idx + 1] : null;
    }

    const CACHE_KEY_PREFIX = 'ldbe_cache_v1';
    const UI_KEY_PREFIX = 'ldbe_ui_v1';
    function getCacheKey() { return `${CACHE_KEY_PREFIX}:${getUsername() || 'unknown'}`; }
    function getUIKey() { return `${UI_KEY_PREFIX}:${getUsername() || 'unknown'}`; }

    function setHint(text) {
      list.innerHTML = '';
      const d = document.createElement('div');
      d.className = 'hint';
      d.style.padding = '8px';
      d.textContent = text;
      list.appendChild(d);
    }

    function render(items) {
      list.innerHTML = '';
      for (const it of items) {
        const row = document.createElement('div');
        row.className = 'row';
        const metaText = [];
        if (it.author) metaText.push(`作者：${escapeHTML(it.author)}`);
        if (it.time) metaText.push(`时间：${escapeHTML(it.time)}`);
        const tagBadges = (Array.isArray(it.tags) ? it.tags : []).map(t => `<span class="tag">${escapeHTML(t)}</span>`).join(' ');
        row.innerHTML = `<div style="font-size:13px;font-weight:600"><a href="${it.href}" target="_blank" style="color:#1155cc;text-decoration:none">${escapeHTML(it.title)}</a></div>
                         <div style="font-size:12px;color:#666;margin-top:4px">${metaText.join(' · ') || '&nbsp;'}</div>
                         <div class="tags-inline" style="margin-top:6px">${tagBadges}</div>`;
        list.appendChild(row);
      }
      if (!items.length) {
        const empty = document.createElement('div');
        empty.className = 'hint';
        empty.textContent = '无匹配项';
        empty.style.padding = '8px';
        list.appendChild(empty);
      }
    }

    function buildTagStats(items) {
      const stats = new Map();
      for (const it of items) {
        const tags = Array.isArray(it.tags) ? it.tags : [];
        for (const t of tags) {
          const name = String(t).trim();
          if (!name) continue;
          stats.set(name, (stats.get(name) || 0) + 1);
        }
      }
      return stats;
    }

    function renderTagChips() {
      const stats = buildTagStats(allItems);
      const entries = Array.from(stats.entries()).sort((a, b) => (b[1] - a[1]) || a[0].localeCompare(b[0]));
      tagsEl.innerHTML = '';
      if (!entries.length) {
        const none = document.createElement('div');
        none.className = 'hint';
        none.textContent = '无标签';
        tagsEl.appendChild(none);
        return;
      }
      for (const [name, count] of entries.slice(0, 80)) {
        const label = document.createElement('label');
        label.className = 'chip' + (selectedTags.has(name) ? ' active' : '');
        label.title = `标签：${name}`;
        const cb = document.createElement('input');
        cb.type = 'checkbox';
        cb.checked = selectedTags.has(name);
        cb.setAttribute('data-tag', name);
        const spanName = document.createElement('span');
        spanName.textContent = name;
        const spanCount = document.createElement('span');
        spanCount.className = 'count';
        spanCount.textContent = String(count);
        label.appendChild(cb);
        label.appendChild(spanName);
        label.appendChild(spanCount);
        label.addEventListener('change', () => {
          const checked = cb.checked;
          if (checked) selectedTags.add(name);
          else selectedTags.delete(name);
          saveUIState();
          applyFilters();
          renderTagChips();
        });
        tagsEl.appendChild(label);
      }
      const clearBtn = document.createElement('button');
      clearBtn.className = 'btn';
      clearBtn.textContent = '清除筛选';
      clearBtn.addEventListener('click', () => {
        if (selectedTags.size === 0 && !q) return;
        selectedTags = new Set();
        saveUIState();
        applyFilters();
        renderTagChips();
      });
      tagsEl.appendChild(clearBtn);
    }

    function applyFilters() {
      const qq = String(q || '').toLowerCase();
      let items = allItems;
      if (qq) items = items.filter(i => (i.title || '').toLowerCase().includes(qq));
      if (selectedTags.size > 0) {
        items = items.filter(i => {
          const set = new Set(Array.isArray(i.tags) ? i.tags : []);
          for (const t of selectedTags) { if (!set.has(t)) return false; }
          return true;
        });
      }
      render(items);
    }

    async function readCache() {
      try {
        const key = getCacheKey();
        const obj = await chrome.storage.local.get(key);
        return obj?.[key] || null;
      } catch {
        return null;
      }
    }

    async function writeCache(items) {
      try {
        const key = getCacheKey();
        const payload = {}; payload[key] = { ts: Date.now(), items };
        await chrome.storage.local.set(payload);
      } catch {}
    }

    async function clearCache() {
      try {
        const key = getCacheKey();
        await chrome.storage.local.remove(key);
      } catch {}
    }

    async function readUIState() {
      try {
        const key = getUIKey();
        const obj = await chrome.storage.local.get(key);
        const s = obj?.[key] || {};
        q = typeof s.q === 'string' ? s.q : '';
        selectedTags = new Set(Array.isArray(s.tags) ? s.tags : []);
        if (search) search.value = q;
      } catch {
        q = '';
        selectedTags = new Set();
      }
    }

    async function saveUIState() {
      try {
        const key = getUIKey();
        const payload = {}; payload[key] = { q, tags: Array.from(selectedTags) };
        await chrome.storage.local.set(payload);
      } catch {}
    }

    async function loadAll() {
      loading = true;
      await readUIState();
      try {
        const cache = await readCache();
        if (cache && Array.isArray(cache.items) && cache.items.length && (Date.now() - (cache.ts || 0) < CACHE_TTL_MS)) {
          allItems = cache.items;
          renderTagChips();
          applyFilters();
        } else {
          setHint('正在加载你的收藏...');
        }
      } catch {
        setHint('正在加载你的收藏...');
      }

      try {
        const items = await fetchAllBookmarks();
        if (items.length) {
          allItems = items;
          renderTagChips();
          applyFilters();
          await writeCache(allItems);
        } else {
          const domItems = extractFromDOM();
          if (domItems.length) {
            allItems = domItems;
            renderTagChips();
            applyFilters();
            await writeCache(allItems);
          } else {
            if (!list.children.length) setHint('未能获取收藏列表。请确认已登录，或页面结构可能已变化。');
          }
        }
      } catch (err) {
        console.debug('[ldbe] loadAll failed', err);
        if (!allItems.length) setHint('加载失败，请稍后重试。');
      } finally {
        loading = false;
      }
    }

    async function fetchAllBookmarks(maxPages = 50) {
      const results = [];
      const origin = location.origin;
      const parts = location.pathname.split('/').filter(Boolean);
      const idx = parts.indexOf('u');
      const username = idx >= 0 && parts[idx + 1] ? parts[idx + 1] : null;
      if (!username) return results;
      let page = 1;
      let hasNext = true;
      while (hasNext && page <= maxPages) {
        const url = `${origin}/u/${username}/activity/bookmarks.json?page=${page}`;
        try {
          const res = await fetch(url, { credentials: 'include' });
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const data = await res.json();
          const pageItems = normalizeBookmarkJson(data);
          if (pageItems.length === 0) break;
          results.push(...pageItems);
          hasNext = getHasNext(data, pageItems);
          page += 1;
        } catch (e) {
          console.debug('[ldbe] json fetch failed, fallback to DOM', e);
          break;
        }
      }
      return dedupeByHref(results);
    }

    function normalizeBookmarkJson(data) {
      const out = [];
      const candidates = Array.isArray(data?.bookmarks) ? data.bookmarks
        : Array.isArray(data?.user_actions) ? data.user_actions
        : Array.isArray(data?.items) ? data.items
        : [];
      for (const b of candidates) {
        const title = b?.title || b?.topic_title || b?.name || '';
        const urlRel = b?.bookmarkable_url || b?.url || b?.link || (b?.topic_slug && b?.topic_id ? `/t/${b.topic_slug}/${b.topic_id}` : null);
        if (!title || !urlRel) continue;
        const href = new URL(urlRel, location.origin).href;
        const tags = Array.isArray(b?.tags) ? b.tags : (Array.isArray(b?.topic_tags) ? b.topic_tags : []);
        const author = b?.username || b?.user?.username || '';
        const time = b?.bookmarked_at || b?.created_at || b?.updated_at || '';
        out.push({ title, href, tags, author, time });
      }
      return out;
    }

    function getHasNext(data, pageItems) {
      if (typeof data?.has_next === 'boolean') return data.has_next;
      if (typeof data?.hasMore === 'boolean') return data.hasMore;
      return pageItems.length > 0;
    }

    function extractFromDOM() {
      const items = [];
      const scope = document.querySelector('main') || document.body;
      const anchors = Array.from(scope.querySelectorAll('a[href^="/t/"]'));
      const seen = new Set();
      for (const a of anchors) {
        const href = new URL(a.getAttribute('href'), location.origin).href;
        const title = (a.textContent || '').trim();
        if (!title || seen.has(href)) continue;
        seen.add(href);
        const container = a.closest('article, li, tr, .item, .bookmark') || a.parentElement;
        const tagEls = container?.querySelectorAll?.('a[href^="/tag/"] , .discourse-tag, a.discourse-tag') || [];
        const tags = Array.from(tagEls).map(el => (el.textContent || '').trim()).filter(Boolean);
        const authorEl = container?.querySelector?.('a[href^="/u/"] .username, a[href^="/u/"]');
        const author = (authorEl?.textContent || '').trim();
        const timeEl = container?.querySelector?.('time');
        const time = timeEl?.getAttribute?.('datetime') || (timeEl?.textContent || '').trim();
        items.push({ title, href, tags, author, time });
        if (items.length >= 200) break; // 防御性上限
      }
      return items;
    }

    function dedupeByHref(items) {
      const map = new Map();
      for (const it of items) { if (!map.has(it.href)) map.set(it.href, it); }
      return Array.from(map.values());
    }

    // 初始加载
    loadAll();

    // 交互：遮罩点击关闭
    overlay.addEventListener('click', hidePanel);

    // 交互：标题栏按钮与额外操作
    shadowRoot.addEventListener('click', async (e) => {
      const target = e.target;
      if (!(target instanceof Element)) return;
      const action = target.getAttribute('data-action');
      if (action === 'close' || action === 'minimize') {
        hidePanel();
      } else if (action === 'reload') {
        loadAll();
      } else if (action === 'settings') {
        try { chrome.runtime.openOptionsPage(); } catch {}
      } else if (action === 'export') {
        try {
          const username = getUsername() || 'unknown';
          const data = { version: 1, origin: location.origin, username, ts: Date.now(), items: allItems };
          const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          const ts = new Date().toISOString().replace(/[:T]/g, '-').split('.')[0];
          a.download = `linuxdo_bookmarks_${username}_${ts}.json`;
          shadowRoot.appendChild(a);
          a.click();
          a.remove();
          setTimeout(() => URL.revokeObjectURL(url), 1000);
        } catch {}
      } else if (action === 'import') {
        fileInput?.click?.();
      } else if (action === 'clear-cache') {
        await clearCache();
        setHint('已清除缓存');
      }
    });

    // 导入文件处理
    fileInput?.addEventListener?.('change', async () => {
      const f = fileInput.files?.[0];
      if (!f) return;
      try {
        const text = await f.text();
        const json = JSON.parse(text);
        let items = Array.isArray(json?.items) ? json.items : (Array.isArray(json) ? json : []);
        if (!Array.isArray(items)) items = [];
        items = items.map(x => ({
          title: String(x?.title || ''),
          href: String(x?.href || ''),
          tags: Array.isArray(x?.tags) ? x.tags.filter(Boolean) : [],
          author: String(x?.author || ''),
          time: String(x?.time || ''),
        })).filter(i => i.title && i.href);
        allItems = dedupeByHref(items);
        renderTagChips();
        applyFilters();
        await writeCache(allItems);
      } catch (err) {
        console.debug('[ldbe] import failed', err);
        setHint('导入失败：JSON 解析错误');
      } finally {
        fileInput.value = '';
      }
    });

    // 搜索
    search.addEventListener('input', () => {
      q = String(search.value || '').trim();
      saveUIState();
      applyFilters();
    });

    // 拖拽移动面板
    const titlebar = shadowRoot.querySelector('.titlebar');
    let dragging = false; let sx = 0; let sy = 0; let ox = 0; let oy = 0;
    titlebar?.addEventListener?.('mousedown', (e) => {
      const t = e.target;
      if (t instanceof Element && (t.classList.contains('btn') || t.classList.contains('dot'))) return;
      dragging = true;
      const rect = panel.getBoundingClientRect();
      panel.style.left = rect.left + 'px';
      panel.style.top = rect.top + 'px';
      panel.style.transform = 'none';
      sx = e.clientX; sy = e.clientY; ox = rect.left; oy = rect.top;
      e.preventDefault();
    });
    window.addEventListener('mousemove', (e) => {
      if (!dragging) return;
      const dx = e.clientX - sx; const dy = e.clientY - sy;
      panel.style.left = (ox + dx) + 'px';
      panel.style.top = (oy + dy) + 'px';
    });
    window.addEventListener('mouseup', () => { dragging = false; });
  }

  function togglePanel() {
    const host = document.getElementById(HOST_ID);
    if (host) {
      hidePanel();
    } else {
      showPanel();
    }
  }

  function showPanel() {
    const host = ensureHost();
    host.style.display = 'block';
  }

  function hidePanel() {
    const host = document.getElementById(HOST_ID);
    if (host) host.remove();
  }

  function escapeHTML(s) {
    return String(s)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }
})();
