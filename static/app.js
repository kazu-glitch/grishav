const STORAGE_KEY = "otakuhub-state-v2";
const API_BASE = "/api";
let csrfToken = "";

const animePosters = {
  naruto: "https://cdn.myanimelist.net/images/anime/1141/142503l.jpg",
  onePiece: "https://cdn.myanimelist.net/images/anime/1244/138851l.jpg",
  attackOnTitan: "https://cdn.myanimelist.net/images/anime/10/47347l.jpg",
  hunterXHunter: "https://cdn.myanimelist.net/images/anime/1337/99013l.jpg"
};

const reactionOptions = [
  { key: "Ninja Hype", title: "Ninja Hype", imageUrl: animePosters.naruto },
  { key: "Pirate Crew", title: "Pirate Crew", imageUrl: animePosters.onePiece },
  { key: "Titan Shock", title: "Titan Shock", imageUrl: animePosters.attackOnTitan },
  { key: "Nen Boost", title: "Nen Boost", imageUrl: animePosters.hunterXHunter }
];

const news = [
  {
    title: "Spring simulcast slate locks in three premiere windows",
    text: "The seasonal calendar added new late-night drops and two same-day dub watch windows."
  },
  {
    title: "Studio panel confirms extended finale runtime",
    text: "The finale event is now scheduled as a 48-minute watch party with host notes enabled."
  },
  {
    title: "OtakuHub recommendation tuning improved",
    text: "Favorites, rating history, and episode progress now influence suggested group watches."
  }
];

const discoveryRails = [
  {
    title: "Trending with hosts",
    items: [
      { title: "Frieren: Beyond Journey's End", tag: "Fantasy", match: 96 },
      { title: "Demon Slayer: Hashira Training Arc", tag: "Action", match: 91 },
      { title: "Jujutsu Kaisen", tag: "Supernatural", match: 89 }
    ]
  },
  {
    title: "Good for group nights",
    items: [
      { title: "Haikyu!!", tag: "Sports", match: 94 },
      { title: "Spy x Family", tag: "Comedy", match: 90 },
      { title: "Mob Psycho 100", tag: "Action Comedy", match: 88 }
    ]
  },
  {
    title: "Short watch commitments",
    items: [
      { title: "Cyberpunk: Edgerunners", tag: "Sci-fi", match: 87 },
      { title: "Odd Taxi", tag: "Mystery", match: 85 },
      { title: "Erased", tag: "Thriller", match: 83 }
    ]
  }
];

const seedState = {
  rooms: [
    { id: "room-1", name: "Hidden Leaf Watch Room", anime: "Naruto", episode: 19, capacity: 42, viewers: 31, status: "Live", imageUrl: animePosters.naruto, reactions: { "Ninja Hype": 24, "Nen Boost": 6 } },
    { id: "room-2", name: "Grand Line Crew Night", anime: "One Piece", episode: 1101, capacity: 56, viewers: 44, status: "Scheduled", imageUrl: animePosters.onePiece, reactions: { "Pirate Crew": 18, "Ninja Hype": 7 } },
    { id: "room-3", name: "Survey Corps Sync", anime: "Attack on Titan", episode: 13, capacity: 35, viewers: 28, status: "Private", imageUrl: animePosters.attackOnTitan, reactions: { "Titan Shock": 20, "Pirate Crew": 5 } }
  ],
  anime: [
    { id: "anime-1", title: "Naruto", episodes: 220, watched: 84, rating: 8.0, status: "watching", favorite: true, genre: "Ninja Adventure", studio: "Pierrot", imageUrl: animePosters.naruto },
    { id: "anime-2", title: "One Piece", episodes: 1122, watched: 208, rating: 8.7, status: "watching", favorite: true, genre: "Pirate Adventure", studio: "Toei Animation", imageUrl: animePosters.onePiece },
    { id: "anime-3", title: "Attack on Titan", episodes: 25, watched: 25, rating: 8.6, status: "completed", favorite: true, genre: "Dark Fantasy", studio: "Wit Studio", imageUrl: animePosters.attackOnTitan },
    { id: "anime-4", title: "Hunter x Hunter", episodes: 148, watched: 36, rating: 9.0, status: "watching", favorite: true, genre: "Action Adventure", studio: "Madhouse", imageUrl: animePosters.hunterXHunter }
  ],
  comments: [
    { id: "comment-1", author: "Grishav", target: "Naruto", message: "The Naruto room needs a Team 7 rewatch after this arc.", reaction: "Ninja Hype", createdAt: Date.now() - 1000 * 60 * 38 },
    { id: "comment-2", author: "Ren", target: "One Piece", message: "Grand Line nights are perfect for long watch parties.", reaction: "Pirate Crew", createdAt: Date.now() - 1000 * 60 * 92 },
    { id: "comment-3", author: "Aiko", target: "Attack on Titan", message: "That reveal deserves a spoiler-free review thread.", reaction: "Titan Shock", createdAt: Date.now() - 1000 * 60 * 180 }
  ],
  schedules: [
    { id: "schedule-1", title: "Naruto Ep 85 Watch Party", date: "2026-05-27", time: "20:00", type: "Premiere" },
    { id: "schedule-2", title: "One Piece Grand Line Room", date: "2026-05-29", time: "19:30", type: "Watch Party" },
    { id: "schedule-3", title: "Hunter x Hunter Nen Training Night", date: "2026-06-02", time: "18:00", type: "Watch Party" }
  ],
  notifications: [
    "Naruto Ep 85 starts tomorrow at 20:00.",
    "Ren bookmarked One Piece Ep 208.",
    "Admin review queue has 3 fresh comments."
  ],
  discovery: discoveryRails,
  theme: "dark"
};

