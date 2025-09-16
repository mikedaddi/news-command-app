document.addEventListener('DOMContentLoaded', () => {
  const feedList = document.getElementById('feed-list');
  const articleContainer = document.getElementById('article-container');
  const addFeedBtn = document.getElementById('add-feed-btn');
  const addModal = document.getElementById('add-feed-modal');
  const saveFeedBtn = document.getElementById('save-feed-btn');
  const cancelFeedBtn = document.getElementById('cancel-feed-btn');
  const howtoBtn = document.getElementById('how-to-btn');
  const howtoModal = document.getElementById('how-to-modal');
  const howtoClose = document.getElementById('close-how-to-btn');
  const bookmarksBtn = document.getElementById('bookmarks-btn');
  const bookmarksModal = document.getElementById('bookmarks-modal');
  const bookmarksClose = document.getElementById('bookmarks-close-btn');
  const bookmarksContainer = document.getElementById('bookmarks-container');
  const resetBtn = document.getElementById('reset-btn');
  const toast = document.getElementById('toast');
  const feedFilter = document.getElementById('feed-filter');
  const topSearch = document.getElementById('top-search');
  const topSearchBtn = document.getElementById('top-search-btn');

  const CORS = 'https://api.allorigins.win/raw?url=';
  let feeds = [];
  let bookmarks = JSON.parse(localStorage.getItem('bookmarks')) || [];

  const defaultFeeds = [
    { name: "BBC World News", url: "http://feeds.bbci.co.uk/news/world/rss.xml" },
    { name: "ABC News (US)", url: "https://abcnews.go.com/abcnews/topstories" },
    { name: "Fox News", url: "https://moxie.foxnews.com/google-publisher/world.xml" },
    { name: "TMZ Entertainment", url: "https://www.tmz.com/rss.xml" }
  ];

  // Toasts
  function showToast(msg) {
    toast.textContent = msg;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3000);
  }

  // Feeds persistence
  function save() {
    localStorage.setItem('feeds', JSON.stringify(feeds));
    localStorage.setItem('bookmarks', JSON.stringify(bookmarks));
  }

  function load() {
    feeds = JSON.parse(localStorage.getItem('feeds')) || defaultFeeds;
  }

  // Render feed list
  function renderFeeds(filter = '') {
    feedList.innerHTML = '';
    feeds
      .filter(f => f.name.toLowerCase().includes(filter.toLowerCase()))
      .forEach((feed, i) => {
        const item = document.createElement('div');
        item.className = 'feed-item';
        item.dataset.idx = i;
        item.innerHTML = `<span>${feed.name}</span> <i class="fas fa-times"></i>`;
        feedList.appendChild(item);
      });
  }

  // Fetch & render feed
  async function loadFeed(idx) {
    const feed = feeds[idx];
    if (!feed) return;
    articleContainer.innerHTML = `<p style="text-align:center;">Loading ${feed.name}...</p>`;
    try {
      const res = await fetch(CORS + encodeURIComponent(feed.url));
      const str = await res.text();
      const data = new DOMParser().parseFromString(str, "text/xml");
      const items = [...data.querySelectorAll("item")].slice(0, 10);

      articleContainer.innerHTML = `<h2>${feed.name}</h2><p>${feed.url}</p>`;
      items.forEach(item => {
        const title = item.querySelector("title")?.textContent || "No Title";
        const link = item.querySelector("link")?.textContent || "#";
        const desc = (item.querySelector("description")?.textContent || "").replace(/<[^>]*>/g, "").slice(0, 150);

        const card = document.createElement('div');
        card.className = 'article-card';
        card.innerHTML = `
          <h3><a href="${link}" target="_blank">${title}</a></h3>
          <p>${desc}...</p>
          <div class="card-actions">
            <button class="share-btn"><i class="fas fa-share-alt"></i></button>
            <button class="export-btn"><i class="fas fa-image"></i></button>
            <button class="bookmark-btn"><i class="fas fa-bookmark"></i></button>
          </div>
        `;

        // Share
        card.querySelector('.share-btn').onclick = () => {
          if (navigator.share) {
            navigator.share({ title, text: desc, url: link }).catch(err => console.log("Share cancelled", err));
          } else {
            alert("Sharing not supported on this device.");
          }
        };

        // Export
        card.querySelector('.export-btn').onclick = async () => {
          const canvas = await html2canvas(card);
          const dataUrl = canvas.toDataURL();
          if (navigator.share) {
            const blob = await (await fetch(dataUrl)).blob();
            const file = new File([blob], "article.png", { type: "image/png" });
            navigator.share({ files: [file], title, text: desc });
          } else {
            const linkEl = document.createElement('a');
            linkEl.href = dataUrl;
            linkEl.download = "article.png";
            linkEl.click();
          }
        };

        // Bookmark
        card.querySelector('.bookmark-btn').onclick = () => {
          if (!bookmarks.find(b => b.link === link)) {
            bookmarks.push({ title, link });
            save();
            showToast("Bookmarked!");
          }
        };

        articleContainer.appendChild(card);
      });
    } catch (err) {
      articleContainer.innerHTML = `<p style="color:red;">Error loading feed: ${err.message}</p>`;
    }
  }

  // Render bookmarks
  function renderBookmarks() {
    bookmarksContainer.innerHTML = bookmarks.length ? '' : '<p>No bookmarks yet.</p>';
    bookmarks.forEach(b => {
      const div = document.createElement('div');
      div.className = 'bookmark-item';
      div.innerHTML = `<a href="${b.link}" target="_blank">${b.title}</a>`;
      bookmarksContainer.appendChild(div);
    });
  }

  // Events
  addFeedBtn.onclick = () => addModal.classList.remove('hidden');
  cancelFeedBtn.onclick = () => addModal.classList.add('hidden');
  saveFeedBtn.onclick = () => {
    const name = document.getElementById('feed-name-input').value.trim();
    const url = document.getElementById('feed-url-input').value.trim();
    if (name && url) {
      feeds.push({ name, url });
      save();
      renderFeeds();
      addModal.classList.add('hidden');
      showToast("Feed added");
    }
  };
  howtoBtn.onclick = () => howtoModal.classList.remove('hidden');
  howtoClose.onclick = () => howtoModal.classList.add('hidden');
  bookmarksBtn.onclick = () => { renderBookmarks(); bookmarksModal.classList.remove('hidden'); };
  bookmarksClose.onclick = () => bookmarksModal.classList.add('hidden');
  resetBtn.onclick = () => { feeds = defaultFeeds; save(); renderFeeds(); loadFeed(0); showToast("Feeds reset"); };

  feedList.onclick = (e) => {
    if (e.target.matches('.fa-times')) {
      const idx = e.target.parentElement.dataset.idx;
      feeds.splice(idx, 1);
      save();
      renderFeeds();
      loadFeed(0);
    } else if (e.target.closest('.feed-item')) {
      loadFeed(e.target.closest('.feed-item').dataset.idx);
    }
  };

  feedFilter.oninput = () => renderFeeds(feedFilter.value);

  function doSearch() {
    if (!topSearch.value) return;
    window.open("https://duckduckgo.com/?q=" + encodeURIComponent(topSearch.value), '_blank');
  }
  topSearchBtn.onclick = doSearch;
  topSearch.onkeydown = (e) => { if (e.key === "Enter") doSearch(); };

  // Init
  load();
  renderFeeds();
  if (feeds.length) loadFeed(0);
});
