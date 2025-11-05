const DEFAULT_STARTING_SCORE = 501;
const DEFAULT_OUT_MODE = "single";
const MAX_DARTS_PER_TURN = 3;
const MULTIPLIER_CONFIG = {
  1: { label: "Single", short: "S", isDouble: false },
  2: { label: "Double", short: "D", isDouble: true },
  3: { label: "Triple", short: "T", isDouble: false },
};
const OUT_MODE_LABELS = {
  double: "Double Out",
  single: "Single Out",
};
const PROFILE_STORAGE_KEY = "dartsProfiles";
const MATCH_MODES = {
  single: {
    id: "single",
    label: "Einzel-Leg",
    setsToWin: 1,
    legsPerSet: 1,
    legsToWin: 1,
  },
  bestOfThreeLegs: {
    id: "bestOfThreeLegs",
    label: "Sätze (Best of 3 Legs)",
    setsToWin: 2,
    legsPerSet: 3,
    legsToWin: 2,
  },
};
const DEFAULT_MATCH_MODE = "single";

const elements = {
  setupForm: document.getElementById("setup-form"),
  resetBtn: document.getElementById("reset-btn"),
  scoreboard: document.getElementById("scoreboard"),
  historyLog: document.getElementById("history-log"),
  listenBtn: document.getElementById("listen-btn"),
  stopListenBtn: document.getElementById("stop-listen-btn"),
  voiceStatus: document.getElementById("voice-status"),
  lastUtterance: document.getElementById("last-utterance"),
  lastInterpretation: document.getElementById("last-interpretation"),
  manualScoreInput: document.getElementById("manual-score"),
  manualCommitBtn: document.getElementById("manual-commit"),
  manualBustBtn: document.getElementById("manual-bust"),
  dartPicker: document.getElementById("dart-picker"),
  template: document.getElementById("scoreboard-item-template"),
  startingScoreSelect: document.getElementById("starting-score"),
  outModeSelect: document.getElementById("out-mode"),
  matchModeSelect: document.getElementById("match-mode"),
  playerOneProfileSelect: document.getElementById("player-one-profile"),
  playerTwoProfileSelect: document.getElementById("player-two-profile"),
  playerOneInput: document.getElementById("player-one"),
  playerTwoInput: document.getElementById("player-two"),
  gameSettings: document.getElementById("game-settings"),
  activePlayerBanner: document.getElementById("active-player-banner"),
  scoreboardCard: document.querySelector(".scoreboard"),
  undoBtn: document.getElementById("undo-btn"),
  dartModeSwitch: document.querySelector(".dart-mode-switch"),
  dartModeButtons: Array.from(document.querySelectorAll(".dart-mode-button")),
  dartNumberButtons: Array.from(document.querySelectorAll(".dart-number")),
  comboButtons: Array.from(document.querySelectorAll(".combo-button")),
  viewToggleButtons: Array.from(document.querySelectorAll(".view-toggle-btn")),
  profileManager: document.querySelector(".profile-manager"),
  profileForm: document.getElementById("profile-form"),
  profileList: document.getElementById("profile-list"),
  profileImageInput: document.getElementById("profile-image"),
  profileImagePreview: document.getElementById("profile-image-preview"),
  profileResetBtn: document.getElementById("profile-reset"),
  profileFirstName: document.getElementById("profile-first-name"),
  profileLastName: document.getElementById("profile-last-name"),
  profileNickname: document.getElementById("profile-nickname"),
  leaderboardCard: document.querySelector(".leaderboard-card"),
  leaderboardSortButtons: Array.from(document.querySelectorAll(".leaderboard-sort-btn")),
  leaderboardBody: document.getElementById("leaderboard-body"),
  leaderboardEmpty: document.getElementById("leaderboard-empty"),
};

const gameState = {
  players: [],
  activeIndex: 0,
  startingScore: DEFAULT_STARTING_SCORE,
  outMode: DEFAULT_OUT_MODE,
  legActive: false,
  currentTurn: null,
  history: [],
  winnerId: null,
  snapshots: [],
  dartMultiplier: 1,
  viewMode: "setup",
  statsCommitted: false,
  leaderboardSort: "average",
  matchMode: DEFAULT_MATCH_MODE,
  matchConfig: { ...MATCH_MODES[DEFAULT_MATCH_MODE] },
  currentSet: 1,
  currentLeg: 1,
  legStarterIndex: 0,
  lastLegWinnerId: null,
  matchCompleted: false,
};

let profiles = [];
let pendingProfileImage = null;
const PROFILES_API_URL = "/api/profiles";
let pendingServerSync = null;
let serverSyncDisabled = false;

async function fetchProfilesFromServer() {
  if (typeof fetch !== "function") return null;
  try {
    const response = await fetch(PROFILES_API_URL, { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`Serverantwort ${response.status}`);
    }
    const data = await response.json();
    if (Array.isArray(data)) {
      serverSyncDisabled = false;
      return data;
    }
  } catch (error) {
    console.warn("Profile konnten nicht vom Server geladen werden:", error);
  }
  return null;
}

function scheduleProfileSync() {
  if (serverSyncDisabled || typeof fetch !== "function") return;
  if (pendingServerSync) {
    clearTimeout(pendingServerSync);
  }
  pendingServerSync = setTimeout(() => {
    pendingServerSync = null;
    syncProfilesToServer(profiles);
  }, 300);
}

async function syncProfilesToServer(currentProfiles) {
  if (serverSyncDisabled || typeof fetch !== "function") return;
  try {
    const response = await fetch(PROFILES_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ profiles: currentProfiles }),
    });
    if (!response.ok) {
      throw new Error(`Serverantwort ${response.status}`);
    }
    serverSyncDisabled = false;
  } catch (error) {
    console.warn("Profile konnten nicht zum Server synchronisiert werden:", error);
    serverSyncDisabled = true;
  }
}

function getCurrentMatchConfig() {
  return (
    gameState.matchConfig ||
    { ...(MATCH_MODES[gameState.matchMode] || MATCH_MODES[DEFAULT_MATCH_MODE]) }
  );
}

function isSetsModeActive(config = getCurrentMatchConfig()) {
  return (config.setsToWin || 1) > 1 || (config.legsPerSet || 1) > 1;
}

function legsNeededForSet(config = getCurrentMatchConfig()) {
  if (config.legsToWin) return config.legsToWin;
  const legsPerSet = config.legsPerSet || 1;
  return Math.floor(legsPerSet / 2) + 1;
}

function computeNextLegStarter() {
  const playersCount = gameState.players.length || 1;
  const next = (gameState.legStarterIndex + 1) % playersCount;
  gameState.legStarterIndex = next;
  return next;
}

function prepareNextLeg() {
  const nextStarter = computeNextLegStarter();
  gameState.players.forEach((player) => {
    player.score = gameState.startingScore;
    player.lastTurn = null;
  });
  gameState.activeIndex = nextStarter;
  gameState.currentTurn = createNewTurn();
  gameState.legActive = true;
  gameState.winnerId = null;
  gameState.snapshots = [];
  gameState.lastLegWinnerId = null;
  gameState.matchCompleted = false;
}

function handleLegWin(player) {
  if (!player) return;
  const config = getCurrentMatchConfig();
  const legsToWin = legsNeededForSet(config);
  const setsToWin = config.setsToWin || 1;

  gameState.legActive = false;
  gameState.lastLegWinnerId = player.id;
  gameState.matchCompleted = false;

  player.totalLegsWon = (player.totalLegsWon || 0) + 1;
  player.legsThisSet = (player.legsThisSet || 0) + 1;

  const displayName = getPlayerDisplayName(player);
  let setWon = false;

  if (player.legsThisSet >= legsToWin) {
    setWon = true;
    player.setsWon = (player.setsWon || 0) + 1;
  }

  const matchWon = player.setsWon >= setsToWin;

  if (matchWon) {
    gameState.winnerId = player.id;
    gameState.matchCompleted = true;
    notifyVoiceStatus("success", `${displayName} gewinnt das Match`);
    finalizeGameStats();
    return;
  }

  if (setWon) {
    gameState.players.forEach((p) => {
      p.legsThisSet = 0;
    });
    gameState.currentSet = (gameState.currentSet || 1) + 1;
    gameState.currentLeg = 1;
    notifyVoiceStatus("info", `${displayName} gewinnt den Satz`);
  } else {
    gameState.currentLeg = (gameState.currentLeg || 1) + 1;
    notifyVoiceStatus("info", `${displayName} gewinnt das Leg`);
  }

  prepareNextLeg();
}

