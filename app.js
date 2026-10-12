const content = document.querySelector("#content");
const title = document.querySelector("#page-title");
const eyebrow = document.querySelector("#page-eyebrow");
const subtitle = document.querySelector("#page-subtitle");
const countValue = document.querySelector("#count-value");
const countLabel = document.querySelector("#count-label");
const statusLabel = document.querySelector("#status-label");
const searchInput = document.querySelector("#search-input");
const filterWrap = document.querySelector("#filter-wrap");
const categoryFilter = document.querySelector("#category-filter");
const clearSearch = document.querySelector("#clear-search");
const proxyOpenButton = document.querySelector("#proxy-open");
const audio = document.querySelector("#audio-element");
const player = document.querySelector("#player");
const gameOverlay = document.querySelector("#game-overlay");
const gameFrame = document.querySelector("#game-frame");
const gameStatus = document.querySelector("#game-status");
const gameLoading = document.querySelector("#game-loading");

const state = {
  view: "games",
  games: [],
  visibleGames: 24,
  gameQuery: "",
  category: "all",
  music: null,
  musicResults: null,
  musicQuery: "",
  album: null,
  albumTracks: null,
  visibleTracks: [],
  queue: [],
  trackIndex: -1,
  toastTimer: null,
  searchTimer: null,
};

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[character]);
}