let state = loadState();
let activeAnimeFilter = "all";
let apiEnabled = false;
let currentUser = null;
let adminUsers = [];

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => Array.from(document.querySelectorAll(selector));

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>'"]/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;"
  }[character]));
}

function loadState() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return structuredClone(seedState);
  try {
    return { ...structuredClone(seedState), ...JSON.parse(raw) };
  } catch {
    return structuredClone(seedState);
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  if (!apiEnabled) return;
  if (!currentUser || !isAdmin()) return;
  fetch(`${API_BASE}/state`, {
    method: "PUT",
    headers: apiHeaders(),
    body: JSON.stringify(state)
  }).then(async (response) => {
    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      throw new Error(payload.error || "Save failed");
    }
  }).catch((error) => {
    notify(error.message);
  });
}

function apiHeaders(extra = {}) {
  return { "Content-Type": "application/json", "X-CSRFToken": csrfToken, ...extra };
}

async function loadCsrfToken() {
  try {
    const response = await fetch(`${API_BASE}/csrf-token`, {
      cache: "no-store",
      credentials: "same-origin"
    });
    if (!response.ok) throw new Error("CSRF unavailable");
    const payload = await response.json();
    csrfToken = payload.csrf_token || "";
  } catch {
    csrfToken = "";
  }
}

async function loadBackendState() {
  try {
    const response = await fetch(`${API_BASE}/state`);
    if (!response.ok) throw new Error("Backend unavailable");
    const backendState = await response.json();
    state = { ...structuredClone(seedState), ...backendState };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    apiEnabled = true;
  } catch {
    apiEnabled = false;
  }
}

function uid(prefix) {
  return `${prefix}-${crypto.randomUUID ? crypto.randomUUID() : Date.now()}`;
}

function posterFor(item, index = 0) {
  if (item?.imageUrl) return item.imageUrl;
  const values = Object.values(animePosters);
  return values[index % values.length];
}

