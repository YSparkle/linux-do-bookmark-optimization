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
      width: min(920px, calc(100vw - 32px));
      border-radius: 12px; background: rgba(250,250,252,.96); color: #111;
      box-shadow: 0 20px 40px rgba(0,0,0,.2), 0 1px 0 rgba(255,255,255,.4) inset;
      border: 1px solid rgba(0,0,0,.08);
      overflow: hidden;
    }
    .titlebar { display: flex; align-items: center; gap: 8px; padding: 10px 12px; background: rgba(255,255,255,.7); -webkit-backdrop-filter: blur(10px); backdrop-filter: blur(10px); border-bottom: 1px solid rgba(0,0,0,.06); }
    .dot { width: 11px; height: 11px; border-radius: 999px; border: 1px solid rgba(0,0,0,.15); }
    .dot.red { background: #ff5f57; }
    .dot.yellow { background: #ffbd2e; }
    .dot.green { background: #28c840; }
    .title { font-weight: 600; font-size: 13px; color: #111; margin-left: 4px; }
    .spacer { flex: 1; }
    .btn { appearance: none; border: 1px solid rgba(0,0,0,.1); background: #fff; color: #111; font-size: 12px; padding: 6px 10px; border-radius: 8px; cursor: pointer; }
    .btn:active { transform: translateY(1px); }

    .body { padding: 12px; display: grid; grid-template-rows: auto 1fr; gap: 10px; }
    .search { display: flex; align-items: center; gap: 8px; }
    .search input { width: 100%; padding: 10px 12px; border-radius: 10px; border: 1px solid rgba(0,0,0,.1); background: #fff; font-size: 13px; outline: none; }
    .list { height: 420px; overflow: auto; padding-right: 6px; }
    .hint { font-size: 12px; color: #666; }
    .footer { padding: 10px 12px; border-top: 1px solid rgba(0,0,0,.06); font-size: 12px; color: #666; background: linear-gradient(to top, rgba(0,0,0,.02), transparent); }
    `;
    return s;
  }

  function panelHTML() {
    return `
      <div class="overlay" part="overlay"></div>
      <div class="panel" role="dialog" aria-label="Linux.do 收藏增强">
        <div class="titlebar" part="titlebar">
          <div class="dot red" data-action="close" title="关闭 (Esc)"></div>
          <div class="dot yellow" data-action="minimize" title="最小化"></div>
          <div class="dot green" data-action="reload" title="刷新"></div>
          <div class="title">Linux.do 收藏增强（骨架版）</div>
          <div class="spacer"></div>
          <button class="btn" data-action="settings">设置</button>
        </div>
        <div class="body" part="body">
          <div class="search">
            <input id="ldbe-search" type="search" placeholder="搜索标题 (示例) / 快捷键：Ctrl/⌘+K 切换、Esc 关闭" />
          </div>
          <div class="list" id="ldbe-list">
            <div class="hint">这里将展示你在 linux.do 收藏的帖子。当前为骨架版，仅展示示例数据与 UI 框架。</div>
          </div>
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

    let allItems = [];
    let loading = false;

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
        row.style.padding = '10px 6px';
        row.style.borderBottom = '1px solid rgba(0,0,0,.06)';
        const tagText = (it.tags && it.tags.length) ? `标签：${it.tags.join('、')}` : '';
        const metaText = [];
        if (it.author) metaText.push(`作者：${escapeHTML(it.author)}`);
        if (it.time) metaText.push(`时间：${escapeHTML(it.time)}`);
        const metaLine = [tagText, metaText.join(' · ')].filter(Boolean).join(' | ');
        row.innerHTML = `<div style="font-size:13px;font-weight:600"><a href="${it.href}" target="_blank" style="color:#1155cc;text-decoration:none">${escapeHTML(it.title)}</a></div>
                         <div style="font-size:12px;color:#666;margin-top:4px">${metaLine || '&nbsp;'}</div>`;
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

    async function loadAll() {
      loading = true;
      setHint('正在加载你的收藏...');
      try {
        const items = await fetchAllBookmarks();
        if (items.length) {
          allItems = items;
          render(allItems);
        } else {
          // 回退：解析当前页 DOM
          const domItems = extractFromDOM();
          if (domItems.length) {
            allItems = domItems;
            render(allItems);
          } else {
            setHint('未能获取收藏列表。请确认已登录，或页面结构可能已变化。');
          }
        }
      } catch (err) {
        console.debug('[ldbe] loadAll failed', err);
        setHint('加载失败，请稍后重试。');
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
        const time = b?.created_at || b?.updated_at || '';
        out.push({ title, href, tags, author, time });
      }
      return out;
    }

    function getHasNext(data, pageItems) {
      if (typeof data?.has_next === 'boolean') return data.has_next;
      if (typeof data?.hasMore === 'boolean') return data.hasMore;
      // 若无显式标志：当本页条目数为 0 视为结束
      return pageItems.length > 0;
    }

    function extractFromDOM() {
      const items = [];
      const scope = document.querySelector('main') || document.body;
      // 优先选择书签列表中的主题链接
      const anchors = Array.from(scope.querySelectorAll('a[href^="/t/"]'));
      const seen = new Set();
      for (const a of anchors) {
        const href = new URL(a.getAttribute('href'), location.origin).href;
        const title = (a.textContent || '').trim();
        if (!title || seen.has(href)) continue;
        seen.add(href);
        const tagEls = a.closest('article, li, tr, .item, .bookmark')?.querySelectorAll?.('a[href^="/tag/"] , .discourse-tag, a.discourse-tag') || [];
        const tags = Array.from(tagEls).map(el => (el.textContent || '').trim()).filter(Boolean);
        items.push({ title, href, tags });
        if (items.length >= 100) break; // 防御性上限
      }
      return items;
    }

    function dedupeByHref(items) {
      const map = new Map();
      for (const it of items) {
        if (!map.has(it.href)) map.set(it.href, it);
      }
      return Array.from(map.values());
    }

    // 初始加载
    loadAll();

    overlay.addEventListener('click', hidePanel);
    shadowRoot.addEventListener('click', (e) => {
      const target = e.target;
      if (!(target instanceof Element)) return;
      const action = target.getAttribute('data-action');
      if (action === 'close') hidePanel();
      else if (action === 'minimize') hidePanel();
      else if (action === 'reload') {
        loadAll();
      } else if (action === 'settings') {
        try { chrome.runtime.openOptionsPage(); } catch {}
      }
    });

    search.addEventListener('input', () => {
      const q = String(search.value || '').trim().toLowerCase();
      if (!q) return render(allItems);
      const filtered = allItems.filter(i => (i.title || '').toLowerCase().includes(q));
      render(filtered);
    });
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
