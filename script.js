// ====== CONFIG & DEFAULTS ======

// Default games
const defaultGameList = [
  "minecraft",
  "astroneer",
  "overwatch",
  "no mans sky",
  "peak",
  "skribble.io",
  "roblox",
  "KTaNE",
  "webfishing"
];

// Default challenges (format the user gave, slightly tidied for parsing)
const defaultChallengeText = `
minecraft(make cake,cause an explosion,win a bingo game,go fishin,tame a dog,tame a cat);
astroneer(catch a snail,go to another planet,cause an explosion,drive car off huge ramp);
overwatch(get play of the game,kill using ultimate,2x kills as mercy,1x kill as torbjorn hammer only,solo ult someone,start a weird convo);
no mans sky(complete a mission together,travel through a blackhole,build a monument,make giant hole);
peak(eat everything you see,use items asap,no backpack,always save eachother,can only talk if backflipping);
skribble.io(blindfolded,one line only,large brush only,tiny brush only);
roblox(make someone ragequit,obby together,annot someone,join teamgame and make someone lose);
KTaNE(text only,<1min,1 life);
webfishing(make someone laugh,make two people fight,brag about having better fish,recieve 2 love notes,start a political debate);
`;

// Global config (overridable via settings + localStorage)
let config = {
  games: defaultGameList.slice(),
  challengesText: defaultChallengeText.trim(),
  enableGameVoting: true,
  enableChallenges: true,
  enableChallengeVoting: true
};

// Parsed challenge map: key = gameNameLower -> { displayName, challenges[] }
let challengeMap = {};

// LocalStorage key
const STORAGE_KEY = "gameNightCasinoConfig";

// Shared segment colours for wheels
const segmentColors = [
  "#f97316",
  "#3b82f6",
  "#22c55e",
  "#ec4899",
  "#eab308",
  "#8b5cf6",
  "#06b6d4",
  "#facc15",
  "#4ade80",
  "#fb7185"
];

// ====== AUDIO ======

const bgMusic = document.getElementById("bgMusic");
const clickSound = document.getElementById("clickSound");
const spinSound = document.getElementById("spinSound");
const winSound = document.getElementById("winSound");

let musicStarted = false;

function ensureMusicStarted() {
  if (musicStarted) return;
  musicStarted = true;
  if (!bgMusic) return;
  bgMusic.volume = 0.6;
  bgMusic
    .play()
    .catch(() => {
      // Autoplay blocked, ignore silently
    });
}

function playClick() {
  if (!clickSound) return;
  clickSound.currentTime = 0;
  clickSound.play().catch(() => {});
}

function playSpin() {
  if (!spinSound) return;
  spinSound.currentTime = 0;
  spinSound.play().catch(() => {});
}

function playWin() {
  if (!winSound) return;
  winSound.currentTime = 0;
  winSound.play().catch(() => {});
}

// ====== DOM HELPERS ======

function $(id) {
  return document.getElementById(id);
}

// Screens
const screenMenu = $("screen-menu");
const screenWheel = $("screen-wheel");
const screenBingo = $("screen-bingo");

// Menu buttons
const btnPlayWheel = $("btnPlayWheel");
const btnPlayBingo = $("btnPlayBingo");
const btnOpenSettingsFromMenu = $("btnOpenSettingsFromMenu");

// Wheel screen buttons
const btnBackFromWheel = $("btnBackFromWheel");
const btnOpenSettingsFromWheel = $("btnOpenSettingsFromWheel");
const btnSpinGame = $("btnSpinGame");
const btnSpinChallenge = $("btnSpinChallenge");

// Bingo screen buttons
const btnBackFromBingo = $("btnBackFromBingo");
const btnOpenSettingsFromBingo = $("btnOpenSettingsFromBingo");
const btnCopySeedLink = $("btnCopySeedLink");
const btnStartBingo = $("btnStartBingo");

// Wheel DOM
const gameWheelCanvas = $("gameWheelCanvas");
const challengeWheelCanvas = $("challengeWheelCanvas");
const gameResultText = $("gameResultText");
const challengeResultText = $("challengeResultText");
const gameVotesContainer = $("gameVotesContainer");
const challengeVotesContainer = $("challengeVotesContainer");