function trailerFor(anime) {
  try {
    const trailer = new URL(anime.trailerUrl);
    if (["youtube.com", "www.youtube.com", "youtu.be"].includes(trailer.hostname)) return trailer.href;
  } catch {
    // Fall back to a YouTube search when no direct trailer is saved.
  }
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(`${anime.title} official trailer`)}`;
}

function reactionImage(key) {
  return reactionOptions.find((option) => option.key === key)?.imageUrl || animePosters.naruto;
}

function formatDateTime(schedule) {
  const date = new Date(`${schedule.date}T${schedule.time}`);
  return date.toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

function timeUntil(schedule) {
  const target = new Date(`${schedule.date}T${schedule.time}`).getTime();
  const diff = target - Date.now();
  if (diff <= 0) return "Now live";
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  const minutes = Math.floor((diff % 3600000) / 60000);
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

function sortedSchedules() {
  return [...state.schedules].sort((a, b) => new Date(`${a.date}T${a.time}`) - new Date(`${b.date}T${b.time}`));
}

function notify(message) {
  state.notifications.unshift(message);
  state.notifications = state.notifications.slice(0, 12);
  saveState();
  renderNotifications();
  const toast = document.createElement("div");
  toast.className = "toast";
  toast.textContent = message;
  $("#notificationTray").append(toast);
  setTimeout(() => toast.remove(), 3200);
}

function render() {
  document.documentElement.classList.toggle("light", state.theme === "light");
  renderAuth();
  renderStats();
  renderRooms();
  renderAnime();
  renderAnimeInsights();
  renderSchedules();
  renderComments();
  renderDiscovery();
  renderNews();
  renderProfile();
  renderAdmin();
  renderNotifications();
  renderCountdown();
}

function renderStats() {
  const stats = [
    ["Watch Rooms", state.rooms.length],
    ["Anime Tracked", state.anime.length],
    ["Comments", state.comments.length],
    ["Schedules", state.schedules.length]
  ];
  $("#statsGrid").innerHTML = stats.map(([label, value]) => `
    <article class="stat-card">
      <span>${label}</span>
      <strong>${value}</strong>
    </article>
  `).join("");
}

function renderRooms() {
  const query = $("#searchInput").value.trim().toLowerCase();
  const rooms = state.rooms.filter((room) => `${room.name} ${room.anime} ${room.status}`.toLowerCase().includes(query));
  $("#liveRooms").innerHTML = rooms.slice(0, 3).map((room, index) => roomCard(room, index, false)).join("") || emptyState("No watch rooms found.");
  $("#roomsGrid").innerHTML = rooms.map((room, index) => roomCard(room, index, true)).join("") || emptyState("Create the first watch party room.");
}

function roomCard(room, index, full) {
  const reactionButtons = reactionOptions.map((reaction) => `
    <button class="reaction-chip" type="button" data-react-room="${room.id}" data-reaction="${reaction.key}">
      <img src="${reaction.imageUrl}" alt="${reaction.title}">
      <span>${reaction.title}</span>
      <strong>${room.reactions?.[reaction.key] || 0}</strong>
    </button>
  `).join("");
  return `
    <article class="room-card ${full ? "full" : ""}">
      <img class="poster-thumb" src="${escapeHtml(posterFor(room, index))}" alt="${escapeHtml(room.anime)} poster art">
      <div>
        <div class="badge-row">
          <span class="badge ${room.status === "Live" ? "live" : "warn"}">${room.status}</span>
          <span class="badge">${room.viewers || Math.ceil(room.capacity * 0.64)}/${room.capacity} watching</span>
        </div>
          <h4>${escapeHtml(room.name)}</h4>
        <p>${escapeHtml(room.anime)} - Episode ${Number(room.episode)}</p>
        ${full ? `<div class="reaction-row">${reactionButtons}</div>
        <div class="card-actions">
          <button type="button" data-join-room="${room.id}">Join</button>
          <button type="button" data-edit-room="${room.id}">Edit</button>
          <button type="button" data-delete-room="${room.id}">Delete</button>
        </div>` : ""}
      </div>
    </article>
  `;
}

function renderAnime() {
  const query = $("#searchInput").value.trim().toLowerCase();
  const anime = state.anime
    .filter((item) => activeAnimeFilter === "all" || (activeAnimeFilter === "favorite" ? item.favorite : item.status === activeAnimeFilter))
    .filter((item) => item.title.toLowerCase().includes(query));

  renderAnimeSummary();
  $("#animeGrid").innerHTML = anime.map((item, index) => {
    const progress = Math.min(100, Math.round((item.watched / item.episodes) * 100));
    return `
      <article class="anime-card">
        <img src="${escapeHtml(posterFor(item, index + 1))}" alt="${escapeHtml(item.title)} poster art">
        <div class="anime-card-body">
          <div class="badge-row">
            <span class="badge">${item.status}</span>
            ${item.favorite ? '<span class="badge live">Favorite</span>' : ""}
            <span class="badge">${item.rating}/10</span>
            <span class="badge">${item.genre || "Shonen"}</span>
            <span class="badge">${item.studio || "Studio TBA"}</span>
          </div>
          <h4>${escapeHtml(item.title)}</h4>
          <p>Recommendation match: ${recommendationScore(item)}%</p>
          <div class="progress-head">
            <span>Episode progress</span>
            <span>${item.watched}/${item.episodes}</span>
          </div>
          <div class="progress"><span style="width:${progress}%"></span></div>
          <div class="card-actions">
            <a class="trailer-link" href="${trailerFor(item)}" target="_blank" rel="noopener noreferrer" aria-label="Watch ${item.title} trailer on YouTube">▶ Trailer</a>
            <button type="button" data-progress-anime="${item.id}">+ Episode</button>
            <button type="button" data-bookmark-anime="${item.id}">Bookmark</button>
            <button type="button" data-edit-anime="${item.id}">Edit</button>
            <button type="button" data-delete-anime="${item.id}">Delete</button>
          </div>
        </div>
      </article>
    `;
  }).join("") || emptyState("No anime match this filter.");
}

function renderAnimeSummary() {
  const summary = [
    ["Total", state.anime.length],
    ["Favorites", state.anime.filter((item) => item.favorite).length],
    ["Watching", state.anime.filter((item) => item.status === "watching").length],
    ["Completed", state.anime.filter((item) => item.status === "completed").length],
    ["Planned", state.anime.filter((item) => item.status === "planned").length]
  ];
  $("#animeSummary").innerHTML = summary.map(([label, value]) => `
    <article>
      <span>${label}</span>
      <strong>${value}</strong>
    </article>
  `).join("");
}

function renderAnimeInsights() {
  const topRated = [...state.anime].sort((a, b) => Number(b.rating) - Number(a.rating))[0];
  const nextToFinish = [...state.anime]
    .filter((item) => Number(item.watched) < Number(item.episodes))
    .sort((a, b) => (Number(b.watched) / Number(b.episodes)) - (Number(a.watched) / Number(a.episodes)))[0];
  const reactionTotals = state.rooms.reduce((totals, room) => {
    Object.entries(room.reactions || {}).forEach(([key, value]) => {
      totals[key] = (totals[key] || 0) + Number(value);
    });
    return totals;
  }, {});
  const topReaction = Object.entries(reactionTotals).sort((a, b) => b[1] - a[1])[0];
  const openRooms = state.rooms.filter((room) => room.status !== "Private").length;

  const cards = [
    ["Top rated", topRated ? `${topRated.title} (${topRated.rating}/10)` : "No ratings yet", "Best score in the current library."],
    ["Finish next", nextToFinish ? `${nextToFinish.title} - ${nextToFinish.episodes - nextToFinish.watched} episodes left` : "All caught up", "Closest title to completion."],
    ["Fan reaction", topReaction ? `${topReaction[0]} (${topReaction[1]})` : "No reactions yet", "Most used watch room reaction."],
    ["Open rooms", `${openRooms} available`, "Live or scheduled rooms people can join."]
  ];

  $("#animeInsights").innerHTML = cards.map(([title, value, text]) => `
    <article class="insight-card">
      <span>${title}</span>
      <strong>${value}</strong>
      <p>${text}</p>
    </article>
  `).join("");
}

function recommendationScore(item) {
  const favoriteBoost = item.favorite ? 9 : 0;
  const progressBoost = item.status === "watching" ? 7 : item.status === "completed" ? 5 : 2;
  return Math.min(99, Math.round(item.rating * 8 + favoriteBoost + progressBoost));
}

function renderSchedules() {
  const schedules = sortedSchedules();
  $("#scheduleList").innerHTML = schedules.map((schedule) => {
    const date = new Date(`${schedule.date}T${schedule.time}`);
    return `
      <article class="schedule-item">
        <div class="date-chip">${date.toLocaleString([], { month: "short" })}<span>${date.getDate()}</span></div>
        <div>
          <span class="badge">${schedule.type}</span>
          <h4>${escapeHtml(schedule.title)}</h4>
          <p>${formatDateTime(schedule)} - ${timeUntil(schedule)}</p>
        </div>
        <div class="card-actions">
          <button type="button" data-edit-schedule="${schedule.id}">Edit</button>
          <button type="button" data-delete-schedule="${schedule.id}">Delete</button>
        </div>
      </article>
    `;
  }).join("") || emptyState("Add an upcoming anime event.");
}

function renderCountdown() {
  const schedules = sortedSchedules().slice(0, 4);
  $("#countdownList").innerHTML = schedules.map((schedule) => `
    <article class="activity-item">
      <h4>${escapeHtml(schedule.title)}</h4>
      <p>${formatDateTime(schedule)} - <strong>${timeUntil(schedule)}</strong></p>
    </article>
  `).join("") || emptyState("No scheduled countdowns.");
  const next = schedules[0];
  $("#sidebarCountdown").textContent = next ? timeUntil(next) : "No events";
  $("#sidebarCountdownMeta").textContent = next ? next.title : "Add a schedule";
}

function renderComments() {
  $("#chatFeed").innerHTML = state.comments.slice(0, 8).map((comment) => `
    <article class="chat-message">
      <div class="badge-row">
        <span class="badge">${escapeHtml(comment.author)}</span>
        <span class="badge">${escapeHtml(comment.target)}</span>
        <span class="image-badge"><img src="${escapeHtml(reactionImage(comment.reaction))}" alt="${escapeHtml(comment.reaction)}">${escapeHtml(comment.reaction)}</span>
      </div>
      <p>${escapeHtml(comment.message)}</p>
      <div class="card-actions">
        <button type="button" data-edit-comment="${comment.id}">Edit</button>
        <button type="button" data-delete-comment="${comment.id}">Delete</button>
      </div>
    </article>
  `).join("") || emptyState("No chat messages yet.");
}

function renderDiscovery() {
  const rails = state.discovery?.length ? state.discovery : discoveryRails;
  $("#discoveryRails").innerHTML = rails.map((rail) => `
    <article class="discovery-rail">
      <h4>${rail.title}</h4>
      <div class="discovery-list">
        ${rail.items.map((item) => `
          <button class="discovery-item" type="button" data-discovery-title="${item.title}">
            <span>
              <strong>${item.title}</strong>
              <small>${item.tag}</small>
            </span>
            <b>${item.match}%</b>
          </button>
        `).join("")}
      </div>
    </article>
  `).join("");
}

function renderNews() {
  $("#newsList").innerHTML = news.map((item) => `
    <article class="news-item">
      <h4>${item.title}</h4>
      <p>${item.text}</p>
    </article>
  `).join("");
}

function renderProfile() {
  const profileTitle = $("#profileTitle");
  const profileUsername = $("#profileUsername");
  const profileBio = $("#profileBio");
  const profileEyebrow = $("#profileEyebrow");
  const profileAvatar = $("#profileAvatar");
  const user = currentUser;

  profileTitle.textContent = user?.displayName || "OtakuHub member";
  profileUsername.textContent = user ? `@${user.username}` : "@guest";
  profileBio.textContent = user?.bio || (user ? "OtakuHub member" : "Sign in to see your profile.");
  profileEyebrow.textContent = user ? `${user.role} profile` : "Your profile";
  const initials = (user?.displayName || "OtakuHub Member").split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase();
  profileAvatar.setAttribute("aria-label", user ? `${user.displayName}'s avatar` : "OtakuHub user avatar");
  profileAvatar.innerHTML = user?.avatarUrl
    ? `<img src="${escapeHtml(user.avatarUrl)}" alt="${escapeHtml(user.displayName)}'s avatar">`
    : escapeHtml(initials);

  const favoriteCount = state.anime.filter((item) => item.favorite).length;
  const completedEpisodes = state.anime.reduce((sum, item) => sum + Number(item.watched), 0);
  $("#activityList").innerHTML = [
    ["Favorite anime lists", `${favoriteCount} titles marked as favorites.`],
    ["Episode bookmarking", "Latest bookmark saved from the profile activity stream."],
    ["Ratings/reviews", `${state.comments.length} reviews and comments posted.`],
    ["Episode progress tracking", `${completedEpisodes} total episodes watched.`]
  ].map(([title, text]) => `
    <article class="activity-item">
      <h4>${title}</h4>
      <p>${text}</p>
    </article>
  `).join("");
}

