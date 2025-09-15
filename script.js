document.addEventListener('DOMContentLoaded', () => {
  const CORS = 'https://api.allorigins.win/raw?url=';
  const FEEDS_KEY = 'ncc_feeds_v2';
  const THEME_KEY = 'ncc_theme_v2';

  // Defaults now include ABC, Fox, TMZ
  const DEFAULT_FEEDS = [
    { name: "BBC World News", url: "https://feeds.bbci.co.uk/news/world/rss.xml" },
    { name: "Variety", url: "https://variety.com/feed/" },
    { name: "TechCrunch", url: "https://techcrunch.com/feed/" },
    { name: "ABC News", url: "https://abcnews.go.com/abcnews/topstories" },
    { name: "Fox News Live", url: "https://moxie.foxnews.com/google-publisher/latest.xml" },
    { name: "TMZ Entertainment", url: "https://www.tmz.com/rss.xml" }
  ];

  const el = id => document.getElementById(id);
  const globalSearch = el('global-search');
  const searchBtn = el('search-btn');
  const googleToggle = el('google-toggle');
  const toggleDark = el('toggle-dark');
  const articleGrid = el('article-grid');
  const heroTitle = el('hero-title');
  const heroSub = el('hero-sub');
  const feedList = el('feed-list');

  let feeds = [];
  let useGoogle = false;

  // Load state
  function loadFeeds(){
    const saved = JSON.parse(localStorage.getItem(FEEDS_KEY) || "null");
    feeds = saved && saved.length ? saved : DEFAULT_FEEDS.slice();
  }
  function saveFeeds(){ localStorage.setItem(FEEDS_KEY, JSON.stringify(feeds)); }

  function renderFeeds(){
    feedList.innerHTML = '';
    feeds.forEach((f,i) => {
      const div = document.createElement('div');
      div.className = 'feed-item';
      div.textContent = f.name;
      div.onclick = () => loadFeedAt(i);
      feedList.appendChild(div);
    });
  }

  // Dark / Light toggle
  function applyTheme(){
    const theme = localStorage.getItem(THEME_KEY) || 'dark';
    document.body.classList.remove('dark-mode','light-mode');
    document.body.classList.add(theme === 'light' ? 'light-mode' : 'dark-mode');
  }
  toggleDark.onclick = () => {
    const current = localStorage.getItem(THEME_KEY) || 'dark';
    const next = current === 'dark' ? 'light' : 'dark';
    localStorage.setItem(THEME_KEY,next);
    applyTheme();
  };

  // Google toggle
  googleToggle.onclick = () => {
    useGoogle = !useGoogle;
    googleToggle.textContent = useGoogle ? "📰" : "🌐"; // flip icons
    heroSub.textContent = useGoogle ? "Google search mode" : "Feed search mode";
  };

  // Search
  searchBtn.onclick = () => {
    const q = globalSearch.value.trim();
    if(!q) return;
    if(useGoogle){
      window.open(`https://www.google.com/search?q=${encodeURIComponent(q)}`,'_blank');
    } else {
      heroTitle.textContent = "Search Results";
      heroSub.textContent = `Query: "${q}" across feeds`;
      articleGrid.innerHTML = `<div class="placeholder">Searching feeds...</div>`;
      // (keep your existing feed search logic here)
    }
  };

  // Load one feed
  async function loadFeedAt(i){
    const f = feeds[i];
    if(!f) return;
    heroTitle.textContent = f.name;
    heroSub.textContent = f.url;
    articleGrid.innerHTML = `<div class="placeholder">Loading...</div>`;
    try {
      const res = await fetch(CORS+encodeURIComponent(f.url));
      const txt = await res.text();
      const xml = new DOMParser().parseFromString(txt,"application/xml");
      const items = xml.querySelectorAll("item");
      articleGrid.innerHTML = '';
      items.forEach(it => {
        const title = it.querySelector("title")?.textContent || 'No title';
        const link = it.querySelector("link")?.textContent || '#';
        const desc = it.querySelector("description")?.textContent || '';
        const a = document.createElement('a');
        a.className='article';
        a.href=link; a.target="_blank";
        a.innerHTML = `<div class="article-body"><h4>${title}</h4><p>${desc.substring(0,100)}</p></div>`;
        articleGrid.appendChild(a);
      });
    } catch(err){
      articleGrid.innerHTML = `<div class="placeholder">Error loading feed</div>`;
    }
  }

  // Init
  loadFeeds();
  renderFeeds();
  applyTheme();
  if(feeds[0]) loadFeedAt(0);
});