class SpeechEngine {
  constructor(onUtterance, onState) {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    this.supported = Boolean(SpeechRecognition);
    this.onUtterance = onUtterance;
    this.onState = onState;

    if (!this.supported) return;

    this.recognition = new SpeechRecognition();
    this.recognition.lang = "de-DE";
    this.recognition.interimResults = false;
    this.recognition.maxAlternatives = 1;

    this.recognition.addEventListener("start", () => this.onState("listening"));
    this.recognition.addEventListener("end", () => this.onState("idle"));
    this.recognition.addEventListener("error", (event) => this.onState("error", event.error));
    this.recognition.addEventListener("result", (event) => {
      const transcript = Array.from(event.results)
        .map((result) => result[0].transcript)
        .join(" ")
        .trim();
      this.onUtterance(transcript);
    });
  }

  start() {
    if (!this.supported || !this.recognition) return;
    try {
      this.recognition.start();
    } catch (error) {
      this.onState("error", error.message);
    }
  }

  stop() {
    if (!this.supported || !this.recognition) return;
    this.recognition.stop();
  }
}

const speechEngine = new SpeechEngine(handleUtterance, handleSpeechState);

initialize().catch((error) => {
  console.error("Fehler bei der Initialisierung:", error);
});

async function initialize() {
  elements.setupForm.addEventListener("submit", onSetupSubmit);
  elements.resetBtn.addEventListener("click", () => resetGame());
  elements.listenBtn.addEventListener("click", () => speechEngine.start());
  elements.stopListenBtn.addEventListener("click", () => speechEngine.stop());
  elements.manualCommitBtn.addEventListener("click", () => {
    const value = parseInt(elements.manualScoreInput.value, 10);
    if (Number.isFinite(value)) {
      applyTurnResult({ type: "turnScore", score: value, label: `${value}` });
      elements.manualScoreInput.value = "";
    }
  });
  elements.manualBustBtn.addEventListener("click", () => registerBust("Manuelle Eingabe"));
  if (elements.undoBtn) {
    elements.undoBtn.addEventListener("click", () => undoLastTurn());
  }
  if (elements.viewToggleButtons.length) {
    elements.viewToggleButtons.forEach((button) => {
      button.addEventListener("click", () => setViewMode(button.dataset.view));
    });
  }
  if (elements.dartPicker) {
    initializeDartPicker();
    elements.dartPicker.addEventListener("click", onDartPickerClick);
  }
  if (elements.dartModeSwitch) {
    elements.dartModeSwitch.addEventListener("click", onDartModeClick);
  }
  if (elements.comboButtons.length) {
    elements.comboButtons.forEach((button) => {
      button.addEventListener("click", () => applyCombo(button.dataset.combo));
    });
  }
  if (elements.leaderboardSortButtons.length) {
    elements.leaderboardSortButtons.forEach((button) => {
      button.addEventListener("click", () => setLeaderboardSort(button.dataset.sort || "average"));
    });
  }
  if (elements.playerOneProfileSelect && elements.playerOneInput) {
    elements.playerOneProfileSelect.addEventListener("change", () =>
      handleProfileSelection(elements.playerOneProfileSelect, elements.playerOneInput, "Player 1")
    );
  }
  if (elements.playerTwoProfileSelect && elements.playerTwoInput) {
    elements.playerTwoProfileSelect.addEventListener("change", () =>
      handleProfileSelection(elements.playerTwoProfileSelect, elements.playerTwoInput, "Player 2")
    );
  }
  if (elements.profileForm) {
    elements.profileForm.addEventListener("submit", onProfileFormSubmit);
  }
  if (elements.profileImageInput) {
    elements.profileImageInput.addEventListener("change", onProfileImageChange);
  }
  if (elements.profileResetBtn) {
    elements.profileResetBtn.addEventListener("click", () => resetProfileForm());
  }
  if (elements.profileList) {
    elements.profileList.addEventListener("click", onProfileListClick);
  }

  await loadProfiles();
  handleProfileSelection(elements.playerOneProfileSelect, elements.playerOneInput, "Player 1");
  handleProfileSelection(elements.playerTwoProfileSelect, elements.playerTwoInput, "Player 2");
  renderLeaderboard();

  updateViewModeUI();

  if (!speechEngine.supported) {
    elements.voiceStatus.textContent = "Nicht unterstützt";
    elements.voiceStatus.className = "status error";
    elements.listenBtn.disabled = true;
    elements.stopListenBtn.disabled = true;
  }

  resetGame();
}

function onSetupSubmit(event) {
  event.preventDefault();
  const formData = new FormData(event.currentTarget);
  const startingScore = parseInt(formData.get("startingScore"), 10) || DEFAULT_STARTING_SCORE;
  const outModeRaw = formData.get("outMode");
  const outMode = OUT_MODE_LABELS[outModeRaw] ? outModeRaw : DEFAULT_OUT_MODE;
  const matchModeRaw = formData.get("matchMode");
  const matchMode = MATCH_MODES[matchModeRaw] ? matchModeRaw : DEFAULT_MATCH_MODE;

  const playerConfigs = [
    createPlayerConfig(1, formData, elements.playerOneProfileSelect, elements.playerOneInput),
    createPlayerConfig(2, formData, elements.playerTwoProfileSelect, elements.playerTwoInput),
  ];

  startGame(playerConfigs, startingScore, outMode, matchMode);
}

function startGame(
  playerConfigs,
  startingScore,
  outMode = DEFAULT_OUT_MODE,
  matchMode = DEFAULT_MATCH_MODE
) {
  const configs = Array.isArray(playerConfigs)
    ? playerConfigs.map((entry, index) =>
        typeof entry === "string"
          ? { name: entry, profileId: "" }
          : {
              name: (entry.name || entry.displayName || `Player ${index + 1}`).trim(),
              profileId: entry.profileId || "",
            }
      )
    : [];

  if (!configs.length) {
    configs.push({ name: "Player 1", profileId: "" }, { name: "Player 2", profileId: "" });
  }

  gameState.players = configs.map((config, index) => {
    const profile = getProfileById(config.profileId);
    const fallbackName = (config.name || `Player ${index + 1}`).trim();
    const displayName = profile ? getProfileDisplayName(profile) : fallbackName;
    const fullName = profile ? `${profile.firstName} ${profile.lastName}`.trim() : "";
    const photo = profile?.image || null;

    return {
      id: `p${index + 1}`,
      name: fallbackName,
      displayName,
      fullName,
      profileId: profile ? profile.id : "",
      photo,
      score: startingScore,
      history: [],
      lastTurn: null,
      totalPointsThisGame: 0,
      totalDartsThisGame: 0,
      statsHistory: [],
      legsThisSet: 0,
      totalLegsWon: 0,
      setsWon: 0,
    };
  });
  gameState.activeIndex = 0;
  gameState.startingScore = startingScore;
  gameState.outMode = OUT_MODE_LABELS[outMode] ? outMode : DEFAULT_OUT_MODE;
  const matchConfig = MATCH_MODES[matchMode] || MATCH_MODES[DEFAULT_MATCH_MODE];
  gameState.matchMode = matchConfig.id;
  gameState.matchConfig = { ...matchConfig };
  gameState.currentSet = 1;
  gameState.currentLeg = 1;
  gameState.legStarterIndex = 0;
  gameState.lastLegWinnerId = null;
  gameState.matchCompleted = false;
  gameState.legActive = true;
  gameState.currentTurn = createNewTurn();
  gameState.history = [];
  gameState.snapshots = [];
  gameState.winnerId = null;
  gameState.statsCommitted = false;

  render();
}