function renderAdmin() {
  if (!isAdmin()) {
    $("#adminGrid").innerHTML = "";
    $("#adminUsersList").innerHTML = "";
    $("#adminUserCount").textContent = "0 users";
    return;
  }
  const liveRooms = state.rooms.filter((room) => room.status === "Live").length;
  const ratings = state.anime.map((item) => Number(item.rating));
  const avgRating = ratings.length ? (ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length).toFixed(1) : "0.0";
  const cards = [
    ["Live rooms", liveRooms, "Monitor hosts, capacity, and room privacy."],
    ["Average rating", avgRating, "Community review sentiment across the library."],
    ["Notifications", state.notifications.length, "System notices queued for users."],
    ["Recommendation engine", "Active", "Scores favorites, progress, and ratings."]
  ];
  $("#adminGrid").innerHTML = cards.map(([title, value, text]) => `
    <article class="admin-card">
      <span class="badge">${title}</span>
      <h3>${value}</h3>
      <p>${text}</p>
    </article>
  `).join("");
  renderAdminUsers();
}

function formatUserActivity(value) {
  if (!value) return "Not recorded";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Not recorded" : date.toLocaleString();
}

function renderAdminUsers() {
  $("#adminUserCount").textContent = `${adminUsers.length} user${adminUsers.length === 1 ? "" : "s"}`;
  $("#adminUsersList").innerHTML = adminUsers.map((user) => `
    <article class="admin-user-row">
      ${user.avatarUrl
        ? `<img src="${escapeHtml(user.avatarUrl)}" alt="${escapeHtml(user.displayName)} profile photo">`
        : `<span class="avatar-initials">${escapeHtml(user.displayName.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase())}</span>`}
      <div>
        <strong>${escapeHtml(user.displayName)} <span class="badge">${escapeHtml(user.role)}</span></strong>
        <small>@${escapeHtml(user.username)} · ${escapeHtml(user.email || "No email")}</small>
        <small>Joined: ${escapeHtml(formatUserActivity(user.createdAt))} · Last login: ${escapeHtml(formatUserActivity(user.lastLoginAt))}</small>
      </div>
      <span class="badge">Active account</span>
    </article>
  `).join("") || emptyState("No users are registered yet.");
}