function formatTime(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`;
}

function artUrl(url) {
  return url ? `/api/music/art?u=${encodeURIComponent(url)}` : "";
}

function showToast(message) {
  const toast = document.querySelector("#toast");
  toast.textContent = message;
  toast.classList.add("is-visible");
  clearTimeout(state.toastTimer);
  state.toastTimer = setTimeout(() => toast.classList.remove("is-visible"), 3600);
}

async function getJson(url, options) {
  const response = await fetch(url, options);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || `Request failed (${response.status}) at ${url}`);
  return data;
}

function setView(view) {
  clearTimeout(state.searchTimer);
  state.searchTimer = null;
  state.view = view;
  state.gameQuery = "";
  state.musicQuery = "";
  state.musicResults = null;
  state.album = null;
  state.albumTracks = null;
  searchInput.value = "";
  clearSearch.hidden = true;
  proxyOpenButton.hidden = view !== "proxy";
  filterWrap.hidden = view !== "games";
  searchInput.type = "search";
  searchInput.placeholder = view === "games" ? "Find a game" : view === "music" ? "Search tracks and artists" : "Search web or enter a URL";
  searchInput.setAttribute("aria-label", view === "games" ? "Search games" : view === "music" ? "Search music" : "Search the web or enter a URL");
  title.textContent = view === "games" ? "HOHOGAMES" : view === "music" ? "Music" : "Proxy";
  eyebrow.textContent = view === "games" ? "THE GAME LIBRARY" : view === "music" ? "LISTEN WHILE YOU PLAY" : "BROWSER PROXY";
  subtitle.textContent = view === "games"
    ? "Best unblocked website with lots of games."
    : view === "music" ? "Find a track, press play, and keep exploring." : "Open a site through Scramjet.";
  countLabel.textContent = view === "games" ? "games" : view === "music" ? "tracks" : "proxy";
  content.style.setProperty("--view-slide-offset", view === "games" ? "-24px" : "24px");
  content.classList.remove("view-slide");
  void content.offsetWidth;
  content.classList.add("view-slide");
  document.querySelectorAll(".nav-button").forEach((button) => {
    const active = button.dataset.view === view;
    button.classList.toggle("is-active", active);
    if (active) button.setAttribute("aria-current", "page");
    else button.removeAttribute("aria-current");
  });
  if (view === "games") renderGames();
  else if (view === "music") renderMusic();
  else renderProxy();
}

function renderProxy() {
  countValue.textContent = "--";
  statusLabel.textContent = "Scramjet ready";
  content.innerHTML = '<div class="empty-state"><div><strong>Proxy ready</strong></div></div>';
}

function gameCategories() {
  return [...new Set(state.games.flatMap((game) => game.tags || []))].sort((a, b) => a.localeCompare(b));
}

function updateCategoryOptions() {
  const current = state.category;
  categoryFilter.innerHTML = '<option value="all">All games</option>' + gameCategories()
    .map((category) => `<option value="${escapeHtml(category)}">${escapeHtml(category)}</option>`)
    .join("");
  categoryFilter.value = gameCategories().includes(current) ? current : "all";
  state.category = categoryFilter.value;
}

function filteredGames() {
  const query = state.gameQuery.trim().toLowerCase();
  return state.games.filter((game) => {
    const matchesQuery = !query || `${game.name} ${(game.tags || []).join(" ")}`.toLowerCase().includes(query);
    const matchesCategory = state.category === "all" || (game.tags || []).includes(state.category);
    return matchesQuery && matchesCategory;
  });
}

function renderGames() {
  const games = filteredGames();
  countValue.textContent = String(state.games.length);
  statusLabel.textContent = state.games.length ? "Library ready" : "Loading library";

  if (!state.games.length) {
    content.innerHTML = '<div class="loading-state">Loading games</div>';
    return;
  }
  if (!games.length) {
    const webSearch = state.gameQuery.trim();
    content.innerHTML = `<div class="empty-state"><div><strong>No games found</strong>Try another title or search the web for “${escapeHtml(webSearch)}”.<div class="load-more-wrap"><button class="load-more" type="button" id="search-web">Search the web</button></div></div></div>`;
    return;
  }

  const shown = games.slice(0, state.visibleGames);
  content.innerHTML = `
    <div class="section-heading"><h2>All games</h2><p>${games.length} titles</p></div>
    <div class="game-grid">${shown.map((game, index) => {
      const image = game.image || "";
      const tags = (game.tags || []).slice(0, 2);
      return `<article class="game-card" style="--order:${index}">
        <button class="game-cover" type="button" data-play-game="${escapeHtml(game.id)}" aria-label="Play ${escapeHtml(game.name)}">
          ${image
            ? `<img src="${escapeHtml(image)}" alt="" loading="lazy" />`
            : `<span class="cover-placeholder" aria-hidden="true">H</span>`}
        </button>
        <div class="game-card-body">
          <div class="card-copy"><h3 title="${escapeHtml(game.name)}">${escapeHtml(game.name)}</h3>
            <div class="game-tags">${tags.map((tag) => `<span class="game-tag">${escapeHtml(tag)}</span>`).join("")}</div>
          </div>
          <button class="launch-button" type="button" data-play-game="${escapeHtml(game.id)}">Play</button>
        </div>
      </article>`;
    }).join("")}</div>
    ${games.length > shown.length ? `<div class="load-more-wrap"><button class="load-more" type="button" id="load-more">Show more games</button></div>` : ""}
  `;
}

function renderTrackList(tracks, indexOffset = 0) {
  if (!tracks.length) return '<div class="empty-state"><div><strong>No tracks found</strong>Try another search.</div></div>';
  return `<div class="track-list">${tracks.map((track, index) => `
    <article class="track-row" style="--order:${index}">
      <img class="track-art" src="${escapeHtml(artUrl(track.artwork))}" alt="" loading="lazy" />
      <div class="track-copy"><strong>${escapeHtml(track.title)}</strong><span>${escapeHtml(track.artist || "Unknown artist")}</span></div>
      <span class="track-duration">${formatTime(Number(track.duration))}</span>
      <button class="play-small" type="button" data-play-track="${index + indexOffset}" aria-label="Play ${escapeHtml(track.title)}">Play</button>
    </article>`).join("")}</div>`;
}

function renderAlbums(albums) {
  if (!albums?.length) return "";
  return `<section><div class="section-heading"><h2>Albums</h2><p>${albums.length} to explore</p></div>
    <div class="album-grid">${albums.slice(0, 9).map((album, index) => `
      <article class="album-card" style="--order:${index}">
        <button class="album-cover" type="button" data-open-album="${escapeHtml(album.id)}" aria-label="Open ${escapeHtml(album.title)}">
          <img src="${escapeHtml(artUrl(album.cover))}" alt="" loading="lazy" />
        </button>
        <div class="album-card-body"><div class="card-copy"><h3 title="${escapeHtml(album.title)}">${escapeHtml(album.title)}</h3><p>${escapeHtml(album.artist?.name || "Album")}</p></div></div>
      </article>`).join("")}</div></section>`;
}

function renderMusic() {
  const results = state.musicResults;
  if (!state.music && !results && !state.albumTracks) {
    countValue.textContent = "--";
    statusLabel.textContent = "Loading music";
    content.innerHTML = '<div class="loading-state">Loading music</div>';
    return;
  }

  if (state.albumTracks) {
    const tracks = state.albumTracks;
    state.visibleTracks = tracks;
    countValue.textContent = String(tracks.length);
    statusLabel.textContent = "Album loaded";
    content.innerHTML = `<div class="section-heading"><h2>${escapeHtml(state.album?.title || "Album tracks")}</h2><button class="clear-search" type="button" id="back-to-music">Back to music</button></div>${renderTrackList(tracks)}`;
    return;
  }

  if (results) {
    const tracks = results.items || [];
    state.visibleTracks = tracks;
    countValue.textContent = String(tracks.length);
    statusLabel.textContent = results.source ? `Search · ${results.source}` : "Search results";
    content.innerHTML = `<div class="music-layout"><section><div class="section-heading"><h2>Tracks</h2><p>${tracks.length} results</p></div>${renderTrackList(tracks)}</section><section>${renderAlbums(results.albums || [])}</section></div>`;
    return;
  }

  const rows = state.music?.rows || {};
  const popular = rows.hits || rows.pop || [];
  const albums = state.music?.albums || [];
  const popularTracks = popular.slice(0, 16);
  const moreTracks = (rows.pop || rows.hiphop || []).slice(0, 12);
  state.visibleTracks = [...popularTracks, ...moreTracks];
  countValue.textContent = String(popular.length);
  statusLabel.textContent = "Music ready";
  content.innerHTML = `<div class="music-layout"><section>${renderAlbums(albums)}
    <div class="section-heading"><h2>Popular tracks</h2><p>${popular.length} tracks</p></div>${renderTrackList(popularTracks)}</section>
    <section><div class="section-heading"><h2>Listen next</h2><p>More from the library</p></div>${renderTrackList(moreTracks, popularTracks.length)}</section></div>`;
}

async function loadGames() {
  try {
    const stores = [
      { id: "ckv", label: "CKV" },
      { id: "seraph", label: "Seraph" },
      { id: "truffled", label: "Truffled" },
      { id: "ugs", label: "UGS" },
      { id: "gn-math", label: "GN Math" },
    ];
    const catalogs = await Promise.allSettled(stores.map(async (store) => {
      const games = await getJson(`/assets/json/${store.id}.json`);
      return games.filter((game) => game?.url).map((game, index) => {
        const image = String(game.img || "");
        const launch = String(game.url);
        return {
          id: `${store.id}:${index}`,
          name: game.name || "Untitled game",
          image: image.startsWith("/img/") ? `/covers/${image.slice(5)}` : image,
          launch: launch.startsWith("/") ? `/stores${launch}` : launch,
          store: store.label,
          tags: [store.label],
        };
      });
    }));
    const failedStores = catalogs.flatMap((result, index) => result.status === "rejected" ? [stores[index].label] : []);
    state.games = catalogs.flatMap((result) => result.status === "fulfilled" ? result.value : []);
    if (!state.games.length) {
      const details = catalogs.map((result, index) => result.status === "rejected"
        ? `${stores[index].label}: ${result.reason.message}`
        : "").filter(Boolean).join("; ");
      throw new Error(details || "No browser-game catalogs are available");
    }
    updateCategoryOptions();
    renderGames();
    if (failedStores.length) showToast(`Some game lists are unavailable: ${failedStores.join(", ")}`);
  } catch (error) {
    statusLabel.textContent = "Games unavailable";
    countValue.textContent = "0";
    content.innerHTML = `<div class="empty-state"><div><strong>Games could not load</strong>${escapeHtml(error.message)}</div></div>`;
  }
}

async function loadMusic() {
  try {
    state.music = await getJson("/api/music/browse");
    if (state.view === "music") renderMusic();
  } catch (error) {
    state.music = { rows: {}, albums: [] };
    statusLabel.textContent = "Music unavailable";
    content.innerHTML = `<div class="empty-state"><div><strong>Music could not load</strong>${escapeHtml(error.message)}</div></div>`;
  }
}

function streamUrl(track) {
  const params = new URLSearchParams({
    id: String(track.id),
    source: track.source || "",
    title: track.title || "",
    artist: track.artist || "",
    duration: String(track.duration || ""),
  });
  if (track.isrc) params.set("isrc", track.isrc);
  return `/api/music/stream?${params}`;
}

function updatePlayer() {
  const track = state.queue[state.trackIndex];
  if (!track) return;
  player.hidden = false;
  document.querySelector("#player-title").textContent = track.title || "Unknown track";
  document.querySelector("#player-artist").textContent = track.artist || "Unknown artist";
  document.querySelector("#player-art").src = artUrl(track.artwork);
  const toggle = document.querySelector("#play-toggle");
  toggle.textContent = audio.paused ? "▶" : "Ⅱ";
  toggle.setAttribute("aria-label", audio.paused ? "Play" : "Pause");
  toggle.title = audio.paused ? "Play" : "Pause";
}

async function playTrack(index, queue = state.visibleTracks) {
  if (!queue.length || index < 0 || index >= queue.length) return;
  state.queue = queue;
  state.trackIndex = index;
  const track = state.queue[index];
  audio.src = streamUrl(track);
  audio.volume = Number(document.querySelector("#volume-control").value);
  updatePlayer();
  try {
    await audio.play();
  } catch (error) {
    showToast(`Could not play this track: ${error.message}`);
  }
}

function changeTrack(direction) {
  if (!state.queue.length) return;
  const nextIndex = (state.trackIndex + direction + state.queue.length) % state.queue.length;
  playTrack(nextIndex, state.queue);
}

async function openAlbum(albumId) {
  content.innerHTML = '<div class="loading-state">Loading album</div>';
  try {
    const data = await getJson(`/api/music/album/${encodeURIComponent(albumId)}`);
    state.album = data.album || null;
    state.albumTracks = data.tracks || [];
    renderMusic();
  } catch (error) {
    showToast(`Could not load album: ${error.message}`);
    state.albumTracks = null;
    renderMusic();
  }
}

function handleSearch() {
  clearSearch.hidden = !searchInput.value;
  if (state.view === "proxy") return;
  if (state.view === "games") {
    state.gameQuery = searchInput.value;
    state.visibleGames = 24;
    renderGames();
    return;
  }

  state.musicQuery = searchInput.value.trim();
  state.album = null;
  state.albumTracks = null;
  state.musicResults = null;
  clearTimeout(state.searchTimer);
  if (!state.musicQuery) {
    renderMusic();
    return;
  }
  const query = state.musicQuery;
  content.innerHTML = '<div class="loading-state">Searching music</div>';
  state.searchTimer = setTimeout(async () => {
    try {
      const results = await getJson(`/api/music/search?q=${encodeURIComponent(query)}&limit=30`);
      if (state.view !== "music" || query !== state.musicQuery) return;
      state.musicResults = results;
      renderMusic();
    } catch (error) {
      if (state.view !== "music" || query !== state.musicQuery) return;
      state.musicResults = { items: [], albums: [] };
      statusLabel.textContent = "Search unavailable";
      content.innerHTML = `<div class="empty-state"><div><strong>Search could not load</strong>${escapeHtml(error.message)}</div></div>`;
    }
  }, 280);
}

function setGameStatus(message) {
  gameStatus.textContent = message;
  gameLoading.textContent = message;
}

function openFrame(source, label, loadingMessage) {
  gameOverlay.hidden = false;
  document.querySelector("#game-title").textContent = label;
  gameLoading.hidden = false;
  gameFrame.hidden = true;
  setGameStatus(loadingMessage);
  gameFrame.onload = () => {
    gameLoading.hidden = true;
    gameFrame.hidden = false;
    setGameStatus("Now playing");
  };
  gameFrame.onerror = () => {
    setGameStatus("This game could not be opened");
    gameLoading.textContent = "This game could not be opened";
  };
  gameFrame.src = source;
}

function launchBrowserGame(game) {
  const target = /^https?:\/\//i.test(game.launch)
    ? game.launch
    : new URL(game.launch, "https://kristenblackburnvolleyballcamps.com").href;
  openFrame(`/embed?u=${encodeURIComponent(target)}`, game.name, "Starting Scramjet");
}

function openProxySite() {
  const value = searchInput.value.trim();
  if (!value) {
    showToast("Enter a website address first.");
    searchInput.focus();
    return;
  }
  try {
    const looksLikeUrl = /^(?:https?:\/\/)?(?:localhost|(?:[\w-]+\.)+[a-z]{2,})(?::\d+)?(?:[/?#].*)?$/i.test(value);
    const address = looksLikeUrl
      ? (/^https?:\/\//i.test(value) ? value : `https://${value}`)
      : `https://search.brave.com/search?q=${encodeURIComponent(value)}`;
    const url = new URL(address);
    if (!['http:', 'https:'].includes(url.protocol)) throw new Error("Only HTTP and HTTPS sites are supported.");
    const label = looksLikeUrl ? url.hostname : `Search: ${value}`;
    openFrame(`/embed?u=${encodeURIComponent(url.href)}`, label, "Starting Scramjet");
  } catch (error) {
    showToast(error.message || "Enter a valid website address.");
  }
}

