document.addEventListener('DOMContentLoaded', () => {
  const feedListContainer = document.getElementById('feed-list');
  const articleContainer = document.getElementById('article-container');
  const addFeedBtn = document.getElementById('add-feed-btn');
  const addFeedModal = document.getElementById('add-feed-modal');
  const saveFeedBtn = document.getElementById('save-feed-btn');
  const cancelFeedBtn = document.getElementById('cancel-feed-btn');
  const bookmarksBtn = document.getElementById('bookmarks-btn');
  const bookmarksModal = document.getElementById('bookmarks-modal');
  const closeBookmarks = document.getElementById('close-bookmarks');
  const bookmarksList = document.getElementById('bookmarks-list');
  const resetFeedsBtn = document.getElementById('reset-feeds-btn');
  const setDefaultBtn = document.getElementById('set-default-btn');
  const searchForm = document.getElementById('search-form');
  const searchInput = document.getElementById('search-input');

  const CORS_PROXY_URL = 'https://api.allorigins.win/raw?url=';

  // --- Default Feeds ---
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

  // --- Fetch and Render Articles ---
  async function fetchAndDisplayFeed(feedUrl, feedElement) {
    articleContainer.innerHTML = '<div class="loading-spinner"></div>';
    document.querySelectorAll('.feed-item').forEach(item => item.classList.remove('active-feed'));
    if (feedElement) feedElement.classList.add('active-feed');

    try {
      const response = await fetch(`${CORS_PROXY_URL}${encodeURIComponent(feedUrl)}`);
      const str = await response.text();
      const data = new window.DOMParser().parseFromString(str, "text/xml");

      articleContainer.innerHTML = '';
      const items = data.querySelectorAll("item");

      if (items.length === 0) {
        articleContainer.innerHTML = `<p style="text-align: center;">No articles found.</p>`;
        return;
      }

      items.forEach(item => {
        const title = item.querySelector("title")?.textContent || 'No Title';
        const link = item.querySelector("link")?.textContent || '#';
        const description = (item.querySelector("description")?.textContent || '')
          .replace(/<[^>]*>?/gm, "").substring(0, 150);
        const pubDate = item.querySelector("pubDate")?.textContent
          ? new Date(item.querySelector("pubDate").textContent).toLocaleDateString()
          : '';

        // Media detection
        let mediaHTML = '';
        const enclosure = item.querySelector("enclosure");
        if (enclosure) {
          const type = enclosure.getAttribute("type");
          const url = enclosure.getAttribute("url");
          if (type?.includes("audio")) {
            mediaHTML = `<audio controls src="${url}"></audio>`;
          } else if (type?.includes("video")) {
            mediaHTML = `<video controls src="${url}"></video>`;
          }
        }

        const articleCard = `
          <div class="article-card">
            <div class="article-header">
              <h2><a href="${link}" target="_blank">${title}</a></h2>
              <button class="bookmark-btn" data-title="${title}" data-link="${link}">🔖</button>
            </div>
            <p>${description}...</p>
            ${mediaHTML}
            <small>${pubDate}</small>
            <div class="share-buttons">
              <button onclick="navigator.share ? navigator.share({title: '${title}', url: '${link}'}) : alert('Sharing not supported')">Share</button>
            </div>
          </div>
        `;
        articleContainer.insertAdjacentHTML('beforeend', articleCard);
      });

      bindBookmarkButtons();

    } catch (error) {
      articleContainer.innerHTML = `<p style="text-align:center; color:red;">Failed to load feed.</p>`;
    }
  }

  // --- Bookmark Logic ---
  function bindBookmarkButtons() {
    document.querySelectorAll('.bookmark-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const title = btn.dataset.title;
        const link = btn.dataset.link;

        const card = document.createElement('div');
        card.className = 'article-card';
        card.innerHTML = `<h2><a href="${link}" target="_blank">${title}</a></h2>`;

        bookmarksList.appendChild(card);
      });
    });
  }

  // --- Save / Load Feeds ---
  function saveFeeds() {
    localStorage.setItem('commandCenterFeeds', JSON.stringify(feeds));
  }

  function loadFeeds() {
    const savedFeeds = localStorage.getItem('commandCenterFeeds');
    feeds = savedFeeds ? JSON.parse(savedFeeds) : DEFAULT_FEEDS;
  }

  function setAsDefaultFeeds() {
    localStorage.setItem('commandCenterDefaultFeeds', JSON.stringify(feeds));
    alert("✅ Current feeds set as your default.");
  }

  function resetToDefaultFeeds() {
    const storedDefault = localStorage.getItem('commandCenterDefaultFeeds');
    feeds = storedDefault ? JSON.parse(storedDefault) : DEFAULT_FEEDS;
    saveFeeds();
    renderFeedList();
    initializeApp(true);
  }

  function renderFeedList() {
    feedListContainer.innerHTML = '';
    feeds.forEach((feed, index) => {
      const feedItemHTML = `
        <div class="feed-item" data-url="${feed.url}" data-index="${index}">
          <span>${feed.name}</span>
          <i class="fas fa-times-circle delete-feed-btn"></i>
        </div>
      `;
      feedListContainer.insertAdjacentHTML('beforeend', feedItemHTML);
    });
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
    } else {
      alert('Please provide both name and URL.');
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
  closeBookmarks.addEventListener('click', () => bookmarksModal.classList.add('hidden'));
  resetFeedsBtn.addEventListener('click', resetToDefaultFeeds);
  setDefaultBtn.addEventListener('click', setAsDefaultFeeds);

  searchForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const query = searchInput.value.trim();
    if (query) {
      window.open(`https://duckduckgo.com/?q=${encodeURIComponent(query)}`, '_blank');
    }
  });

  // --- Init ---
  function initializeApp(isReload = false) {
    if (!isReload) {
      loadFeeds();
    }
    renderFeedList();
    const firstFeed = document.querySelector('.feed-item');
    if (firstFeed) {
      fetchAndDisplayFeed(firstFeed.dataset.url, firstFeed);
    }
  }

  initializeApp();
});