function resetGame() {
  elements.setupForm.reset();
  if (elements.playerOneProfileSelect) {
    elements.playerOneProfileSelect.value = "";
  }
  if (elements.playerTwoProfileSelect) {
    elements.playerTwoProfileSelect.value = "";
  }
  if (elements.matchModeSelect) {
    elements.matchModeSelect.value = DEFAULT_MATCH_MODE;
  }
  handleProfileSelection(elements.playerOneProfileSelect, elements.playerOneInput, "Player 1");
  handleProfileSelection(elements.playerTwoProfileSelect, elements.playerTwoInput, "Player 2");
  const defaultConfigs = [
    {
      name: elements.playerOneInput ? elements.playerOneInput.value.trim() || "Player 1" : "Player 1",
      profileId: "",
    },
    {
      name: elements.playerTwoInput ? elements.playerTwoInput.value.trim() || "Player 2" : "Player 2",
      profileId: "",
    },
  ];
  startGame(defaultConfigs, DEFAULT_STARTING_SCORE, DEFAULT_OUT_MODE, DEFAULT_MATCH_MODE);
  elements.manualScoreInput.value = "";
  elements.lastUtterance.textContent = "-";
  elements.lastInterpretation.textContent = "-";
  resetProfileForm(true);
}

function createPlayerConfig(slot, formData, select, input) {
  const fieldName = slot === 1 ? "playerOne" : "playerTwo";
  const fallback = `Player ${slot}`;
  const formValue = formData.get(fieldName);
  const inputValue = input ? input.value : "";
  const name = (formValue || inputValue || "").toString().trim() || fallback;
  const profileId = select?.value || "";
  return { slot, name, profileId };
}

function createNewTurn() {
  const player = gameState.players[gameState.activeIndex];
  if (!player) return null;
  return {
    playerId: player.id,
    darts: [],
    startingScore: player.score,
    spoken: [],
    bust: false,
  };
}

function handleUtterance(transcript) {
  if (!gameState.legActive) return;

  elements.lastUtterance.textContent = transcript || "–";
  const interpretation = interpretUtterance(transcript);
  elements.lastInterpretation.textContent = interpretation.readable;

  switch (interpretation.type) {
    case "dart":
      applyDart(interpretation);
      break;
    case "turnScore":
      applyTurnResult(interpretation);
      break;
    case "bust":
      registerBust("Sprachbefehl");
      break;
    case "undo":
      undoLastTurn();
      break;
    case "newGame":
      resetGame();
      break;
    case "noop":
    default:
      notifyVoiceStatus("error", "Nicht erkannt");
  }
}

function handleSpeechState(state, error) {
  switch (state) {
    case "listening":
      notifyVoiceStatus("listening", "Hört zu …");
      break;
    case "idle":
      notifyVoiceStatus("offline", "Inaktiv");
      break;
    case "error":
      notifyVoiceStatus("error", error || "Fehler");
      break;
    default:
      notifyVoiceStatus("offline", "Inaktiv");
      break;
  }
}

function notifyVoiceStatus(status, label) {
  elements.voiceStatus.className = `status ${status}`;
  elements.voiceStatus.textContent = label;
}

function onDartModeClick(event) {
  const button = event.target.closest(".dart-mode-button");
  if (!button) return;

  const multiplier = parseInt(button.dataset.multiplier || "1", 10);
  if (!Number.isFinite(multiplier) || !MULTIPLIER_CONFIG[multiplier]) return;

  setDartMultiplier(multiplier);
}

function onDartPickerClick(event) {
  const button = event.target.closest(".dart-button");
  if (!button || !elements.dartPicker.contains(button) || !gameState.legActive) return;

  const label = button.dataset.label || "";
  const readable = button.dataset.readable || label || button.textContent || "";
  const score = parseInt(button.dataset.score || "0", 10);
  const multiplier = parseInt(button.dataset.multiplier || "1", 10);
  const isDouble = button.dataset.double === "true";

  applyDart({
    type: "dart",
    readable,
    dart: {
      label: label || `${score}`,
      score,
      isDouble,
      multiplier,
    },
  });
}

function interpretUtterance(raw) {
  if (!raw) return { type: "noop", readable: "Keine Eingabe" };

  const input = raw.toLowerCase().replace(/[^\w\s]/g, " ").replace(/\s+/g, " ").trim();

  const commands = {
    bust: ["bust", "passt", "überworfen"],
    undo: ["rückgängig", "zurück", "undo"],
    newGame: ["neues spiel", "neues leg", "restart"],
  };

  if (containsCommand(input, commands.bust)) return { type: "bust", readable: "Bust" };
  if (containsCommand(input, commands.undo)) return { type: "undo", readable: "Rückgängig" };
  if (containsCommand(input, commands.newGame)) return { type: "newGame", readable: "Neues Spiel" };

  const dart = parseDartPhrase(input);
  if (dart) {
    return {
      type: "dart",
      readable: dart.readable || dart.label,
      dart,
    };
  }

  const aggregateScore = parseInt(input, 10);
  if (Number.isFinite(aggregateScore) && aggregateScore >= 0 && aggregateScore <= 180) {
    return {
      type: "turnScore",
      score: aggregateScore,
      label: `${aggregateScore}`,
      readable: `Score ${aggregateScore}`,
    };
  }

  return { type: "noop", readable: `Keine Zuordnung für "${raw}"` };
}

function containsCommand(text, lexemes) {
  return lexemes.some((lexeme) => text.includes(lexeme));
}

function parseDartPhrase(text) {
  const multiplierMap = new Map([
    ["single", 1],
    ["einfach", 1],
    ["singlebull", 25],
    ["bull", 50],
    ["bullseye", 50],
    ["double", 2],
    ["doppel", 2],
    ["triple", 3],
    ["treble", 3],
    ["dreifach", 3],
  ]);

  const numberWords = new Map([
    ["null", 0],
    ["eins", 1],
    ["zwei", 2],
    ["drei", 3],
    ["vier", 4],
    ["fünf", 5],
    ["sechs", 6],
    ["sieben", 7],
    ["acht", 8],
    ["neun", 9],
    ["zehn", 10],
    ["elf", 11],
    ["zwölf", 12],
    ["dreizehn", 13],
    ["vierzehn", 14],
    ["fünfzehn", 15],
    ["sechzehn", 16],
    ["siebzehn", 17],
    ["achtzehn", 18],
    ["neunzehn", 19],
    ["zwanzig", 20],
    ["einundzwanzig", 21],
    ["zweiundzwanzig", 22],
    ["fünfundzwanzig", 25],
    ["three", 3],
    ["twenty", 20],
  ]);

  if (/bull/.test(text)) {
    const isDoubleBull = /double|doppel/.test(text);
    return {
      label: isDoubleBull ? "DB" : "SB",
      readable: isDoubleBull ? "Double Bull" : "Single Bull",
      score: isDoubleBull ? 50 : 25,
      isDouble: isDoubleBull,
      multiplier: isDoubleBull ? 2 : 1,
    };
  }

  let multiplier = 1;
  let base = null;

  for (const [keyword, value] of multiplierMap.entries()) {
    if (text.includes(keyword)) {
      if (value === 25 || value === 50) {
        return {
          label: value === 50 ? "DB" : "SB",
          readable: value === 50 ? "Double Bull" : "Single Bull",
          score: value,
          isDouble: value === 50,
          multiplier: value === 50 ? 2 : 1,
        };
      }
      multiplier = value;
      break;
    }
  }

  const numberMatch = text.match(/\b(\d{1,2})\b/);
  if (numberMatch) {
    base = parseInt(numberMatch[1], 10);
  } else {
    for (const [word, number] of numberWords.entries()) {
      if (text.includes(word)) {
        base = number;
        break;
      }
    }
  }

  if (!Number.isFinite(base) || base < 0 || base > 20) return null;
  const score = base * multiplier;
  const config = MULTIPLIER_CONFIG[multiplier] || MULTIPLIER_CONFIG[1];
  const label = base === 0 ? "0" : `${config.short}${base}`;
  const readable = base === 0 ? "0" : `${config.label} ${base}`;
  return { label, readable, score, isDouble: multiplier === 2, multiplier };
}

