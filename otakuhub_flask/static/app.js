const STORAGE_KEY = "otakuhub-state-v1";
const API_BASE = "/api";

const posterMap = [
  "/static/assets/poster-neon.png",
  "/static/assets/poster-sakura.png",
  "/static/assets/poster-storm.png",
  "/static/assets/poster-sunrise.png"
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

const seedState = {
  rooms: [
    { id: "room-1", name: "Friday Shonen Night", anime: "Jujutsu Kaisen", episode: 18, capacity: 42, viewers: 31, status: "Live", reactions: { "🔥": 24, "✨": 12, "😭": 4 } },
    { id: "room-2", name: "Cozy Isekai Cafe", anime: "Frieren: Beyond Journey's End", episode: 11, capacity: 28, viewers: 18, status: "Scheduled", reactions: { "👏": 10, "💯": 6 } },
    { id: "room-3", name: "Midnight Mecha Sync", anime: "Gundam: Iron Bloom", episode: 6, capacity: 20, viewers: 14, status: "Private", reactions: { "🔥": 8, "✨": 7 } }
  ],
  anime: [
    { id: "anime-1", title: "Jujutsu Kaisen", episodes: 24, watched: 18, rating: 9.4, status: "watching", favorite: true },
    { id: "anime-2", title: "Frieren: Beyond Journey's End", episodes: 28, watched: 11, rating: 9.7, status: "watching", favorite: true },
    { id: "anime-3", title: "Solo Leveling", episodes: 12, watched: 12, rating: 8.8, status: "completed", favorite: false },
    { id: "anime-4", title: "Dandadan", episodes: 12, watched: 0, rating: 8.6, status: "planned", favorite: true }
  ],
  comments: [
    { id: "comment-1", author: "Mika", target: "Friday Shonen Night", message: "No spoilers in chat and the sync timer worked perfectly.", reaction: "✨", createdAt: Date.now() - 1000 * 60 * 38 },
    { id: "comment-2", author: "Ren", target: "Frieren: Beyond Journey's End", message: "Episode 11 needs a bookmark at the campfire scene.", reaction: "😭", createdAt: Date.now() - 1000 * 60 * 92 },
    { id: "comment-3", author: "Aiko", target: "Solo Leveling", message: "That raid arc deserves a rewatch party this weekend.", reaction: "🔥", createdAt: Date.now() - 1000 * 60 * 180 }
  ],
  schedules: [
    { id: "schedule-1", title: "Jujutsu Kaisen Ep 19", date: "2026-05-27", time: "20:00", type: "Premiere" },
    { id: "schedule-2", title: "Frieren Rewatch Room", date: "2026-05-29", time: "19:30", type: "Watch Party" },
    { id: "schedule-3", title: "Summer Season Preview", date: "2026-06-02", time: "18:00", type: "News Drop" }
  ],
  notifications: [
    "Jujutsu Kaisen Ep 19 starts tomorrow at 20:00.",
    "Ren bookmarked Frieren Ep 11.",
    "Admin review queue has 3 fresh comments."
  ],
  theme: "dark"
};

let state = loadState();
let activeAnimeFilter = "all";
let apiEnabled = false;

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => Array.from(document.querySelectorAll(selector));

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
  if (apiEnabled) {
    fetch(`${API_BASE}/state`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(state)
    }).catch(() => {
      apiEnabled = false;
    });
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

function posterFor(index) {
  return posterMap[index % posterMap.length];
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
  renderStats();
  renderRooms();
  renderAnime();
  renderSchedules();
  renderComments();
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
  const reactionButtons = ["🔥", "✨", "😭", "👏", "💯"].map((emoji) => `
    <button type="button" data-react-room="${room.id}" data-emoji="${emoji}">${emoji} ${room.reactions?.[emoji] || 0}</button>
  `).join("");
  return `
    <article class="room-card ${full ? "full" : ""}">
      <img class="poster-thumb" src="${posterFor(index)}" alt="${room.anime} poster art">
      <div>
        <div class="badge-row">
          <span class="badge ${room.status === "Live" ? "live" : "warn"}">${room.status}</span>
          <span class="badge">${room.viewers || Math.ceil(room.capacity * 0.64)}/${room.capacity} watching</span>
        </div>
        <h4>${room.name}</h4>
        <p>${room.anime} · Episode ${room.episode}</p>
        ${full ? `<div class="reaction-row">${reactionButtons}</div>
        <div class="card-actions">
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

  $("#animeGrid").innerHTML = anime.map((item, index) => {
    const progress = Math.min(100, Math.round((item.watched / item.episodes) * 100));
    return `
      <article class="anime-card">
        <img src="${posterFor(index + 1)}" alt="${item.title} poster art">
        <div class="anime-card-body">
          <div class="badge-row">
            <span class="badge">${item.status}</span>
            ${item.favorite ? '<span class="badge live">Favorite</span>' : ""}
            <span class="badge">${item.rating}/10</span>
          </div>
          <h4>${item.title}</h4>
          <p>Recommendation match: ${recommendationScore(item)}%</p>
          <div class="progress-head">
            <span>Episode progress</span>
            <span>${item.watched}/${item.episodes}</span>
          </div>
          <div class="progress"><span style="width:${progress}%"></span></div>
          <div class="card-actions">
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
          <h4>${schedule.title}</h4>
          <p>${formatDateTime(schedule)} · ${timeUntil(schedule)}</p>
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
      <h4>${schedule.title}</h4>
      <p>${formatDateTime(schedule)} · <strong>${timeUntil(schedule)}</strong></p>
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
        <span class="badge">${comment.author}</span>
        <span class="badge">${comment.target}</span>
        <span class="badge">${comment.reaction}</span>
      </div>
      <p>${comment.message}</p>
      <div class="card-actions">
        <button type="button" data-edit-comment="${comment.id}">Edit</button>
        <button type="button" data-delete-comment="${comment.id}">Delete</button>
      </div>
    </article>
  `).join("") || emptyState("No chat messages yet.");
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
}

function renderNotifications() {
  $("#notificationCount").textContent = state.notifications.length;
}

function emptyState(text) {
  return `<div class="empty-state">${text}</div>`;
}

function openModal(id) {
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
  const heading = form.querySelector("h3");
  if (heading) heading.textContent = title;
}

function handleRoomSubmit(event) {
  event.preventDefault();
  const data = formData(event.currentTarget);
  const room = {
    id: data.id || uid("room"),
    name: data.name,
    anime: data.anime,
    episode: Number(data.episode),
    capacity: Number(data.capacity),
    viewers: Math.max(1, Math.round(Number(data.capacity) * 0.62)),
    status: data.status,
    reactions: state.rooms.find((item) => item.id === data.id)?.reactions || {}
  };
  state.rooms = data.id ? state.rooms.map((item) => item.id === data.id ? room : item) : [room, ...state.rooms];
  saveState();
  event.currentTarget.closest("dialog").close();
  resetForm(event.currentTarget, "Create Room");
  render();
  notify(`${room.name} saved.`);
}

function handleAnimeSubmit(event) {
  event.preventDefault();
  const data = formData(event.currentTarget);
  const anime = {
    id: data.id || uid("anime"),
    title: data.title,
    episodes: Number(data.episodes),
    watched: Math.min(Number(data.watched), Number(data.episodes)),
    rating: Number(data.rating).toFixed(1),
    status: data.status,
    favorite: Boolean(data.favorite)
  };
  state.anime = data.id ? state.anime.map((item) => item.id === data.id ? anime : item) : [anime, ...state.anime];
  saveState();
  event.currentTarget.closest("dialog").close();
  resetForm(event.currentTarget, "Add Anime");
  render();
  notify(`${anime.title} saved to your anime list.`);
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
  $("#searchInput").addEventListener("input", () => {
    renderRooms();
    renderAnime();
  });

  $("#quickChatForm").addEventListener("submit", (event) => {
    event.preventDefault();
    const message = new FormData(event.currentTarget).get("message");
    state.comments.unshift({ id: uid("comment"), author: "Mika", target: "Global Chat", message, reaction: "✨", createdAt: Date.now() });
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
  if (dataset.reactRoom) reactToRoom(dataset.reactRoom, dataset.emoji);

  if (dataset.editAnime) editAnime(dataset.editAnime);
  if (dataset.deleteAnime) removeItem("anime", dataset.deleteAnime, "Anime removed from list.");
  if (dataset.progressAnime) progressAnime(dataset.progressAnime);
  if (dataset.bookmarkAnime) bookmarkAnime(dataset.bookmarkAnime);

  if (dataset.editSchedule) editSchedule(dataset.editSchedule);
  if (dataset.deleteSchedule) removeItem("schedules", dataset.deleteSchedule, "Schedule deleted.");

  if (dataset.editComment) editComment(dataset.editComment);
  if (dataset.deleteComment) removeItem("comments", dataset.deleteComment, "Comment deleted.");
}

function removeItem(collection, id, message) {
  state[collection] = state[collection].filter((item) => item.id !== id);
  saveState();
  render();
  notify(message);
}

function reactToRoom(id, emoji) {
  state.rooms = state.rooms.map((room) => {
    if (room.id !== id) return room;
    const reactions = { ...room.reactions, [emoji]: (room.reactions?.[emoji] || 0) + 1 };
    return { ...room, reactions };
  });
  saveState();
  render();
  notify(`Reaction ${emoji} added.`);
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
    author: "Mika",
    target: anime.title,
    message: `Bookmarked episode ${anime.watched || 1} for the next watch party.`,
    reaction: "✨",
    createdAt: Date.now()
  });
  saveState();
  render();
  notify(`${anime.title} episode bookmarked.`);
}

function setView(view) {
  $$(".view").forEach((section) => section.classList.toggle("active", section.id === view));
  $$(".nav-link").forEach((link) => link.classList.toggle("active", link.dataset.view === view));
  window.location.hash = view;
}

async function boot() {
  await loadBackendState();
  bindEvents();
  render();
  const initialView = location.hash.replace("#", "") || "dashboard";
  if ($(`#${initialView}`)) setView(initialView);
  setInterval(renderCountdown, 60000);
}

boot();
