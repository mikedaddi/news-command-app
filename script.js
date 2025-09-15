/* News Command Center - JS
   - Permanent dark mode
   - Sidebar feed list + add/remove
   - Top-centered DuckDuckGo search
   - Article cards with share + bookmark
   - Bookmarks modal overlay
   - Persistence via localStorage
*/

document.addEventListener('DOMContentLoaded', () => {
  // DOM
  const feedListEl = document.getElementById('feed-list');
  const articleWrap = document.getElementById('article-wrap');
  const feedNameEl = document.getElementById('feed-name');
  const feedSubEl = document.getElementById('feed-sub');

  // modals & inputs
  const addModal = document.getElementById('add-modal');
  const addName = document.getElementById('add-name');
  const addUrl = document.getElementById('add-url');
  const addSave = document.getElementById('add-save');
  const addCancel = document.getElementById('add-cancel');

  const howtoBtn = document.getElementById('howto-btn');
  const howtoModal = document.getElementById('howto-modal');
  const howtoClose = document.getElementById('howto-close');

  const bookmarksBtn = document.getElementById('bookmarks-btn');
  const bookmarksModal = document.getElementById('bookmarks-modal');
  const bookmarksClose = document.getElementById('bookmarks-close');
  const bookmarksList = document.getElementById('bookmarks-list');

  const feedFilter = document.getElementById('feed-filter');
  const topSearch = document.getElementById('top-search');
  const topSearchBtn = document.getElementById('top-search-btn');

  const toastEl = document.getElementById('toast');

  // storage keys
  const FEED_KEY = 'ncc_feeds_v3';
  const BMARK_KEY = 'ncc_bmarks_v3';

  // CORS proxy (replace if needed)
  const CORS = 'https://api.allorigins.win/raw?url=';

  // defaults
  const DEFAULT_FEEDS = [
    { name: "BBC World News", url: "https://feeds.bbci.co.uk/news/world/rss.xml" },
    { name: "ABC News (US)", url: "https://feeds.abcnews.com/abcnews/topstories" },
    { name: "Fox News", url: "https://feeds.foxnews.com/foxnews/latest" },
    { name: "TMZ Entertainment", url: "https://www.tmz.com/rss.xml" },
    { name: "Variety", url: "https://variety.com/feed/" },
    { name: "TechCrunch", url: "https://techcrunch.com/feed/" }
  ];

  let feeds = [];
  let bookmarks = [];

  // toast helper
  function toast(msg, t = 1800) {
    toastEl.textContent = msg;
    toastEl.classList.remove('hidden');
    setTimeout(() => toastEl.classList.add('hidden'), t);
  }

  // load / save
  function loadState() {
    try {
      const f = JSON.parse(localStorage.getItem(FEED_KEY) || 'null');
      feeds = Array.isArray(f) && f.length ? f : DEFAULT_FEEDS.slice();
    } catch (e) { feeds = DEFAULT_FEEDS.slice(); }

    try {
      const b = JSON.parse(localStorage.getItem(BMARK_KEY) || 'null');
      bookmarks = Array.isArray(b) ? b : [];
    } catch (e) { bookmarks = []; }
  }
  function saveState() {
    localStorage.setItem(FEED_KEY, JSON.stringify(feeds));
    localStorage.setItem(BMARK_KEY, JSON.stringify(bookmarks));
  }

  // render feeds list (with optional filter)
  function renderFeeds(filter = '') {
    feedListEl.innerHTML = '';
    feeds.forEach((f, idx) => {
      if (filter && !f.name.toLowerCase().includes(filter.toLowerCase())) return;
      const item = document.createElement('div');
      item.className = 'feed-item';
      item.dataset.idx = idx;
      item.innerHTML = `<div class="name">${escapeHtml(f.name)}</div>
                        <div class="actions"><i class="fa fa-times" data-idx="${idx}" title="Remove feed"></i></div>`;
      feedListEl.appendChild(item);
    });
  }

  // safe escape for text
  function escapeHtml(s){ return String(s).replace(/[&<>"']/g, (m) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }

  // parse and display feed
  async function loadFeed(index) {
    const f = feeds[index];
    if (!f) return;
    feedNameEl.textContent = f.name;
    feedSubEl.textContent = f.url;
    articleWrap.innerHTML = `<div class="placeholder">Loading ${f.name}...</div>`;

    try {
      const res = await fetch(CORS + encodeURIComponent(f.url));
      if (!res.ok) throw new Error('Network ' + res.status);
      const txt = await res.text();
      const xml = new DOMParser().parseFromString(txt, 'application/xml');
      if (xml.querySelector('parsererror')) throw new Error('Invalid feed XML');

      const items = xml.querySelectorAll('item, entry');
      if (!items || items.length === 0) {
        articleWrap.innerHTML = `<div class="placeholder">No items found in this feed.</div>`;
        return;
      }

      // build cards
      articleWrap.innerHTML = '';
      items.forEach((it, i) => {
        if (i >= 12) return; // limit
        const title = (it.querySelector('title')?.textContent || it.querySelector('title')?.textContent || 'No title').trim();
        const linkNode = it.querySelector('link');
        let link = linkNode ? (linkNode.getAttribute ? (linkNode.getAttribute('href') || linkNode.textContent) : linkNode.textContent) : (it.querySelector('link')?.textContent || '#');
        const desc = (it.querySelector('description')?.textContent || it.querySelector('summary')?.textContent || '').replace(/<[^>]+>/g, '').trim();
        const pubraw = it.querySelector('pubDate')?.textContent || it.querySelector('updated')?.textContent || '';
        const pub = pubraw ? (new Date(pubraw).toLocaleDateString()) : '';

        const card = document.createElement('div');
        card.className = 'article-card';
        card.innerHTML = `
          <div class="article-left">
            <a class="article-title" href="${escapeHtml(link)}" target="_blank" rel="noopener noreferrer">${escapeHtml(title)}</a>
            <p class="article-desc">${escapeHtml(desc.substring(0, 220))}${desc.length > 220 ? '…' : ''}</p>
            <div class="article-meta-row">${escapeHtml(pub)}</div>
          </div>
          <div class="article-actions">
            <button class="icon-btn share-btn" title="Share"><i class="fa fa-share-alt"></i></button>
            <button class="icon-btn bookmark-btn" title="Bookmark"><i class="fa fa-bookmark"></i></button>
          </div>
        `;
        // share handler
        card.querySelector('.share-btn').addEventListener('click', (e) => {
          e.stopPropagation();
          // small share modal approach: copy & tweet
          navigator.clipboard.writeText(link).then(()=> toast('Link copied to clipboard'));
          // open twitter in new window prefilled
          const tweet = `Check this out: ${title} ${link}`;
          window.open('https://twitter.com/intent/tweet?text=' + encodeURIComponent(tweet), '_blank');
        });

        // bookmark handler
        card.querySelector('.bookmark-btn').addEventListener('click', (e) => {
          e.stopPropagation();
          addBookmark({ title, link, desc: desc.substring(0, 240), date: pub });
        });

        articleWrap.appendChild(card);
      });

    } catch (err) {
      console.error('feed error', err);
      articleWrap.innerHTML = `<div class="placeholder">Failed to load feed — ${err.message}</div>`;
    }
  }

  // add bookmark
  function addBookmark(obj) {
    if (!obj || !obj.link) return;
    if (bookmarks.some(b => b.link === obj.link)) { toast('Already bookmarked'); return; }
    bookmarks.unshift(obj);
    saveState();
    toast('Saved to bookmarks');
  }

  // render bookmarks modal
  function renderBookmarks() {
    bookmarksList.innerHTML = '';
    if (!bookmarks.length) { bookmarksList.innerHTML = '<div class="placeholder">No bookmarks yet.</div>'; return; }
    bookmarks.forEach((b, idx) => {
      const it = document.createElement('div');
      it.className = 'bookmark-item';
      it.innerHTML = `<div>
                        <a href="${escapeHtml(b.link)}" target="_blank">${escapeHtml(b.title)}</a>
                        <p>${escapeHtml(b.desc || '').substring(0,120)}${(b.desc||'').length>120 ? '…' : ''}</p>
                      </div>
                      <div><button class="btn ghost remove-bm" data-idx="${idx}">Remove</button></div>`;
      bookmarksList.appendChild(it);
    });
    // attach remove handlers
    bookmarksList.querySelectorAll('.remove-bm').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = Number(btn.dataset.idx);
        bookmarks.splice(idx, 1);
        saveState();
        renderBookmarks();
        toast('Bookmark removed');
      });
    });
  }

  // Add feed flow
  document.getElementById('add-feed-btn').addEventListener('click', () => { addModal.classList.remove('hidden'); });
  addCancel.addEventListener('click', () => { addModal.classList.add('hidden'); addName.value=''; addUrl.value=''; });
  addSave.addEventListener('click', () => {
    const name = (addName.value || '').trim();
    const url = (addUrl.value || '').trim();
    if (!url) { alert('Please paste a valid feed URL'); return; }
    feeds.push({ name: name || url, url });
    saveState();
    renderFeeds(feedFilter.value);
    addModal.classList.add('hidden'); addName.value=''; addUrl.value='';
    toast('Feed added');
  });

  // how-to modal
  howtoBtn.addEventListener('click', ()=> howtoModal.classList.remove('hidden'));
  howtoClose.addEventListener('click', ()=> howtoModal.classList.add('hidden'));

  // bookmarks modal
  bookmarksBtn.addEventListener('click', ()=> { renderBookmarks(); bookmarksModal.classList.remove('hidden'); });
  bookmarksClose.addEventListener('click', ()=> bookmarksModal.classList.add('hidden'));

  // remove feed click (delegate)
  feedListEl.addEventListener('click', (ev) => {
    const feedItem = ev.target.closest('.feed-item');
    if (!feedItem) return;
    // if clicked remove icon
    if (ev.target.matches('.fa-times')) {
      const idx = Number(ev.target.dataset.idx);
      if (!Number.isNaN(idx)) {
        if (!confirm('Remove this feed?')) return;
        feeds.splice(idx, 1);
        saveState();
        renderFeeds(feedFilter.value);
        toast('Feed removed');
        return;
      }
    }
    // else open feed
    const idx = Number(feedItem.dataset.idx);
    if (!Number.isNaN(idx)) loadFeed(idx);
  });

  // feed filter
  feedFilter.addEventListener('input', ()=> renderFeeds(feedFilter.value));

  // top search (DuckDuckGo)
  function doTopSearch(){
    const q = (topSearch.value || '').trim();
    if (!q) return;
    const url = 'https://duckduckgo.com/?q=' + encodeURIComponent(q);
    window.open(url,'_blank');
  }
  topSearch.addEventListener('keydown', (e)=> { if(e.key === 'Enter') doTopSearch(); });
  topSearchBtn.addEventListener('click', doTopSearch);

  // init
  function init(){
    loadState();
    renderFeeds();
    if (feeds.length) loadFeed(0);
    else articleWrap.innerHTML = '<div class="placeholder">No feeds. Add one to begin.</div>';
  }

  init();
});
