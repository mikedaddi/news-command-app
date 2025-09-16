document.addEventListener('DOMContentLoaded', () => {
  const feedListContainer = document.getElementById('feed-list');
  const articleContainer = document.getElementById('article-container');
  const addFeedBtn = document.getElementById('add-feed-btn');
  const addFeedModal = document.getElementById('add-feed-modal');
  const saveFeedBtn = document.getElementById('save-feed-btn');
  const cancelFeedBtn = document.getElementById('cancel-feed-btn');
  const bookmarksBtn = document.getElementById('bookmarks-btn');
  const bookmarksModal = document.getElementById('bookmarks-modal');
  const closeBookmarksBtn = document.getElementById('close-bookmarks-btn');
  const howToBtn = document.getElementById('how-to-btn');
  const howToModal = document.getElementById('how-to-modal');
  const closeHowToBtn = document.getElementById('close-how-to-btn');
  const searchInput = document.getElementById('search-input');
  const searchBtn = document.getElementById('search-btn');
  const resetBtn = document.getElementById('reset-btn');

  const CORS_PROXY = 'https://api.allorigins.win/raw?url=';
  let feeds = [];

  // --- Save/load feeds ---
  function saveFeeds() {
    localStorage.setItem('commandCenterFeeds', JSON.stringify(feeds));
  }

  function loadFeeds() {
    const savedFeeds = localStorage.getItem('commandCenterFeeds');
    if (savedFeeds) {
      feeds = JSON.parse(savedFeeds);
    } else {
      feeds = [
        { name: "BBC World News", url: "http://feeds.bbci.co.uk/news/world/rss.xml" },
        { name: "ABC News (US)", url: "https://abcnews.go.com/abcnews/usheadlines" },
        { name: "Fox News", url: "https://moxie.foxnews.com/google-publisher/world.xml" },
        { name: "TMZ Entertainment", url: "https://www.tmz.com/rss.xml" },
        { name: "TechCrunch", url: "https://techcrunch.com/feed/" }
      ];
      saveFeeds();
    }
  }

  // --- Render sidebar ---
  function renderFeedList() {
    feedListContainer.innerHTML = '';
    feeds.forEach((feed, index) => {
      const item = document.createElement('div');
      item.className = 'feed-item';
      item.dataset.url = feed.url;
      item.dataset.index = index;
      item.innerHTML = `
        <span>${feed.name}</span>
        <button class="delete-feed-btn"><i class="fas fa-times"></i></button>
      `;
      feedListContainer.appendChild(item);
    });
  }

  // --- Fetch feed ---
  async function fetchAndDisplayFeed(url, feedElement) {
    articleContainer.innerHTML = '<div class="loading-spinner"></div>';
    document.querySelectorAll('.feed-item').forEach(i => i.classList.remove('active-feed'));
    if (feedElement) feedElement.classList.add('active-feed');

    try {
      const res = await fetch(`${CORS_PROXY}${encodeURIComponent(url)}`);
      const text = await res.text();
      const data = new DOMParser().parseFromString(text, "text/xml");
      const items = data.querySelectorAll("item");

      articleContainer.innerHTML = '';
      items.forEach(item => {
        const title = item.querySelector("title")?.textContent || 'No Title';
        const link = item.querySelector("link")?.textContent || '#';
        const description = (item.querySelector("description")?.textContent || '').replace(/<[^>]*>?/gm, "").substring(0, 150);
        const pubDate = item.querySelector("pubDate")?.textContent ? new Date(item.querySelector("pubDate").textContent).toLocaleDateString() : '';

        const media = item.querySelector("media\\:content, enclosure, content");
        const thumbnail = media?.getAttribute("url") || '';

        const card = document.createElement('div');
        card.className = 'article-card';
        card.innerHTML = `
          ${thumbnail ? `<img src="${thumbnail}" class="article-thumb">` : ''}
          <div class="article-info">
            <a href="${link}" target="_blank" class="article-title">${title}</a>
            <p>${description}...</p>
            <small>${pubDate}</small>
          </div>
          <div class="article-actions">
            <button class="share-btn"><i class="fas fa-share-alt"></i></button>
            <button class="bookmark-btn"><i class="fas fa-bookmark"></i></button>
          </div>
        `;
        articleContainer.appendChild(card);

        // Share button
        card.querySelector('.share-btn').addEventListener('click', () => {
          if (navigator.share) {
            navigator.share({ title, url: link });
          } else {
            navigator.clipboard.writeText(link);
            alert('Link copied!');
          }
        });

        // Bookmark button
        card.querySelector('.bookmark-btn').addEventListener('click', () => {
          const bookmarks = document.getElementById('bookmarks');
          const clone = card.cloneNode(true);
          clone.querySelectorAll('.share-btn,.bookmark-btn').forEach(b => b.remove());
          bookmarks.appendChild(clone);
        });
      });
    } catch (err) {
      articleContainer.innerHTML = `<p>Failed to load feed. ${err.message}</p>`;
    }
  }

  // --- Events ---
  addFeedBtn.addEventListener('click', () => addFeedModal.classList.remove('hidden'));
  cancelFeedBtn.addEventListener('click', () => addFeedModal.classList.add('hidden'));
  saveFeedBtn.addEventListener('click', () => {
    const name = document.getElementById('feed-name-input').value.trim();
    const url = document.getElementById('feed-url-input').value.trim();
    if (name && url) {
      feeds.push({ name, url });
      saveFeeds();
      renderFeedList();
      addFeedModal.classList.add('hidden');
    }
  });

  feedListContainer.addEventListener('click', e => {
    const feedEl = e.target.closest('.feed-item');
    if (!feedEl) return;
    if (e.target.closest('.delete-feed-btn')) {
      feeds.splice(feedEl.dataset.index, 1);
      saveFeeds();
      renderFeedList();
      if (feeds.length) fetchAndDisplayFeed(feeds[0].url, document.querySelector('.feed-item'));
      return;
    }
    fetchAndDisplayFeed(feedEl.dataset.url, feedEl);
  });

  bookmarksBtn.addEventListener('click', () => bookmarksModal.classList.remove('hidden'));
  closeBookmarksBtn.addEventListener('click', () => bookmarksModal.classList.add('hidden'));
  howToBtn.addEventListener('click', () => howToModal.classList.remove('hidden'));
  closeHowToBtn.addEventListener('click', () => howToModal.classList.add('hidden'));
  resetBtn.addEventListener('click', () => {
    localStorage.removeItem('commandCenterFeeds');
    loadFeeds();
    renderFeedList();
    fetchAndDisplayFeed(feeds[0].url, document.querySelector('.feed-item'));
  });

  // Search
  searchBtn.addEventListener('click', () => {
    const query = searchInput.value.trim();
    if (query) window.open(`https://duckduckgo.com/?q=${encodeURIComponent(query)}`, '_blank');
  });
  searchInput.addEventListener('keypress', e => {
    if (e.key === 'Enter') searchBtn.click();
  });

  // --- Init ---
  function init() {
    loadFeeds();
    renderFeedList();
    if (feeds.length) fetchAndDisplayFeed(feeds[0].url, document.querySelector('.feed-item'));
  }
  init();
});
