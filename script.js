// --- Wait for DOM ---
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
  const bookmarksBtn = document.getElementById('bookmarks-btn');
  const bookmarksModal = document.getElementById('bookmarks-modal');
  const closeBookmarksBtn = document.getElementById('close-bookmarks-btn');
  const resetBtn = document.getElementById('reset-btn');

  const CORS_PROXY = "https://api.allorigins.win/raw?url=";
  let feeds = [];

  // --- Feed Handling ---
  async function fetchAndDisplayFeed(feedUrl, feedElement) {
    articleContainer.innerHTML = '<p>Loading...</p>';
    document.querySelectorAll('.feed-item').forEach(i => i.classList.remove('active-feed'));
    if (feedElement) feedElement.classList.add('active-feed');

    try {
      const res = await fetch(`${CORS_PROXY}${encodeURIComponent(feedUrl)}`);
      const text = await res.text();
      const data = new window.DOMParser().parseFromString(text, "text/xml");

      articleContainer.innerHTML = '';
      const items = data.querySelectorAll("item");

      if (!items.length) {
        articleContainer.innerHTML = "<p>No articles found.</p>";
        return;
      }

      items.forEach(item => {
        const title = item.querySelector("title")?.textContent || "No Title";
        const link = item.querySelector("link")?.textContent || "#";
        const description = (item.querySelector("description")?.textContent || "")
          .replace(/<[^>]*>?/gm, "")
          .substring(0, 200);
        const pubDate = item.querySelector("pubDate")?.textContent
          ? new Date(item.querySelector("pubDate").textContent).toLocaleDateString()
          : "";

        const thumbnail = item.querySelector("media\\:thumbnail")?.getAttribute("url") ||
                          item.querySelector("media\\:content")?.getAttribute("url") || "";

        const card = `
          <div class="article-card">
            ${thumbnail ? `<img src="${thumbnail}" alt="thumbnail" class="thumb" />` : ""}
            <div class="article-body">
              <a href="${link}" target="_blank" class="article-title">${title}</a>
              <p>${description}...</p>
              <span class="pub-date">${pubDate}</span>
              <div class="article-actions">
                <button class="share-btn"><i class="fas fa-share-alt"></i></button>
                <button class="bookmark-btn"><i class="fas fa-bookmark"></i></button>
              </div>
            </div>
          </div>
        `;
        articleContainer.insertAdjacentHTML("beforeend", card);
      });

      bindArticleButtons();

    } catch (err) {
      console.error(err);
      articleContainer.innerHTML = `<p>Error loading feed: ${err.message}</p>`;
    }
  }

  function saveFeeds() {
    localStorage.setItem('feeds', JSON.stringify(feeds));
  }

  function loadFeeds() {
    const saved = localStorage.getItem('feeds');
    if (saved) {
      feeds = JSON.parse(saved);
    } else {
      feeds = [
        { name: "BBC World News", url: "http://feeds.bbci.co.uk/news/world/rss.xml" },
        { name: "ABC News (US)", url: "https://abcnews.go.com/abcnews/topstories" },
        { name: "Fox News", url: "https://feeds.foxnews.com/foxnews/latest" },
        { name: "TMZ Entertainment", url: "https://www.tmz.com/rss.xml" },
        { name: "TechCrunch", url: "https://techcrunch.com/feed/" }
      ];
      saveFeeds();
    }
  }

  function renderFeedList() {
    feedListContainer.innerHTML = '';
    feeds.forEach((feed, i) => {
      const el = `
        <div class="feed-item" data-url="${feed.url}" data-index="${i}">
          <span>${feed.name}</span>
          <button class="delete-feed-btn">x</button>
        </div>
      `;
      feedListContainer.insertAdjacentHTML('beforeend', el);
    });
  }

  function bindArticleButtons() {
    document.querySelectorAll('.bookmark-btn').forEach(btn => {
      btn.addEventListener('click', e => {
        const card = e.target.closest('.article-card').cloneNode(true);
        card.querySelectorAll('.bookmark-btn, .share-btn').forEach(b => b.remove());
        document.getElementById('bookmarks').appendChild(card);
      });
    });

    document.querySelectorAll('.share-btn').forEach(btn => {
      btn.addEventListener('click', e => {
        const title = e.target.closest('.article-card').querySelector('.article-title').innerText;
        const link = e.target.closest('.article-card').querySelector('.article-title').href;
        if (navigator.share) {
          navigator.share({ title, url: link });
        } else {
          alert(`Share this link: ${link}`);
        }
      });
    });
  }

  // --- Event Listeners ---
  addFeedBtn.addEventListener('click', () => addFeedModal.classList.remove('hidden'));
  cancelFeedBtn.addEventListener('click', () => addFeedModal.classList.add('hidden'));
  howToBtn.addEventListener('click', () => howToModal.classList.remove('hidden'));
  closeHowToBtn.addEventListener('click', () => howToModal.classList.add('hidden'));
  bookmarksBtn.addEventListener('click', () => bookmarksModal.classList.remove('hidden'));
  closeBookmarksBtn.addEventListener('click', () => bookmarksModal.classList.add('hidden'));

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

  resetBtn.addEventListener('click', () => {
    localStorage.removeItem('feeds');
    loadFeeds();
    renderFeedList();
    initializeApp(true);
  });

  feedListContainer.addEventListener('click', e => {
    const target = e.target;
    const feedEl = target.closest('.feed-item');

    if (target.classList.contains('delete-feed-btn')) {
      const index = feedEl.dataset.index;
      feeds.splice(index, 1);
      saveFeeds();
      renderFeedList();
      initializeApp(true);
    } else if (feedEl) {
      fetchAndDisplayFeed(feedEl.dataset.url, feedEl);
    }
  });

  document.getElementById('search-btn').addEventListener('click', () => {
    const q = document.getElementById('global-search').value.trim();
    if (q) window.open(`https://duckduckgo.com/?q=${encodeURIComponent(q)}`, "_blank");
  });

  document.getElementById('global-search').addEventListener('keypress', e => {
    if (e.key === 'Enter') {
      const q = e.target.value.trim();
      if (q) window.open(`https://duckduckgo.com/?q=${encodeURIComponent(q)}`, "_blank");
    }
  });

  // --- Init ---
  function initializeApp(force = false) {
    if (!force) loadFeeds();
    renderFeedList();
    const first = document.querySelector('.feed-item');
    if (first) fetchAndDisplayFeed(first.dataset.url, first);
  }
  initializeApp();
});