function applyDart(interpretation) {
  const player = gameState.players[gameState.activeIndex];
  if (!player) return;

  if (!gameState.currentTurn || gameState.currentTurn.playerId !== player.id) {
    gameState.currentTurn = createNewTurn();
  }

  const dart = interpretation.dart;
  const remaining = player.score - dart.score;
  const requiresDouble = requiresDoubleCheckout();
  const normalizedDart = normalizeDart(dart);
  if (!normalizedDart) return;
  const readableLabel = interpretation.readable || normalizedDart.label;

  if (remaining < 0 || (remaining === 0 && requiresDouble && !dart.isDouble)) {
    const reason =
      remaining === 0 && requiresDouble && !dart.isDouble
        ? `${readableLabel} - Double benötigt`
        : readableLabel;
    registerBust(reason);
    return;
  }

  recordSnapshot();
  recordDartStats(player, normalizedDart.score, 1);
  player.score = remaining;
  gameState.currentTurn.darts.push(normalizedDart);
  gameState.currentTurn.spoken.push(interpretation.readable);
  player.lastTurn = normalizedDart.label;

  if (remaining === 0) {
    finishTurn(false, true);
    handleLegWin(player);
  } else if (gameState.currentTurn.darts.length >= MAX_DARTS_PER_TURN) {
    finishTurn(false, false);
    advancePlayer();
  }

  render();
}

function applyTurnResult(result) {
  const player = gameState.players[gameState.activeIndex];
  if (!player) return;

  const remaining = player.score - result.score;
  const requiresDouble = requiresDoubleCheckout();

  if (remaining < 0) {
    registerBust(result.label);
    return;
  }

  if (remaining === 0 && requiresDouble) {
    notifyVoiceStatus("error", `${outModeLabel()} benötigt ein Double zum Checkout`);
    return;
  }

  recordSnapshot();
  recordDartStats(player, result.score, Number(result.dartsCount) || 3);

  const turn =
    gameState.currentTurn && gameState.currentTurn.playerId === player.id
      ? gameState.currentTurn
      : {
          playerId: player.id,
          darts: [],
          startingScore: result.score + remaining,
          bust: false,
          spoken: [],
        };

  player.score = remaining;
  player.lastTurn = `${result.score}`;

  turn.darts = [{ label: `${result.score}`, score: result.score, isDouble: false }];
  turn.spoken = [result.readable || result.label];
  turn.bust = false;

  const legWon = remaining === 0;

  pushHistory(turn, player, legWon);
  player.history.push(turn);
  gameState.currentTurn = null;

  if (legWon) {
    handleLegWin(player);
  } else {
    advancePlayer();
  }

  render();
}

function finishTurn(bust, legWon) {
  const player = gameState.players[gameState.activeIndex];
  if (!player || !gameState.currentTurn) return;

  gameState.currentTurn.bust = bust;
  pushHistory(gameState.currentTurn, player, legWon);
  player.history.push(gameState.currentTurn);
  player.lastTurn = bust ? "Bust" : summarizeTurn(gameState.currentTurn);
  gameState.currentTurn = null;
}

function pushHistory(turn, player, legWon = false) {
  const total = turn.darts.reduce((sum, dart) => sum + dart.score, 0);
  const entry = {
    id: uid(),
    playerId: player.id,
    playerName: getPlayerDisplayName(player),
    darts: turn.darts.map((dart) => ({ ...dart, label: shortLabelForDart(dart) })),
    spoken: [...turn.spoken],
    bust: turn.bust,
    total,
    remaining: player.score,
    timestamp: Date.now(),
    legWon,
    set: gameState.currentSet,
    leg: gameState.currentLeg,
    matchMode: gameState.matchMode,
  };
  gameState.history.unshift(entry);
}

function registerBust(reason) {
  const player = gameState.players[gameState.activeIndex];
  if (!player) return;

  recordSnapshot();
  if (gameState.currentTurn) {
    const lostPoints = gameState.currentTurn.darts.reduce(
      (sum, dart) => sum + (dart.score || 0),
      0
    );
    player.totalPointsThisGame = Math.max(
      0,
      (player.totalPointsThisGame || 0) - lostPoints
    );
    player.score = gameState.currentTurn.startingScore;
  }
  finishTurn(true, false);
  advancePlayer();
  render();
  notifyVoiceStatus("error", `Bust (${reason})`);
}

function recordSnapshot() {
  const snapshot = {
    activeIndex: gameState.activeIndex,
    players: gameState.players.map((player) => ({
      id: player.id,
      score: player.score,
      lastTurn: player.lastTurn,
      legsThisSet: player.legsThisSet || 0,
      totalLegsWon: player.totalLegsWon || 0,
      setsWon: player.setsWon || 0,
    })),
    history: structuredClone(gameState.history),
    currentTurn: gameState.currentTurn ? structuredClone(gameState.currentTurn) : null,
    legActive: gameState.legActive,
    winnerId: gameState.winnerId,
    matchMode: gameState.matchMode,
    currentSet: gameState.currentSet,
    currentLeg: gameState.currentLeg,
    legStarterIndex: gameState.legStarterIndex,
    lastLegWinnerId: gameState.lastLegWinnerId,
    matchCompleted: gameState.matchCompleted,
  };
  gameState.snapshots.push(snapshot);
  if (gameState.snapshots.length > 20) {
    gameState.snapshots.shift();
  }
}

function undoLastTurn() {
  const lastSnapshot = gameState.snapshots.pop();
  if (!lastSnapshot) {
    notifyVoiceStatus("error", "Nichts zum Rückgängig machen");
    return;
  }
  gameState.activeIndex = lastSnapshot.activeIndex;
  gameState.legActive = lastSnapshot.legActive;
  gameState.winnerId = lastSnapshot.winnerId;
  gameState.matchMode = lastSnapshot.matchMode || DEFAULT_MATCH_MODE;
  gameState.matchConfig = {
    ...(MATCH_MODES[gameState.matchMode] || MATCH_MODES[DEFAULT_MATCH_MODE]),
  };
  gameState.currentSet = lastSnapshot.currentSet || 1;
  gameState.currentLeg = lastSnapshot.currentLeg || 1;
  gameState.legStarterIndex = lastSnapshot.legStarterIndex || 0;
  gameState.lastLegWinnerId = lastSnapshot.lastLegWinnerId || null;
  gameState.matchCompleted = Boolean(lastSnapshot.matchCompleted);
  gameState.statsCommitted = false;
  gameState.players.forEach((player) => {
    const snapshotPlayer = lastSnapshot.players.find((p) => p.id === player.id);
    if (snapshotPlayer) {
      player.score = snapshotPlayer.score;
      player.lastTurn = snapshotPlayer.lastTurn;
      player.legsThisSet = snapshotPlayer.legsThisSet || 0;
      player.totalLegsWon = snapshotPlayer.totalLegsWon || 0;
      player.setsWon = snapshotPlayer.setsWon || 0;
    }
  });
  gameState.history = lastSnapshot.history;
  gameState.currentTurn = lastSnapshot.currentTurn;
  render();
  notifyVoiceStatus("offline", "Letzter Schritt zurückgenommen");
}

function advancePlayer() {
  gameState.activeIndex = (gameState.activeIndex + 1) % gameState.players.length;
  if (gameState.legActive) {
    gameState.currentTurn = createNewTurn();
  } else {
    gameState.currentTurn = null;
  }
}

function summarizeTurn(turn) {
  if (!turn || !turn.darts.length) return "-";
  return turn.darts.map((dart) => shortLabelForDart(dart)).join(", ");
}

function render() {
  renderScoreboard();
  renderHistory();
  updateUndoAvailability();
}