function renderNotifications() {
  $("#notificationCount").textContent = state.notifications.length;
}

function emptyState(text) {
  return `<div class="empty-state">${text}</div>`;
}

function openModal(id) {
  if (id === "profileModal") {
    if (!currentUser) return openModal("authModal");
    const form = $("#profileForm");
    form.reset();
    form.elements.displayName.value = currentUser.displayName || "";
    form.elements.bio.value = currentUser.bio || "";
    form.elements.imageUrl.value = currentUser.avatarUrl || "";
    updateUploadPreview(form);
  }
  const dialog = $(`#${id}`);
  dialog?.showModal();
}

function closeModal(button) {
  button.closest("dialog")?.close();
}

function populateForm(form, values) {
  Object.entries(values).forEach(([key, value]) => {
    const input = form.elements[key];
    if (!input) return;
    if (input.type === "checkbox") input.checked = Boolean(value);
    else input.value = value;
  });
  updateUploadPreview(form);
}

function renderAuth() {
  const authButton = $("#authButton");
  const logoutButton = $("#logoutButton");
  const authStatus = $("#authStatus");
  if (!authButton || !logoutButton) return;

  authButton.textContent = currentUser ? currentUser.username : "Login";
  logoutButton.classList.toggle("hidden", !currentUser);
  const canAccessAdmin = isAdmin();
  $$('[data-admin-only]').forEach((element) => {
    element.hidden = !canAccessAdmin;
  });
  $("#resetDemoBtn").hidden = !canAccessAdmin;
  if (authStatus && currentUser) {
    authStatus.textContent = `Logged in as ${currentUser.username} (${currentUser.role}).`;
  }
}

function isAdmin() {
  return currentUser?.role === "admin";
}

async function loadCurrentUser() {
  try {
    const response = await fetch(`${API_BASE}/auth/me`);
    const payload = await response.json();
    currentUser = response.ok ? payload.user : null;
  } catch {
    currentUser = null;
  }
}

async function sendAuthRequest(path, data, retryOnCsrfError = true) {
  if (!csrfToken) await loadCsrfToken();
  const response = await fetch(`${API_BASE}/auth/${path}`, {
    method: "POST",
    headers: apiHeaders(),
    body: JSON.stringify(data),
    credentials: "same-origin"
  });
  const payload = await response.json().catch(() => ({}));
  if (response.status === 403 && retryOnCsrfError && /csrf/i.test(payload.error || "")) {
    await loadCsrfToken();
    return sendAuthRequest(path, data, false);
  }
  if (!response.ok) throw new Error(payload.error || "Auth request failed.");
  return payload;
}

async function loadAdminUsers() {
  if (!isAdmin()) {
    adminUsers = [];
    return;
  }
  try {
    const response = await fetch(`${API_BASE}/users`, { credentials: "same-origin" });
    const payload = await response.json();
    adminUsers = response.ok && Array.isArray(payload) ? payload : [];
  } catch {
    adminUsers = [];
  }
}

async function handleLogin(event) {
  event.preventDefault();
  // Event.currentTarget can be cleared after an await, so retain the form
  // before making the network request.
  const form = event.currentTarget;
  const authStatus = $("#authStatus");
  const data = formData(form);
  try {
    const payload = await sendAuthRequest("login", data);
    currentUser = payload.user;
    form.reset();
    $("#authModal").close();
    await loadAdminUsers();
    render();
    notify(`Welcome back, ${currentUser.displayName}.`);
  } catch (error) {
    authStatus.textContent = error.message;
  }
}

async function handleRegister(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const authStatus = $("#authStatus");
  const data = formData(form);
  try {
    const payload = await sendAuthRequest("register", data);
    currentUser = payload.user;
    form.reset();
    $("#authModal").close();
    await loadAdminUsers();
    render();
    notify(`Account created for ${currentUser.displayName}.`);
  } catch (error) {
    authStatus.textContent = error.message;
  }
}

async function handleLogout() {
  try {
    await sendAuthRequest("logout", {});
  } catch {
    // Local UI still clears the user when the backend is unavailable.
  }
  currentUser = null;
  adminUsers = [];
  render();
  setView("dashboard");
  notify("Logged out.");
}

function formData(form) {
  const data = Object.fromEntries(new FormData(form).entries());
  $$("input[type='checkbox']", form).forEach((input) => {
    data[input.name] = input.checked;
  });
  return data;
}

function resetForm(form, title) {
  form.reset();
  form.elements.id.value = "";
  if (form.elements.imageUrl) form.elements.imageUrl.value = "";
  updateUploadPreview(form);
  if (form.id === "animeForm") $("#jikanResults").innerHTML = "";
  const heading = form.querySelector("h3");
  if (heading) heading.textContent = title;
}

