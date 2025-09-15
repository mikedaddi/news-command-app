document.addEventListener('DOMContentLoaded', () => {
    // --- Get the key players on the board ---
    const feedListContainer = document.getElementById('feed-list');
    const articleContainer = document.getElementById('article-container');
    const addFeedBtn = document.getElementById('add-feed-btn');
    const addFeedModal = document.getElementById('add-feed-modal');
    const saveFeedBtn = document.getElementById('save-feed-btn');
    const cancelFeedBtn = document.getElementById('cancel-feed-btn');
    const howToBtn = document.getElementById('how-to-btn');
    const howToModal = document.getElementById('how-to-modal');
    const closeHowToBtn = document.getElementById('close-how-to-btn');
    const themeToggleBtn = document.getElementById('theme-toggle');
    const feedFilterInput = document.getElementById('feed-filter-input');

    const CORS_PROXY_URL = 'https://api.allorigins.win/raw?url=';
    let feeds = [];

    // --- CORE FUNCTIONALITY (largely the same) ---
    async function fetchAndDisplayFeed(feedUrl, feedElement) {
        articleContainer.innerHTML = '<div class="loading-spinner"></div>';
        document.querySelectorAll('.feed-item').forEach(item => item.classList.remove('active-feed'));
        if (feedElement) feedElement.classList.add('active-feed');

        try {
            const response = await fetch(`${CORS_PROXY_URL}${encodeURIComponent(feedUrl)}`);
            if (!response.ok) throw new Error(`Network response was not ok`);
            const str = await response.text();
            const data = new window.DOMParser().parseFromString(str, "text/xml");
            
            articleContainer.innerHTML = '';
            const items = data.querySelectorAll("item");
            if (items.length === 0) throw new Error("Feed is empty or in an unrecognized format");

            items.forEach(item => {
                const title = item.querySelector("title")?.textContent || 'No Title';
                const link = item.querySelector("link")?.textContent || '#';
                const description = (item.querySelector("description")?.textContent || '').replace(/<[^>]*>?/gm, "").substring(0, 150);
                const author = item.querySelector("author")?.textContent || item.querySelector("dc\\:creator")?.textContent || 'Unknown Author';
                const pubDate = item.querySelector("pubDate")?.textContent ? new Date(item.querySelector("pubDate").textContent).toLocaleDateString() : 'No Date';
                const mediaContent = item.querySelector("media\\:content, content");
                const thumbnail = mediaContent ? mediaContent.getAttribute("url") : '';
                
                const articleCard = `
                    <a href="${link}" target="_blank" rel="noopener noreferrer" class="article-card">
                        ${thumbnail ? `<img src="${thumbnail}" class="article-image" alt="Article thumbnail">` : '<div class="article-image"></div>'}
                        <div class="article-content">
                            <h2>${title}</h2>
                            <p>${description}...</p>
                            <div class="article-meta">
                                <span>${author}</span> | <span>${pubDate}</span>
                            </div>
                        </div>
                    </a>
                `;
                articleContainer.insertAdjacentHTML('beforeend', articleCard);
            });
        } catch (error) {
            console.error('Fetch Error:', error);
            articleContainer.innerHTML = `<p style="text-align: center; color: var(--accent-red);">Failed to load feed. The source may be invalid or the server is blocking requests.</p>`;
        }
    }

    // --- Data Management Functions ---
    function saveFeeds() { localStorage.setItem('commandCenterFeeds', JSON.stringify(feeds)); }
    function loadFeeds() {
        const savedFeeds = localStorage.getItem('commandCenterFeeds');
        if (savedFeeds && JSON.parse(savedFeeds).length > 0) {
            feeds = JSON.parse(savedFeeds);
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
            const feedItemHTML = `
                <div class="feed-item" data-url="${feed.url}" data-index="${index}">
                    <span>${feed.name}</span>
                    <i class="fas fa-times delete-feed-btn"></i>
                </div>
            `;
            feedListContainer.insertAdjacentHTML('beforeend', feedItemHTML);
        });
    }

    // --- EVENT LISTENERS ---
    addFeedBtn.addEventListener('click', () => addFeedModal.classList.remove('hidden'));
    cancelFeedBtn.addEventListener('click', () => addFeedModal.classList.add('hidden'));
    howToBtn.addEventListener('click', () => howToModal.classList.remove('hidden'));
    closeHowToBtn.addEventListener('click', () => howToModal.classList.add('hidden');

    saveFeedBtn.addEventListener('click', () => {
        const feedNameInput = document.getElementById('feed-name-input');
        const feedUrlInput = document.getElementById('feed-url-input');
        const name = feedNameInput.value.trim();
        const url = feedUrlInput.value.trim();
        if (name && url) {
            feeds.push({ name, url });
            saveFeeds();
            renderFeedList();
            feedNameInput.value = ''; feedUrlInput.value = '';
            addFeedModal.classList.add('hidden');
        } else { alert('Please provide both a name and a valid URL.'); }
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
            fetchAndDisplayFeed(feedElement.dataset.url, feedElement);
        }
    });

    // --- NEW: FEED FILTER LOGIC ---
    feedFilterInput.addEventListener('keyup', () => {
        const filterText = feedFilterInput.value.toLowerCase();
        document.querySelectorAll('.feed-item').forEach(feedItem => {
            const feedName = feedItem.querySelector('span').textContent.toLowerCase();
            if (feedName.includes(filterText)) {
                feedItem.classList.remove('hidden');
            } else {
                feedItem.classList.add('hidden');
            }
        });
    });

    // --- NEW: THEME TOGGLE LOGIC ---
    themeToggleBtn.addEventListener('click', () => {
        document.body.classList.toggle('light-mode');
        const icon = themeToggleBtn.querySelector('i');
        if (document.body.classList.contains('light-mode')) {
            localStorage.setItem('theme', 'light');
            icon.classList.remove('fa-moon');
            icon.classList.add('fa-sun');
        } else {
            localStorage.setItem('theme', 'dark');
            icon.classList.remove('fa-sun');
            icon.classList.add('fa-moon');
        }
    });

    // --- INITIALIZATION ---
    function initializeApp(isReload = false) {
        if (!isReload) loadFeeds();
        renderFeedList();
        const firstFeed = document.querySelector('.feed-item');
        if (firstFeed) {
            fetchAndDisplayFeed(firstFeed.dataset.url, firstFeed);
        } else {
            articleContainer.innerHTML = '<p style="text-align: center;">Click the "+" to add a feed and get started.</p>';
        }

        // Load saved theme
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme === 'light') {
            document.body.classList.add('light-mode');
            themeToggleBtn.querySelector('i').classList.replace('fa-moon', 'fa-sun');
        }
    }

    initializeApp();
});
