// News Command Center — Refactor: top search, sidebar hide, bookmarks drawer
document.addEventListener('DOMContentLoaded', () => {
  // Config & defaults
  const CORS = 'https://api.allorigins.win/raw?url=';
  const FEEDS_KEY = 'ncc_feeds_v1';
  const HIDDEN_KEY = 'ncc_hidden_v1';
  const BOOKMARKS_KEY = 'ncc_bmarks_v1';
  const THEME_KEY = 'ncc_theme_v1';

  const DEFAULT_FEEDS = [
    { name: "BBC World News", url: "https://feeds.bbci.co.uk/news/world/rss.xml" },
    { name: "Variety", url: "https://variety.com/feed/" },
    { name: "TechCrunch", url: "https://techcrunch.com/feed/" }
  ];

  // DOM
  const el = (id) => document.getElementById(id);
  const feedList = el('feed-list');
  const articleGrid = el('article-grid');
  const heroTitle = el('hero-title');
  const heroSub = el('hero-sub');
  const feedFilter = el('feed-filter');
  const globalSearch = el('global-search');
  const searchBtn = el('search-btn');
  const bookmarksBtn = el('bookmarks-btn');
  const bookmarksDrawer = el('bookmarks-drawer');
  const bookmarksList = el('bookmarks-list');
  const bookmarksClose = el('close-bookmarks');
  const sidebar = el('sidebar');
  const sidebarToggle = el('sidebar-toggle');
  const toggleDark = el('toggle-dark');
  const addFeedBtn = el('add-feed-btn');
  const addModal = el('add-feed-modal');
  const saveFeedBtn = el('save-feed-btn');
  const cancelFeedBtn = el('cancel-feed-btn');
  const feedNameInput = el('feed-name-input');
  const feedUrlInput = el('feed-url-input');
  const resetFeedsBtn = el('reset-feeds-btn');
  const toast = el('toast') || createToast();

  let feeds = [];
  let hidden = new Set();
  let bookmarks = [];

  // Utilities
  function toastShow(msg, t=2200){ toast.textContent = msg; toast.classList.remove('hidden'); setTimeout(()=>toast.classList.add('hidden'),t); }
  function safeParse(s){ try{ return JSON.parse(s); }catch(e){return null}}
  function save(key,obj){ try{ localStorage.setItem(key, JSON.stringify(obj)); }catch(e){console.warn('save fail',e)} }
  function load(key){ return safeParse(localStorage.getItem(key)); }
  function normalize(u){ if(!u) return ''; u=u.trim(); if(!/^https?:\/\//i.test(u)) u='https://'+u; if(u.startsWith('http://')) u=u.replace(/^http:\/\//,'https://'); return u; }
  function elCreate(tag, cls=''){ const n=document.createElement(tag); if(cls) n.className=cls; return n; }

  // state load
  function loadState(){
    const f = load(FEEDS_KEY); feeds = Array.isArray(f) && f.length ? f : DEFAULT_FEEDS.slice();
    const h = load(HIDDEN_KEY); hidden = new Set(Array.isArray(h)?h:[]);
    const b = load(BOOKMARKS_KEY); bookmarks = Array.isArray(b)?b:[];
    const theme = localStorage.getItem(THEME_KEY); if(theme==='dark') document.body.classList.add('dark-mode');
  }
  function persistAll(){ save(FEEDS_KEY, feeds); save(HIDDEN_KEY, Array.from(hidden)); save(BOOKMARKS_KEY, bookmarks); }

  // Render feeds in sidebar
  function renderFeeds(filter=''){
    feedList.innerHTML='';
    feeds.forEach((f,i)=> {
      if(hidden.has(f.url)) return;
      if(filter && !f.name.toLowerCase().includes(filter.toLowerCase())) return;
      const item = elCreate('div','feed-item');
      item.dataset.index=i; item.dataset.url=f.url;
      const left = elCreate('div','feed-meta');
      const name = elCreate('div','feed-name'); name.textContent = f.name;
      left.appendChild(name);
      const controls = elCreate('div','feed-controls');
      // hide / delete (hide persists)
      const hideBtn = elCreate('button'); hideBtn.title='Hide feed'; hideBtn.innerHTML='✖'; hideBtn.onclick=(ev)=>{ ev.stopPropagation(); hidden.add(f.url); persistAll(); renderFeeds(feedFilter.value); toastShow('Feed hidden'); };
      const openBtn = elCreate('button'); openBtn.title='Open feed'; openBtn.innerHTML='→'; openBtn.onclick=(ev)=>{ ev.stopPropagation(); loadFeedAt(i,item); };
      controls.appendChild(openBtn); controls.appendChild(hideBtn);
      item.appendChild(left); item.appendChild(controls);
      item.onclick = ()=> loadFeedAt(i,item);
      feedList.appendChild(item);
    });
  }

  // Render bookmarks drawer
  function renderBookmarks(){
    bookmarksList.innerHTML='';
    if(bookmarks.length===0){ bookmarksList.innerHTML='<div class="muted">No bookmarks yet — right-click an article to save.</div>'; return;}
    bookmarks.forEach(b=>{
      const a = elCreate('a','article'); a.href=b.link; a.target='_blank';
      const thumb = elCreate('div','thumb'); if(b.thumb) thumb.style.backgroundImage=`url(${b.thumb})`;
      const body = elCreate('div','article-body'); const h = elCreate('h4'); h.textContent=b.title; const p = elCreate('p'); p.textContent=b.desc || '';
      body.appendChild(h); body.appendChild(p);
      a.appendChild(thumb); a.appendChild(body);
      bookmarksList.appendChild(a);
    });
  }

  function addBookmark(obj){
    if(!obj || !obj.link) return;
    if(bookmarks.some(b=>b.link===obj.link)) { toastShow('Already bookmarked'); return; }
    bookmarks.unshift(obj); if(bookmarks.length>200) bookmarks.pop(); persistAll(); renderBookmarks(); toastShow('Saved');
  }

  // Fetch and parse feed (RSS or Atom)
  async function fetchFeed(url, limit=18){
    try{
      const res = await fetch(CORS + encodeURIComponent(url));
      if(!res.ok) throw new Error('Network '+res.status);
      const txt = await res.text();
      const xml = new DOMParser().parseFromString(txt,'application/xml');
      if(xml.querySelector('parsererror')) throw new Error('Invalid feed XML');
      // RSS
      const items = xml.querySelectorAll('item');
      if(items && items.length){
        const out = [];
        items.forEach((it,idx)=>{
          if(idx>=limit) return;
          const title = it.querySelector('title')?.textContent || 'No title';
          const link = it.querySelector('link')?.textContent || it.querySelector('guid')?.textContent || url;
          let desc = it.querySelector('description')?.textContent || '';
          desc = desc.replace(/<[^>]+>/g,'').trim();
          const pub = it.querySelector('pubDate')?.textContent || '';
          const media = it.querySelector('media\\:content, enclosure, media\\:thumbnail');
          const thumb = media ? (media.getAttribute('url') || '') : '';
          out.push({ title, link, desc, pub, thumb });
        });
        return out;
      }
      // Atom
      const entries = xml.querySelectorAll('entry');
      if(entries && entries.length){
        const out=[];
        entries.forEach((en,idx)=>{
          if(idx>=limit) return;
          const title = en.querySelector('title')?.textContent || 'No title';
          const link = en.querySelector('link')?.getAttribute('href') || en.querySelector('link')?.textContent || url;
          let desc = en.querySelector('summary')?.textContent || en.querySelector('content')?.textContent || '';
          desc = desc.replace(/<[^>]+>/g,'').trim();
          const pub = en.querySelector('updated')?.textContent || en.querySelector('published')?.textContent || '';
          out.push({ title, link, desc, pub, thumb: '' });
        });
        return out;
      }
      throw new Error('No items');
    }catch(err){
      console.warn('fetchFeed',url,err);
      return { error: err.message || 'fetch error' };
    }
  }

  // Show a feed in the main grid
  async function loadFeedAt(index, feedElement=null){
    const f = feeds[index];
    if(!f) return;
    heroTitle.textContent = f.name;
    heroSub.textContent = f.url;
    articleGrid.innerHTML = '<div class="placeholder">Loading...</div>';
    const data = await fetchFeed(f.url, 24);
    if(data && data.error){ articleGrid.innerHTML = `<div class="placeholder">Failed: ${data.error}</div>`; return; }
    renderArticles(data);
  }

  // Render articles array into grid
  function renderArticles(items){
    articleGrid.innerHTML = '';
    if(!items || !items.length) { articleGrid.innerHTML = '<div class="placeholder">No articles</div>'; return; }
    items.forEach(it=>{
      const a = elCreate('a','article'); a.href = it.link || '#'; a.target='_blank';
      const thumb = elCreate('div','thumb'); if(it.thumb) thumb.style.backgroundImage=`url(${it.thumb})`; 
      const body = elCreate('div','article-body'); const h = elCreate('h4'); h.textContent = it.title; const p = elCreate('p'); p.textContent = it.desc? (it.desc.substring(0,140)) : '';
      const meta = elCreate('div','article-meta'); meta.textContent = it.pub || '';
      body.appendChild(h); body.appendChild(p); body.appendChild(meta);
      a.appendChild(thumb); a.appendChild(body);
      // right-click to bookmark (contextmenu)
      a.addEventListener('contextmenu', (e)=>{ e.preventDefault(); addBookmark({ title: it.title, desc: it.desc, link: it.link, thumb: it.thumb }); });
      articleGrid.appendChild(a);
    });
  }

  // Global search across all feeds (fetches each feed if needed)
  async function globalSearchQuery(q){
    if(!q || !q.trim()) { toastShow('Enter search terms'); return; }
    heroTitle.textContent = 'Search Results';
    heroSub.textContent = `Query: "${q}"`;
    articleGrid.innerHTML = '<div class="placeholder">Searching across feeds…</div>';
    const lower = q.toLowerCase();
    const results = [];
    // fetch each feed (limit small)
    for(const f of feeds){
      if(hidden.has(f.url)) continue;
      const res = await fetchFeed(f.url, 12);
      if(Array.isArray(res)){
        res.forEach(it=>{
          if((it.title+it.desc).toLowerCase().includes(lower)){
            results.push(Object.assign({}, it, { source: f.name }));
          }
        });
      }
    }
    if(results.length===0){ articleGrid.innerHTML = `<div class="placeholder">No results for "${q}"</div>`; return; }
    // render results
    articleGrid.innerHTML='';
    results.forEach(it=>{
      const a = elCreate('a','article'); a.href=it.link; a.target='_blank';
      const thumb = elCreate('div','thumb'); if(it.thumb) thumb.style.backgroundImage=`url(${it.thumb})`;
      const body = elCreate('div','article-body'); const h=elCreate('h4'); h.textContent=it.title; const p=elCreate('p'); p.textContent=it.desc ? it.desc.substring(0,140) : '';
      const meta = elCreate('div','article-meta'); meta.textContent = it.source + (it.pub? ' · '+it.pub:'');
      body.appendChild(h); body.appendChild(p); body.appendChild(meta);
      a.appendChild(thumb); a.appendChild(body);
      a.addEventListener('contextmenu', (e)=>{ e.preventDefault(); addBookmark({ title: it.title, desc: it.desc, link: it.link, thumb: it.thumb }); });
      articleGrid.appendChild(a);
    });
  }

  // Wire events
  function wireUI(){
    // feed filter
    feedFilter?.addEventListener('input', ()=> renderFeeds(feedFilter.value));

    // search
    searchBtn?.addEventListener('click', ()=> { globalSearchQuery(globalSearch.value); });
    globalSearch?.addEventListener('keydown', (e)=> { if(e.key==='Enter') globalSearchQuery(globalSearch.value); });

    // bookmarks drawer
    bookmarksBtn?.addEventListener('click', ()=> { bookmarksDrawer.classList.toggle('hidden'); renderBookmarks(); });
    bookmarksClose?.addEventListener('click', ()=> bookmarksDrawer.classList.add('hidden'));

    // sidebar toggle
    sidebarToggle?.addEventListener('click', ()=> sidebar.classList.toggle('open'));

    // theme toggle
    toggleDark?.addEventListener('click', ()=> {
      const is = document.body.classList.toggle('dark-mode');
      localStorage.setItem(THEME_KEY, is?'dark':'light');
    });

    // add feed modal
    addFeedBtn?.addEventListener('click', ()=> addModal.classList.remove('hidden'));
    cancelFeedBtn?.addEventListener('click', ()=> addModal.classList.add('hidden'));
    saveFeedBtn?.addEventListener('click', ()=> {
      const name = (feedNameInput.value || '').trim(); const url = normalize(feedUrlInput.value || '');
      if(!url){ toastShow('Enter a valid feed URL'); return; }
      feeds.push({ name: name || url, url }); persistAll(); renderFeeds(feedFilter.value); addModal.classList.add('hidden'); feedNameInput.value=''; feedUrlInput.value=''; toastShow('Feed added');
    });

    // Reset
    resetFeedsBtn?.addEventListener('click', ()=> {
      if(!confirm('Reset to default feeds?')) return;
      feeds = DEFAULT_FEEDS.slice(); hidden.clear(); persistAll(); renderFeeds(); toastShow('Reset to defaults');
      // load first feed
      const idx = feeds.findIndex(f=>!hidden.has(f.url)); if(idx>=0) loadFeedAt(idx);
    });

    // click outside to close modal/drawer on mobile
    document.addEventListener('click', (e)=>{
      if(!e.target.closest('.modal-inner') && !e.target.closest('#add-feed-btn')) addModal.classList.add('hidden');
    });
  }

  // init
  async function init(){
    loadState(); renderFeeds(); renderBookmarks();
    wireUI();
    // load first available feed
    const idx = feeds.findIndex(f=> !hidden.has(f.url));
    if(idx>=0) await loadFeedAt(idx);
    else articleGrid.innerHTML = '<div class="placeholder">No feeds visible. Add or unhide a feed.</div>';
  }

  // helper to create toast if missing
  function createToast(){
    const t = document.createElement('div'); t.id='toast'; t.className='toast hidden'; document.body.appendChild(t); return t;
  }

  // allow safe external calls
  window.ncc = { addBookmark, fetchFeed, renderFeeds };

  // start
  init();
});
