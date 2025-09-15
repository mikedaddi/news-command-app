// --- DOM READY ---
document.addEventListener('DOMContentLoaded', () => {
  const feedListContainer = document.getElementById('feed-list');
  const articleContainer = document.getElementById('article-container');
  const addFeedBtn = document.getElementById('add-feed-btn');
  const addFeedModal = document.getElementById('add-feed-modal');
  const saveFeedBtn = document.getElementById('save-feed-btn');
  const cancelFeedBtn = document.getElementById('cancel-feed-btn');
  const howToBtn = document.getElementById('how-to-btn');
  const howToModal = document.getElementById('how-to-modal');
  const closeHowToBtn = document.getElementById('close-how-to-btn');
  const searchInput = document.getElementById('search-input');
  const searchBtn = document.getElementById('search-btn');

  const CORS_PROXY_URL = 'https://api.allorigins.win/raw?url=';
  let feeds = [];

  // --- FETCH FEED ---
  async function fetchAndDisplayFeed(feedUrl, feedElement) {
    articleContainer.innerHTML = '<div class="loading-spinner"></div>';
    document.querySelectorAll('.feed-item').forEach(item => item.classList.remove('active-feed'));
    if (feedElement) feedElement.classList.add('active-feed');

    try {
      const response = await fetch(`${CORS_PROXY_URL}${encodeURIComponent(feedUrl)}`);
      if (!response.ok) throw new Error(`Status: ${response.status}`);
      const str = await response.text();
      const data = new window.DOMParser().parseFromString(str, "text/xml");

      articleContainer.innerHTML = '';
      const items = data.querySelectorAll("item");

      if (items.length === 0) {
        articleContainer.innerHTML = `<p style="text-align: center;">This feed is empty or invalid.</p>`;
        return;
      }

      items.forEach(item => {
        const title = item.querySelector("title")?.textContent || 'No Title';
        const link = item.querySelector("link")?.textContent || '#';
        const description = (item.querySelector("description")?.textContent || '')
          .replace(/<[^>]*>?/gm, "")
          .substring(0, 200);
        const pubDate = item.querySelector("pubDate")?.textContent
          ? new Date(item.querySelector("pubDate").textContent).toLocaleDateString()
          : 'No Date';

        const articleCard = `
          <a href="${link}" target="_blank" rel="noopener noreferrer" class="article-card">
            <div class="article-content">
              <h2>${title}</h2>
              <p>${description}...</p>
              <div class="article-meta"><span>${pubDate}</span></div>
            </div>
          </a>
        `;
        articleContainer.insertAdjacentHTML('beforeend', articleCard);
      });
    } catch (error) {
      console.error('Fetch Error:', error);
      articleContainer.innerHTML = `<p style="color: var(--accent-red); text-align:center;">Failed to load feed. Error: ${error.message}</p>`;
    }
  }

  // --- SAVE FEEDS ---
  function saveFeeds() {
    localStorage.setItem('commandCenterFeeds', JSON.stringify(feeds));
  }

  function loadFeeds() {
    const savedFeeds = localStorage.getItem('commandCenterFeeds');
    if (savedFeeds && JSON.parse(savedFeeds).length > 0) {
      feeds = JSON.parse(savedFeeds);
    } else {
      feeds = [
        { name: "BBC World News", url: "http://feeds.bbci.co.uk/news/world/rss.xml" },
        { name: "ABC News (US)", url: "https://abcnews.go.com/abcnews/topstories" },
        { name: "Fox News", url: "https://feeds.foxnews.com/foxnews/latest" },
        { name: "TMZ Entertainment", url: "https://www.tmz.com/rss.xml" },
        { name: "Variety", url: "https://variety.com/feed/" },
        { name: "TechCrunch", url: "https://techcrunch.com/feed/" }
      ];
      saveFeeds();
    }
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

  // --- EVENT LISTENERS ---
  addFeedBtn.addEventListener('click', () => addFeedModal.classList.remove('hidden'));
  cancelFeedBtn.addEventListener('click', () => addFeedModal.classList.add('hidden'));
  howToBtn.addEventListener('click', () => howToModal.classList.remove('hidden'));
  closeHowToBtn.addEventListener('click', () => howToModal.classList.add('hidden'));

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
    } else {
      alert('Please provide both a name and a valid URL.');
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

  // --- SEARCH ---
  searchBtn.addEventListener('click', () => {
    const query = searchInput.value.trim();
    if (!query) return;

    const duckUrl = `https://duckduckgo.com/?q=${encodeURIComponent(query)}`;
    window.open(duckUrl, '_blank');
  });

  // --- INITIALIZATION ---
  function initializeApp(isReload = false) {
    if (!isReload) {
      loadFeeds();
    }
    renderFeedList();
    const firstFeed = document.querySelector('.feed-item');
    if (firstFeed) {
      const firstFeedUrl = firstFeed.dataset.url;
      fetchAndDisplayFeed(firstFeedUrl, firstFeed);
    } else {
      articleContainer.innerHTML = '<p style="text-align:center;">Click "+" to add a feed.</p>';
    }
  }

  initializeApp();
});