async function uploadSelectedImage(form) {
  const fileInput = form.elements.imageFile;
  const file = fileInput?.files?.[0];
  if (!file) return form.elements.imageUrl?.value || "";
  if (!apiEnabled || !csrfToken) {
    notify("Start the Flask backend to upload device images.");
    return form.elements.imageUrl?.value || "";
  }

  const body = new FormData();
  body.append("image", file);
  const response = await fetch(`${API_BASE}/uploads`, {
    method: "POST",
    headers: { "X-CSRFToken": csrfToken },
    body
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || "Image upload failed");
  form.elements.imageUrl.value = payload.url;
  fileInput.value = "";
  updateUploadPreview(form);
  return payload.url;
}

function updateUploadPreview(form) {
  const preview = document.querySelector(`[data-preview-for="${form.id}"]`);
  if (!preview) return;
  const imageUrl = form.elements.imageUrl?.value;
  const file = form.elements.imageFile?.files?.[0];
  if (file) {
    preview.innerHTML = `<span>Selected: ${file.name}</span>`;
    return;
  }
  preview.innerHTML = imageUrl ? `<img src="${imageUrl}" alt="Selected artwork preview"><span>Current image</span>` : "";
}

async function handleRoomSubmit(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const data = formData(event.currentTarget);
  let imageUrl = data.imageUrl || state.rooms.find((item) => item.id === data.id)?.imageUrl || "";
  try {
    imageUrl = await uploadSelectedImage(form) || imageUrl;
  } catch (error) {
    notify(error.message);
    return;
  }
  const room = {
    id: data.id || uid("room"),
    name: data.name,
    anime: data.anime,
    episode: Number(data.episode),
    capacity: Number(data.capacity),
    viewers: Math.max(1, Math.round(Number(data.capacity) * 0.62)),
    status: data.status,
    imageUrl: imageUrl || state.anime.find((item) => item.title.toLowerCase() === data.anime.toLowerCase())?.imageUrl || animePosters.naruto,
    reactions: state.rooms.find((item) => item.id === data.id)?.reactions || {}
  };
  state.rooms = data.id ? state.rooms.map((item) => item.id === data.id ? room : item) : [room, ...state.rooms];
  saveState();
  form.closest("dialog").close();
  resetForm(form, "Create Room");
  render();
  notify(`${room.name} saved.`);
}

async function handleAnimeSubmit(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const data = formData(event.currentTarget);
  let imageUrl = data.imageUrl || state.anime.find((item) => item.id === data.id)?.imageUrl || "";
  try {
    imageUrl = await uploadSelectedImage(form) || imageUrl;
  } catch (error) {
    notify(error.message);
    return;
  }
  const anime = {
    id: data.id || uid("anime"),
    title: data.title,
    episodes: Number(data.episodes),
    watched: Math.min(Number(data.watched), Number(data.episodes)),
    rating: Number(data.rating).toFixed(1),
    status: data.status,
    favorite: Boolean(data.favorite),
    genre: data.genre || state.anime.find((item) => item.id === data.id)?.genre || "Shonen",
    studio: data.studio || state.anime.find((item) => item.id === data.id)?.studio || "Studio TBA",
    imageUrl: imageUrl || posterFor(null, state.anime.length),
    trailerUrl: data.trailerUrl.trim()
  };
  state.anime = data.id ? state.anime.map((item) => item.id === data.id ? anime : item) : [anime, ...state.anime];
  saveState();
  form.closest("dialog").close();
  resetForm(form, "Add Anime");
  render();
  notify(`${anime.title} saved to your anime list.`);
}

async function handleProfileSubmit(event) {
  event.preventDefault();
  const form = event.currentTarget;
  if (!currentUser) return;
  try {
    const avatarUrl = await uploadSelectedImage(form) || currentUser.avatarUrl || "";
    const data = formData(form);
    const response = await fetch(`${API_BASE}/profile`, {
      method: "PUT",
      headers: apiHeaders(),
      body: JSON.stringify({ displayName: data.displayName, bio: data.bio, avatarUrl }),
      credentials: "same-origin"
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error || "Profile update failed.");
    currentUser = payload;
    await loadAdminUsers();
    form.closest("dialog").close();
    render();
    notify("Profile updated.");
  } catch (error) {
    notify(error.message);
  }
}

async function searchJikanForAnime() {
  const form = $("#animeForm");
  const query = form.elements.title.value.trim();
  const results = $("#jikanResults");
  if (query.length < 2) {
    results.innerHTML = `<div class="empty-state">Enter an anime title first.</div>`;
    return;
  }
  results.innerHTML = `<div class="empty-state">Searching Jikan...</div>`;
  try {
    const response = await fetch(`${API_BASE}/jikan/search?q=${encodeURIComponent(query)}`);
    const payload = await response.json();
    if (!response.ok || payload.error) throw new Error(payload.error || "Jikan search failed");
    const items = Array.isArray(payload) ? payload : payload.items || [];
    const status = payload.source === "local-fallback"
      ? `<div class="empty-state">Jikan is temporarily unavailable. Showing matches from the OtakuHub catalogue.</div>`
      : "";
    results.innerHTML = status + (items.map((item) => `
      <button class="jikan-result" type="button"
        data-jikan-title="${encodeURIComponent(item.title || "")}"
        data-jikan-episodes="${item.episodes || 1}"
        data-jikan-rating="${item.rating || 7}"
        data-jikan-genre="${encodeURIComponent(item.genre || "Anime")}"
        data-jikan-studio="${encodeURIComponent(item.studio || "Studio TBA")}" 
        data-jikan-image="${encodeURIComponent(item.imageUrl || "")}"
        data-jikan-trailer="${encodeURIComponent(item.trailerUrl || "")}">
        <img src="${item.imageUrl || animePosters.naruto}" alt="${item.title} poster">
        <span><strong>${item.title}</strong><small>${item.genre} - ${item.studio}</small></span>
      </button>
    `).join("") || `<div class="empty-state">No Jikan results found.</div>`);
  } catch (error) {
    results.innerHTML = `<div class="empty-state">${error.message}</div>`;
  }
}

function applyJikanResult(button) {
  const form = $("#animeForm");
  form.elements.title.value = decodeURIComponent(button.dataset.jikanTitle || "");
  form.elements.episodes.value = button.dataset.jikanEpisodes || 1;
  form.elements.rating.value = Number(button.dataset.jikanRating || 7).toFixed(1);
  form.elements.genre.value = decodeURIComponent(button.dataset.jikanGenre || "Anime");
  form.elements.studio.value = decodeURIComponent(button.dataset.jikanStudio || "Studio TBA");
  form.elements.imageUrl.value = decodeURIComponent(button.dataset.jikanImage || "");
  form.elements.trailerUrl.value = decodeURIComponent(button.dataset.jikanTrailer || "");
  updateUploadPreview(form);
  notify(`${form.elements.title.value} details added from Jikan.`);
}

function handleScheduleSubmit(event) {
  event.preventDefault();
  const data = formData(event.currentTarget);
  const schedule = {
    id: data.id || uid("schedule"),
    title: data.title,
    date: data.date,
    time: data.time,
    type: data.type
  };
  state.schedules = data.id ? state.schedules.map((item) => item.id === data.id ? schedule : item) : [schedule, ...state.schedules];
  saveState();
  event.currentTarget.closest("dialog").close();
  resetForm(event.currentTarget, "Add Schedule");
  render();
  notify(`${schedule.title} added to the calendar.`);
}

function handleCommentSubmit(event) {
  event.preventDefault();
  const data = formData(event.currentTarget);
  const comment = {
    id: data.id || uid("comment"),
    author: data.author,
    target: data.target,
    message: data.message,
    reaction: data.reaction,
    createdAt: Date.now()
  };
  state.comments = data.id ? state.comments.map((item) => item.id === data.id ? comment : item) : [comment, ...state.comments];
  saveState();
  event.currentTarget.closest("dialog").close();
  resetForm(event.currentTarget, "Add Comment");
  render();
  notify(`${comment.author} posted a comment.`);
}

function editRoom(id) {
  const room = state.rooms.find((item) => item.id === id);
  if (!room) return;
  resetForm($("#roomForm"), "Edit Room");
  populateForm($("#roomForm"), room);
  $("#roomModalTitle").textContent = "Edit Room";
  openModal("roomModal");
}

function editAnime(id) {
  const anime = state.anime.find((item) => item.id === id);
  if (!anime) return;
  resetForm($("#animeForm"), "Edit Anime");
  populateForm($("#animeForm"), anime);
  $("#animeModalTitle").textContent = "Edit Anime";
  openModal("animeModal");
}

function editSchedule(id) {
  const schedule = state.schedules.find((item) => item.id === id);
  if (!schedule) return;
  resetForm($("#scheduleForm"), "Edit Schedule");
  populateForm($("#scheduleForm"), schedule);
  $("#scheduleModalTitle").textContent = "Edit Schedule";
  openModal("scheduleModal");
}

function editComment(id) {
  const comment = state.comments.find((item) => item.id === id);
  if (!comment) return;
  resetForm($("#commentForm"), "Edit Comment");
  populateForm($("#commentForm"), comment);
  $("#commentModalTitle").textContent = "Edit Comment";
  openModal("commentModal");
}

function bindEvents() {
  $$(".nav-link").forEach((link) => link.addEventListener("click", (event) => {
    event.preventDefault();
    setView(link.dataset.view);
  }));

  $$("[data-nav-target]").forEach((button) => button.addEventListener("click", () => setView(button.dataset.navTarget)));
  $$("[data-open-modal]").forEach((button) => button.addEventListener("click", () => openModal(button.dataset.openModal)));
  $$(".close-modal").forEach((button) => button.addEventListener("click", () => closeModal(button)));
  $$("dialog").forEach((dialog) => dialog.addEventListener("click", (event) => {
    if (event.target === dialog) dialog.close();
  }));

  $("#roomForm").addEventListener("submit", handleRoomSubmit);
  $("#animeForm").addEventListener("submit", handleAnimeSubmit);
  $("#scheduleForm").addEventListener("submit", handleScheduleSubmit);
  $("#commentForm").addEventListener("submit", handleCommentSubmit);
  $("#profileForm").addEventListener("submit", handleProfileSubmit);
  $("#loginForm").addEventListener("submit", handleLogin);
  $("#registerForm").addEventListener("submit", handleRegister);
  $("#logoutButton").addEventListener("click", handleLogout);
  $("#roomForm").elements.imageFile.addEventListener("change", () => updateUploadPreview($("#roomForm")));
  $("#animeForm").elements.imageFile.addEventListener("change", () => updateUploadPreview($("#animeForm")));
  $("#profileForm").elements.imageFile.addEventListener("change", () => updateUploadPreview($("#profileForm")));
  $("#jikanSearchBtn").addEventListener("click", searchJikanForAnime);
  $("#searchInput").addEventListener("input", () => {
    renderRooms();
    renderAnime();
  });

  $("#quickChatForm").addEventListener("submit", (event) => {
    event.preventDefault();
    const message = new FormData(event.currentTarget).get("message");
    state.comments.unshift({ id: uid("comment"), author: currentUser?.displayName || "Grishav", target: "Global Chat", message, reaction: "Ninja Hype", createdAt: Date.now() });
    saveState();
    event.currentTarget.reset();
    render();
    notify("Message sent to watch chat.");
  });

  $("#themeToggle").addEventListener("click", () => {
    state.theme = state.theme === "dark" ? "light" : "dark";
    saveState();
    render();
  });

  $("#notificationBtn").addEventListener("click", () => {
    const message = state.notifications[0] || "No notifications yet.";
    notify(`Latest: ${message}`);
  });

  $("#resetDemoBtn").addEventListener("click", () => {
    if (!isAdmin()) return;
    state = structuredClone(seedState);
    saveState();
    render();
    notify("Demo data restored.");
  });

  $$(".tab").forEach((tab) => tab.addEventListener("click", () => {
    $$(".tab").forEach((item) => item.classList.remove("active"));
    tab.classList.add("active");
    activeAnimeFilter = tab.dataset.filter;
    renderAnime();
  }));

  document.addEventListener("click", handleDelegatedActions);
}

function handleDelegatedActions(event) {
  const target = event.target.closest("button");
  if (!target) return;
  const dataset = target.dataset;

  if (dataset.editRoom) editRoom(dataset.editRoom);
  if (dataset.deleteRoom) removeItem("rooms", dataset.deleteRoom, "Watch room deleted.");
  if (dataset.reactRoom) reactToRoom(dataset.reactRoom, dataset.reaction);
  if (dataset.joinRoom) joinRoom(dataset.joinRoom);

  if (dataset.editAnime) editAnime(dataset.editAnime);
  if (dataset.deleteAnime) removeItem("anime", dataset.deleteAnime, "Anime removed from list.");
  if (dataset.progressAnime) progressAnime(dataset.progressAnime);
  if (dataset.bookmarkAnime) bookmarkAnime(dataset.bookmarkAnime);

  if (dataset.editSchedule) editSchedule(dataset.editSchedule);
  if (dataset.deleteSchedule) removeItem("schedules", dataset.deleteSchedule, "Schedule deleted.");

  if (dataset.editComment) editComment(dataset.editComment);
  if (dataset.deleteComment) removeItem("comments", dataset.deleteComment, "Comment deleted.");
  if (dataset.jikanTitle) applyJikanResult(target);
  if (dataset.discoveryTitle) startAnimeFromDiscovery(dataset.discoveryTitle);
}

function removeItem(collection, id, message) {
  state[collection] = state[collection].filter((item) => item.id !== id);
  saveState();
  render();
  notify(message);
}

function reactToRoom(id, reaction) {
  state.rooms = state.rooms.map((room) => {
    if (room.id !== id) return room;
    const reactions = { ...room.reactions, [reaction]: (room.reactions?.[reaction] || 0) + 1 };
    return { ...room, reactions };
  });
  saveState();
  render();
  notify(`${reaction} reaction added.`);
}

function joinRoom(id) {
  const room = state.rooms.find((item) => item.id === id);
  if (!room) return;
  if (room.status === "Private") {
    notify("This is a private room. Ask its host for access.");
    return;
  }
  if (Number(room.viewers || 0) >= Number(room.capacity)) {
    notify(`${room.name} is full.`);
    return;
  }
  state.rooms = state.rooms.map((item) => {
    if (item.id !== id) return item;
    const viewers = Math.min(Number(item.capacity), Number(item.viewers || 0) + 1);
    return { ...item, viewers, status: item.status === "Private" ? "Private" : "Live" };
  });
  saveState();
  render();
  notify(`Joined ${room.name}.`);
}

function progressAnime(id) {
  state.anime = state.anime.map((item) => item.id === id ? { ...item, watched: Math.min(item.episodes, Number(item.watched) + 1) } : item);
  saveState();
  render();
  notify("Episode progress updated.");
}

function bookmarkAnime(id) {
  const anime = state.anime.find((item) => item.id === id);
  if (!anime) return;
  state.comments.unshift({
    id: uid("comment"),
    author: currentUser?.displayName || "Grishav",
    target: anime.title,
    message: `Bookmarked episode ${anime.watched || 1} for the next watch party.`,
    reaction: "Ninja Hype",
    createdAt: Date.now()
  });
  saveState();
  render();
  notify(`${anime.title} episode bookmarked.`);
}

function startAnimeFromDiscovery(title) {
  resetForm($("#animeForm"), "Add Anime");
  $("#animeModalTitle").textContent = "Add Anime";
  $("#animeForm").elements.title.value = title;
  $("#animeForm").elements.status.value = "planned";
  $("#animeForm").elements.episodes.value = 12;
  $("#animeForm").elements.watched.value = 0;
  $("#animeForm").elements.rating.value = 8.0;
  openModal("animeModal");
}

function setView(view) {
  if (view === "admin" && !isAdmin()) view = "dashboard";
  $$(".view").forEach((section) => section.classList.toggle("active", section.id === view));
  $$(".nav-link").forEach((link) => link.classList.toggle("active", link.dataset.view === view));
  window.location.hash = view;
}

async function boot() {
  await loadCsrfToken();
  await loadBackendState();
  await loadCurrentUser();
  await loadAdminUsers();
  bindEvents();
  render();
  const initialView = location.hash.replace("#", "") || "dashboard";
  if ($(`#${initialView}`)) setView(initialView);
  setInterval(renderCountdown, 60000);
}

boot();
