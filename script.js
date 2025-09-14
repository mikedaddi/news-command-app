// script.js - upgraded version
document.addEventListener('DOMContentLoaded', () => {
  const CORS_PROXY = 'https://api.allorigins.win/raw?url=';
  const STORAGE_KEY = 'commandCenterFeeds';
  const THEME_KEY = 'commandCenterTheme';

  const DEFAULT_FEEDS = [
    { name: "BBC World News", url: "https://feeds.bbci.co.uk/news/world/rss.xml" },
    { name: "Variety", url: "https://variety.com/feed/" },
    { name: "TechCrunch", url: "https://techcrunch.com/feed/" }
  ];

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
  const searchInput = document.getElementById('search-input');

  let feeds = [];

  const safeParse = (s) => { try { return JSON.parse(s); } catch { return null; } };
  const normalizeUrl = (u) => {
    if (!u) return '';
    u = u.trim();
    if (!/^https?:\/\//i.test(u)) u = 'https://' + u;
    return u.replace(/^http:\/\//i,'https://');
  };
  const escapeHtml = (str = '') => String(str).replace(/[&<>"'\/]/g, s => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;','/':'&#x2F;'
  })[s]);

  function saveFeedsToStorage() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(feeds)); } catch (e) { console.warn('save fail', e); }
  }
  function loadFeedsFromStorage() {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = safeParse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) return null;
    for (const p of parsed) { if (!p || !p.url) return null; }
    return parsed;
  }
  function setThemeFromStorage() {
    const t = localStorage.getItem(THEME_KEY);
    document.body.classList.toggle('dark-mode', t === 'dark');
  }

  function renderFeeds() {
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

  async function fetchAndShow(feedUrl, feedElement = null) {
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
      if (doc.querySelector('parsererror')) {
        articleContainer.innerHTML = '<p style="text-align:center;color:var(--danger)">Feed parse error.</p>';
        return;
      }

      const items = doc.querySelectorAll('item');
      const entries = doc.querySelectorAll('entry');
      const source = items.length ? items : entries;
      if (!source.length) {
        articleContainer.innerHTML = '<p style="text-align:center;color:var(--danger)">No items found.</p>';
        return;
      }

      articleContainer.innerHTML = '';
      source.forEach((node, idx) => {
        if (idx >= 12) return;
        const title = node.querySelector('title')?.textContent || 'No title';
        const link = node.querySelector('link')?.textContent || node.querySelector('link')?.getAttribute('href') || '#';
        let desc = node.querySelector('description')?.textContent || node.querySelector('summary')?.textContent || node.querySelector('content')?.textContent || '';
        desc = desc.replace(/<[^>]+>/g,'').slice(0,240);
        const pub = node.querySelector('pubDate')?.textContent || node.querySelector('updated')?.textContent || node.querySelector('published')?.textContent || '';
        const media = node.querySelector('media\\:content, enclosure, media\\:thumbnail');
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
        a.addEventListener('contextmenu', (e) => { e.preventDefault(); saveBookmarkFromElement(a); });
      });
    } catch (err) {
      console.error('Fetch error', err);
      articleContainer.innerHTML = `<p style="text-align:center;color:var(--danger)">Failed to load feed (${escapeHtml(err.message)})</p>`;
    }
  }

  function saveBookmarkFromElement(element) {
    const title = element.querySelector('.article-content h2')?.textContent || '';
    const desc = element.querySelector('.article-content p')?.textContent || '';
    const href = element.href || '#';
    const exists = Array.from(bookmarksContainer.querySelectorAll('a')).some(a => a.href === href);
    if (exists) { alert('Already bookmarked.'); return; }

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

  function addFeed(name, url) {
    const n = (name || '').trim();
    const u = normalizeUrl((url || '').trim());
    if (!u) { alert('Please enter a valid URL'); return false; }
    feeds.push