function renderScoreboard() {
  const matchConfig = getCurrentMatchConfig();
  const isSetsMode = isSetsModeActive(matchConfig);
  if (elements.gameSettings) {
    const matchLabel = matchConfig.label || MATCH_MODES[DEFAULT_MATCH_MODE].label;
    elements.gameSettings.textContent = `Modus: ${gameState.startingScore} Punkte - ${outModeLabel()} - Match: ${matchLabel}`;
  }
  document.body.classList.toggle("sets-mode", isSetsMode);

  elements.scoreboard.innerHTML = "";

  gameState.players.forEach((player, index) => {
    const fragment = elements.template.content.cloneNode(true);
    const node = fragment.querySelector(".player-card");
    const nameNode = fragment.querySelector(".player-name");
    const metaNode = fragment.querySelector(".player-meta");
    const avatarWrapper = fragment.querySelector(".player-avatar-wrapper");
    const avatarImage = fragment.querySelector(".player-avatar");
    const avatarFallback = fragment.querySelector(".player-avatar-fallback");
    const scoreNode = fragment.querySelector(".player-score");
    const lastNode = fragment.querySelector(".player-last");
    const setsNode = fragment.querySelector(".player-sets");
    const legsNode = fragment.querySelector(".player-legs");

    const displayName = getPlayerDisplayName(player);
    nameNode.textContent = displayName;
    if (metaNode) {
      const fullName = player.fullName && player.fullName !== displayName ? player.fullName : "";
      metaNode.textContent = fullName;
      metaNode.hidden = !fullName;
    }
    if (avatarFallback) {
      const initial = (displayName || "?").charAt(0).toUpperCase() || "?";
      avatarFallback.textContent = initial;
    }
    if (avatarImage) {
      avatarImage.alt = displayName || "Profilbild";
      if (player.photo) {
        avatarImage.src = player.photo;
        avatarImage.hidden = false;
      } else {
        avatarImage.src = "";
        avatarImage.hidden = true;
      }
    }
    if (avatarWrapper) {
      avatarWrapper.classList.toggle("has-photo", Boolean(player.photo));
    }

    scoreNode.textContent = player.score;
    lastNode.textContent = player.lastTurn || "-";
    if (setsNode) {
      setsNode.textContent = String(player.setsWon || 0);
    }
    if (legsNode) {
      legsNode.textContent = String(player.legsThisSet || 0);
    }

    if (gameState.activeIndex === index && gameState.legActive) {
      node.classList.add("active");
    }
    if (gameState.winnerId === player.id) {
      node.classList.add("winner");
    }

    elements.scoreboard.appendChild(fragment);
  });

  updateActivePlayerBanner();
}

function renderHistory() {
  elements.historyLog.innerHTML = "";
  gameState.history.slice(0, 12).forEach((entry) => {
    const li = document.createElement("li");
    li.className = "history-item";
    if (entry.bust) li.classList.add("bust");

    const playerSpan = document.createElement("span");
    playerSpan.className = "player";
    playerSpan.textContent = entry.playerName;

    li.appendChild(playerSpan);

    const entryConfig = MATCH_MODES[entry.matchMode] || MATCH_MODES[DEFAULT_MATCH_MODE];
    const showSetDetails =
      (entryConfig.setsToWin || 1) > 1 || (entryConfig.legsPerSet || 1) > 1;
    if (entry.set || entry.leg) {
      const infoSpan = document.createElement("span");
      infoSpan.className = "leg-info";
      const setLabel = showSetDetails && entry.set ? `Satz ${entry.set}` : "";
      const legLabel = entry.leg ? `Leg ${entry.leg}` : "";
      infoSpan.textContent = [setLabel, legLabel].filter(Boolean).join(" · ");
      if (infoSpan.textContent) {
        li.appendChild(infoSpan);
      }
    }

    const summarySpan = document.createElement("span");
    summarySpan.className = "summary";
    summarySpan.textContent = entry.darts.map((dart) => shortLabelForDart(dart)).join(", ") || "-";

    const remainingSpan = document.createElement("span");
    remainingSpan.className = "remaining";
    const remainingText = entry.bust ? "Bust" : `Rest: ${entry.remaining}`;
    remainingSpan.textContent = entry.legWon ? `${remainingText} 🎯` : remainingText;

    li.appendChild(summarySpan);
    li.appendChild(remainingSpan);

    elements.historyLog.appendChild(li);
  });
}

function outModeLabel(mode = gameState.outMode) {
  return OUT_MODE_LABELS[mode] || OUT_MODE_LABELS.double;
}

function requiresDoubleCheckout() {
  return gameState.outMode === "double";
}

function initializeDartPicker() {
  gameState.dartMultiplier = MULTIPLIER_CONFIG[gameState.dartMultiplier] ? gameState.dartMultiplier : 1;
  updateDartModeButtons();
  updateDartNumberButtons();
}

function setDartMultiplier(multiplier) {
  if (gameState.dartMultiplier === multiplier || !MULTIPLIER_CONFIG[multiplier]) return;
  gameState.dartMultiplier = multiplier;
  updateDartModeButtons();
  updateDartNumberButtons();
}

