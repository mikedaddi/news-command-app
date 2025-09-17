// DEEVO — script.js
// Single-file app logic (feeds, bookmarks, add/delete, default, fetch, parse, UI)

document.addEventListener('DOMContentLoaded', () => {

  /* ---------- DOM ---------- */
  const feedList = document.getElementById('feed-list');
  const articleContainer = document.getElementById('article-container');
  const addFeedBtn = document.getElementById('add-feed-btn');
  const addFeedModal = document.getElementById('add-feed-modal');
  const saveFeedBtn = document.getElementById('save-feed-btn');
  const cancelFeedBtn = document.getElementById('cancel-feed-btn');
  const feedNameInput = document.getElementById('feed-name-input');
  const feedUrlInput = document.getElementById('feed-url-input');

  const resetFeedsBtn = document.getElementById('reset-feeds-btn');
  const setDefaultBtn = document.getElementById('set-default-btn');

  const bookmarksBtn = document.getElementById('bookmarks-btn');
  const bookmarksModal = document.getElementById('bookmarks-modal');
  const closeBookmarksBtn = document.getElementById('close-bookmarks-btn');
  const clearBookmarksBtn = document.getElementById('clear-bookmarks-btn');
  const bookmarksList = document.getElementById('bookmarks');

  const searchForm = document.getElementById('search-form');
  const searchInput = document.getElementById('search-input');

  const CORS_PROXY = 'https://api.allorigins.win/raw?url=';

  /* ---------- State & Defaults ---------- */
  const DEFAULT_FEEDS = [
    { name: "BBC World News", url: "https://feeds.bbci.co.uk/news/world/rss.xml" },
    { name: "ABC News (US)", url: "https://abcnews.go.com/abcnews/topstories" },
    { name: "Fox News", url: "https://feeds.foxnews.com/foxnews/latest" },
    { name: "TMZ Entertainment", url: "https://www.tmz.com/rss.xml" },
    { name: "TechCrunch", url: "https://techcrunch.com/feed/" },
    { name: "Wired Tech", url: "https://www.wired.com/feed/rss" },
    { name: "AccuWeather News", url: "https://rss.accuweather.com/rss/top-stories" },
    { name: "The Hollywood Reporter", url: "https://www.hollywoodreporter.com/c/news/feed" },
    { name: "ET Online Entertainment", url: "https://www.etonline.com/news/rss" }
  ];

  let feeds = [];
  let bookmarks = [];

  /* ---------- Utilities ---------- */
  function saveFeeds() { localStorage.setItem('deevoFeeds', JSON.stringify(feeds)); }
  function loadFeeds() {
    const saved = localStorage.getItem('deevoFeeds');
    if (saved) feeds = JSON.parse(saved);
    else {
      // if user has a chosen default stored, use that; otherwise default to DEFAULT_FEEDS
      const savedDefault = localStorage.getItem('deevoDefaultFeeds');
      feeds = savedDefault ? JSON.parse(savedDefault) : DEFAULT_FEEDS.slice();
      saveFeeds();
    }
  }

  function saveBookmarks() { localStorage.setItem('deevoBookmarks', JSON.stringify(bookmarks)); }
  function loadBookmarks() {
    const saved = localStorage.getItem('deevoBookmarks');
    bookmarks = saved ? JSON.parse(saved) : [];
  }

  function formatDate(dateStr) {
    try {
      const d = new Date(dateStr);
      if (!isNaN(d)) return d.toLocaleDateString();
    } catch (e) {}
    return '';
  }

  /* ---------- Render Feeds ---------- */
  function renderFeedList() {
    feedList.innerHTML = '';
    feeds.forEach((f, i) => {
      const el = document.createElement('div');
      el.className = 'feed-item';
      el.dataset.index = i;
      el.dataset.url = f.url;
      el.innerHTML = `<div class="name">${escapeHtml(f.name)}</div>
                      <div class="actions">
                        <button class="delete-feed-btn" title="Remove feed"><i class="fas fa-times-circle"></i></button>
                      </div>`;
      feedList.appendChild(el);
    });
  }

  /* ---------- Feed Fetch & Parse ---------- */
  async function fetchAndDisplayFeed(url, feedEl) {
    articleContainer.innerHTML = `<p class="loading-note">Loading...</p>`;
    // highlight active
    document.querySelectorAll('.feed-item').forEach(n => n.classList.remove('active-feed'));
    if (feedEl) feedEl.classList.add('active-feed');

    try {
      const res = await fetch(`${CORS_PROXY}${encodeURIComponent(url)}`);
      if (!res.ok) throw new Error(`Network error ${res.status}`);
      const xmlText = await res.text();

      const parser = new DOMParser();
      const xml = parser.parseFromString(xmlText, "application/xml");
      const items = xml.querySelectorAll('item');

      if (!items || items.length === 0) {
        articleContainer.innerHTML = `<p class="loading-note">No articles found for this feed.</p>`;
        return;
      }

      articleContainer.innerHTML = '';
      items.forEach(item => {
        const title = item.querySelector('title')?.textContent?.trim() || 'No title';
        const link = item.querySelector('link')?.textContent?.trim() || item.querySelector('guid')?.textContent?.trim() || '#';
        let description = item.querySelector('description')?.textContent || item.querySelector('content\\:encoded')?.textContent || '';
        description = description.replace(/<[^>]*>/g, '').trim().slice(0, 320);

        // detect image - common patterns
        let image = '';
        const enclosure = item.querySelector('enclosure[url]');
        if (enclosure && enclosure.getAttribute('url')) image = enclosure.getAttribute('url');
        if (!image) {
          const media = item.querySelector('media\\:content, media\\:thumbnail, thumbnail, image');
          if (media && media.getAttribute && media.getAttribute('url')) image = media.getAttribute('url');
          if (!image && media && media.textContent && /https?:\/\//.test(media.textContent)) image = media.textContent.trim();
        }
        // fallback - sometimes <image><url> inside channel
        if (!image) {
          const imgInDesc = (item.querySelector('description')?.textContent || '').match(/<img[^>]+src="([^">]+)"/i);
          if (imgInDesc && imgInDesc[1]) image = imgInDesc[1];
        }

        const pubDate = formatDate(item.querySelector('pubDate')?.textContent || item.querySelector('dc\\:date')?.textContent || '');

        const card = document.createElement('article');
        card.className = 'article-card';

        // image
        const imgHtml = image ? `<img class="article-image" src="${escapeAttr(image)}" alt="thumb">` : `<div style="width:160px;height:100px;border-radius:8px;background:#0e0f10;"></div>`;

        // inner HTML
        card.innerHTML = `
          ${imgHtml}
          <div class="article-content">
            <h3 class="article-title"><a href="${escapeAttr(link)}" target="_blank" rel="noopener noreferrer">${escapeHtml(title)}</a></h3>
            <p class="article-desc">${escapeHtml(description)}${description.length >= 320 ? '…' : ''}</p>
            <div class="article-meta">
              <span>${escapeHtml(pubDate)}</span>
            </div>
          </div>
          <div class="article-tools">
            <button class="share-btn" title="Share"><i class="fas fa-share-alt"></i></button>
            <button class="bookmark-btn" title="Bookmark"><i class="fas fa-bookmark"></i></button>
          </div>
        `;

        // attach handlers for share/bookmark
        const shareBtn = card.querySelector('.share-btn');
        shareBtn.addEventListener('click', async () => {
          if (navigator.share) {
            try {
              await navigator.share({ title, url: link });
            } catch (e) { /* user cancelled */ }
          } else {
            // fallback: copy to clipboard
            try {
              await navigator.clipboard.writeText(link);
              alert('Link copied to clipboard — paste into your social app to share.');
            } catch (err) {
              window.open(link, '_blank');
            }
          }
        });

        const bookmarkBtn = card.querySelector('.bookmark-btn');
        bookmarkBtn.addEventListener('click', () => {
          bookmarks.unshift({ title, link, description, image, pubDate });
          saveBookmarks();
          renderBookmarks();
          alert('Saved to Bookmarks');
        });

        articleContainer.appendChild(card);
      });

    } catch (err) {
      console.error('Fetch error', err);
      articleContainer.innerHTML = `<p class="loading-note">Failed to load feed — it may be blocked or invalid.</p>`;
    }
  }

  /* ---------- Bookmarks ---------- */
  function renderBookmarks() {
    bookmarksList.innerHTML = '';
    if (!bookmarks || bookmarks.length === 0) {
      bookmarksList.innerHTML = '<p style="color:#cfd6d9;">No bookmarks yet.</p>';
      return;
    }
    bookmarks.forEach((b, i) => {
      const node = document.createElement('div');
      node.className = 'article-card';
      node.style.alignItems = 'center';
      node.innerHTML = `
        ${b.image ? `<img class="article-image" src="${escapeAttr(b.image)}" alt="">` : `<div style="width:120px;height:80px;border-radius:8px;background:#0e0f10;"></div>`}
        <div style="flex:1;padding-right:12px;">
          <h4 style="margin:0;"><a href="${escapeAttr(b.link)}" target="_blank">${escapeHtml(b.title)}</a></h4>
          <p style="margin:6px 0;color:#bfc8cc;">${escapeHtml((b.description||'').slice(0,180))}${(b.description||'').length>180?'…':''}</p>
          <small style="color:var(--muted)">${escapeHtml(b.pubDate||'')}</small>
        </div>
        <div style="display:flex;flex-direction:column;gap:8px;">
          <button class="btn" data-index="${i}" title="Open"><i class="fas fa-external-link-alt"></i></button>
          <button class="btn danger" data-remove="${i}" title="Remove"><i class="fas fa-trash"></i></button>
        </div>
      `;
      bookmarksList.appendChild(node);
    });

    // attach remove handlers
    bookmarksList.querySelectorAll('[data-remove]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const idx = parseInt(btn.getAttribute('data-remove'), 10);
        bookmarks.splice(idx, 1);
        saveBookmarks();
        renderBookmarks();
      });
    });
  }

  /* ---------- Feed add/delete/reset/default ---------- */
  function addFeed(name, url) {
    feeds.unshift({ name, url });
    saveFeeds();
    renderFeedList();
  }

  function removeFeed(index) {
    feeds.splice(index, 1);
    saveFeeds();
    renderFeedList();
  }

  function setAsDefault() {
    localStorage.setItem('deevoDefaultFeeds', JSON.stringify(feeds));
    alert('Current feeds saved as default.');
  }

  function resetToDefault() {
    const stored = localStorage.getItem('deevoDefaultFeeds');
    feeds = stored ? JSON.parse(stored) : DEFAULT_FEEDS.slice();
    saveFeeds();
    renderFeedList();
    // auto-load first
    const first = document.querySelector('.feed-item');
    if (first) fetchAndDisplayFeed(first.dataset.url, first);
  }

  /* ---------- Helper: escape to avoid raw HTML injection in innerHTML usage ---------- */
  function escapeHtml(str='') {
    return String(str).replace(/[&<>"']/g, s => ({
      '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
    }[s]));
  }
  function escapeAttr(s='') { return escapeHtml(s); }

  /* ---------- Attach UI events ---------- */
  // feed list clicks
  feedList.addEventListener('click', (e) => {
    const item = e.target.closest('.feed-item');
    if (!item) return;

    // delete clicked?
    if (e.target.closest('.delete-feed-btn')) {
      const idx = Number(item.dataset.index);
      if (!Number.isNaN(idx)) {
        if (confirm('Remove this feed?')) {
          removeFeed(idx);
          // reload first feed
          const first = document.querySelector('.feed-item');
          if (first) fetchAndDisplayFeed(first.dataset.url, first);
        }
      }
      return;
    }

    const url = item.dataset.url;
    fetchAndDisplayFeed(url, item);
  });

  // add feed modal
  addFeedBtn.addEventListener('click', () => {
    feedNameInput.value = '';
    feedUrlInput.value = '';
    addFeedModal.classList.remove('hidden');
  });
  cancelFeedBtn.addEventListener('click', () => addFeedModal.classList.add('hidden'));
  saveFeedBtn.addEventListener('click', () => {
    const name = feedNameInput.value.trim();
    const url = feedUrlInput.value.trim();
    if (!name || !url) { alert('Please enter both name and URL'); return; }
    addFeed(name, url);
    addFeedModal.classList.add('hidden');
  });

  // reset & default
  resetFeedsBtn.addEventListener('click', () => {
    if (confirm('Reset to your saved default feeds?')) resetToDefault();
  });
  setDefaultBtn.addEventListener('click', () => {
    setAsDefault();
  });

  // bookmarks modal
  bookmarksBtn.addEventListener('click', () => {
    loadBookmarks();
    renderBookmarks();
    bookmarksModal.classList.remove('hidden');
  });
  closeBookmarksBtn.addEventListener('click', () => bookmarksModal.classList.add('hidden'));
  clearBookmarksBtn.addEventListener('click', () => {
    if (confirm('Clear all bookmarks?')) {
      bookmarks = []; saveBookmarks(); renderBookmarks();
    }
  });

  // search form -> DuckDuckGo
  searchForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const q = searchInput.value.trim();
    if (!q) return;
    window.open(`https://duckduckgo.com/?q=${encodeURIComponent(q)}`, '_blank');
  });

  /* ---------- Init app ---------- */
  function initialize() {
    loadBookmarks();
    loadFeeds();
    renderFeedList();
    // auto-load first feed
    const first = document.querySelector('.feed-item');
    if (first) fetchAndDisplayFeed(first.dataset.url, first);
  }

  // small compatibility: ensure DEFAULT_FEEDS variable available (if reset used previously)
  if (typeof DEFAULT_FEEDS === 'undefined') window.DEFAULT_FEEDS = DEFAULT_FEEDS = DEFAULT_FEEDS || [];

  // start
  initialize();

});