// Bingo DOM
const bingoSeedDisplay = $("bingoSeedDisplay");
const bingoCardEl = $("bingoCard");
const bingoRerollInfo = $("bingoRerollInfo");
const bingoStatusText = $("bingoStatusText");

// Settings DOM
const settingsOverlay = $("settingsOverlay");
const gameListInput = $("gameListInput");
const challengeConfigInput = $("challengeConfigInput");
const enableGameVotingInput = $("enableGameVoting");
const enableChallengesInput = $("enableChallenges");
const enableChallengeVotingInput = $("enableChallengeVoting");
const btnSaveSettings = $("btnSaveSettings");
const btnCancelSettings = $("btnCancelSettings");
const btnResetDefaults = $("btnResetDefaults");

// ====== SCREEN NAVIGATION ======

function showScreen(which) {
  [screenMenu, screenWheel, screenBingo].forEach((s) => s.classList.remove("active"));
  if (which === "menu") screenMenu.classList.add("active");
  if (which === "wheel") screenWheel.classList.add("active");
  if (which === "bingo") screenBingo.classList.add("active");
}

function openSettings() {
  settingsOverlay.classList.remove("hidden");
}

function closeSettings() {
  settingsOverlay.classList.add("hidden");
}

// ====== CONFIG + CHALLENGE PARSING ======

function parseGamesFromTextarea(value) {
  return value
    .split("\n")
    .map((g) => g.trim())
    .filter((g) => g.length > 0);
}

function parseChallenges(text) {
  const map = {};
  const chunks = text.split(";");

  for (const chunk of chunks) {
    const part = chunk.trim();
    if (!part) continue;

    const match = part.match(/^([^()]+)\(([^()]*)\)$/);
    if (!match) {
      // Ignore malformed entries rather than exploding
      continue;
    }

    const gameNameRaw = match[1].trim();
    const challengesStr = match[2].trim();

    if (!gameNameRaw || !challengesStr) continue;

    const gameKey = gameNameRaw.toLowerCase();
    const challenges = challengesStr
      .split(",")
      .map((c) => c.trim())
      .filter((c) => c.length > 0);

    if (!challenges.length) continue;

    map[gameKey] = {
      displayName: gameNameRaw,
      challenges
    };
  }

  return map;
}

function loadConfigFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      challengeMap = parseChallenges(config.challengesText);
      return;
    }
    const data = JSON.parse(raw);
    config = {
      games: Array.isArray(data.games) && data.games.length ? data.games : defaultGameList.slice(),
      challengesText: typeof data.challengesText === "string" && data.challengesText.trim().length
        ? data.challengesText
        : defaultChallengeText.trim(),
      enableGameVoting: !!data.enableGameVoting,
      enableChallenges: data.enableChallenges === false ? false : true,
      enableChallengeVoting: !!data.enableChallengeVoting
    };
    challengeMap = parseChallenges(config.challengesText);
  } catch (e) {
    console.warn("Failed to load config, using defaults.", e);
    config = {
      games: defaultGameList.slice(),
      challengesText: defaultChallengeText.trim(),
      enableGameVoting: true,
      enableChallenges: true,
      enableChallengeVoting: true
    };
    challengeMap = parseChallenges(config.challengesText);
  }
}

