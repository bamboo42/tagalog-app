/* Tagalog Trainer — all app logic. Static: data is fetched from /data JSON files. */

const els = {
  homeView: document.getElementById("home-view"),
  practiceView: document.getElementById("practice-view"),
  wotdWord: document.getElementById("wotd-word"),
  wotdWordEnglish: document.getElementById("wotd-word-english"),
  wotdSentence: document.getElementById("wotd-sentence"),
  wotdSentenceEnglish: document.getElementById("wotd-sentence-english"),
  tiles: document.getElementById("tiles"),
  practiceTitle: document.getElementById("practice-title"),
  practiceTagalog: document.getElementById("practice-tagalog"),
  practiceEnglish: document.getElementById("practice-english"),
  translateBtn: document.getElementById("translate-btn"),
  nextBtn: document.getElementById("next-btn"),
  backBtn: document.getElementById("back-btn"),
  errorBanner: document.getElementById("error-banner"),
};

// Cache of loaded sentence files, keyed by file path.
const sentenceCache = {};

// Practice session state.
let currentSentences = [];
let currentIndex = -1;

/* ---------- Helpers ---------- */

async function loadJSON(path) {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`Failed to load ${path} (${res.status})`);
  return res.json();
}

function showError(message) {
  els.errorBanner.textContent = message;
  els.errorBanner.classList.remove("hidden");
  setTimeout(() => els.errorBanner.classList.add("hidden"), 6000);
}

function randomIndex(length, avoid) {
  if (length <= 1) return 0;
  let idx;
  do {
    idx = Math.floor(Math.random() * length);
  } while (idx === avoid);
  return idx;
}

/* ---------- Word of the day ---------- */

// Deterministic pick: same word for everyone all day, rotates at local midnight.
function wordOfTheDayIndex(total) {
  const now = new Date();
  const daysSinceEpoch = Math.floor(
    (now.getTime() - now.getTimezoneOffset() * 60000) / 86400000
  );
  return daysSinceEpoch % total;
}

async function initWordOfTheDay() {
  const data = await loadJSON("data/words.json");
  const words = data.words;
  const entry = words[wordOfTheDayIndex(words.length)];

  els.wotdWord.textContent = entry.tagalog;
  els.wotdWordEnglish.textContent = entry.english;
  els.wotdSentence.textContent = entry.sentenceTagalog;
  els.wotdSentenceEnglish.textContent = entry.sentenceEnglish;
}

/* ---------- Tiles ---------- */

async function initTiles() {
  const data = await loadJSON("data/categories.json");

  data.categories.forEach((category) => {
    const tile = document.createElement("button");
    tile.className = "tile";
    tile.type = "button";
    tile.innerHTML = `
      <span class="tile-title">${category.title}</span>
      <span class="tile-desc">${category.description || ""}</span>
    `;
    tile.addEventListener("click", () => openCategory(category));
    els.tiles.appendChild(tile);
  });
}

/* ---------- Practice flow ---------- */

async function openCategory(category) {
  try {
    if (!sentenceCache[category.file]) {
      sentenceCache[category.file] = await loadJSON(category.file);
    }
  } catch (err) {
    showError(`Could not load "${category.title}". ${err.message}`);
    return;
  }

  currentSentences = sentenceCache[category.file].sentences;
  currentIndex = -1;

  els.practiceTitle.textContent = category.title;
  els.homeView.classList.add("hidden");
  els.practiceView.classList.remove("hidden");
  window.scrollTo(0, 0);

  showNextSentence();
}

function showNextSentence() {
  currentIndex = randomIndex(currentSentences.length, currentIndex);
  const entry = currentSentences[currentIndex];

  els.practiceTagalog.textContent = entry.tagalog;
  els.practiceEnglish.textContent = entry.english;
  els.practiceEnglish.classList.add("hidden");
  els.translateBtn.classList.remove("hidden");
  els.nextBtn.classList.add("hidden");
}

function revealTranslation() {
  els.practiceEnglish.classList.remove("hidden");
  els.translateBtn.classList.add("hidden");
  els.nextBtn.classList.remove("hidden");
}

function goHome() {
  els.practiceView.classList.add("hidden");
  els.homeView.classList.remove("hidden");
  window.scrollTo(0, 0);
}

/* ---------- Init ---------- */

els.translateBtn.addEventListener("click", revealTranslation);
els.nextBtn.addEventListener("click", showNextSentence);
els.backBtn.addEventListener("click", goHome);

(async function init() {
  try {
    await Promise.all([initWordOfTheDay(), initTiles()]);
  } catch (err) {
    showError(
      "Could not load app data. If you opened index.html directly from disk, " +
        "serve it with a local web server instead (e.g. VS Code Live Server)."
    );
    console.error(err);
  }
})();
