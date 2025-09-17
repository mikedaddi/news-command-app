document.addEventListener('DOMContentLoaded', () => {
  const feedListContainer = document.getElementById('feed-list');
  const articleContainer = document.getElementById('article-container');
  const addFeedBtn = document.getElementById('add-feed-btn');
  const addFeedModal = document.getElementById('add-feed-modal');
  const saveFeedBtn = document.getElementById('save-feed-btn');
  const cancelFeedBtn = document.getElementById('cancel-feed-btn');
  const resetFeedsBtn = document.getElementById('reset-feeds-btn');
  const bookmarksBtn = document.getElementById('bookmarks-btn');
  const bookmarksModal = document.getElementById('bookmarks-modal');
  const closeBookmarksBtn = document.getElementById('close-bookmarks-btn');
  const searchInput = document.getElementById('search-input');

  const CORS_PROXY_URL = 'https://api.allorigins.win/raw?url=';
  let feeds = [];

  const defaultFeeds = [
    { name: "BBC World News", url: "http://feeds.bbci.co.uk/news/world/rss.xml" },
    { name: "Variety Entertainment", url: "https://variety.com/feed/" },
    { name: "TechCrunch", url: "https://techcrunch.com/feed/" },
    { name: "The Hollywood Reporter", url: "https://www.hollywoodreporter.com/c/news/feed/" }
  ];

  async function fetchAndDisplayFeed(feedUrl, feedElement) {
    articleContainer.innerHTML = '<p style="text-align:center;">Loading...</p>';
    document.querySelectorAll('.feed-item').forEach(item => item.classList.remove('active-feed'));
    if (feedElement) feedElement.classList.add('active-feed');

    try {
      const response = await fetch(`${CORS_PROXY_URL}${encodeURIComponent(feedUrl)}`);
      const str = await response.text();
      const data = new window.DOMParser().parseFromString(str, "text/xml");

      articleContainer.innerHTML = '';
      const items = data.querySelectorAll("item");

      if (items.length === 0) {
        articleContainer.innerHTML = '<p style="text-align:center;">No articles available.</p>';
        return;
      }

      items.forEach(item => {
        const title = item.querySelector("title")?.textContent || 'No Title';
        const link = item.querySelector("link")?.textContent || '#';
        const description = (item.querySelector("description")?.textContent || '')
          .replace(/<[^>]*>?/gm, "")
          .substring(0, 150);
        const pubDate = item.querySelector("pubDate")?.textContent
          ? new Date(item.querySelector("pubDate").textContent).toLocaleDateString()
          : 'No Date';

        const articleCard = `
          <a href="${link}" target="_blank" rel="noopener noreferrer" class="article-card">
            <div class="article-content">
              <h2>${title}</h2>
              <p>${description}...</p>
              <div class="article-meta">
                <span>${pubDate}</span>
              </div>
            </div>
          </a>
        `;
        articleContainer.insertAdjacentHTML('beforeend', articleCard);
      });

    } catch (err) {
      console.error('Feed Error:', err);
      articleContainer.innerHTML = `<p style="text-align:center;color:red;">Failed to load feed.</p>`;
    }
  }

  function saveFeeds() {
    localStorage.setItem('deevoFeeds', JSON.stringify(feeds));
  }

  function loadFeeds() {
    const savedFeeds = localStorage.getItem('deevoFeeds');
    if (savedFeeds) {
      feeds = JSON.parse(savedFeeds);
    } else {
      feeds = [...defaultFeeds];
      saveFeeds();
    }
  }

  function renderFeedList() {
    feedListContainer.innerHTML = '';
    feeds.forEach((feed, index) => {
      const feedItemHTML = `
        <div class="feed-item" data-url="${feed.url}" data-index="${index}">
          <span>${feed.name}</span>
          <span class="delete-feed-btn">✖</span>
        </div>
      `;
      feedListContainer.insertAdjacentHTML('beforeend', feedItemHTML);
    });
  }

  addFeedBtn.addEventListener('click', () => addFeedModal.classList.remove('hidden'));
  cancelFeedBtn.addEventListener('click', () => addFeedModal.classList.add('hidden'));
  resetFeedsBtn.addEventListener('click', () => {
    feeds = [...defaultFeeds];
    saveFeeds();
    renderFeedList();
    initializeApp(true);
  });

  saveFeedBtn.addEventListener('click', () => {
    const feedNameInput = document.getElementById('feed-name-input');
    const feedUrlInput = document.getElementById('feed-url-input');
    const name = feedNameInput.value.trim();
    const url = feedUrlInput.value.trim();
    if (name && url) {
      feeds.push({ name, url });
      saveFeeds();
      renderFeedList();
      feedNameInput.value = '';
      feedUrlInput.value = '';
      addFeedModal.classList.add('hidden');
    }
  });

  feedListContainer.addEventListener('click', (event) => {
    const target = event.target;
    const feedElement = target.closest('.feed-item');

    if (target.matches('.delete-feed-btn')) {
      event.stopPropagation();
      const indexToDelete = parseInt(feedElement.dataset.index, 10);
      feeds.splice(indexToDelete, 1);
      saveFeeds();
      renderFeedList();
      initializeApp(true);
    } else if (feedElement) {
      const feedUrl = feedElement.dataset.url;
      fetchAndDisplayFeed(feedUrl, feedElement);
    }
  });

  bookmarksBtn.addEventListener('click', () => bookmarksModal.classList.remove('hidden'));
  closeBookmarksBtn.addEventListener('click', () => bookmarksModal.classList.add('hidden'));

  searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      const query = searchInput.value.trim();
      if (query) {
        const url = `https://duckduckgo.com/?q=${encodeURIComponent(query)}`;
        window.open(url, '_blank');
      }
    }
  });

  function initializeApp(isReload = false) {
    if (!isReload) loadFeeds();
    renderFeedList();
    const firstFeed = document.querySelector('.feed-item');
    if (firstFeed) fetchAndDisplayFeed(firstFeed.dataset.url, firstFeed);
  }

  initializeApp();
});
