document.addEventListener('DOMContentLoaded', () => {
  const feedList = document.getElementById('feed-list');
  const articleWrap = document.getElementById('article-wrap');
  const feedName = document.getElementById('feed-name');
  const feedSub = document.getElementById('feed-sub');

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

  const toast = document.getElementById('toast');
  const canvas = document.getElementById('share-canvas');

  const FEED_KEY = 'ncc_feeds_v4';
  const BMARK_KEY = 'ncc_bookmarks_v4';
  const CORS = 'https://api.allorigins.win/raw?url=';

  const DEFAULT_FEEDS = [
    { name: "BBC World News", url: "https://feeds.bbci.co.uk/news/world/rss.xml" },
    { name: "ABC News (US)", url: "https://feeds.abcnews.com/abcnews/topstories" },
    { name: "Fox News", url: "https://feeds.foxnews.com/foxnews/latest" },
    { name: "TMZ Entertainment", url: "https://www.tmz.com/rss.xml" },
    { name: "Variety", url: "https://variety.com/feed/" },
    { name: "TechCrunch", url: "https://techcrunch.com/feed/" }
  ];

  let feeds = [], bookmarks = [], undoFeed = null;

  function showToast(msg, undoCallback=null) {
    toast.textContent = msg;
    if (undoCallback) {
      const undoBtn = document.createElement('button');
      undoBtn.textContent = "Undo";
      undoBtn.className = "btn ghost small";
      undoBtn.onclick = () => { undoCallback(); hideToast(); };
      toast.appendChild(undoBtn);
    }
    toast.classList.add('show');
    setTimeout(hideToast, 3000);
  }
  function hideToast(){ toast.classList.remove('show'); }

  function save(){ localStorage.setItem(FEED_KEY, JSON.stringify(feeds)); localStorage.setItem(BMARK_KEY, JSON.stringify(bookmarks)); }
  function load(){
    feeds = JSON.parse(localStorage.getItem(FEED_KEY)||'null') || DEFAULT_FEEDS;
    bookmarks = JSON.parse(localStorage.getItem(BMARK_KEY)||'null') || [];
  }

  function renderFeeds(filter=''){
    feedList.innerHTML='';
    feeds.forEach((f,i)=>{
      if(filter && !f.name.toLowerCase().includes(filter.toLowerCase())) return;
      const div=document.createElement('div');
      div.className='feed-item'; div.dataset.idx=i;
      div.innerHTML=`<div class="name">${f.name}</div><div class="actions"><i class="fa fa-times" data-idx="${i}"></i></div>`;
      feedList.appendChild(div);
    });
  }

  async function loadFeed(i){
    const f=feeds[i]; if(!f) return;
    feedName.textContent=f.name; feedSub.textContent=f.url;
    articleWrap.innerHTML='<div class="placeholder">Loading...</div>';
    try{
      const res=await fetch(CORS+encodeURIComponent(f.url));
      const txt=await res.text();
      const xml=new DOMParser().parseFromString(txt,'application/xml');
      const items=xml.querySelectorAll('item,entry');
      articleWrap.innerHTML='';
      items.forEach((it,idx)=>{
        if(idx>=10) return;
        const title=(it.querySelector('title')?.textContent||'').trim();
        let link=it.querySelector('link')?.textContent||it.querySelector('link')?.getAttribute('href')||'#';
        const desc=(it.querySelector('description')?.textContent||'').replace(/<[^>]+>/g,'');
        const pub=it.querySelector('pubDate')?.textContent||it.querySelector('updated')?.textContent||'';
        const card=document.createElement('div');
        card.className='article-card';
        card.innerHTML=`
          <div class="article-left">
            <a href="${link}" target="_blank" class="article-title">${title}</a>
            <p class="article-desc">${desc.slice(0,200)}...</p>
            <div class="article-meta-row">${pub?new Date(pub).toLocaleDateString():''}</div>
          </div>
          <div class="article-actions">
            <button class="icon-btn share-btn" title="Share"><i class="fa fa-share-alt"></i></button>
            <button class="icon-btn export-btn" title="Export Card"><i class="fa fa-image"></i></button>
            <button class="icon-btn bookmark-btn" title="Bookmark"><i class="fa fa-bookmark"></i></button>
          </div>`;
        card.querySelector('.bookmark-btn').onclick=()=>{addBookmark({title,link,desc,date:pub});};
        card.querySelector('.share-btn').onclick=()=>{navigator.clipboard.writeText(link); showToast("Link copied + Twitter opened"); window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(title+" "+link)}`,'_blank');};
        card.querySelector('.export-btn').onclick=()=>{exportCard(title,link);};
        articleWrap.appendChild(card);
      });
    }catch(e){articleWrap.innerHTML=`<div class="placeholder">Error: ${e.message}</div>`;}
  }

  function addBookmark(b){ if(bookmarks.some(x=>x.link===b.link)){showToast("Already saved");return;} bookmarks.unshift(b); save(); showToast("Saved!"); }

  function renderBookmarks(){
    bookmarksList.innerHTML=bookmarks.map((b,i)=>`
      <div class="bookmark-item">
        <div><a href="${b.link}" target="_blank">${b.title}</a><p>${b.desc}</p></div>
        <button class="btn ghost remove-bm" data-i="${i}">Remove</button>
      </div>`).join('');
    bookmarksList.querySelectorAll('.remove-bm').forEach(btn=>btn.onclick=()=>{bookmarks.splice(btn.dataset.i,1);save();renderBookmarks();});
  }

  function exportCard(title,link){
    const ctx=canvas.getContext('2d'); canvas.width=800; canvas.height=400;
    ctx.fillStyle="#0f1113"; ctx.fillRect(0,0,800,400);
    ctx.fillStyle="#00d0ff"; ctx.font="bold 28px Segoe UI"; ctx.fillText(title,40,100,720);
    ctx.fillStyle="#ccc"; ctx.font="18px Segoe UI"; ctx.fillText(link,40,160,720);
    ctx.fillStyle="#555"; ctx.font="16px Segoe UI"; ctx.fillText("Shared via News Command Center",40,360);
    const url=canvas.toDataURL("image/png");
    const a=document.createElement('a'); a.href=url;a.download="share.png";a.click();
    showToast("Card exported!");
  }

  // events
  document.getElementById('add-feed-btn').onclick=()=>addModal.classList.remove('hidden');
  addCancel.onclick=()=>addModal.classList.add('hidden');
  addSave.onclick=()=>{feeds.push({name:addName.value||addUrl.value,url:addUrl.value});