function updateDartModeButtons() {
  elements.dartModeButtons.forEach((button) => {
    const buttonMultiplier = parseInt(button.dataset.multiplier || "0", 10);
    const isActive = buttonMultiplier === gameState.dartMultiplier;
    button.classList.toggle("active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  });
}

function updateDartNumberButtons() {
  const config = MULTIPLIER_CONFIG[gameState.dartMultiplier] || MULTIPLIER_CONFIG[1];

  elements.dartNumberButtons.forEach((button) => {
    const base = parseInt(button.dataset.number || "0", 10);
    const score = base * gameState.dartMultiplier;
    const disabled = base === 0 && gameState.dartMultiplier !== 1;
    const label = base === 0 ? "0" : `${config.short}${base}`;
    const readable = base === 0 ? "0" : `${config.label} ${base}`;

    button.dataset.label = label;
    button.dataset.readable = readable;
    button.dataset.score = String(score);
    button.dataset.multiplier = String(gameState.dartMultiplier);
    button.dataset.double = String(config.isDouble && base !== 0);
    button.disabled = disabled;

    const abbrNode = button.querySelector(".abbr");
    const valueNode = button.querySelector(".value");
    if (abbrNode) {
      abbrNode.textContent = label;
    }
    if (valueNode) {
      valueNode.textContent = String(score);
    }
  });
}

function updateUndoAvailability() {
  if (!elements.undoBtn) return;
  elements.undoBtn.disabled = gameState.snapshots.length === 0;
}

function recordDartStats(player, points, dartsCount) {
  if (!player) return;
  const normalizedPoints = Number(points) || 0;
  const normalizedDarts = Number(dartsCount) || 0;
  player.totalPointsThisGame = (player.totalPointsThisGame || 0) + normalizedPoints;
  player.totalDartsThisGame = (player.totalDartsThisGame || 0) + normalizedDarts;
}

function applyCombo(sequence) {
  if (!sequence || !gameState.legActive) return;
  const tokens = sequence.split(/[-,]/).map((token) => token.trim()).filter(Boolean);
  if (!tokens.length) return;

  const startingPlayerId = gameState.players[gameState.activeIndex]?.id;
  if (!startingPlayerId) return;

  for (const token of tokens) {
    if (!gameState.legActive) break;

    const dart = dartFromToken(token);
    if (!dart) continue;

    const readable = dart.readable || dart.label;
    applyDart({ type: "dart", readable, dart });

    const currentPlayerId = gameState.players[gameState.activeIndex]?.id;
    if (!gameState.legActive || currentPlayerId !== startingPlayerId) {
      break;
    }
    if (!gameState.currentTurn || gameState.currentTurn.playerId !== startingPlayerId) {
      break;
    }
  }
}

function finalizeGameStats() {
  if (gameState.statsCommitted || gameState.legActive || !gameState.winnerId) {
    return;
  }

  let updated = false;

  gameState.players.forEach((player) => {
    if (!player.profileId) return;
    const profile = getProfileById(player.profileId);
    if (!profile) return;

    ensureProfileStats(profile);

    profile.stats.gamesPlayed += 1;
    profile.stats.totalPoints += player.totalPointsThisGame || 0;
    profile.stats.totalDarts += player.totalDartsThisGame || 0;
    profile.stats.legsWon += player.totalLegsWon || 0;
    const setsWonThisMatch = player.setsWon || (player.id === gameState.winnerId ? 1 : 0);
    profile.stats.setsWon += setsWonThisMatch;

    const entry = {
      id: uid(),
      date: new Date().toISOString(),
      points: player.totalPointsThisGame || 0,
      darts: player.totalDartsThisGame || 0,
      average:
        player.totalDartsThisGame > 0
          ? Number((player.totalPointsThisGame / player.totalDartsThisGame).toFixed(2))
          : 0,
      legWon: player.id === gameState.winnerId,
      setsWon: setsWonThisMatch,
      legsWon: player.totalLegsWon || 0,
    };

    profile.history = profile.history || [];
    profile.history.unshift(entry);
    if (profile.history.length > 10) {
      profile.history.length = 10;
    }

    updated = true;
  });

  if (updated) {
    saveProfiles();
    renderProfileList();
  }

  gameState.players.forEach((player) => {
    player.totalPointsThisGame = 0;
    player.totalDartsThisGame = 0;
    player.totalLegsWon = 0;
    player.legsThisSet = 0;
    player.setsWon = 0;
  });

  gameState.statsCommitted = true;
  saveProfiles();
}

function setViewMode(view) {
  const normalized = ["play", "profiles", "leaderboard"].includes(view) ? view : "setup";
  if (gameState.viewMode === normalized) {
    updateViewModeUI();
    return;
  }
  gameState.viewMode = normalized;
  updateViewModeUI();
  if (normalized === "play") {
    requestAnimationFrame(() => {
      elements.scoreboardCard?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  } else if (normalized === "profiles") {
    requestAnimationFrame(() => {
      elements.profileManager?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  } else if (normalized === "leaderboard") {
    requestAnimationFrame(() => {
      elements.leaderboardCard?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }
}

function updateViewModeUI() {
  const currentView = gameState.viewMode;
  document.body.classList.toggle("play-view", currentView === "play");
  document.body.classList.toggle("profiles-view", currentView === "profiles");
  document.body.classList.toggle("leaderboard-view", currentView === "leaderboard");
  elements.viewToggleButtons.forEach((button) => {
    const isActive = button.dataset.view === currentView;
    button.classList.toggle("active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  });
  if (currentView === "play") {
    updateActivePlayerBanner();
  } else if (currentView === "leaderboard") {
    renderLeaderboard();
  }
}

function updateActivePlayerBanner() {
  if (!elements.activePlayerBanner) return;
  const matchConfig = getCurrentMatchConfig();
  const isSetsMode = isSetsModeActive(matchConfig);
  let message = "";

  if (!gameState.players.length) {
    message = "";
  } else if (gameState.winnerId) {
    const winner = gameState.players.find((player) => player.id === gameState.winnerId);
    const winnerName = getPlayerDisplayName(winner);
    if (winnerName) {
      message = isSetsMode ? `Match gewonnen von ${winnerName}` : `Leg gewonnen von ${winnerName}`;
    }
  } else if (!gameState.legActive) {
    const starter = gameState.players[gameState.activeIndex] || gameState.players[0];
    const starterName = getPlayerDisplayName(starter);
    if (starterName) {
      const legLabel = isSetsMode
        ? `Satz ${gameState.currentSet} · Leg ${gameState.currentLeg}`
        : "das nächste Leg";
      message = `Bereit: ${starterName} startet ${legLabel}`;
    }
  } else {
    const active = gameState.players[gameState.activeIndex];
    if (active) {
      const activeName = getPlayerDisplayName(active);
      const dartsThrown = gameState.currentTurn?.darts.length ?? 0;
      const dartsInfo = dartsThrown ? ` - ${dartsThrown}/3 Darts` : "";
      const context = isSetsMode
        ? ` · Satz ${gameState.currentSet} · Leg ${gameState.currentLeg}`
        : "";
      message = `Am Zug: ${activeName} - Rest ${active.score}${dartsInfo}${context}`;
    }
  }

  elements.activePlayerBanner.textContent = message;
}

function normalizeDart(dart) {
  if (!dart) return null;
  const { readable: _ignored, ...rest } = dart;
  return { ...rest, label: shortLabelForDart(dart) };
}

function dartFromToken(token) {
  if (!token) return null;
  const trimmed = token.trim().toUpperCase();
  if (!trimmed) return null;

  if (trimmed === "SB" || trimmed === "25") {
    return { label: "SB", readable: "Single Bull", score: 25, isDouble: false, multiplier: 1 };
  }
  if (trimmed === "DB" || trimmed === "50") {
    return { label: "DB", readable: "Double Bull", score: 50, isDouble: true, multiplier: 2 };
  }
  if (trimmed === "0" || trimmed === "MISS") {
    return { label: "0", readable: "0", score: 0, isDouble: false, multiplier: 1 };
  }

  let multiplier = 1;
  let base = null;

  if (/^T(\d{1,2})$/.test(trimmed)) {
    multiplier = 3;
    base = parseInt(trimmed.slice(1), 10);
  } else if (/^D(\d{1,2})$/.test(trimmed)) {
    multiplier = 2;
    base = parseInt(trimmed.slice(1), 10);
  } else if (/^S(\d{1,2})$/.test(trimmed)) {
    multiplier = 1;
    base = parseInt(trimmed.slice(1), 10);
  } else if (/^\d{1,2}$/.test(trimmed)) {
    multiplier = 1;
    base = parseInt(trimmed, 10);
  }

  if (!Number.isFinite(base) || base < 0 || base > 20) return null;
  const config = MULTIPLIER_CONFIG[multiplier] || MULTIPLIER_CONFIG[1];
  const label = base === 0 ? "0" : multiplier === 1 ? `${base}` : `${config.short}${base}`;
  const readable =
    base === 0 ? "0" : multiplier === 1 ? `Single ${base}` : `${config.label} ${base}`;

  return { label, readable, score: base * multiplier, isDouble: multiplier === 2, multiplier };
}

function shortLabelForDart(dart) {
  if (!dart) return "-";
  const rawLabel = (dart.label || "").trim();
  const score = Number(dart.score) || 0;
  const parsedMultiplier = Number(dart.multiplier);
  const multiplier = Number.isFinite(parsedMultiplier) ? parsedMultiplier : undefined;

  if (score === 0) return "0";
  if (score === 25 && multiplier === 1) return "SB";
  if (score === 50 && multiplier === 2) return "DB";

  if (multiplier && MULTIPLIER_CONFIG[multiplier]) {
    const base = Math.round(score / multiplier);
    if (Number.isFinite(base) && base >= 0) {
      if (multiplier === 1) {
        return `${base}`;
      }
      return `${MULTIPLIER_CONFIG[multiplier].short}${base}`;
    }
  }

  const doubleMatch = /^double\s+(\d{1,2})$/i.exec(rawLabel);
  if (doubleMatch) return `D${doubleMatch[1]}`;
  const tripleMatch = /^triple\s+(\d{1,2})$/i.exec(rawLabel);
  if (tripleMatch) return `T${tripleMatch[1]}`;
  const singleMatch = /^single\s+(\d{1,2})$/i.exec(rawLabel);
  if (singleMatch) return singleMatch[1];
  const prefixedMatch = /^[SDT](\d{1,2})$/i.exec(rawLabel);
  if (prefixedMatch) {
    const prefix = rawLabel[0].toUpperCase();
    if (prefix === "S") {
      return prefixedMatch[1];
    }
    return `${prefix}${prefixedMatch[1]}`;
  }
  if (/^db$/i.test(rawLabel)) return "DB";
  if (/^sb$/i.test(rawLabel)) return "SB";
  if (/^double\s+bull$/i.test(rawLabel)) return "DB";
  if (/^single\s+bull$/i.test(rawLabel)) return "SB";

  return rawLabel || String(score);
}

// Polyfill for structuredClone in older browsers (primarily for tests)
function structuredClone(value) {
  if (window.structuredClone) {
    return window.structuredClone(value);
  }
  return JSON.parse(JSON.stringify(value));
}

function uid() {
  if (window.crypto?.randomUUID) {
    return window.crypto.randomUUID();
  }
  return `id-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}





function handleProfileSelection(select, input, fallbackName) {
  if (!input) return;
  const profileId = select?.value || "";
  const profile = getProfileById(profileId);
  if (profile) {
    const displayName = getProfileDisplayName(profile);
    input.value = displayName || fallbackName;
    input.readOnly = true;
    input.classList.add("read-only");
  } else {
    input.readOnly = false;
    input.classList.remove("read-only");
    if (fallbackName && !input.value.trim()) {
      input.value = fallbackName;
    }
  }
}

function onProfileFormSubmit(event) {
  event.preventDefault();
  const formData = new FormData(event.currentTarget);
  const firstName = (formData.get("firstName") || "").toString().trim();
  const lastName = (formData.get("lastName") || "").toString().trim();
  const nickname = (formData.get("nickname") || "").toString().trim();

  if (!nickname && !firstName) {
    notifyVoiceStatus("error", "Nickname erforderlich");
    return;
  }

  const profile = {
    id: uid(),
    firstName,
    lastName,
    nickname,
    image: pendingProfileImage || "",
    stats: {
      gamesPlayed: 0,
      legsWon: 0,
      totalPoints: 0,
      totalDarts: 0,
    },
    history: [],
    createdAt: Date.now(),
  };

  profiles.push(profile);
  saveProfiles();
  renderProfileOptions();
  renderProfileList();
  resetProfileForm();
  handleProfileSelection(elements.playerOneProfileSelect, elements.playerOneInput, "Player 1");
  handleProfileSelection(elements.playerTwoProfileSelect, elements.playerTwoInput, "Player 2");
}

function onProfileImageChange(event) {
  const file = event.target.files?.[0];
  if (!file) {
    pendingProfileImage = null;
    if (elements.profileImagePreview) {
      elements.profileImagePreview.src = "";
      elements.profileImagePreview.hidden = true;
    }
    return;
  }
  const reader = new FileReader();
  reader.onload = () => {
    pendingProfileImage = reader.result;
    if (elements.profileImagePreview) {
      elements.profileImagePreview.src = pendingProfileImage;
      elements.profileImagePreview.hidden = false;
    }
  };
  reader.readAsDataURL(file);
}

function resetProfileForm(skipFields = false) {
  pendingProfileImage = null;
  if (!skipFields && elements.profileForm) {
    elements.profileForm.reset();
  }
  if (elements.profileImageInput) {
    elements.profileImageInput.value = "";
  }
  if (elements.profileImagePreview) {
    elements.profileImagePreview.src = "";
    elements.profileImagePreview.hidden = true;
  }
}

function onProfileListClick(event) {
  const button = event.target.closest("button[data-action]");
  if (!button) return;
  const action = button.dataset.action;
  const profileId = button.dataset.id;
  if (!profileId) return;

  if (action === "assign") {
    assignProfileToSlot(profileId, Number(button.dataset.slot) || 1);
    return;
  }

  if (action === "delete") {
    const profile = getProfileById(profileId);
    if (!profile) return;
    if (!window.confirm(`Profil "${profile.nickname || profile.firstName}" löschen?`)) return;
    profiles = profiles.filter((item) => item.id !== profileId);
    saveProfiles();
    renderProfileOptions();
    renderProfileList();
    if (elements.playerOneProfileSelect?.value === profileId) {
      elements.playerOneProfileSelect.value = "";
      handleProfileSelection(elements.playerOneProfileSelect, elements.playerOneInput, "Player 1");
    }
    if (elements.playerTwoProfileSelect?.value === profileId) {
      elements.playerTwoProfileSelect.value = "";
      handleProfileSelection(elements.playerTwoProfileSelect, elements.playerTwoInput, "Player 2");
    }
  }
}

function assignProfileToSlot(profileId, slot) {
  const select = slot === 1 ? elements.playerOneProfileSelect : elements.playerTwoProfileSelect;
  const input = slot === 1 ? elements.playerOneInput : elements.playerTwoInput;
  const fallback = slot === 1 ? "Player 1" : "Player 2";
  if (!select || !input) return;
  select.value = profileId || "";
  handleProfileSelection(select, input, fallback);
  setViewMode("setup");
}

async function loadProfiles() {
  let sourceProfiles = null;

  const serverProfiles = await fetchProfilesFromServer();
  if (serverProfiles !== null) {
    sourceProfiles = serverProfiles;
    try {
      localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(serverProfiles));
    } catch (error) {
      console.warn("Profile konnten nicht lokal gespeichert werden:", error);
    }
  } else {
    try {
      const raw = localStorage.getItem(PROFILE_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          sourceProfiles = parsed;
        }
      }
    } catch (error) {
      console.warn("Profile konnten nicht aus dem lokalen Speicher geladen werden:", error);
    }
  }

  profiles = Array.isArray(sourceProfiles)
    ? sourceProfiles.map((profile) => {
        ensureProfileStats(profile);
        return profile;
      })
    : [];

  renderProfileOptions();
  renderProfileList();
}

function saveProfiles() {
  try {
    localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profiles));
  } catch (error) {
    console.error("Profile konnten nicht gespeichert werden", error);
  }
  scheduleProfileSync();
}

function renderProfileOptions() {
  const defaultOption = '<option value="">Benutzerdefiniert</option>';
  const options = profiles
    .map((profile) => {
      const displayName = getProfileDisplayName(profile);
      return `<option value="${profile.id}">${displayName}</option>`;
    })
    .join("");

  const updateSelect = (select, fallbackLabel) => {
    if (!select) return;
    const previous = select.value;
    select.innerHTML = defaultOption + options;
    if (previous && profiles.some((profile) => profile.id === previous)) {
      select.value = previous;
    } else {
      select.value = "";
    }
  };

  updateSelect(elements.playerOneProfileSelect, "Player 1");
  updateSelect(elements.playerTwoProfileSelect, "Player 2");

  handleProfileSelection(elements.playerOneProfileSelect, elements.playerOneInput, "Player 1");
  handleProfileSelection(elements.playerTwoProfileSelect, elements.playerTwoInput, "Player 2");
}

function renderProfileList() {
  if (!elements.profileList) return;
  if (!profiles.length) {
    elements.profileList.innerHTML = '<li class="profile-empty">Noch keine Profile gespeichert.</li>';
    renderLeaderboard();
    return;
  }

  const fragment = document.createDocumentFragment();
  profiles
    .slice()
    .sort((a, b) => getProfileDisplayName(a).localeCompare(getProfileDisplayName(b)))
    .forEach((profile) => {
      ensureProfileStats(profile);
      const li = document.createElement("li");
      li.className = "profile-card";
      li.dataset.id = profile.id;

      const displayName = getProfileDisplayName(profile);
      const fullName = `${profile.firstName} ${profile.lastName}`.trim();
      const averagePerDart = formatAverage(profile.stats.totalPoints, profile.stats.totalDarts);
      const averageThreeDart = formatAverage(profile.stats.totalPoints * 3, profile.stats.totalDarts);
      const games = profile.stats.gamesPlayed;
      const legs = profile.stats.legsWon;
      const sets = profile.stats.setsWon || 0;
      const initial = (profile.nickname || profile.firstName || displayName || "?").charAt(0).toUpperCase();

      const avatarMarkup = profile.image
        ? `<img src="${profile.image}" alt="${displayName}" />`
        : `<div class="profile-avatar-fallback">${initial}</div>`;

      const historyEntries = (profile.history || [])
        .slice(0, 3)
        .map((entry) => {
          const dateLabel = formatProfileDate(entry.date);
          const avg = entry.darts ? formatAverage(entry.points, entry.darts) : "0.00";
          const setsWon = entry.setsWon != null ? entry.setsWon : entry.legWon ? 1 : 0;
          const legsWon = entry.legsWon != null ? entry.legsWon : entry.legWon ? 1 : 0;
          const setInfo =
            setsWon || legsWon
              ? ` · Sätze: ${setsWon} · Legs: ${legsWon}`
              : "";
          return `<li>${dateLabel}: ${entry.points} Punkte · ${entry.darts} Darts · Ø ${avg}${setInfo}${
            entry.legWon ? " · Sieg" : ""
          }</li>`;
        })
        .join("");

      li.innerHTML = `
        ${avatarMarkup}
        <div class="profile-info">
          <h4>${displayName}</h4>
          <span>${fullName || ""}</span>
          <p class="profile-stats">Spiele: ${games} · Sätze: ${sets} · Legs: ${legs} · Ø/Dart: ${averagePerDart}${
        profile.stats.totalDarts ? ` · 3-Dart Ø: ${averageThreeDart}` : ""
      }</p>
          ${historyEntries ? `<ul class="profile-history">${historyEntries}</ul>` : ""}
          <div class="profile-actions-inline">
            <button type="button" class="ghost" data-action="assign" data-slot="1" data-id="${profile.id}">Als Spieler 1 wählen</button>
            <button type="button" class="ghost" data-action="assign" data-slot="2" data-id="${profile.id}">Als Spieler 2 wählen</button>
            <button type="button" class="ghost danger" data-action="delete" data-id="${profile.id}">Löschen</button>
          </div>
        </div>
      `;

      fragment.appendChild(li);
    });

  elements.profileList.innerHTML = "";
  elements.profileList.appendChild(fragment);
  renderLeaderboard();
}

function getProfileById(id) {
  if (!id) return null;
  return profiles.find((profile) => profile.id === id) || null;
}

function getProfileDisplayName(profile) {
  if (!profile) return "";
  const nickname = (profile.nickname || "").trim();
  if (nickname) return nickname;
  return `${profile.firstName || ""} ${profile.lastName || ""}`.trim() || "Unbenannt";
}

function getPlayerDisplayName(player) {
  if (!player) return "";
  const value = (player.displayName || player.name || "").toString().trim();
  return value;
}

function setLeaderboardSort(sortKey) {
  const normalized = sortKey === "legs" ? "legs" : "average";
  if (gameState.leaderboardSort === normalized) return;
  gameState.leaderboardSort = normalized;
  updateLeaderboardSortButtons();
  renderLeaderboard();
}

function updateLeaderboardSortButtons() {
  elements.leaderboardSortButtons.forEach((button) => {
    const key = button.dataset.sort || "average";
    const isActive = key === gameState.leaderboardSort;
    button.classList.toggle("active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  });
}

function renderLeaderboard() {
  if (!elements.leaderboardBody || !elements.leaderboardEmpty) return;
  updateLeaderboardSortButtons();

  const leaderboardEntries = profiles
    .map((profile) => {
      ensureProfileStats(profile);
      const stats = profile.stats;
      const darts = Number(stats.totalDarts) || 0;
      const points = Number(stats.totalPoints) || 0;
      const games = Number(stats.gamesPlayed) || 0;
      const legs = Number(stats.legsWon) || 0;
      const sets = Number(stats.setsWon) || 0;
      const averageValue = darts > 0 ? points / darts : 0;
      return {
        profile,
        displayName: getProfileDisplayName(profile),
        fullName: `${profile.firstName || ""} ${profile.lastName || ""}`.trim(),
        averageValue,
        threeDartAverageValue: averageValue * 3,
        averageLabel: formatAverage(points, darts),
        threeDartLabel: darts > 0 ? (averageValue * 3).toFixed(2) : "0.00",
        legs,
        sets,
        games,
        hasStats: games > 0 || darts > 0,
      };
    })
    .filter((entry) => entry.hasStats);

  const sortKey = gameState.leaderboardSort;
  leaderboardEntries.sort((a, b) => {
    if (sortKey === "legs") {
      if (b.legs !== a.legs) return b.legs - a.legs;
      if (b.sets !== a.sets) return b.sets - a.sets;
      if (b.averageValue !== a.averageValue) return b.averageValue - a.averageValue;
    } else {
      if (b.averageValue !== a.averageValue) return b.averageValue - a.averageValue;
      if (b.sets !== a.sets) return b.sets - a.sets;
      if (b.legs !== a.legs) return b.legs - a.legs;
    }
    if (b.games !== a.games) return b.games - a.games;
    return a.displayName.localeCompare(b.displayName, "de-DE");
  });

  elements.leaderboardBody.innerHTML = "";

  if (!leaderboardEntries.length) {
    elements.leaderboardEmpty.hidden = false;
    return;
  }

  elements.leaderboardEmpty.hidden = true;

  const fragment = document.createDocumentFragment();

  leaderboardEntries.forEach((entry, index) => {
    const tr = document.createElement("tr");

    const rankCell = document.createElement("td");
    rankCell.textContent = String(index + 1);
    tr.appendChild(rankCell);

    const playerCell = document.createElement("td");
    const playerWrapper = document.createElement("div");
    playerWrapper.className = "leaderboard-player-cell";

    const avatarWrapper = document.createElement("div");
    avatarWrapper.className = "leaderboard-avatar";
    const displayName = entry.displayName || "Unbenannt";
    if (entry.profile.image) {
      const img = document.createElement("img");
      img.src = entry.profile.image;
      img.alt = displayName;
      avatarWrapper.classList.add("has-photo");
      avatarWrapper.appendChild(img);
    } else {
      const fallback = document.createElement("span");
      fallback.className = "leaderboard-avatar-fallback";
      fallback.textContent = displayName.charAt(0).toUpperCase() || "?";
      avatarWrapper.appendChild(fallback);
    }

    const nameWrapper = document.createElement("div");
    nameWrapper.className = "leaderboard-player-text";
    const nicknameEl = document.createElement("span");
    nicknameEl.className = "leaderboard-player-name";
    nicknameEl.textContent = displayName;
    nameWrapper.appendChild(nicknameEl);
    if (entry.fullName) {
      const fullNameEl = document.createElement("span");
      fullNameEl.className = "leaderboard-player-full";
      fullNameEl.textContent = entry.fullName;
      nameWrapper.appendChild(fullNameEl);
    }

    playerWrapper.appendChild(avatarWrapper);
    playerWrapper.appendChild(nameWrapper);
    playerCell.appendChild(playerWrapper);
    tr.appendChild(playerCell);

    const averageCell = document.createElement("td");
    averageCell.textContent = entry.averageLabel;
    tr.appendChild(averageCell);

    const threeDartCell = document.createElement("td");
    threeDartCell.textContent = entry.threeDartLabel;
    tr.appendChild(threeDartCell);

    const setsCell = document.createElement("td");
    setsCell.textContent = String(entry.sets);
    tr.appendChild(setsCell);

    const legsCell = document.createElement("td");
    legsCell.textContent = String(entry.legs);
    tr.appendChild(legsCell);

    const gamesCell = document.createElement("td");
    gamesCell.textContent = String(entry.games);
    tr.appendChild(gamesCell);

    fragment.appendChild(tr);
  });

  elements.leaderboardBody.appendChild(fragment);
}

function ensureProfileStats(profile) {
  profile.stats = profile.stats || {};
  profile.stats.gamesPlayed = profile.stats.gamesPlayed || 0;
  profile.stats.legsWon = profile.stats.legsWon || 0;
  profile.stats.setsWon = profile.stats.setsWon || 0;
  profile.stats.totalPoints = profile.stats.totalPoints || 0;
  profile.stats.totalDarts = profile.stats.totalDarts || 0;
  profile.history = profile.history || [];
}

function formatAverage(points, darts) {
  if (!darts) return "0.00";
  return Number(points / darts).toFixed(2);
}

function formatProfileDate(value) {
  if (!value) return "";
  try {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return new Intl.DateTimeFormat("de-DE", {
      dateStyle: "short",
      timeStyle: "short",
    }).format(date);
  } catch (error) {
    return "";
  }
}


