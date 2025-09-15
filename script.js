// script.js - final, robust version
document.addEventListener('DOMContentLoaded', () => {
  // --- Config & defaults ---
  const CORS_PROXY = 'https://api.allorigins.win/raw?url=';
  const STORAGE_KEY = 'commandCenterFeeds';
  const THEME_KEY = 'commandCenterTheme';

  const DEFAULT_FEEDS = [
    { name: "BBC World News", url: "https://feeds.bbci.co.uk/news/world/rss.xml" },
    { name: "Variety", url: "https://variety.com/feed/" },
    { name: "TechCrunch", url: "https://techcrunch.com/feed/" }
  ];

  // --- DOM refs ---
  const feedList = document.getElementById('feed-list');
  const articleContainer = document.getElementById('article-container');
  const bookmarksContainer = document.getElementById('bookmarks');
  const addFeedBtn = document.getElementById('add-feed-btn');
  const addFeedModal = document.getElementById('add-feed-modal');
  const saveFeedBtn = document.getElementById('save-feed-btn');
  const cancelFeedBtn = document.getElementById('cancel-feed-btn');
  const feedNameInput = document.getElementById('feed-name-input');
  const feedUrlInput = document.getElementById('feed-url-input');
  const howToBtn = document.getElementById('how-to-btn');
  const howToModal = document.getElementById('how-to-modal');
  const closeHowToBtn = document.getElementById('close-how-to-btn');
  const toggleDarkBtn = document.getElementById('toggle-dark');
  const resetFeedsBtn = document.getElementById('reset-feeds-btn');
  const sidebarToggle = document.getElementById('sidebar-toggle');
  const sidebar = document.querySelector('.sidebar-feeds');

  // --- State ---
  let feeds = [];

  // ---------- Utilities ----------
  const safeParse = (s) => {
    try { return JSON.parse(s); } catch { return null; }
  };

  function saveFeedsToStorage() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(feeds)); } catch (e) { console.warn('save fail', e); }
  }
  function loadFeedsFromStorage() {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = safeParse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) return null;
    // Basic validation: each item has name and url
    for (const p of parsed) {
      if (!p || !p.url) return null;
    }
    return parsed;
  }

  function setThemeFromStorage() {
    const t = localStorage.getItem(THEME_KEY);
    if (t === 'dark') document.body.classList.add('dark-mode');
    else document.body.classList.remove('dark-mode');
  }

  function normalizeUrl(u){
    if (!u) return '';
    u = u.trim();
    if (!/^https?:\/\//i.test(u)) u = 'https://' + u;
    if (u.startsWith('http://')) u = u.replace(/^http:\/\//i,'https://');
    return u;
  }

  function escapeHtml(str = '') {
    return String(str).replace(/[&<>"'\/]/g, s => {
      const map = { '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;','/':'&#x2F;' };
      return map[s];
    });
  }

  // ---------- Render sidebar feeds ----------
  function renderFeeds() {
    if (!feedList) return;
    feedList.innerHTML = '';
    feeds.forEach((f, i) => {
      const div = document.createElement('div');
      div.className = 'feed-item';
      div.dataset.index = i;
      div.dataset.url = f.url;
      div.innerHTML = `
        <div class="name">${escapeHtml(f.name)}</div>
        <div class="controls">
          ${i >= DEFAULT_FEEDS.length ? '<button class="delete-feed" title="Delete feed">❌</button>' : ''}
        </div>
      `;
      feedList.appendChild(div);
    });
  }

  // ---------- Fetch + render feed items (RSS & Atom tolerant) ----------
  async function fetchAndShow(feedUrl, feedElement = null) {
    if (!articleContainer) return;
    articleContainer.innerHTML = '<div class="loading"><div class="loading-spinner"></div></div>';
    document.querySelectorAll('.feed-item').forEach(el => el.classList.remove('active'));
    if (feedElement) feedElement.classList.add('active');

    const url = normalizeUrl(feedUrl);
    if (!url) {
      articleContainer.innerHTML = '<p style="text-align:center;color:var(--danger)">Invalid feed URL</p>';
      return;
    }

    try {
      const res = await fetch(CORS_PROXY + encodeURIComponent(url), { cache: 'no-store' });
      if (!res.ok) throw new Error(`Network ${res.status}`);
      const text = await res.text();
      const doc = new DOMParser().parseFromString(text, 'application/xml');

      // Check for parsererror
      if (doc.querySelector('parsererror')) {
        articleContainer.innerHTML = '<p style="text-align:center;color:var(--danger)">Feed parse error (not valid XML/RSS).</p>';
        return;
      }

      // Try RSS <item>
      const items = doc.querySelectorAll('item');
      if (items && items.length > 0) {
        articleContainer.innerHTML = '';
        items.forEach((it, idx) => {
          if (idx >= 12) return;
          const title = it.querySelector('title')?.textContent || 'No title';
          const link = it.querySelector('link')?.textContent || it.querySelector('guid')?.textContent || '#';
          let desc = it.querySelector('description')?.textContent || it.querySelector('content\\:encoded')?.textContent || '';
          desc = desc.replace(/<[^>]+>/g,'').slice(0,240);
          const pub = it.querySelector('pubDate')?.textContent || it.querySelector('dc\\:date')?.textContent || '';
          const media = it.querySelector('media\\:content, enclosure, media\\:thumbnail');
          const thumb = media ? (media.getAttribute('url') || media.getAttribute('href')) : '';

          const a = document.createElement('a');
          a.className = 'article-card';
          a.href = link;
          a.target = '_blank';
          a.rel = 'noopener noreferrer';
          a.innerHTML = `
            ${thumb ? `<img class="article-image" src="${escapeHtml(thumb)}" alt="">` : `<div class="article-image" style="background:#e8e8e8"></div>`}
            <div class="article-content">
              <h2>${escapeHtml(title)}</h2>
              <p>${escapeHtml(desc)}</p>
              <div class="article-meta">${escapeHtml(pub)}</div>
            </div>
          `;
          articleContainer.appendChild(a);

          // Bind bookmark on click to save (event delegation for buttons would be better if you add a save-button)
          a.addEventListener('contextmenu', (e) => { e.preventDefault(); saveBookmarkFromElement(a); });
        });
        return;
      }

      // Try Atom <entry>
      const entries = doc.querySelectorAll('entry');
      if (entries && entries.length > 0) {
        articleContainer.innerHTML = '';
        entries.forEach((en, idx) => {
          if (idx >= 12) return;
          const title = en.querySelector('title')?.textContent || 'No title';
          const link = en.querySelector('link')?.getAttribute('href') || en.querySelector('link')?.textContent || '#';
          let desc = en.querySelector('summary')?.textContent || en.querySelector('content')?.textContent || '';
          desc = desc.replace(/<[^>]+>/g,'').slice(0,240);
          const pub = en.querySelector('updated')?.textContent || en.querySelector('published')?.textContent || '';
          const a = document.createElement('a');
          a.className = 'article-card';
          a.href = link;
          a.target = '_blank';
          a.rel = 'noopener noreferrer';
          a.innerHTML = `
            <div class="article-image" style="background:#e8e8e8"></div>
            <div class="article-content">
              <h2>${escapeHtml(title)}</h2>
              <p>${escapeHtml(desc)}</p>
              <div class="article-meta">${escapeHtml(pub)}</div>
            </div>
          `;
          articleContainer.appendChild(a);
          a.addEventListener('contextmenu', (e) => { e.preventDefault(); saveBookmarkFromElement(a); });
        });
        return;
      }

      articleContainer.innerHTML = '<p style="text-align:center;color:var(--danger)">No items found or unsupported feed format.</p>';
    } catch (err) {
      console.error('Fetch error', err);
      articleContainer.innerHTML = `<p style="text-align:center;color:var(--danger)">Failed to load feed (${escapeHtml(err.message)})</p>`;
    }
  }

  // ---------- Bookmarks ----------
  function saveBookmarkFromElement(element) {
    if (!bookmarksContainer) return;
    // create a clone and store basic fields
    const title = element.querySelector('.article-content h2')?.textContent || '';
    const desc = element.querySelector('.article-content p')?.textContent || '';
    const href = element.href || '#';

    // prevent duplicates by href
    const exists = Array.from(bookmarksContainer.querySelectorAll('a')).some(a => a.href === href);
    if (exists) {
      alert('Already bookmarked.');
      return;
    }

    const card = document.createElement('a');
    card.className = 'article-card';
    card.href = href;
    card.target = '_blank';
    card.rel = 'noopener noreferrer';
    card.innerHTML = `
      <div class="article-image" style="background:#fff8dc"></div>
      <div class="article-content"><h2>${escapeHtml(title)}</h2><p>${escapeHtml(desc.slice(0,120))}</p></div>
    `;
    bookmarksContainer.prepend(card);
  }

  // ---------- Add / Delete feeds ----------
  function addFeed(name, url) {
    const n = (name || '').trim();
    const u = normalizeUrl((url || '').trim());
    if (!u) { alert('Please enter a valid URL'); return false; }
    feeds.push({ name: n || u, url: u });
    saveFeedsToStorage();
    renderFeeds();
    return true;
  }

  function deleteFeedAt(index) {
    if (index < DEFAULT_FEEDS.length) { alert('Cannot delete default feed'); return; }
    feeds.splice(index,1);
    saveFeedsToStorage();
    renderFeeds();
  }

  // ---------- Event wiring ----------
  function wireEvents() {
    // sidebar feed click (delegation)
    feedList.addEventListener('click', (e) => {
      const item = e.target.closest('.feed-item');
      if (!item) return;
      const idx = Number(item.dataset.index);
      const delBtn = e.target.closest('.delete-feed');
      if (delBtn) {
        e.stopPropagation();
        deleteFeedAt(idx);
        const first = document.querySelector('.feed-item');
        if (first) {
          const firstIdx = Number(first.dataset.index);
          fetchAndShow(feeds[firstIdx].url, first);
        } else {
          if (articleContainer) articleContainer.innerHTML = '<p style="text-align:center">No feeds available.</p>';
        }
        return;
      }
      fetchAndShow(feeds[idx].url, item);
      // close sidebar on small screens
      if (window.innerWidth < 760 && sidebar) sidebar.classList.remove('open');
    });

    // Add feed
    if (addFeedBtn) addFeedBtn.addEventListener('click', () => addFeedModal.classList.remove('hidden'));
    if (cancelFeedBtn) cancelFeedBtn.addEventListener('click', () => addFeedModal.classList.add('hidden'));
    if (saveFeedBtn) saveFeedBtn.addEventListener('click', () => {
      const name = (feedNameInput?.value || '').trim();
      const url = (feedUrlInput?.value || '').trim();
      if (!url) { alert('Enter a feed URL'); return; }
      const ok = addFeed(name, url);
      if (ok) {
        feedNameInput.value = ''; feedUrlInput.value = '';
        addFeedModal.classList.add('hidden');
        renderFeeds();
      }
    });

    // How-to
    if (howToBtn) howToBtn.addEventListener('click', () => howToModal.classList.remove('hidden'));
    if (closeHowToBtn) closeHowToBtn.addEventListener('click', () => howToModal.classList.add('hidden'));

    // Reset
    if (resetFeedsBtn) resetFeedsBtn.addEventListener('click', () => {
      if (!confirm('Reset to default feeds? This will remove custom feeds.')) return;
      feeds = DEFAULT_FEEDS.slice();
      saveFeedsToStorage();
      renderFeeds();
      const first = document.querySelector('.feed-item');
      if (first) fetchAndShow(feeds[Number(first.dataset.index)].url, first);
    });

    // theme toggle
    if (toggleDarkBtn) toggleDarkBtn.addEventListener('click', () => {
      const isDark = document.body.classList.toggle('dark-mode');
      localStorage.setItem(THEME_KEY, isDark ? 'dark' : 'light');
    });

    // sidebar hamburger
    if (sidebarToggle) sidebarToggle.addEventListener('click', () => {
      sidebar.classList.toggle('open');
    });

    // keyboard escape closes modals
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        addFeedModal.classList.add('hidden');
        howToModal.classList.add('hidden');
        if (sidebar) sidebar.classList.remove('open');
      }
    });
  }

  // ---------- Init ----------
  function init() {
    // restore feeds safely
    const stored = loadFeedsFromStorage();
    if (stored && stored.length > 0) feeds = stored;
    else {
      feeds = DEFAULT_FEEDS.slice(); // clone
      saveFeedsToStorage();
    }

    // assign dataset indices for render step
    renderFeeds();

    // wire events after render
    // ensure feed-item nodes have data-index
    Array.from(document.querySelectorAll('.feed-item')).forEach((el, idx) => { el.dataset.index = idx; });

    wireEvents();

    // set theme
    setThemeFromStorage();

    // load first feed
    const first = document.querySelector('.feed-item');
    if (first) {
      fetchAndShow(feeds[Number(first.dataset.index)].url, first);
    } else {
      if (articleContainer) articleContainer.innerHTML = '<p style="text-align:center">No feeds available. Add one with ➕</p>';
    }
  }

  // run
  init();

});
