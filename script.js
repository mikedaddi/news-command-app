// News Command Center - script.js
// Drop-in ready. Uses AllOrigins CORS proxy for RSS fetching.

document.addEventListener('DOMContentLoaded', () => {
  // DOM references
  const feedList = document.getElementById('feed-list');
  const articleContainer = document.getElementById('article-container');
  const addFeedBtn = document.getElementById('add-feed-btn');
  const addFeedModal = document.getElementById('add-feed-modal');
  const saveFeedBtn = document.getElementById('save-feed-btn');
  const cancelFeedBtn = document.getElementById('cancel-feed-btn');
  const howToBtn = document.getElementById('how-to-btn');
  const howToModal = document.getElementById('how-to-modal');
  const closeHowToBtn = document.getElementById('close-how-to-btn');
  const bookmarksBtn = document.getElementById('bookmarks-btn');
  const bookmarksModal = document.getElementById('bookmarks-modal');
  const closeBookmarksBtn = document.getElementById('close-bookmarks-btn');
  const bookmarksContainer = document.getElementById('bookmarks');
  const resetBtn = document.getElementById('reset-btn');
  const feedSearch = document.getElementById('feed-search');
  const globalSearch = document.getElementById('global-search');
  const searchBtn = document.getElementById('search-btn');
  const toastEl = document.getElementById('toast');

  const CORS = 'https://api.allorigins.win/raw?url='; // proxy
  const FEED_KEY = 'commandCenterFeeds';
  const BMARK_KEY = 'commandCenterBookmarks';

  // Default feed list (includes your requested feeds)
  const DEFAULT_FEEDS = [
    { name: "BBC World News", url: "https://feeds.bbci.co.uk/news/world/rss.xml" },
    { name: "ABC News (US)", url: "https://abcnews.go.com/abcnews/topstories" },
    { name: "Fox News", url: "https://feeds.foxnews.com/foxnews/latest" },
    { name: "TMZ Entertainment", url: "https://www.tmz.com/rss.xml" },
    { name: "TechCrunch", url: "https://techcrunch.com/feed/" },
    { name: "National Weather Service News", url: "https://www.weather.gov/rss/" },
    { name: "The Hollywood Reporter", url: "https://hollywoodreporter.com/c/news/feed/" },
    { name: "HuffPost Entertainment", url: "https://www.huffpost.com/entertainment/feed" }
  ];

  // State
  let feeds = [];
  let bookmarks = [];

  // ----------------------
  // Utilities
  // ----------------------
  function showToast(msg, timeout = 2200) {
    toastEl.textContent = msg;
    toastEl.classList.remove('hidden');
    toastEl.classList.add('visible');
    setTimeout(() => {
      toastEl.classList.remove('visible');
      toastEl.classList.add('hidden');
    }, timeout);
  }

  function safeText(s) { return (s || '').toString().trim(); }

  // extract link from RSS item (handles <link href=...> or <link>text</link>)
  function extractLink(item) {
    const linkNode = item.querySelector('link');
    if (!linkNode) return '#';
    // prefer href attribute
    const href = linkNode.getAttribute && (linkNode.getAttribute('href') || linkNode.getAttribute('url'));
    if (href) return href;
    // sometimes link text node holds url
    const text = linkNode.textContent && linkNode.textContent.trim();
    if (text && text.startsWith('http')) return text;
    // for Atom <link rel="alternate" href="...">
    const alt = item.querySelector('link[rel="alternate"]');
    if (alt && alt.getAttribute('href')) return alt.getAttribute('href');
    return text || '#';
  }

  // extract thumbnail from common tags or inside description <img>
  function extractThumbnail(item) {
    const media = item.querySelector('media\\:content, enclosure, media\\:thumbnail, image');
    if (media) {
      const url = media.getAttribute('url') || media.getAttribute('src') || media.textContent;
      if (url) return url;
    }
    // try to parse <img> inside description
    const desc = item.querySelector('description')?.textContent || item.querySelector('summary')?.textContent || '';
    const m = desc.match(/<img[^>]+src=["']([^"']+)["']/i);
    if (m && m[1]) return m[1];
    return '';
  }

  // ----------------------
  // Bookmarks
  // ----------------------
  function loadBookmarks() {
    try {
      bookmarks = JSON.parse(localStorage.getItem(BMARK_KEY)) || [];
    } catch {
      bookmarks = [];
    }
  }

  function saveBookmarks() {
    localStorage.setItem(BMARK_KEY, JSON.stringify(bookmarks));
  }

  function renderBookmarks() {
    bookmarksContainer.innerHTML = '';
    if (!bookmarks.length) {
      bookmarksContainer.innerHTML = '<p class="muted">No bookmarks yet.</p>';
      return;
    }
    bookmarks.forEach((b, idx) => {
      const div = document.createElement('div');
      div.className = 'bookmark-item';
      div.innerHTML = `
        <div class="bm-left">
          ${b.thumb ? `<img src="${b.thumb}" alt="thumb">` : `<div class="bm-placeholder"></div>`}
        </div>
        <div class="bm-body">
          <a href="${b.link}" target="_blank" class="bm-title">${escapeHtml(b.title)}</a>
          <p class="bm-desc">${escapeHtml((b.desc || '').substring(0,160))}</p>
        </div>
        <div class="bm-actions">
          <button class="btn small remove-bm" data-idx="${idx}">Remove</button>
        </div>
      `;
      bookmarksContainer.appendChild(div);
    });
    // attach remove handlers
    bookmarksContainer.querySelectorAll('.remove-bm').forEach(btn => {
      btn.addEventListener('click', () => {
        const i = Number(btn.dataset.idx);
        bookmarks.splice(i, 1);
        saveBookmarks();
        renderBookmarks();
        showToast('Bookmark removed');
      });
    });
  }

  // ----------------------
  // Feeds persistance & UI
  // ----------------------
  function saveFeeds() {
    localStorage.setItem(FEED_KEY, JSON.stringify(feeds));
  }

  function loadFeeds() {
    try {
      const s = localStorage.getItem(FEED_KEY);
      if (s) {
        feeds = JSON.parse(s);
        // if saved is empty array, fallback to defaults
        if (!Array.isArray(feeds) || feeds.length === 0) feeds = DEFAULT_FEEDS.slice();
      } else {
        feeds = DEFAULT_FEEDS.slice();
        saveFeeds();
      }
    } catch {
      feeds = DEFAULT_FEEDS.slice();
      saveFeeds();
    }
  }

  function restoreDefaultFeeds() {
    feeds = DEFAULT_FEEDS.slice();
    saveFeeds();
    renderFeedList();
    // load first feed
    const first = document.querySelector('.feed-item');
    if (first) fetchAndDisplayFeed(first.dataset.url, first);
    showToast('Default feeds restored');
  }

  function renderFeedList(filter = '') {
    feedList.innerHTML = '';
    feeds.forEach((f, idx) => {
      if (filter && !f.name.toLowerCase().includes(filter.toLowerCase())) return;
      const el = document.createElement('div');
      el.className = 'feed-item';
      el.dataset.index = idx;
      el.dataset.url = f.url;
      el.innerHTML = `
        <div class="feed-name">${escapeHtml(f.name)}</div>
        <div class="feed-controls">
          <button class="delete-feed" title="Remove feed">&times;</button>
        </div>
      `;
      feedList.appendChild(el);
    });
  }

  // ----------------------
  // Fetch / Render articles
  // ----------------------
  async function fetchAndDisplayFeed(feedUrl, feedElement = null) {
    articleContainer.innerHTML = '<div class="loading-spinner" aria-hidden="true"></div>';
    // set active feed highlight
    document.querySelectorAll('.feed-item').forEach(it => it.classList.remove('active-feed'));
    if (feedElement) feedElement.classList.add('active-feed');

    try {
      const res = await fetch(CORS + encodeURIComponent(feedUrl));
      if (!res.ok) throw new Error(`Network ${res.status}`);
      const text = await res.text();
      const xml = new window.DOMParser().parseFromString(text, 'text/xml');

      // get items (RSS) or entries (Atom)
      const items = Array.from(xml.querySelectorAll('item, entry')).slice(0, 12);
      if (!items.length) {
        articleContainer.innerHTML = '<p class="muted">No articles found in this feed.</p>';
        return;
      }

      articleContainer.innerHTML = ''; // clear
      items.forEach(it => {
        const title = safeText(it.querySelector('title')?.textContent) || 'No title';
        const link = extractLink(it) || '#';
        const descRaw = it.querySelector('description')?.textContent || it.querySelector('summary')?.textContent || '';
        const desc = descRaw.replace(/<[^>]+>/g, '').trim().substring(0, 300);
        const pub = (it.querySelector('pubDate')?.textContent || it.querySelector('updated')?.textContent || '');
        const date = pub ? new Date(pub).toLocaleDateString() : '';
        const thumb = extractThumbnail(it);

        const card = document.createElement('article');
        card.className = 'article-card';
        card.innerHTML = `
          <div class="card-thumb">${thumb ? `<img src="${thumb}" alt="thumb">` : `<div class="thumb-placeholder"></div>`}</div>
          <div class="card-body">
            <a class="article-title" href="${escapeHtml(link)}" target="_blank" rel="noopener noreferrer">${escapeHtml(title)}</a>
            <p class="article-desc">${escapeHtml(desc)}${desc.length >= 300 ? '…' : ''}</p>
            <div class="article-meta">
              <span class="pub-date">${escapeHtml(date)}</span>
              <div class="actions">
                <button class="btn share" title="Share"><i class="fas fa-share-alt"></i></button>
                <button class="btn bookmark" title="Bookmark"><i class="fas fa-bookmark"></i></button>
              </div>
            </div>
          </div>
        `;
        // add event handlers
        const shareBtn = card.querySelector('.share');
        shareBtn.addEventListener('click', async () => {
          try {
            if (navigator.share) {
              await navigator.share({ title, text: desc, url: link });
            } else {
              await navigator.clipboard.writeText(link);
              showToast('Link copied to clipboard');
            }
          } catch (err) {
            showToast('Sharing failed');
            console.error(err);
          }
        });

        const bookmarkBtn = card.querySelector('.bookmark');
        bookmarkBtn.addEventListener('click', () => {
          // avoid duplicates by link
          if (bookmarks.some(b => b.link === link)) {
            showToast('Already bookmarked');
            return;
          }
          bookmarks.unshift({ title, link, desc, thumb });
          saveBookmarks();
          renderBookmarks();
          showToast('Bookmarked');
        });

        articleContainer.appendChild(card);
      });

    } catch (err) {
      console.error('Feed load error', err);
      articleContainer.innerHTML = `<p class="muted">Failed to load feed: ${escapeHtml(err.message)}</p>`;
    }
  }

  // ----------------------
  // Helpers for escaping
  // ----------------------
  function escapeHtml(s) {
    if (!s) return '';
    return s.replace(/[&<>"']/g, function (m) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[m];
    });
  }

  // ----------------------
  // Event wiring
  // ----------------------
  // open add modal
  addFeedBtn.addEventListener('click', () => {
    addFeedModal.classList.remove('hidden');
  });
  // cancel add modal
  cancelFeedBtn.addEventListener('click', () => {
    addFeedModal.classList.add('hidden');
    document.getElementById('feed-name-input').value = '';
    document.getElementById('feed-url-input').value = '';
  });

  // save new feed
  saveFeedBtn.addEventListener('click', () => {
    const name = document.getElementById('feed-name-input').value.trim();
    const url = document.getElementById('feed-url-input').value.trim();
    if (!name || !url) { showToast('Provide both name and URL'); return; }
    // basic validation
    if (!/^https?:\/\//i.test(url)) { showToast('Feed URL should start with http:// or https://'); return; }
    feeds.push({ name, url });
    saveFeeds();
    renderFeedList(feedSearch.value.trim());
    addFeedModal.classList.add('hidden');
    document.getElementById('feed-name-input').value = '';
    document.getElementById('feed-url-input').value = '';
    showToast('Feed added');
  });

  // feed list click (delegate)
  feedList.addEventListener('click', (e) => {
    const row = e.target.closest('.feed-item');
    if (!row) return;
    const idx = Number(row.dataset.index);
    // delete clicked?
    if (e.target.closest('.delete-feed')) {
      feeds.splice(idx, 1);
      saveFeeds();
      renderFeedList(feedSearch.value.trim());
      showToast('Feed removed');
      // auto-load first available
      const first = document.querySelector('.feed-item');
      if (first) fetchAndDisplayFeed(first.dataset.url, first);
      else articleContainer.innerHTML = '<p class="muted">No feeds. Add one to begin.</p>';
      return;
    }
    // otherwise load feed
    fetchAndDisplayFeed(row.dataset.url, row);
  });

  // feed filter
  feedSearch.addEventListener('input', () => renderFeedList(feedSearch.value.trim()));

  // how-to modal
  howToBtn.addEventListener('click', () => howToModal.classList.remove('hidden'));
  closeHowToBtn.addEventListener('click', () => howToModal.classList.add('hidden'));

  // bookmarks modal
  bookmarksBtn.addEventListener('click', () => {
    renderBookmarks();
    bookmarksModal.classList.remove('hidden');
  });
  closeBookmarksBtn.addEventListener('click', () => bookmarksModal.classList.add('hidden'));

  // reset to default feeds ONLY
  resetBtn.addEventListener('click', () => {
    restoreDefaultFeeds();
  });

  // duckduckgo search
  searchBtn.addEventListener('click', () => {
    const q = globalSearch.value.trim();
    if (!q) return;
    window.open('https://duckduckgo.com/?q=' + encodeURIComponent(q), '_blank');
  });
  globalSearch.addEventListener('keydown', (e) => { if (e.key === 'Enter') searchBtn.click(); });

  // ----------------------
  // Initialization
  // ----------------------
  function initialize() {
    loadFeeds();
    loadBookmarks();
    renderFeedList();
    const first = document.querySelector('.feed-item');
    if (first) {
      fetchAndDisplayFeed(first.dataset.url, first);
    } else {
      articleContainer.innerHTML = '<p class="muted">No feeds available. Add one from the sidebar.</p>';
    }
  }

  initialize();
});