function closeGame() {
  gameOverlay.hidden = true;
  gameFrame.src = "about:blank";
  gameFrame.hidden = true;
  gameLoading.hidden = false;
}

document.querySelectorAll(".nav-button").forEach((button) => {
  button.addEventListener("click", () => setView(button.dataset.view));
});

content.addEventListener("click", (event) => {
  const webSearchButton = event.target.closest("#search-web");
  if (webSearchButton) {
    const query = state.gameQuery.trim();
    if (query) {
      openFrame(`/embed?u=${encodeURIComponent(`https://search.brave.com/search?q=${encodeURIComponent(query)}`)}`, `Search: ${query}`, "Starting Scramjet");
    }
    return;
  }
  const loadMore = event.target.closest("#load-more");
  if (loadMore) {
    state.visibleGames += 24;
    renderGames();
    return;
  }
  const gameButton = event.target.closest("[data-play-game]");
  if (gameButton) {
    const game = state.games.find((item) => item.id === gameButton.dataset.playGame);
    if (game) launchBrowserGame(game);
    return;
  }
  const trackButton = event.target.closest("[data-play-track]");
  if (trackButton) {
    playTrack(Number(trackButton.dataset.playTrack));
    return;
  }
  const albumButton = event.target.closest("[data-open-album]");
  if (albumButton) openAlbum(albumButton.dataset.openAlbum);
  if (event.target.closest("#back-to-music")) {
    state.album = null;
    state.albumTracks = null;
    renderMusic();
  }
});

searchInput.addEventListener("input", handleSearch);
categoryFilter.addEventListener("change", () => {
  state.category = categoryFilter.value;
  state.visibleGames = 24;
  renderGames();
});
clearSearch.addEventListener("click", () => {
  searchInput.value = "";
  handleSearch();
  searchInput.focus();
});
document.querySelector("#play-toggle").addEventListener("click", () => {
  if (!state.queue.length) return;
  if (audio.paused) audio.play().catch((error) => showToast(error.message));
  else audio.pause();
});
document.querySelector("#previous-track").addEventListener("click", () => changeTrack(-1));
document.querySelector("#next-track").addEventListener("click", () => changeTrack(1));
document.querySelector("#close-game").addEventListener("click", closeGame);
document.querySelector("#fullscreen-game").addEventListener("click", () => {
  gameFrame.requestFullscreen?.().catch((error) => showToast(error.message));
});
proxyOpenButton.addEventListener("click", openProxySite);
document.querySelector("#volume-control").addEventListener("input", (event) => {
  audio.volume = Number(event.target.value);
});
document.querySelector("#seek-control").addEventListener("input", (event) => {
  if (Number.isFinite(audio.duration)) audio.currentTime = audio.duration * Number(event.target.value) / 1000;
});
audio.addEventListener("play", updatePlayer);
audio.addEventListener("pause", updatePlayer);
audio.addEventListener("ended", () => changeTrack(1));
audio.addEventListener("timeupdate", () => {
  document.querySelector("#current-time").textContent = formatTime(audio.currentTime);
  document.querySelector("#total-time").textContent = formatTime(audio.duration);
  document.querySelector("#seek-control").value = Number.isFinite(audio.duration) && audio.duration
    ? String(Math.round(audio.currentTime / audio.duration * 1000))
    : "0";
});
audio.addEventListener("error", () => showToast("This track could not be played. Try another one."));
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !gameOverlay.hidden) closeGame();
  if (event.key === "Enter" && state.view === "proxy" && document.activeElement === searchInput) openProxySite();
  if (event.key === "/" && !["INPUT", "TEXTAREA"].includes(document.activeElement.tagName)) {
    event.preventDefault();
    searchInput.focus();
  }
});

loadGames();
loadMusic();