function saveConfigToStorage() {
  const data = {
    games: config.games,
    challengesText: config.challengesText,
    enableGameVoting: config.enableGameVoting,
    enableChallenges: config.enableChallenges,
    enableChallengeVoting: config.enableChallengeVoting
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function syncSettingsUIFromConfig() {
  gameListInput.value = config.games.join("\n");
  challengeConfigInput.value = config.challengesText;
  enableGameVotingInput.checked = config.enableGameVoting;
  enableChallengesInput.checked = config.enableChallenges;
  enableChallengeVotingInput.checked = config.enableChallengeVoting;
}

function readSettingsFromUI() {
  const games = parseGamesFromTextarea(gameListInput.value);
  if (!games.length) {
    alert("Game list cannot be empty. Keeping previous games.");
  } else {
    config.games = games;
  }

  const chText = challengeConfigInput.value.trim();
  if (!chText) {
    alert("Challenge config cannot be empty. Keeping previous challenges.");
  } else {
    const parsed = parseChallenges(chText);
    if (Object.keys(parsed).length === 0) {
      alert("Could not parse any challenges from that text. Keeping previous challenges.");
    } else {
      config.challengesText = chText;
      challengeMap = parsed;
    }
  }

  config.enableGameVoting = enableGameVotingInput.checked;
  config.enableChallenges = enableChallengesInput.checked;
  config.enableChallengeVoting = enableChallengeVotingInput.checked;

  saveConfigToStorage();
}

// ====== WHEEL CLASS ======

class Wheel {
  constructor(opts) {
    this.canvas = opts.canvas;
    this.ctx = this.canvas.getContext("2d");
    this.getItems = opts.getItems; // function returns array
    this.getVotingEnabled = opts.getVotingEnabled; // function returns bool
    this.maxChips = opts.maxChips || 2;
    this.voteContainer = opts.voteContainer || null;
    this.spinButton = opts.spinButton || null;
    this.onSpinEnd = opts.onSpinEnd || (() => {});

    this.items = [];
    this.chips = {}; // itemName -> count
    this.totalChips = 0;

    this.currentAngle = 0;
    this.spinning = false;
    this.spinStartTime = 0;
    this.spinDuration = 0;
    this.startAngleAtSpin = 0;
    this.targetAngle = 0;
    this.chosenIndex = null;

    if (this.spinButton) {
      this.spinButton.addEventListener("click", () => {
        if (this.spinning) return;
        ensureMusicStarted();
        playClick();
        this.startSpin();
      });
    }

    if (this.voteContainer) {
      this.voteContainer.addEventListener("click", (e) => {
        const btn = e.target.closest(".chip-button");
        if (!btn) return;
        ensureMusicStarted();
        playClick();
        const index = parseInt(btn.dataset.index, 10);
        this.handleChipClick(index);
      });
    }

    this.refresh();
  }

  refresh() {
    this.items = (this.getItems && this.getItems()) || [];
    this.chips = {};
    this.totalChips = 0;
    this.currentAngle = 0;
    this.renderVotes();
    this.draw();
  }

  renderVotes() {
    if (!this.voteContainer) return;

    this.voteContainer.innerHTML = "";
    const votingEnabled = this.getVotingEnabled ? this.getVotingEnabled() : false;

    if (!votingEnabled) {
      this.voteContainer.textContent = "Voting disabled in settings.";
      return;
    }

    if (!this.items.length) {
      this.voteContainer.textContent = "Add some options first.";
      return;
    }

    const info = document.createElement("div");
    info.className = "vote-info";
    info.textContent = "Tap games to place up to 2 pokerchips.";
    this.voteContainer.appendChild(info);

    const list = document.createElement("div");
    list.className = "vote-list";

    this.items.forEach((item, index) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "chip-button";
      btn.dataset.index = String(index);

      const labelSpan = document.createElement("span");
      labelSpan.textContent = item;

      const chipsSpan = document.createElement("span");
      chipsSpan.className = "chips";

      btn.appendChild(labelSpan);
      btn.appendChild(chipsSpan);
      list.appendChild(btn);
    });

    this.voteContainer.appendChild(list);
    this.updateChipLabels();
  }

  updateChipLabels() {
    if (!this.voteContainer) return;
    const votingEnabled = this.getVotingEnabled ? this.getVotingEnabled() : false;
    this.voteContainer
      .querySelectorAll(".chip-button")
      .forEach((btn) => {
        const idx = parseInt(btn.dataset.index, 10);
        const name = this.items[idx];
        const count = this.chips[name] || 0;
        const span = btn.querySelector(".chips");
        span.textContent = votingEnabled && count > 0 ? `💰x${count}` : "";
        btn.classList.toggle("has-chips", votingEnabled && count > 0);
      });
  }

  handleChipClick(index) {
    if (!this.items.length) return;
    const votingEnabled = this.getVotingEnabled ? this.getVotingEnabled() : false;
    if (!votingEnabled) return;

    const name = this.items[index];
    const current = this.chips[name] || 0;

    if (current > 0) {
      // Remove a chip
      this.chips[name] = current - 1;
      if (this.chips[name] <= 0) {
        delete this.chips[name];
      }
      this.totalChips -= 1;
    } else {
      // Add a chip if we have capacity
      if (this.totalChips >= this.maxChips) {
        // Max chips reached, ignore
        return;
      }
      this.chips[name] = 1;
      this.totalChips += 1;
    }

    this.updateChipLabels();
  }

  resizeCanvasForHiDPI() {
    const rect = this.canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  draw() {
    this.resizeCanvasForHiDPI();

    const rect = this.canvas.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    const ctx = this.ctx;
    const cx = width / 2;
    const cy = height / 2;
    const radius = Math.min(width, height) / 2 - 6;

    ctx.clearRect(0, 0, width, height);

    ctx.save();
    ctx.translate(cx, cy);

    if (!this.items.length) {
      ctx.beginPath();
      ctx.arc(0, 0, radius, 0, Math.PI * 2);
      ctx.fillStyle = "#020617";
      ctx.fill();
      ctx.strokeStyle = "#4b5563";
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = "#9ca3af";
      ctx.font = "14px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("Add options in Settings", 0, 0);
      ctx.restore();
      return;
    }

    const numSegments = this.items.length;
    const segmentAngle = (Math.PI * 2) / numSegments;

    for (let i = 0; i < numSegments; i++) {
      const startAngle = this.currentAngle + i * segmentAngle;
      const endAngle = startAngle + segmentAngle;

      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, radius, startAngle, endAngle);
      ctx.closePath();

      const color = segmentColors[i % segmentColors.length];
      ctx.fillStyle = color;
      ctx.fill();
      ctx.strokeStyle = "#020617";
      ctx.lineWidth = 2;
      ctx.stroke();

      // Label
      const midAngle = startAngle + segmentAngle / 2;
      ctx.save();
      ctx.rotate(midAngle);
      ctx.translate(radius * 0.7, 0);
      ctx.rotate(Math.PI / 2);

      ctx.fillStyle = "#020617";
      ctx.font = "bold 12px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      const label = this.items[i];
      const display = label.length > 18 ? label.slice(0, 15) + "…" : label;
      ctx.fillText(display, 0, 0);

      ctx.restore();
    }

    // Inner circle
    ctx.beginPath();
    ctx.arc(0, 0, radius * 0.2, 0, Math.PI * 2);
    ctx.fillStyle = "#020617";
    ctx.fill();

    ctx.restore();
  }

  weightedRandomIndex() {
    if (!this.items.length) return 0;

    const votingEnabled = this.getVotingEnabled ? this.getVotingEnabled() : false;

    if (!votingEnabled || this.totalChips === 0) {
      // Simple uniform random
      return Math.floor(Math.random() * this.items.length);
    }

    const weights = this.items.map((name) => 1 + (this.chips[name] || 0));
    const total = weights.reduce((a, b) => a + b, 0);
    const r = Math.random() * total;
    let acc = 0;
    for (let i = 0; i < weights.length; i++) {
      acc += weights[i];
      if (r <= acc) return i;
    }
    return this.items.length - 1;
  }

  startSpin() {
    this.items = (this.getItems && this.getItems()) || [];
    if (!this.items.length) {
      alert("No options available. Add them in Settings first.");
      return;
    }

    this.chosenIndex = this.weightedRandomIndex();

    const numSegments = this.items.length;
    const segmentAngle = (Math.PI * 2) / numSegments;
    const extraSpins = 4 + Math.floor(Math.random() * 3); // 4–6 extra turns

    const finalAngleForWinner =
      -Math.PI / 2 - segmentAngle * (this.chosenIndex + 0.5);

    this.targetAngle = finalAngleForWinner + extraSpins * Math.PI * 2;
    this.spinDuration = 4000 + Math.random() * 1500;
    this.spinStartTime = performance.now();
    this.startAngleAtSpin = this.currentAngle;
    this.spinning = true;

    if (this.spinButton) this.spinButton.disabled = true;
    playSpin();
    requestAnimationFrame((ts) => this.animateSpin(ts));
  }

  animateSpin(timestamp) {
    if (!this.spinning) return;

    const elapsed = timestamp - this.spinStartTime;
    const t = Math.min(elapsed / this.spinDuration, 1);
    const eased = 1 - Math.pow(1 - t, 3); // easeOutCubic

    this.currentAngle =
      this.startAngleAtSpin + (this.targetAngle - this.startAngleAtSpin) * eased;

    this.draw();

    if (t < 1) {
      requestAnimationFrame((ts) => this.animateSpin(ts));
    } else {
      this.spinning = false;
      if (this.spinButton) this.spinButton.disabled = false;
      const winner = this.items[this.chosenIndex];
      playWin();
      this.onSpinEnd(winner, this.chosenIndex);
    }
  }
}

// ====== WHEEL MODE SETUP ======

let gameWheel = null;
let challengeWheel = null;
let lastChosenGame = null;

function getGameItems() {
  return config.games;
}

function getChallengeItemsForGame(gameName) {
  if (!gameName) return [];
  const key = gameName.toLowerCase();
  const entry = challengeMap[key];
  if (!entry) return [];
  return entry.challenges;
}

function setupWheels() {
  gameWheel = new Wheel({
    canvas: gameWheelCanvas,
    getItems: getGameItems,
    getVotingEnabled: () => config.enableGameVoting,
    maxChips: 2,
    voteContainer: gameVotesContainer,
    spinButton: btnSpinGame,
    onSpinEnd: (winner) => {
      lastChosenGame = winner;
      gameResultText.innerHTML =
        'Tonight we play: <span class="name">' + winner + "</span>";
      challengeResultText.textContent =
        "Pick a challenge for " + winner + "!";
      // Reset challenge wheel based on this game
      const items = getChallengeItemsForGame(winner);
      challengeWheel.getItems = () => items;
      challengeWheel.refresh();

      if (!config.enableChallenges || !items.length) {
        btnSpinChallenge.disabled = true;
        if (!config.enableChallenges) {
          challengeResultText.textContent =
            "Challenge wheel disabled in settings.";
        } else if (!items.length) {
          challengeResultText.textContent =
            "No challenges configured for " + winner + ".";
        }
      } else {
        btnSpinChallenge.disabled = false;
      }
    }
  });

  challengeWheel = new Wheel({
    canvas: challengeWheelCanvas,
    getItems: () => [],
    getVotingEnabled: () => config.enableChallengeVoting,
    maxChips: 2,
    voteContainer: challengeVotesContainer,
    spinButton: btnSpinChallenge,
    onSpinEnd: (winner) => {
      challengeResultText.innerHTML =
        'Challenge: <span class="name">' + winner + "</span>";
    }
  });

  // Initially challenge wheel has no items
  challengeWheel.refresh();
}

// ====== BINGO MODE SETUP ======

let bingoSeed = null;
let bingoRerollsLeft = 2;
let bingoStarted = false;
let bingoCells = []; // [{ game, challenge, completed, el }]

// Simple LCG RNG with seed
function makeRng(seed) {
  let s = seed >>> 0;
  return function () {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
}

// Flatten challenges into [{ game, challenge }]
function getAllChallengeEntries() {
  const entries = [];
  for (const gameKey in challengeMap) {
    const entry = challengeMap[gameKey];
    entry.challenges.forEach((ch) => {
      entries.push({
        game: entry.displayName,
        challenge: ch
      });
    });
  }
  return entries;
}

function generateBingoSeed(existingSeed) {
  if (existingSeed != null) return existingSeed;
  return Math.floor(Math.random() * 1_000_000_000);
}

function updateUrlForBingo(seed) {
  const url = new URL(window.location.href);
  url.searchParams.set("mode", "bingo");
  url.searchParams.set("seed", String(seed));
  history.replaceState(null, "", url.toString());
}

function initBingoFromSeed(seed) {
  bingoSeed = generateBingoSeed(seed);
  bingoRerollsLeft = 2;
  bingoStarted = false;
  bingoCells = [];
  bingoSeedDisplay.textContent = "Seed: " + bingoSeed;
  bingoRerollInfo.textContent = "Rerolls left: " + bingoRerollsLeft;
  bingoStatusText.textContent =
    "Reroll cells you don’t like, then press Start Bingo.";
  bingoStatusText.classList.remove("win");

  updateUrlForBingo(bingoSeed);

  const entries = getAllChallengeEntries();
  if (!entries.length) {
    bingoCardEl.innerHTML =
      "<p>No challenges configured. Add some in Settings first.</p>";
    return;
  }

  const rng = makeRng(bingoSeed);

  const chosen = [];
  const usedIndices = new Set();

  for (let i = 0; i < 25; i++) {
    let idx;
    if (usedIndices.size < entries.length) {
      // Draw unique until we've used them all
      do {
        idx = Math.floor(rng() * entries.length);
      } while (usedIndices.has(idx));
      usedIndices.add(idx);
    } else {
      // Allow repeats if we don't have enough unique entries
      idx = Math.floor(rng() * entries.length);
    }
    chosen.push(entries[idx]);
  }

  bingoCardEl.innerHTML = "";
  bingoCells = [];

  chosen.forEach((entry, index) => {
    const cell = document.createElement("div");
    cell.className = "bingo-cell";
    cell.dataset.index = String(index);

    const gameDiv = document.createElement("div");
    gameDiv.className = "bingo-cell-game";
    gameDiv.textContent = entry.game;

    const chDiv = document.createElement("div");
    chDiv.className = "bingo-cell-challenge";
    chDiv.textContent = entry.challenge;

    cell.appendChild(gameDiv);
    cell.appendChild(chDiv);

    cell.addEventListener("click", () => handleBingoCellClick(index));

    bingoCardEl.appendChild(cell);

    bingoCells.push({
      game: entry.game,
      challenge: entry.challenge,
      completed: false,
      el: cell
    });
  });
}

function handleBingoCellClick(index) {
  if (!bingoCells[index]) return;
  const cell = bingoCells[index];

  if (!bingoStarted) {
    // Reroll mode
    if (bingoRerollsLeft <= 0) {
      bingoStatusText.textContent =
        "No rerolls left. Press Start Bingo when ready!";
      return;
    }

    const entries = getAllChallengeEntries();
    if (!entries.length) return;

    const rng = makeRng(Math.floor(Math.random() * 1_000_000_000));
    const newEntry = entries[Math.floor(rng() * entries.length)];
    cell.game = newEntry.game;
    cell.challenge = newEntry.challenge;

    // Update DOM
    const gameDiv = cell.el.querySelector(".bingo-cell-game");
    const chDiv = cell.el.querySelector(".bingo-cell-challenge");
    if (gameDiv) gameDiv.textContent = cell.game;
    if (chDiv) chDiv.textContent = cell.challenge;

    bingoRerollsLeft -= 1;
    bingoRerollInfo.textContent = "Rerolls left: " + bingoRerollsLeft;
    bingoStatusText.textContent =
      bingoRerollsLeft > 0
        ? "Reroll cells you don’t like, then press Start Bingo."
        : "No rerolls left. Press Start Bingo when ready!";
  } else {
    // Completion mode
    cell.completed = !cell.completed;
    cell.el.classList.toggle("completed", cell.completed);
    checkBingoWin();
  }
}

function checkBingoWin() {
  const size = 5;

  const idx = (r, c) => r * size + c;

  const isCompleteCell = (i) => bingoCells[i] && bingoCells[i].completed;

  let win = false;

  // Rows
  for (let r = 0; r < size; r++) {
    let rowComplete = true;
    for (let c = 0; c < size; c++) {
      if (!isCompleteCell(idx(r, c))) {
        rowComplete = false;
        break;
      }
    }
    if (rowComplete) {
      win = true;
      break;
    }
  }

  // Columns
  if (!win) {
    for (let c = 0; c < size; c++) {
      let colComplete = true;
      for (let r = 0; r < size; r++) {
        if (!isCompleteCell(idx(r, c))) {
          colComplete = false;
          break;
        }
      }
      if (colComplete) {
        win = true;
        break;
      }
    }
  }

  // Diagonals
  if (!win) {
    let diag1 = true;
    let diag2 = true;
    for (let i = 0; i < size; i++) {
      if (!isCompleteCell(idx(i, i))) diag1 = false;
      if (!isCompleteCell(idx(i, size - 1 - i))) diag2 = false;
    }
    win = diag1 || diag2;
  }

  if (win) {
    bingoStatusText.textContent = "BINGO! You completed a line – jackpot! 🎉";
    bingoStatusText.classList.add("win");
    playWin();
  } else {
    bingoStatusText.textContent = "Keep going – complete a row to win!";
    bingoStatusText.classList.remove("win");
  }
}

// ====== MODE ENTRY HELPERS ======

function enterWheelMode() {
  showScreen("wheel");
  ensureMusicStarted();
  gameWheel.refresh();
  challengeWheel.getItems = () => [];
  challengeWheel.refresh();
  btnSpinChallenge.disabled = true;
  gameResultText.textContent = "Waiting to spin…";
  challengeResultText.textContent = "Pick a game first, then spin for a challenge.";
}

function enterBingoMode() {
  showScreen("bingo");
  ensureMusicStarted();
  const url = new URL(window.location.href);
  const seedParam = url.searchParams.get("seed");
  const parsedSeed = seedParam ? parseInt(seedParam, 10) : null;
  initBingoFromSeed(Number.isFinite(parsedSeed) ? parsedSeed : null);
}

// ====== EVENT WIRING ======

function wireEvents() {
  // Menu
  btnPlayWheel.addEventListener("click", () => {
    ensureMusicStarted();
    playClick();
    enterWheelMode();
  });

  btnPlayBingo.addEventListener("click", () => {
    ensureMusicStarted();
    playClick();
    enterBingoMode();
  });

  btnOpenSettingsFromMenu.addEventListener("click", () => {
    ensureMusicStarted();
    playClick();
    syncSettingsUIFromConfig();
    openSettings();
  });

  // Wheel screen nav
  btnBackFromWheel.addEventListener("click", () => {
    playClick();
    showScreen("menu");
  });

  btnOpenSettingsFromWheel.addEventListener("click", () => {
    ensureMusicStarted();
    playClick();
    syncSettingsUIFromConfig();
    openSettings();
  });

  // Bingo screen nav
  btnBackFromBingo.addEventListener("click", () => {
    playClick();
    showScreen("menu");
  });

  btnOpenSettingsFromBingo.addEventListener("click", () => {
    ensureMusicStarted();
    playClick();
    syncSettingsUIFromConfig();
    openSettings();
  });

  // Settings overlay
  btnCancelSettings.addEventListener("click", () => {
    playClick();
    closeSettings();
  });

  btnSaveSettings.addEventListener("click", () => {
    playClick();
    readSettingsFromUI();
    gameWheel.refresh();
    // Reset challenge wheel so it is clean
    challengeWheel.getItems = () => [];
    challengeWheel.refresh();
    btnSpinChallenge.disabled = true;
    closeSettings();
  });

  btnResetDefaults.addEventListener("click", () => {
    playClick();
    if (!confirm("Reset games and challenges to defaults?")) return;
    config.games = defaultGameList.slice();
    config.challengesText = defaultChallengeText.trim();
    config.enableGameVoting = true;
    config.enableChallenges = true;
    config.enableChallengeVoting = true;
    challengeMap = parseChallenges(config.challengesText);
    saveConfigToStorage();
    syncSettingsUIFromConfig();
    gameWheel.refresh();
    challengeWheel.getItems = () => [];
    challengeWheel.refresh();
    btnSpinChallenge.disabled = true;
  });

  // Bingo controls
  btnCopySeedLink.addEventListener("click", async () => {
    playClick();
    try {
      await navigator.clipboard.writeText(window.location.href);
      alert("Link copied! Share it so others get the same card.");
    } catch {
      alert("Could not copy automatically. You can copy the URL from the address bar.");
    }
  });

  btnStartBingo.addEventListener("click", () => {
    ensureMusicStarted();
    playClick();
    bingoStarted = true;
    bingoRerollsLeft = 0;
    bingoRerollInfo.textContent =
      "Rerolls left: 0 (card locked – click cells as you complete challenges)";
    bingoStatusText.textContent =
      "Card locked. Click cells as you complete challenges and get a row!";
    bingoStatusText.classList.remove("win");
  });

  // Handle window resize for wheels
  window.addEventListener("resize", () => {
    if (gameWheel) gameWheel.draw();
    if (challengeWheel) challengeWheel.draw();
  });
}

// ====== INIT ======

function init() {
  loadConfigFromStorage();
  challengeMap = parseChallenges(config.challengesText);
  syncSettingsUIFromConfig();
  setupWheels();
  wireEvents();

  // Start on menu
  showScreen("menu");

  // If URL has mode=bingo, jump straight into bingo mode
  const url = new URL(window.location.href);
  if (url.searchParams.get("mode") === "bingo") {
    enterBingoMode();
  }
}

document.addEventListener("DOMContentLoaded", init);
