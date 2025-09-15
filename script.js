document.addEventListener('DOMContentLoaded', () => {
  const feedListContainer = document.getElementById('feed-list');
  const articleContainer = document.getElementById('article-container');
  const addFeedBtn = document.getElementById('add-feed-btn');
  const addFeedModal = document.getElementById('add-feed-modal');
  const saveFeedBtn = document.getElementById('save-feed-btn');
  const cancelFeedBtn = document.getElementById('cancel-feed-btn');
  const searchInput = document.getElementById('search-input');
  const bookmarkSearch = document.getElementById('bookmark-search');

  const CORS_PROXY_URL = 'https://api.allorigins.win/raw?url=';
  let feeds = [];

  // --- Fetch & display feed ---
  async function fetchAndDisplayFeed(feedUrl, feedElement) {
    articleContainer.innerHTML = '<div class="loading-spinner"></div>';
    document.querySelectorAll('.feed-item').forEach(item => item.classList.remove('active-feed'));
    if (feedElement) feedElement.classList.add('active-feed');

    try {
      const response = await fetch(`${CORS_PROXY_URL}${encodeURIComponent(feedUrl)}`);
      if (!response.ok) throw new Error(`Status: ${response.status}`);

      const str = await response.text();
      const data = new DOMParser().parseFromString(str, "text/xml");

      articleContainer.innerHTML = '';
      const items = data.querySelectorAll("item");
      if (items.length === 0) {
        articleContainer.innerHTML = `<p style="text-align:center;">Feed is empty or unrecognized format.</p>`;
        return;
      }

      items.forEach(item => {
        const title = item.querySelector("title")?.textContent || 'No Title';
        const link = item.querySelector("link")?.textContent || '#';
        const description = (item.querySelector("description")?.textContent || '').replace(/<[^>]*>?/gm, "").substring(0, 150);
        const pubDate = item.querySelector("pubDate")?.textContent ? new Date(item.querySelector("pubDate").textContent).toLocaleDateString() : 'No Date';

        const card = `
          <div class="article-card" data-title="${title.toLowerCase()}">
            <h2>${title}</h2>
            <p>${description}...</p>
            <div class="article-meta">${pubDate}</div>
            <a href="${link}" target="_blank">Read more</a>
            <button class="save-btn">🔖 Save</button>
          </div>
        `;
        articleContainer.insertAdjacentHTML('beforeend', card);
      });

      bindSaveButtons();
    } catch (error) {
      console.error('Fetch Error:', error);
      articleContainer.innerHTML = `<p style="color:red; text-align:center;">Failed to load feed. ${error.message}</p>`;
    }
  }

  // --- Save feeds ---
  function saveFeeds() {
    localStorage.setItem('commandCenterFeeds', JSON.stringify(feeds));
  }

  function loadFeeds() {
    const saved = localStorage.getItem('commandCenterFeeds');
    if (saved) {
      feeds = JSON.parse(saved);
    } else {
      feeds = [
        { name: "BBC World News", url: "http://feeds.bbci.co.uk/news/world/rss.xml" },
        { name: "Variety", url: "https://variety.com/feed/" },
        { name: "TechCrunch", url: "https://techcrunch.com/feed/" }
      ];
      saveFeeds();
    }
  }

  function renderFeedList() {
    feedListContainer.innerHTML = '';
    feeds.forEach((feed, index) => {
      const feedHTML = `
        <div class="feed-item" data-url="${feed.url}" data-index="${index}">
          <span>${feed.name}</span>
          <i class="fas fa-times-circle delete-feed-btn" title="Remove"></i>
        </div>
      `;
      feedListContainer.insertAdjacentHTML('beforeend', feedHTML);
    });
  }

  // --- Bookmarking ---
  function bindSaveButtons() {
    document.querySelectorAll('.save-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const article = btn.parentElement.cloneNode(true);
        article.querySelector('.save-btn').remove();
        document.getElementById('bookmarks').appendChild(article);
      });
    });
  }

  // --- Search filter ---
  searchInput.addEventListener('input', () => {
    const q = searchInput.value.toLowerCase();
    document.querySelectorAll('#article-container .article-card').forEach(card => {
      card.style.display = card.dataset.title.includes(q) ? '' : 'none';
    });
  });

  bookmarkSearch.addEventListener('input', () => {
    const q = bookmarkSearch.value.toLowerCase();
    document.querySelectorAll('#bookmarks .article-card').forEach(card => {
      card.style.display = card.dataset.title?.includes(q) ? '' : 'none';
    });
  });

  // --- Event Listeners ---
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

  feedListContainer.addEventListener('click', (e) => {
    const feedElement = e.target.closest('.feed-item');
    if (!feedElement) return;

    if (e.target.matches('.delete-feed-btn')) {
      const index = parseInt(feedElement.dataset.index, 10);
      feeds.splice(index, 1);
      saveFeeds();
      renderFeedList();
      initializeApp(true);
    } else {
      fetchAndDisplayFeed(feedElement.dataset.url, feedElement);
    }
  });

  // --- Dark Mode Toggle ---
  const savedMode = localStorage.getItem('theme');
  if (savedMode) document.body.classList.add(savedMode + '-mode');
  document.getElementById('toggle-dark').addEventListener('click', () => {
    document.body.classList.toggle('dark-mode');
    document.body.classList.toggle('light-mode');
    localStorage.setItem('theme', document.body.classList.contains('dark-mode') ? 'dark' : 'light');
  });

  // --- Initialize ---
  function initializeApp(isReload = false) {
    if (!isReload) loadFeeds();
    renderFeedList();
    const firstFeed = document.querySelector('.feed-item');
    if (firstFeed) fetchAndDisplayFeed(firstFeed.dataset.url, firstFeed);
  }
  initializeApp();
});
