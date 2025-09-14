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
  const sidebar = document.getElementById('sidebar');
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
        articleContainer
