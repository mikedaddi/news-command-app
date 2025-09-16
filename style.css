:root {
  --bg: #121212;
  --fg: #e0e0e0;
  --accent: #00cfff;
  --card-bg: #1e1e1e;
  --card-border: #333;
  --btn-bg: #00cfff;
  --btn-fg: #121212;
  --toast-bg: #333;
}

body {
  margin: 0;
  font-family: 'Segoe UI', sans-serif;
  background: var(--bg);
  color: var(--fg);
}

.topbar {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  border-bottom: 1px solid var(--card-border);
}
.topbar .app-logo {
  height: 50px;
  margin-right: 1rem;
}
.topbar h1 {
  flex: 1;
  text-align: center;
}
.search-bar {
  display: flex;
  background: var(--card-bg);
  border-radius: 6px;
  overflow: hidden;
}
.search-bar input {
  border: none;
  padding: 0.5rem;
  background: transparent;
  color: var(--fg);
}
.search-bar button {
  background: var(--btn-bg);
  color: var(--btn-fg);
  border: none;
  padding: 0.5rem 1rem;
  cursor: pointer;
}

.container {
  display: flex;
}

.sidebar {
  width: 250px;
  background: #1a1a1a;
  padding: 1rem;
  border-right: 1px solid var(--card-border);
}
.sidebar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.sidebar h2 {
  margin: 0;
}
.feed-list {
  margin-top: 1rem;
}
.feed-item {
  display: flex;
  justify-content: space-between;
  padding: 0.5rem;
  margin-bottom: 0.3rem;
  background: var(--card-bg);
  border-radius: 4px;
  cursor: pointer;
}
.feed-item span { flex: 1; }
.feed-item:hover { background: #2a2a2a; }
.feed-item i { color: red; cursor: pointer; }

main {
  flex: 1;
  padding: 1rem;
}

.article-card {
  display: flex;
  gap: 1rem;
  background: var(--card-bg);
  border: 1px solid var(--card-border);
  border-radius: 6px;
  padding: 1rem;
  margin-bottom: 1rem;
}
.article-card .thumb {
  flex: 0 0 120px;
}
.article-card .thumb img {
  width: 120px;
  height: 90px;
  object-fit: cover;
  border-radius: 4px;
}
.article-card .article-body {
  flex: 1;
}
.article-card h3 a {
  color: var(--accent);
  text-decoration: none;
}
.card-actions {
  display: flex;
  gap: 0.5rem;
  margin-top: 0.5rem;
}
.card-actions button {
  background: #333;
  color: var(--fg);
  border: none;
  padding: 0.3rem 0.6rem;
  cursor: pointer;
  border-radius: 4px;
}

.modal {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0,0,0,0.6);
  display: flex;
  align-items: center;
  justify-content: center;
}
.modal.hidden { display: none; }
.modal-content {
  background: var(--card-bg);
  padding: 2rem;
  border-radius: 6px;
}

.toast {
  position: fixed;
  bottom: 1rem; left: 50%;
  transform: translateX(-50%);
  background: var(--toast-bg);
  color: var(--fg);
  padding: 0.5rem 1rem;
  border-radius: 6px;
  opacity: 0;
  transition: opacity 0.3s;
}
.toast.show { opacity: 1; }
