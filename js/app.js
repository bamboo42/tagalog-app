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
  practiceGroup: document.getElementById("practice-group"),
  jumpBar: document.getElementById("jump-bar"),
  dirTl: document.getElementById("dir-tl"),
  dirEn: document.getElementById("dir-en"),
  translateBtn: document.getElementById("translate-btn"),
  nextBtn: document.getElementById("next-btn"),
  backBtn: document.getElementById("back-btn"),
  errorBanner: document.getElementById("error-banner"),
};

// Cache of loaded data files, keyed by file path.
const sentenceCache = {};

// Practice session state.
let currentMode = "sentences"; // "sentences" | "words"
let currentSentences = [];
let currentIndex = -1;

// Word-group state ("words" mode): items shown groupSize at a time.
let groupSize = 1;
let currentWords = [];
let wordOrder = []; // indices into currentWords, shuffled or sequential
let wordPos = 0;
let sequentialWords = false;
let showJumpBar = false;

// Translation direction: false = Tagalog shown first, true = English shown first.
let reversed = localStorage.getItem("tagalog-trainer-direction") === "en-first";

function setDirection(englishFirst) {
  reversed = englishFirst;
  localStorage.setItem(
    "tagalog-trainer-direction",
    englishFirst ? "en-first" : "tl-first"
  );
  els.dirTl.classList.toggle("active", !englishFirst);
  els.dirEn.classList.toggle("active", englishFirst);
}

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

// Fisher-Yates, in place.
function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
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

  const data = sentenceCache[category.file];
  currentMode = category.mode === "words" ? "words" : "sentences";

  els.practiceTitle.textContent = category.title;
  els.homeView.classList.add("hidden");
  els.practiceView.classList.remove("hidden");
  window.scrollTo(0, 0);

  if (currentMode === "words") {
    currentWords = data.words;
    sequentialWords = !!category.sequential;
    showJumpBar = !!category.jumpBar;
    groupSize = category.groupSize || 1;
    wordOrder = currentWords.map((_, i) => i);
    if (!sequentialWords) shuffle(wordOrder);
    wordPos = 0;
    els.nextBtn.textContent = groupSize > 1 ? "Next words" : "Next word";
    buildJumpBar();
    showNextWordGroup();
  } else {
    els.jumpBar.classList.add("hidden");
    currentSentences = data.sentences;
    currentIndex = -1;
    els.nextBtn.textContent = "Next sentence";
    showNextSentence();
  }
}

function showNextSentence() {
  currentIndex = randomIndex(currentSentences.length, currentIndex);
  const entry = currentSentences[currentIndex];

  els.practiceGroup.classList.add("hidden");
  els.practiceTagalog.classList.remove("hidden");
  // "Tagalog" element holds the prompt, "English" the answer — swapped when reversed.
  els.practiceTagalog.textContent = reversed ? entry.english : entry.tagalog;
  els.practiceEnglish.textContent = reversed ? entry.tagalog : entry.english;
  els.practiceEnglish.classList.add("hidden");
  els.translateBtn.classList.remove("hidden");
  els.nextBtn.classList.add("hidden");
}

// Quick-jump buttons (1, 10, 20 ... 90) for categories that opt in (Numbers).
function buildJumpBar() {
  els.jumpBar.innerHTML = "";
  if (!showJumpBar) {
    els.jumpBar.classList.add("hidden");
    return;
  }

  const targets = [1, 10, 20, 30, 40, 50, 60, 70, 80, 90].filter(
    (n) => n <= currentWords.length
  );
  targets.forEach((n) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "jump-btn";
    btn.textContent = n;
    btn.addEventListener("click", () => {
      wordPos = n - 1;
      showNextWordGroup();
    });
    els.jumpBar.appendChild(btn);
  });
  els.jumpBar.classList.remove("hidden");
}

function showNextWordGroup() {
  // End of a pass: sequential lists restart from 1; shuffled lists reshuffle.
  if (wordPos >= wordOrder.length) {
    wordPos = 0;
    if (!sequentialWords) shuffle(wordOrder);
  }

  const group = wordOrder
    .slice(wordPos, wordPos + groupSize)
    .map((i) => currentWords[i]);
  wordPos += group.length;

  els.practiceGroup.innerHTML = "";
  group.forEach((word) => {
    const row = document.createElement("div");
    row.className = "word-row";

    const prompt = document.createElement("span");
    prompt.className = "word-tagalog";
    prompt.textContent = reversed ? word.english : word.tagalog;

    const answer = document.createElement("span");
    answer.className = "word-english veiled";
    answer.textContent = reversed ? word.tagalog : word.english;

    row.append(prompt, answer);

    if (word.exampleTagalog) {
      const example = document.createElement("span");
      example.className = "word-example";
      example.textContent = reversed
        ? word.exampleEnglish || ""
        : word.exampleTagalog;

      const exampleAnswer = document.createElement("span");
      exampleAnswer.className = "word-example-english veiled";
      exampleAnswer.textContent = reversed
        ? word.exampleTagalog
        : word.exampleEnglish || "";

      row.append(example, exampleAnswer);
    }

    els.practiceGroup.appendChild(row);
  });

  els.practiceGroup.classList.remove("hidden");
  els.practiceTagalog.classList.add("hidden");
  els.practiceEnglish.classList.add("hidden");
  els.translateBtn.classList.remove("hidden");
  els.nextBtn.classList.add("hidden");
}

function revealTranslation() {
  if (currentMode === "words") {
    els.practiceGroup
      .querySelectorAll(".veiled")
      .forEach((el) => el.classList.remove("veiled"));
  } else {
    els.practiceEnglish.classList.remove("hidden");
  }
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
els.nextBtn.addEventListener("click", () => {
  if (currentMode === "words") showNextWordGroup();
  else showNextSentence();
});
els.backBtn.addEventListener("click", goHome);
els.dirTl.addEventListener("click", () => setDirection(false));
els.dirEn.addEventListener("click", () => setDirection(true));
setDirection(reversed); // reflect the saved choice on load

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
