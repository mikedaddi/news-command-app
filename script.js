// News Command Center — Share & Export upgrade
document.addEventListener('DOMContentLoaded', () => {
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

  // DOM helpers
  const el = id => document.getElementById(id);
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
  const exportBtn = el('export-results-btn');

  let feeds = [];
  let hidden = new Set();
  let bookmarks = [];

  // utilities
  function toastShow(msg, t=2200){ toast.textContent = msg; toast.classList.remove('hidden'); setTimeout(()=>toast.classList.add('hidden'), t); }
  function safeParse(s){ try{ return JSON.parse(s) }catch(e){ return null } }
  function save(key,obj){ try{ localStorage.setItem(key, JSON.stringify(obj)); }catch(e){ console.warn('save fail', e) } }
  function load(key){ return safeParse(localStorage.getItem(key)) }
  function normalize(u){ if(!u) return ''; u=u.trim(); if(!/^https?:\/\//i.test(u)) u='https://'+u; if(u.startsWith('http://')) u=u.replace(/^http:\/\//,'https://'); return u; }
  function elCreate(tag, cls=''){ const n=document.createElement(tag); if(cls) n.className=cls; return n; }

  // load state
  function loadState(){
    const f = load(FEEDS_KEY); feeds = Array.isArray(f) && f.length ? f : DEFAULT_FEEDS.slice();
    const h = load(HIDDEN_KEY); hidden = new Set(Array.isArray(h)?h:[]);
    const b = load(BOOKMARKS_KEY); bookmarks = Array.isArray(b)?b:[];
    const theme = localStorage.getItem(THEME_KEY); if(theme==='dark') document.body.classList.add('dark-mode');
  }
  function persistAll(){ save(FEEDS_KEY, feeds); save(HIDDEN_KEY, Array.from(hidden)); save(BOOKMARKS_KEY, bookmarks); }

  // render feeds
  function renderFeeds(filter=''){
    feedList.innerHTML = '';
    feeds.forEach((f,i) => {
      if(hidden.has(f.url)) return;
      if(filter && !f.name.toLowerCase().includes(filter.toLowerCase())) return;
      const item = elCreate('div','feed-item');
      item.dataset.index = i; item.dataset.url = f.url;
      const left = elCreate('div','feed-meta');
      const name = elCreate('div','feed-name'); name.textContent = f.name;
      left.appendChild(name);
      const controls = elCreate('div','feed-controls');
      const openBtn = elCreate('button'); openBtn.title='Open feed'; openBtn.innerHTML='→'; openBtn.onclick=(ev)=>{ ev.stopPropagation(); loadFeedAt(i, item); };
      const hideBtn = elCreate('button'); hideBtn.title='Hide feed'; hideBtn.innerHTML='✖'; hideBtn.onclick=(ev)=>{ ev.stopPropagation(); hidden.add(f.url); persistAll(); renderFeeds(feedFilter.value); toastShow('Feed hidden'); };
      controls.appendChild(openBtn); controls.appendChild(hideBtn);
      item.appendChild(left); item.appendChild(controls);
      item.onclick = ()=> loadFeedAt(i, item);
      feedList.appendChild(item);
    });
  }

  // bookmarks
  function renderBookmarks(){
    bookmarksList.innerHTML = '';
    if(!bookmarks || bookmarks.length===0){ bookmarksList.innerHTML = '<div class="muted">No bookmarks yet — right-click an article to save.</div>'; return; }
    bookmarks.forEach(b => {
      const a = elCreate('a','article'); a.href = b.link; a.target='_blank';
      const thumb = elCreate('div','thumb'); if(b.thumb) thumb.style.backgroundImage = `url(${b.thumb})`;
      const body = elCreate('div','article-body'); const h = elCreate('h4'); h.textContent = b.title; const p = elCreate('p'); p.textContent = b.desc || '';
      body.appendChild(h); body.appendChild(p);
      a.appendChild(thumb); a.appendChild(body);
      bookmarksList.appendChild(a);
    });
  }
  function addBookmark(obj){
    if(!obj || !obj.link) return;
    if(bookmarks.some(b=>b.link === obj.link)){ toastShow('Already bookmarked'); return; }
    bookmarks.unshift(obj); if(bookmarks.length>200) bookmarks.pop();
    persistAll(); renderBookmarks(); toastShow('Saved');
  }

  // fetch feed (rss & atom)
  async function fetchFeed(url, limit=18){
    try{
      const res = await fetch(CORS + encodeURIComponent(url));
      if(!res.ok) throw new Error('Network '+res.status);
      const txt = await res.text();
      const xml = new DOMParser().parseFromString(txt, 'application/xml');
      if(xml.querySelector('parsererror')) throw new Error('Invalid feed XML');
      const items = xml.querySelectorAll('item');
      if(items && items.length){
        const out = [];
        items.forEach((it, idx) => {
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
      const entries = xml.querySelectorAll('entry');
      if(entries && entries.length){
        const out = [];
        entries.forEach((en, idx) => {
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
      console.warn('fetchFeed', url, err);
      return { error: err.message || 'fetch error' };
    }
  }

  // render articles into grid
  function renderArticles(items, isSearch=false){
    articleGrid.innerHTML = '';
    if(!items || items.length===0){ articleGrid.innerHTML = '<div class="placeholder">No articles</div>'; return; }
    // show export button only in search mode
    if(isSearch) exportBtn.classList.remove('hidden'); else exportBtn.classList.add('hidden');

    items.forEach(it => {
      const a = elCreate('a','article'); a.href = it.link || '#'; a.target = '_blank';
      const thumb = elCreate('div','thumb'); if(it.thumb) thumb.style.backgroundImage = `url(${it.thumb})`;
      const body = elCreate('div','article-body'); const h = elCreate('h4'); h.textContent = it.title; const p = elCreate('p'); p.textContent = it.desc ? it.desc.substring(0,140) : '';
      const meta = elCreate('div','article-meta'); meta.textContent = it.pub || '';
      // share bar
      const shareBar = elCreate('div','share-bar');
      const copyBtn = elCreate('button','share-btn'); copyBtn.title='Copy link'; copyBtn.innerHTML='📋'; copyBtn.onclick = (e) => { e.preventDefault(); navigator.clipboard.writeText(it.link || ''); toastShow('Link copied'); };
      const twBtn = elCreate('button','share-btn'); twBtn.title='Share to Twitter'; twBtn.innerHTML='🐦'; twBtn.onclick = (e) => { e.preventDefault(); window.open(`https://twitter.com/intent/tweet?url=${encodeURIComponent(it.link)}&text=${encodeURIComponent(it.title)}`,'_blank'); };
      const fbBtn = elCreate('button','share-btn'); fbBtn.title='Share to Facebook'; fbBtn.innerHTML='👍'; fbBtn.onclick = (e) => { e.preventDefault(); window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(it.link)}`,'_blank'); };

      shareBar.appendChild(copyBtn); shareBar.appendChild(twBtn); shareBar.appendChild(fbBtn);

      body.appendChild(h); body.appendChild(p); body.appendChild(meta); body.appendChild(shareBar);
      a.appendChild(thumb); a.appendChild(body);

      // right-click to bookmark
      a.addEventListener('contextmenu', (e) => { e.preventDefault(); addBookmark({ title: it.title, desc: it.desc, link: it.link, thumb: it.thumb }); });

      articleGrid.appendChild(a);
    });
  }

  // load a feed by index
  async function loadFeedAt(index, feedElement=null){
    const f = feeds[index];
    if(!f) return;
    heroTitle.textContent = f.name;
    heroSub.textContent = f.url;
    articleGrid.innerHTML = '<div class="placeholder">Loading...</div>';
    const data = await fetchFeed(f.url, 24);
    if(data && data.error){ articleGrid.innerHTML = `<div class="placeholder">Failed: ${data.error}</div>`; return; }
    renderArticles(data, false);
  }

  // global search (fetch across feeds)
  async function globalSearchQuery(q){
    if(!q || !q.trim()){ toastShow('Enter search terms'); return; }
    heroTitle.textContent = 'Search Results';
    heroSub.textContent = `Query: "${q}"`;
    articleGrid.innerHTML = '<div class="placeholder">Searching across feeds…</div>';
    const lower = q.toLowerCase();
    const results = [];
    // sequential to avoid flooding proxies
    for(const f of feeds){
      if(hidden.has(f.url)) continue;
      const res = await fetchFeed(f.url, 12);
      if(Array.isArray(res)){
        res.forEach(it => {
          if((it.title + ' ' + it.desc).toLowerCase().includes(lower)){
            results.push(Object.assign({}, it, { source: f.name }));
          }
        });
      }
    }
    if(results.length===0){ articleGrid.innerHTML = `<div class="placeholder">No results for "${q}"</div>`; return; }
    // attach source into meta if present
    results.forEach(r => { if(r.source) r.pub = (r.pub? r.pub + ' · ' : '') + r.source; });
    renderArticles(results, true);
  }

  // create share card (canvas) and download
  function createExportCard(title, sub, count){
    const w = 1200, h = 630;
    const canvas = document.createElement('canvas'); canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext('2d');
    // background gradient
    const g = ctx.createLinearGradient(0,0,w,h);
    g.addColorStop(0,'#0f1720'); g.addColorStop(1,'#1a2a3a');
    ctx.fillStyle = g; ctx.fillRect(0,0,w,h);
    // accent bar
    ctx.fillStyle = '#1e90ff'; ctx.fillRect(40,40, w-80, 12);
    // title
    ctx.fillStyle = '#fff'; ctx.font = 'bold 48px Inter, sans-serif'; wrapText(ctx, title, 60, 140, w-120, 56);
    // subtitle
    ctx.fillStyle = '#dbe7ff'; ctx.font = '22px Inter, sans-serif'; wrapText(ctx, sub, 60, 240, w-120, 28);
    // count + date
    ctx.fillStyle = '#9fbff6'; ctx.font = '20px Inter, sans-serif'; ctx.fillText(`Results: ${count}`, 60, 340);
    ctx.fillText(new Date().toLocaleString(), 60, 380);
    // small watermark
    ctx.globalAlpha = 0.18; ctx.font = 'bold 20px Inter'; ctx.fillText('News Command Center', w-360, h-60); ctx.globalAlpha = 1;
    // download
    const dataUrl = canvas.toDataURL('image/png');
    const a = document.createElement('a'); a.href = dataUrl; a.download = 'search-card.png'; a.click();
  }

  // helper: wrap text
  function wrapText(ctx, text, x, y, maxWidth, lineHeight){
    const words = text.split(' ');
    let line = '', ypos = y;
    for(let n=0;n<words.length;n++){
      const testLine = line + words[n] + ' ';
      const metrics = ctx.measureText(testLine);
      if(metrics.width > maxWidth && n>0){ ctx.fillText(line, x, ypos); line = words[n] + ' '; ypos += lineHeight; }
      else { line = testLine; }
    }
    if(line) ctx.fillText(line, x, ypos);
  }

  // wire UI events
  function wireUI(){
    feedFilter?.addEventListener('input', ()=> renderFeeds(feedFilter.value));
    searchBtn?.addEventListener('click', ()=> globalSearchQuery(globalSearch.value));
    globalSearch?.addEventListener('keydown', (e) => { if(e.key==='Enter') globalSearchQuery(globalSearch.value); });

    bookmarksBtn?.addEventListener('click', ()=> { bookmarksDrawer.classList.toggle('hidden'); renderBookmarks(); });
    bookmarksClose?.addEventListener('click', ()=> bookmarksDrawer.classList.add('hidden'));

    sidebarToggle?.addEventListener('click', ()=> sidebar.classList.toggle('open'));
    toggleDark?.addEventListener('click', ()=> { const is = document.body.classList.toggle('dark-mode'); localStorage.setItem(THEME_KEY, is ? 'dark' : 'light'); });

    addFeedBtn?.addEventListener('click', ()=> addModal.classList.remove('hidden'));
    cancelFeedBtn?.addEventListener('click', ()=> addModal.classList.add('hidden'));
    saveFeedBtn?.addEventListener('click', ()=> {
      const name = (feedNameInput.value || '').trim(); const url = normalize(feedUrlInput.value || '');
      if(!url){ toastShow('Enter a valid feed URL'); return; }
      feeds.push({ name: name || url, url }); persistAll(); renderFeeds(feedFilter.value); addModal.classList.add('hidden'); feedNameInput.value=''; feedUrlInput.value=''; toastShow('Feed added');
    });

    resetFeedsBtn?.addEventListener('click', ()=> {
      if(!confirm('Reset to default feeds?')) return;
      feeds = DEFAULT_FEEDS.slice(); hidden.clear(); persistAll(); renderFeeds(); toastShow('Reset to defaults');
      const idx = feeds.findIndex(f=>!hidden.has(f.url)); if(idx>=0) loadFeedAt(idx);
    });

    // export button
    exportBtn?.addEventListener('click', ()=> {
      const title = heroTitle.textContent || 'Search Results';
      const sub = heroSub.textContent || '';
      const count = articleGrid.children.length || 0;
      // copy text summary
      const text = `${title}\n${sub}\nFound ${count} articles.\nShared via News Command Center`;
      navigator.clipboard.writeText(text).then(()=> toastShow('Summary copied to clipboard'));
      // also download png card
      createExportCard(title, sub, count);
    });

    // click outside modals
    document.addEventListener('click', (e) => { if(!e.target.closest('.modal-inner') && !e.target.closest('#add-feed-btn')) addModal.classList.add('hidden'); });
  }

  // create export canvas wrapper
  function createExportCard(title, sub, count){ createExportCard = function(t,s,c){ /* placeholder overwritten below */ }; /* fallback */ ; /* but actual function defined above */ createExportCard(title, sub, count); }

  // initialize
  async function init(){
    loadState(); renderFeeds(); renderBookmarks(); wireUI();
    // load first visible feed
    const idx = feeds.findIndex(f => !hidden.has(f.url));
    if(idx>=0) await loadFeedAt(idx);
    else articleGrid.innerHTML = '<div class="placeholder">No feeds visible. Add or unhide a feed.</div>';
  }

  // helper createToast if missing
  function createToast(){ const t = document.createElement('div'); t.id='toast'; t.className='toast hidden'; document.body.appendChild(t); return t; }

  // expose some helpers for console usage
  window.ncc = { addBookmark, fetchFeed, renderFeeds };

  init();
});
