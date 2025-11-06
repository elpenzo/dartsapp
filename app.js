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
const MAX_TOURNAMENT_PLAYERS = 16;
const TOURNAMENT_ROUNDS = [
  { id: "roundOf16", label: "Achtelfinale" },
  { id: "quarterfinals", label: "Viertelfinale" },
  { id: "semifinals", label: "Halbfinale" },
  { id: "final", label: "Finale" },
];
const DART_SWIPE_MIN_DISTANCE = 30;
const DART_SWIPE_PREVIEW_THRESHOLD = 12;
const DART_SWIPE_MAX_OFFSET = 18;
const DART_SWIPE_FEEDBACK_TIMEOUT = 250;
const VOICE_WAKE_WORD = "hey siri";
const VOICE_WAKE_TIMEOUT_MS = 15000;

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
  scoreboardHeatmap: document.getElementById("scoreboard-heatmap"),
  undoBtn: document.getElementById("undo-btn"),
  dartModeSwitch: document.querySelector(".dart-mode-switch"),
  dartModeButtons: Array.from(document.querySelectorAll(".dart-mode-button")),
  dartNumberButtons: Array.from(document.querySelectorAll(".dart-number")),
  comboButtons: Array.from(document.querySelectorAll(".combo-button")),
  viewToggleButtons: Array.from(document.querySelectorAll(".view-toggle-btn")),
  tournamentCard: document.querySelector(".tournament-card"),
  tournamentForm: document.getElementById("tournament-form"),
  tournamentResetBtn: document.getElementById("tournament-reset"),
  tournamentMatchModeSelect: document.getElementById("tournament-match-mode"),
  tournamentPlayerSelects: Array.from(document.querySelectorAll(".tournament-player-select")),
  tournamentPlayerInputs: Array.from(document.querySelectorAll(".tournament-player-input")),
  tournamentStatus: document.getElementById("tournament-status"),
  tournamentBracket: document.getElementById("tournament-bracket"),
  profileManager: document.querySelector(".profile-manager"),
  profileForm: document.getElementById("profile-form"),
  profileList: document.getElementById("profile-list"),
  profileImageInput: document.getElementById("profile-image"),
  profileImagePreview: document.getElementById("profile-image-preview"),
  profileResetBtn: document.getElementById("profile-reset"),
  profileFirstName: document.getElementById("profile-first-name"),
  profileLastName: document.getElementById("profile-last-name"),
  profileNickname: document.getElementById("profile-nickname"),
  profileIdInput: document.getElementById("profile-id"),
  profileSubmitBtn: document.getElementById("profile-submit"),
  leaderboardCard: document.querySelector(".leaderboard-card"),
  leaderboardSortButtons: Array.from(document.querySelectorAll(".leaderboard-sort-btn")),
  leaderboardBody: document.getElementById("leaderboard-body"),
  leaderboardEmpty: document.getElementById("leaderboard-empty"),
};

const dartSwipePointers = new Map();
const dartSwipeBoundButtons = new WeakSet();
const voiceControlState = {
  awake: false,
  wakeTimer: null,
};

function createInitialTournamentState() {
  return {
    active: false,
    status: "idle",
    players: [],
    startingScore: DEFAULT_STARTING_SCORE,
    outMode: DEFAULT_OUT_MODE,
    matchMode: DEFAULT_MATCH_MODE,
    rounds: [],
    matchLookup: {},
    currentRoundIndex: null,
    currentMatchIndex: null,
    currentMatchId: null,
    championId: null,
    nextMatchTimer: null,
  };
}

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
  tournament: createInitialTournamentState(),
};

let profiles = [];
let pendingProfileImage = null;
let editingProfileId = null;
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

function createEmptyHistogram() {
  const histogram = { SB: 0, DB: 0, MISS: 0 };
  for (let value = 1; value <= 20; value += 1) {
    histogram[`S${value}`] = 0;
    histogram[`D${value}`] = 0;
    histogram[`T${value}`] = 0;
  }
  return histogram;
}

function cloneHistogram(source) {
  const clone = createEmptyHistogram();
  if (!source) return clone;
  Object.keys(source).forEach((key) => {
    if (Object.prototype.hasOwnProperty.call(clone, key)) {
      clone[key] = Number(source[key]) || 0;
    }
  });
  return clone;
}

function histogramKeyForDart(dart) {
  if (!dart) return null;
  const multiplier = Number(dart.multiplier) || 1;
  const score = Number(dart.score) || 0;
  if (score === 0) return "MISS";
  if (score === 50 || dart.label === "DB") return "DB";
  if (score === 25 || dart.label === "SB") return "SB";
  const base = Math.round(score / multiplier);
  if (!Number.isFinite(base) || base < 0 || base > 20) return null;
  const prefix = multiplier === 3 ? "T" : multiplier === 2 ? "D" : "S";
  return `${prefix}${base}`;
}

function recordDartHit(player, dart) {
  if (!player || !dart) return;
  if (!player.dartHitsThisGame) {
    player.dartHitsThisGame = createEmptyHistogram();
  }
  const key = histogramKeyForDart(dart);
  if (!key) return;
  player.dartHitsThisGame[key] = (player.dartHitsThisGame[key] || 0) + 1;
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
    handleTournamentMatchCompletion(player);
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
    this.recognition.continuous = true;
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
  if (elements.tournamentForm) {
    elements.tournamentForm.addEventListener("submit", onTournamentSubmit);
  }
  if (elements.tournamentResetBtn) {
    elements.tournamentResetBtn.addEventListener("click", resetTournamentForm);
  }
  if (elements.tournamentPlayerSelects.length) {
    elements.tournamentPlayerSelects.forEach((select, index) => {
      if (!select.dataset.slot) {
        select.dataset.slot = String(index + 1);
      }
      select.addEventListener("change", () => onTournamentProfileSelectChange(index));
    });
    elements.tournamentPlayerSelects.forEach((_, index) => {
      syncTournamentPlayerField(index);
    });
  }
  if (elements.tournamentPlayerInputs.length) {
    elements.tournamentPlayerInputs.forEach((input) => {
      input.addEventListener("input", () => {
        if (input.dataset.autofill === "true" && input.value.trim()) {
          delete input.dataset.autofill;
        }
      });
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
  renderTournamentBracket();
  setTournamentStatus("Kein Turnier aktiv.", "idle");
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
  setViewMode("play");
}

function startGame(
  playerConfigs,
  startingScore,
  outMode = DEFAULT_OUT_MODE,
  matchMode = DEFAULT_MATCH_MODE
) {
  const configs = Array.isArray(playerConfigs)
    ? playerConfigs.map((entry, index) => {
        if (typeof entry === "string") {
          return { name: entry.trim(), profileId: "" };
        }
        const normalizedName = (entry.name || entry.displayName || `Player ${index + 1}`).trim();
        return {
          ...entry,
          name: normalizedName,
          profileId: entry.profileId || "",
        };
      })
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
      tournamentPlayerId: config.tournamentPlayerId || null,
      tournamentSeed: config.tournamentSeed || null,
      score: startingScore,
      history: [],
      lastTurn: null,
      totalPointsThisGame: 0,
      totalDartsThisGame: 0,
      statsHistory: [],
      legsThisSet: 0,
      totalLegsWon: 0,
      setsWon: 0,
      dartHitsThisGame: createEmptyHistogram(),
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
  disarmVoiceControl();
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

function extractWakeWord(transcript) {
  if (!transcript) {
    return { wakeWordDetected: false, commandText: "" };
  }
  const normalized = transcript.toLowerCase();
  const index = normalized.indexOf(VOICE_WAKE_WORD);
  if (index === -1) {
    return { wakeWordDetected: false, commandText: transcript.trim() };
  }
  const commandText = transcript.slice(index + VOICE_WAKE_WORD.length).trim();
  return { wakeWordDetected: true, commandText };
}

function armVoiceControl() {
  voiceControlState.awake = true;
  if (voiceControlState.wakeTimer) {
    clearTimeout(voiceControlState.wakeTimer);
  }
  voiceControlState.wakeTimer = setTimeout(() => {
    voiceControlState.awake = false;
    voiceControlState.wakeTimer = null;
  }, VOICE_WAKE_TIMEOUT_MS);
}

function disarmVoiceControl() {
  voiceControlState.awake = false;
  if (voiceControlState.wakeTimer) {
    clearTimeout(voiceControlState.wakeTimer);
    voiceControlState.wakeTimer = null;
  }
}

function handleUtterance(transcript) {
  if (!gameState.legActive) return;

  elements.lastUtterance.textContent = transcript || "-";
  const { wakeWordDetected, commandText } = extractWakeWord(transcript || "");

  if (wakeWordDetected) {
    armVoiceControl();
    notifyVoiceStatus("info", "Codewort erkannt");
  }

  if (!voiceControlState.awake) {
    elements.lastInterpretation.textContent = `Codewort "${VOICE_WAKE_WORD}" erforderlich`;
    return;
  }

  const cleanedCommand = commandText.replace(/^[\s,;:.-]+/, "");
  const effectiveCommand = cleanedCommand.trim();
  if (!effectiveCommand) {
    elements.lastInterpretation.textContent = "Bereit fuer Sprachbefehle";
    return;
  }

  const interpretation = interpretUtterance(effectiveCommand);
  elements.lastInterpretation.textContent = interpretation.readable;

  let executed = false;
  if (interpretation.type === "sequence") {
    interpretation.actions.forEach((action) => {
      executed = executeInterpretation(action) || executed;
    });
  } else {
    executed = executeInterpretation(interpretation);
  }

  if (!executed) {
    notifyVoiceStatus("error", "Nichts ausgefuehrt");
  }

  disarmVoiceControl();
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

function executeInterpretation(interpretation) {
  switch (interpretation.type) {
    case "dart":
      applyDart(interpretation);
      return true;
    case "turnScore":
      applyTurnResult(interpretation);
      return true;
    case "bust":
      registerBust("Sprachbefehl");
      return true;
    case "undo":
      undoLastTurn();
      return true;
    case "newGame":
      resetGame();
      return true;
    default:
      return false;
  }
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

  const segments = splitUtteranceSegments(raw);
  if (segments.length > 1) {
    const actions = segments
      .map((segment) => interpretSegment(segment))
      .filter((action) => action.type && action.type !== "noop");
    if (actions.length === 1) {
      return actions[0];
    }
    if (actions.length > 1) {
      return {
        type: "sequence",
        actions,
        readable: actions.map((action) => action.readable).join(", "),
      };
    }
  }

  return interpretSegment(raw);
}

function splitUtteranceSegments(raw) {
  if (!raw) return [];
  const normalized = raw.replace(/\s+/g, " ").trim();
  if (!normalized) return [];
  if (/[;,]/.test(normalized)) {
    return normalized.split(/[;,]/).map((segment) => segment.trim()).filter(Boolean);
  }
  return normalized
    .split(/\s+(?:und|plus|dann)\s+/i)
    .map((segment) => segment.trim())
    .filter(Boolean);
}

function interpretSegment(rawSegment) {
  const source = (rawSegment || "").trim();
  if (!source) return { type: "noop", readable: "Keine Eingabe" };

  const normalizedSource =
    typeof source.normalize === "function"
      ? source.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      : source;

  const input = normalizedSource.toLowerCase().replace(/[^\w\s]/g, " ").replace(/\s+/g, " ").trim();

  const commands = {
    bust: ["bust", "passt", "uberworfen", "berworfen"],
    undo: ["ruckgangig", "zuruck", "undo"],
    newGame: ["neues spiel", "neues leg", "restart"],
  };

  if (containsCommand(input, commands.bust)) return { type: "bust", readable: "Bust" };
  if (containsCommand(input, commands.undo)) return { type: "undo", readable: "Rueckgaengig" };
  if (containsCommand(input, commands.newGame)) return { type: "newGame", readable: "Neues Spiel" };

  const dart = parseDartPhrase(input);
  if (dart) {
    return {
      type: "dart",
      readable: dart.readable || source || dart.label,
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

  return { type: "noop", readable: `Keine Zuordnung fuer "${source}"` };
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
  recordDartHit(player, normalizedDart);
  if (normalizedDart.multiplier === 3) {
    playTripleHitSound();
  }

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
      totalPointsThisGame: player.totalPointsThisGame || 0,
      totalDartsThisGame: player.totalDartsThisGame || 0,
      dartHitsThisGame: cloneHistogram(player.dartHitsThisGame),
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
      player.totalPointsThisGame = snapshotPlayer.totalPointsThisGame || 0;
      player.totalDartsThisGame = snapshotPlayer.totalDartsThisGame || 0;
      player.dartHitsThisGame = cloneHistogram(snapshotPlayer.dartHitsThisGame);
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

const MAX_DOUBLE_OUT_CHECKOUT = 170;
const MAX_SINGLE_OUT_CHECKOUT = 180;
const CHECKOUT_SHOTS = createCheckoutShotCatalog();
const CHECKOUT_DOUBLE_SHOTS = CHECKOUT_SHOTS.filter((shot) => shot.isDouble);
const CHECKOUT_CACHE = new Map();
let audioContext = null;

function renderScoreboard() {
  const matchConfig = getCurrentMatchConfig();
  const isSetsMode = isSetsModeActive(matchConfig);
  if (elements.gameSettings) {
    const matchLabel = matchConfig.label || MATCH_MODES[DEFAULT_MATCH_MODE].label;
    const tournamentLabel = getActiveTournamentMatchLabel();
    const tournamentSuffix = tournamentLabel ? ` - Turnier: ${tournamentLabel}` : "";
    elements.gameSettings.textContent = `Modus: ${gameState.startingScore} Punkte - ${outModeLabel()} - Match: ${matchLabel}${tournamentSuffix}`;
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
    const checkoutNode = fragment.querySelector(".player-checkout");
    const checkoutWrapper = fragment.querySelector(".player-checkout-wrapper");

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
    if (checkoutNode && checkoutWrapper) {
      const suggestion = getCheckoutSuggestion(player.score, gameState.outMode);
      if (suggestion) {
        checkoutNode.textContent = suggestion;
        checkoutNode.dataset.state = "ready";
        checkoutNode.title = `Empfohlener Checkout: ${suggestion}`;
        checkoutWrapper.hidden = false;
      } else {
        checkoutNode.textContent = "";
        checkoutNode.dataset.state = "none";
        checkoutNode.removeAttribute("title");
        checkoutWrapper.hidden = true;
      }
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
  renderActivePlayerHeatmap();
}

function getCheckoutSuggestion(score, outMode = gameState.outMode) {
  const numericScore = Number(score);
  if (!Number.isFinite(numericScore)) {
    return "";
  }
  const requiresDouble = outMode === "double";
  const cacheKey = `${requiresDouble ? "D" : "S"}:${numericScore}`;
  if (CHECKOUT_CACHE.has(cacheKey)) {
    return CHECKOUT_CACHE.get(cacheKey);
  }
  const suggestion = computeCheckoutSuggestion(numericScore, requiresDouble);
  CHECKOUT_CACHE.set(cacheKey, suggestion);
  return suggestion;
}

function computeCheckoutSuggestion(score, requiresDouble) {
  const target = Math.trunc(score);
  if (target <= 0) {
    return "";
  }
  const maxScore = requiresDouble ? MAX_DOUBLE_OUT_CHECKOUT : MAX_SINGLE_OUT_CHECKOUT;
  if (target > maxScore) {
    return "";
  }
  const combos = findCheckoutCombos(target, requiresDouble);
  if (!combos.length) {
    return "";
  }
  return combos[0].map((shot) => shot.display).join(" · ");
}

function renderActivePlayerHeatmap() {
  const container = elements.scoreboardHeatmap;
  if (!container) return;

  if (gameState.viewMode !== "play") {
    container.hidden = true;
    return;
  }

  const activePlayer = gameState.players[gameState.activeIndex];
  if (!activePlayer) {
    container.hidden = false;
    container.innerHTML = '<p class="heatmap-empty">Kein Spieler aktiv.</p>';
    return;
  }

  const displayName = getPlayerDisplayName(activePlayer) || `Spieler ${gameState.activeIndex + 1}`;
  const histogram = activePlayer.dartHitsThisGame || createEmptyHistogram();
  const heatmapMarkup = generateProfileHeatmapMarkup({
    stats: { dartHistogram: histogram },
  });

  if (!heatmapMarkup) {
    container.hidden = false;
    container.innerHTML = `<p class="heatmap-empty">Noch keine Treffer für ${displayName}.</p>`;
    return;
  }

  container.hidden = false;
  container.innerHTML = heatmapMarkup;
  const titleNode = container.querySelector(".profile-heatmap-title");
  if (titleNode) {
    titleNode.textContent = `Trefferheatmap – ${displayName}`;
  }
}

function findCheckoutCombos(target, requiresDouble) {
  const finalShots = requiresDouble ? CHECKOUT_DOUBLE_SHOTS : CHECKOUT_SHOTS;
  if (!finalShots.length) {
    return [];
  }
  const minFinalScore = finalShots.reduce((min, shot) => Math.min(min, shot.score), Infinity);
  const combos = [];
  const seen = new Set();

  const addCombo = (combo) => {
    const normalized = normalizeCheckoutCombo(combo);
    const key = normalized.map((shot) => shot.id).join("|");
    if (seen.has(key)) return;
    seen.add(key);
    combos.push(normalized);
  };

  finalShots.forEach((finalShot) => {
    if (finalShot.score === target) {
      addCombo([finalShot]);
    }
  });

  CHECKOUT_SHOTS.forEach((firstShot) => {
    const remainingAfterFirst = target - firstShot.score;
    if (remainingAfterFirst < minFinalScore) {
      return;
    }

    finalShots.forEach((finalShot) => {
      if (finalShot.score === remainingAfterFirst) {
        addCombo([firstShot, finalShot]);
      }
    });

    CHECKOUT_SHOTS.forEach((secondShot) => {
      const remainingAfterSecond = remainingAfterFirst - secondShot.score;
      if (remainingAfterSecond < minFinalScore) {
        return;
      }
      finalShots.forEach((finalShot) => {
        if (finalShot.score === remainingAfterSecond) {
          addCombo([firstShot, secondShot, finalShot]);
        }
      });
    });
  });

  combos.sort(compareCheckoutCombos);
  return combos;
}

function normalizeCheckoutCombo(combo) {
  if (combo.length <= 1) {
    return combo.slice();
  }
  const finalShot = combo[combo.length - 1];
  const opening = combo
    .slice(0, combo.length - 1)
    .sort((a, b) => shotPriorityValue(b) - shotPriorityValue(a));
  return [...opening, finalShot];
}

function compareCheckoutCombos(a, b) {
  if (a.length !== b.length) {
    return a.length - b.length;
  }
  const maxSlots = Math.max(a.length, b.length, 3);
  for (let i = 0; i < maxSlots; i += 1) {
    const shotA = a[i];
    const shotB = b[i];
    const priorityA = shotA ? shotPriorityValue(shotA) : -1;
    const priorityB = shotB ? shotPriorityValue(shotB) : -1;
    if (priorityA !== priorityB) {
      return priorityB - priorityA;
    }
  }
  const totalA = a.reduce((sum, shot) => sum + shot.score, 0);
  const totalB = b.reduce((sum, shot) => sum + shot.score, 0);
  if (totalA !== totalB) {
    return totalB - totalA;
  }
  const labelA = a.map((shot) => shot.display).join("");
  const labelB = b.map((shot) => shot.display).join("");
  return labelA.localeCompare(labelB, "de-DE");
}

function shotPriorityValue(shot) {
  const kindPriority = {
    T: 5,
    D: 4,
    DB: 4,
    S: 3,
    SB: 2,
  };
  const weight = kindPriority[shot.kind] || 0;
  return weight * 100 + shot.base;
}

function createCheckoutShotCatalog() {
  const shots = [];
  for (let value = 1; value <= 20; value += 1) {
    shots.push({
      id: `S${value}`,
      score: value,
      display: `${value}`,
      kind: "S",
      base: value,
      isDouble: false,
    });
    shots.push({
      id: `D${value}`,
      score: value * 2,
      display: `D${value}`,
      kind: "D",
      base: value,
      isDouble: true,
    });
    shots.push({
      id: `T${value}`,
      score: value * 3,
      display: `T${value}`,
      kind: "T",
      base: value,
      isDouble: false,
    });
  }
  shots.push({
    id: "SB25",
    score: 25,
    display: "25",
    kind: "SB",
    base: 25,
    isDouble: false,
  });
  shots.push({
    id: "DB25",
    score: 50,
    display: "Bull",
    kind: "DB",
    base: 25,
    isDouble: true,
  });
  return shots;
}

function playTripleHitSound() {
  if (typeof window === "undefined") return;
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) return;
  if (!audioContext) {
    try {
      audioContext = new AudioContext();
    } catch (error) {
      audioContext = null;
      return;
    }
  }
  if (!audioContext) return;
  if (audioContext.state === "suspended") {
    audioContext.resume().catch(() => {});
  }

  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();
  const startTime = audioContext.currentTime;
  const duration = 0.28;

  oscillator.type = "triangle";
  oscillator.frequency.setValueAtTime(660, startTime);
  oscillator.frequency.exponentialRampToValueAtTime(990, startTime + duration);

  gain.gain.setValueAtTime(0, startTime);
  gain.gain.linearRampToValueAtTime(0.45, startTime + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

  oscillator.connect(gain);
  gain.connect(audioContext.destination);

  oscillator.start(startTime);
  oscillator.stop(startTime + duration + 0.05);
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
  setupDartSwipeGestures();
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
    const label =
      base === 0
        ? "0"
        : gameState.dartMultiplier === 1
        ? `${base}`
        : `${config.short}${base}`;
    const readable = base === 0 ? "0" : `${config.label} ${base}`;

    button.dataset.label = label;
    button.dataset.readable = readable;
    button.dataset.score = String(score);
    button.dataset.multiplier = String(gameState.dartMultiplier);
    button.dataset.double = String(config.isDouble && base !== 0);
    if (base > 0) {
      button.dataset.swipeLeft = "\u2190 T";
      button.dataset.swipeRight = "D \u2192";
    } else {
      delete button.dataset.swipeLeft;
      delete button.dataset.swipeRight;
    }
    button.disabled = disabled;

    const valueNode = button.querySelector(".value");
    if (valueNode) {
      valueNode.textContent = String(score);
    }
  });
}

function setupDartSwipeGestures() {
  if (!elements.dartNumberButtons.length) return;
  elements.dartNumberButtons.forEach((button) => {
    if (dartSwipeBoundButtons.has(button)) return;
    dartSwipeBoundButtons.add(button);
    button.addEventListener("pointerdown", onDartNumberPointerDown);
    button.addEventListener("pointermove", onDartNumberPointerMove);
    button.addEventListener("pointerup", onDartNumberPointerUp);
    button.addEventListener("pointercancel", onDartNumberPointerCancel);
    button.addEventListener("pointerleave", onDartNumberPointerCancel);
  });
}

function onDartNumberPointerDown(event) {
  if (event.pointerType === "mouse" && event.button !== 0) return;
  const button = event.currentTarget;
  dartSwipePointers.set(event.pointerId, {
    button,
    startX: event.clientX,
    startY: event.clientY,
    previewMultiplier: null,
  });
  if (typeof button.setPointerCapture === "function") {
    try {
      button.setPointerCapture(event.pointerId);
    } catch {
      /* Ignore capture errors */
    }
  }
}

function onDartNumberPointerMove(event) {
  const state = dartSwipePointers.get(event.pointerId);
  if (!state || state.button !== event.currentTarget) return;

  const deltaX = event.clientX - state.startX;
  const deltaY = event.clientY - state.startY;

  if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) >= DART_SWIPE_PREVIEW_THRESHOLD) {
    if (typeof event.preventDefault === "function") {
      event.preventDefault();
    }
    const multiplier = deltaX > 0 ? 2 : 3;
    if (state.previewMultiplier !== multiplier) {
      state.previewMultiplier = multiplier;
    }
    applyDartSwipePreview(state.button, multiplier, deltaX);
  } else if (state.previewMultiplier) {
    state.previewMultiplier = null;
    clearDartSwipePreview(state.button);
  }
}

function onDartNumberPointerUp(event) {
  const button = event.currentTarget;
  if (typeof button.releasePointerCapture === "function") {
    try {
      button.releasePointerCapture(event.pointerId);
    } catch {
      /* Ignore release errors */
    }
  }
  const state = dartSwipePointers.get(event.pointerId);
  dartSwipePointers.delete(event.pointerId);
  if (!state || state.button !== button) return;

  clearDartSwipePreview(button);

  const deltaX = event.clientX - state.startX;
  const deltaY = event.clientY - state.startY;
  const absDeltaX = Math.abs(deltaX);
  const absDeltaY = Math.abs(deltaY);

  if (absDeltaX < DART_SWIPE_MIN_DISTANCE || absDeltaX <= absDeltaY) {
    return;
  }

  const multiplier = deltaX > 0 ? 2 : 3;
  handleDartSwipe(button, multiplier, event);
}

function onDartNumberPointerCancel(event) {
  const button = event.currentTarget;
  if (typeof button.releasePointerCapture === "function") {
    try {
      button.releasePointerCapture(event.pointerId);
    } catch {
      /* Ignore release errors */
    }
  }
  clearDartSwipePreview(button);
  dartSwipePointers.delete(event.pointerId);
}

function applyDartSwipePreview(button, multiplier, deltaX) {
  const clampedOffset = Math.max(Math.min(deltaX, DART_SWIPE_MAX_OFFSET), -DART_SWIPE_MAX_OFFSET);
  const classToAdd = multiplier === 2 ? "swipe-preview-double" : "swipe-preview-triple";
  const classToRemove = multiplier === 2 ? "swipe-preview-triple" : "swipe-preview-double";
  button.classList.remove("swipe-double", "swipe-triple");
  button.classList.add(classToAdd);
  button.classList.remove(classToRemove);
  button.style.setProperty("--dart-swipe-offset", `${clampedOffset}px`);
}

function clearDartSwipePreview(button) {
  button.classList.remove("swipe-preview-double", "swipe-preview-triple");
  button.style.removeProperty("--dart-swipe-offset");
}

function handleDartSwipe(button, multiplier, event) {
  clearDartSwipePreview(button);
  if (!gameState.legActive || button.disabled) return;
  if (!MULTIPLIER_CONFIG[multiplier]) return;

  const base = parseInt(button.dataset.number || "0", 10);
  if (!Number.isFinite(base) || base <= 0) return;

  const config = MULTIPLIER_CONFIG[multiplier];
  const score = base * multiplier;
  const label = `${config.short}${base}`;
  const readable = `${config.label} ${base}`;

  if (event && typeof event.preventDefault === "function") {
    event.preventDefault();
  }

  blockNextClick(button);
  triggerSwipeFeedback(button, multiplier);

  applyDart({
    type: "dart",
    readable,
    dart: {
      label,
      score,
      isDouble: multiplier === 2,
      multiplier,
    },
  });
}

function blockNextClick(button) {
  const suppressClick = (event) => {
    event.stopImmediatePropagation();
    event.preventDefault();
  };
  button.addEventListener("click", suppressClick, { once: true, capture: true });
}

function triggerSwipeFeedback(button, multiplier) {
  button.classList.remove("swipe-preview-double", "swipe-preview-triple");
  const className = multiplier === 2 ? "swipe-double" : "swipe-triple";
  const offset = multiplier === 2 ? "6px" : "-6px";
  button.style.setProperty("--dart-swipe-offset", offset);
  button.classList.add(className);
  setTimeout(() => {
    button.classList.remove(className);
    button.style.removeProperty("--dart-swipe-offset");
  }, DART_SWIPE_FEEDBACK_TIMEOUT);
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
    profile.stats.dartHistogram = cloneHistogram(profile.stats.dartHistogram);
    const entryHistogram = cloneHistogram(player.dartHitsThisGame);
    Object.keys(entryHistogram).forEach((key) => {
      profile.stats.dartHistogram[key] =
        (profile.stats.dartHistogram[key] || 0) + (entryHistogram[key] || 0);
    });

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
      dartHistogram: entryHistogram,
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
    player.dartHitsThisGame = createEmptyHistogram();
  });

  gameState.statsCommitted = true;
  saveProfiles();
}

function setViewMode(view) {
  const allowedViews = ["setup", "play", "tournament", "profiles", "leaderboard"];
  const normalized = allowedViews.includes(view) ? view : "setup";
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
  document.body.classList.toggle("tournament-view", currentView === "tournament");
  document.body.classList.toggle("profiles-view", currentView === "profiles");
  document.body.classList.toggle("leaderboard-view", currentView === "leaderboard");
  elements.viewToggleButtons.forEach((button) => {
    const isActive = button.dataset.view === currentView;
    button.classList.toggle("active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  });
  if (elements.scoreboardHeatmap) {
    if (currentView === "play") {
      renderActivePlayerHeatmap();
    } else {
      elements.scoreboardHeatmap.hidden = true;
    }
  }
  if (currentView === "play") {
    updateActivePlayerBanner();
  } else if (currentView === "tournament") {
    renderTournamentBracket();
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

function syncTournamentPlayerField(slotIndex) {
  const inputs = elements.tournamentPlayerInputs || [];
  const selects = elements.tournamentPlayerSelects || [];
  const input = inputs[slotIndex];
  const select = selects[slotIndex];
  if (!input || !select) return;

  const profileId = select.value || "";
  const profile = getProfileById(profileId);

  if (profile) {
    const displayName = getProfileDisplayName(profile);
    if (!input.value.trim() || input.dataset.autofill === "true") {
      input.value = displayName;
      input.dataset.autofill = "true";
    }
    input.placeholder = displayName;
  } else {
    if (input.dataset.autofill === "true") {
      input.value = "";
    }
    input.placeholder = "";
    delete input.dataset.autofill;
  }
}

function onTournamentProfileSelectChange(slotIndex) {
  syncTournamentPlayerField(slotIndex);
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

  const submittedId = (elements.profileIdInput?.value || "").toString().trim();
  const targetId = editingProfileId || submittedId;
  const isEditing = Boolean(targetId);

  if (isEditing) {
    const profile = getProfileById(targetId);
    if (!profile) {
      notifyVoiceStatus("error", "Profil konnte nicht gefunden werden");
      resetProfileForm(true);
      return;
    }

    profile.firstName = firstName;
    profile.lastName = lastName;
    profile.nickname = nickname;
    if (pendingProfileImage !== null) {
      profile.image = pendingProfileImage || "";
    }
    profile.updatedAt = Date.now();

    saveProfiles();
    renderProfileOptions();
    renderProfileList();
    const playersUpdated = refreshPlayersForProfile(profile.id);
    handleProfileSelection(elements.playerOneProfileSelect, elements.playerOneInput, "Player 1");
    handleProfileSelection(elements.playerTwoProfileSelect, elements.playerTwoInput, "Player 2");
    resetProfileForm();
    if (playersUpdated) {
      render();
    }
    notifyVoiceStatus("success", "Profil aktualisiert");
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
      setsWon: 0,
      totalPoints: 0,
      totalDarts: 0,
      dartHistogram: createEmptyHistogram(),
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
  notifyVoiceStatus("success", "Profil gespeichert");
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
  editingProfileId = null;
  pendingProfileImage = null;

  if (elements.profileForm) {
    elements.profileForm.dataset.mode = "create";
    if (!skipFields) {
      elements.profileForm.reset();
    }
  }

  if (elements.profileIdInput) {
    elements.profileIdInput.value = "";
  }
  if (elements.profileImageInput) {
    elements.profileImageInput.value = "";
  }
  if (elements.profileImagePreview) {
    elements.profileImagePreview.src = "";
    elements.profileImagePreview.hidden = true;
  }
  if (elements.profileSubmitBtn) {
    elements.profileSubmitBtn.textContent = "Profil speichern";
  }
  if (elements.profileResetBtn) {
    elements.profileResetBtn.textContent = "Zurücksetzen";
  }
}

function startProfileEdit(profileId) {
  const profile = getProfileById(profileId);
  if (!profile) return;

  setViewMode("profiles");

  editingProfileId = profileId;
  pendingProfileImage = profile.image || "";

  if (elements.profileForm) {
    elements.profileForm.dataset.mode = "edit";
  }
  if (elements.profileIdInput) {
    elements.profileIdInput.value = profileId;
  }
  if (elements.profileFirstName) {
    elements.profileFirstName.value = profile.firstName || "";
  }
  if (elements.profileLastName) {
    elements.profileLastName.value = profile.lastName || "";
  }
  if (elements.profileNickname) {
    elements.profileNickname.value = profile.nickname || "";
  }
  if (elements.profileImageInput) {
    elements.profileImageInput.value = "";
  }
  if (elements.profileImagePreview) {
    if (profile.image) {
      elements.profileImagePreview.src = profile.image;
      elements.profileImagePreview.hidden = false;
    } else {
      elements.profileImagePreview.src = "";
      elements.profileImagePreview.hidden = true;
    }
  }
  if (elements.profileSubmitBtn) {
    elements.profileSubmitBtn.textContent = "Änderungen speichern";
  }
  if (elements.profileResetBtn) {
    elements.profileResetBtn.textContent = "Abbrechen";
  }
  requestAnimationFrame(() => {
    elements.profileForm?.scrollIntoView({ behavior: "smooth", block: "start" });
    elements.profileFirstName?.focus();
  });
}

function refreshPlayersForProfile(profileId) {
  if (!profileId) return false;
  const profile = getProfileById(profileId);
  if (!profile) return false;

  const displayName = getProfileDisplayName(profile);
  const fullName = `${profile.firstName || ""} ${profile.lastName || ""}`.trim();
  const photo = profile.image || "";
  let updated = false;

  gameState.players.forEach((player) => {
    if (player.profileId === profileId) {
      player.displayName = displayName;
      player.fullName = fullName;
      player.photo = photo || null;
      const playerDisplay = getPlayerDisplayName(player);
      gameState.history.forEach((entry) => {
        if (entry.playerId === player.id) {
          entry.playerName = playerDisplay;
        }
      });
      gameState.snapshots.forEach((snapshot) => {
        if (!snapshot?.players) return;
        snapshot.players.forEach((snapPlayer) => {
          if (snapPlayer.profileId === profileId) {
            snapPlayer.displayName = displayName;
            snapPlayer.fullName = fullName;
            snapPlayer.photo = photo || null;
          }
        });
      });
      updated = true;
    }
  });

  return updated;
}

function resetProfileStats(profileId) {
  const profile = getProfileById(profileId);
  if (!profile) return;
  if (!window.confirm(`Statistiken von "${getProfileDisplayName(profile)}" zurücksetzen?`)) return;
  ensureProfileStats(profile);
  profile.stats.gamesPlayed = 0;
  profile.stats.legsWon = 0;
  profile.stats.setsWon = 0;
  profile.stats.totalPoints = 0;
  profile.stats.totalDarts = 0;
  profile.stats.dartHistogram = createEmptyHistogram();
  profile.history = [];
  profile.updatedAt = Date.now();
  saveProfiles();
  renderProfileList();
  renderLeaderboard();
  notifyVoiceStatus("success", "Statistiken zurückgesetzt");
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

  if (action === "edit") {
    startProfileEdit(profileId);
    return;
  }

  if (action === "reset-stats") {
    resetProfileStats(profileId);
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

  const updateSelect = (select) => {
    if (!select) return;
    const previous = select.value;
    select.innerHTML = defaultOption + options;
    if (previous && profiles.some((profile) => profile.id === previous)) {
      select.value = previous;
    } else {
      select.value = "";
    }
  };

  updateSelect(elements.playerOneProfileSelect);
  updateSelect(elements.playerTwoProfileSelect);

  if (Array.isArray(elements.tournamentPlayerSelects)) {
    elements.tournamentPlayerSelects.forEach((select, index) => {
      updateSelect(select);
      syncTournamentPlayerField(index);
    });
  }

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
      const heatmapMarkup = generateProfileHeatmapMarkup(profile);

      li.innerHTML = `
        ${avatarMarkup}
        <div class="profile-info">
          <h4>${displayName}</h4>
          <span>${fullName || ""}</span>
          <p class="profile-stats">Spiele: ${games} · Sätze: ${sets} · Legs: ${legs} · Ø/Dart: ${averagePerDart}${
        profile.stats.totalDarts ? ` · 3-Dart Ø: ${averageThreeDart}` : ""
      }</p>
          ${historyEntries ? `<ul class="profile-history">${historyEntries}</ul>` : ""}
          ${heatmapMarkup}
          <div class="profile-actions-inline">
            <button type="button" class="ghost" data-action="edit" data-id="${profile.id}">Bearbeiten</button>
            <button type="button" class="ghost" data-action="reset-stats" data-id="${profile.id}">Statistiken zurücksetzen</button>
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

function setTournamentStatus(message, state = "idle") {
  if (!elements.tournamentStatus) return;
  elements.tournamentStatus.textContent = message;
  elements.tournamentStatus.dataset.state = state;
}

function clearTournamentMatchTimer() {
  const tournament = gameState.tournament;
  if (tournament?.nextMatchTimer) {
    clearTimeout(tournament.nextMatchTimer);
    tournament.nextMatchTimer = null;
  }
}

function resetTournamentForm() {
  const tournament = gameState.tournament;
  if (tournament?.status === "in-progress") {
    setTournamentStatus("Match laeuft - Reset nach Matchende moeglich.", "error");
    return;
  }
  clearTournamentMatchTimer();
  const inputs = elements.tournamentPlayerInputs || [];
  inputs.forEach((input) => {
    if (!input) return;
    input.value = "";
    input.placeholder = "";
    delete input.dataset.autofill;
  });
  const selects = elements.tournamentPlayerSelects || [];
  selects.forEach((select) => {
    if (!select) return;
    select.value = "";
  });
  selects.forEach((_, index) => {
    syncTournamentPlayerField(index);
  });
  gameState.tournament = createInitialTournamentState();
  renderTournamentBracket();
  setTournamentStatus("Kein Turnier aktiv.", "idle");
}

function collectTournamentPlayerEntries() {
  const inputs = elements.tournamentPlayerInputs || [];
  const selects = elements.tournamentPlayerSelects || [];
  const entries = [];

  for (let i = 0; i < MAX_TOURNAMENT_PLAYERS; i += 1) {
    const input = inputs[i];
    const select = selects[i];
    const rawName = typeof input?.value === "string" ? input.value.trim() : "";
    const profileId = select?.value || "";
    const profile = profileId ? getProfileById(profileId) : null;
    const name = rawName || (profile ? getProfileDisplayName(profile) : "");
    if (!name) continue;
    entries.push({
      name,
      seed: i + 1,
      profileId,
      participantIndex: i,
    });
  }

  return entries;
}

function onTournamentSubmit(event) {
  event.preventDefault();
  const entries = collectTournamentPlayerEntries();
  if (entries.length < 2) {
    setTournamentStatus("Mindestens zwei Spieler eingeben.", "error");
    return;
  }

  const players = entries.slice(0, MAX_TOURNAMENT_PLAYERS).map((entry, index) => ({
    id: `tp${index + 1}`,
    name: entry.name,
    seed: entry.seed,
    profileId: entry.profileId || "",
    sourceIndex: entry.participantIndex,
  }));

  const matchModeValue = elements.tournamentMatchModeSelect?.value;
  const matchMode = MATCH_MODES[matchModeValue] ? matchModeValue : DEFAULT_MATCH_MODE;
  const startingScore =
    parseInt(elements.startingScoreSelect?.value, 10) || DEFAULT_STARTING_SCORE;
  const outModeRaw = elements.outModeSelect?.value;
  const outMode = OUT_MODE_LABELS[outModeRaw] ? outModeRaw : DEFAULT_OUT_MODE;

  const tournament = createInitialTournamentState();
  tournament.active = true;
  tournament.players = players;
  tournament.matchMode = matchMode;
  tournament.startingScore = startingScore;
  tournament.outMode = outMode;

  const structure = buildTournamentStructure(players);
  tournament.rounds = structure.rounds;
  tournament.matchLookup = structure.matchLookup;

  resolveTournamentByes(tournament);
  if (!tournament.championId) {
    tournament.status = "pending";
  }
  gameState.tournament = tournament;

  renderTournamentBracket();

  const nextMatch = findNextTournamentMatch(tournament);
  if (nextMatch) {
    launchTournamentMatch(nextMatch);
    return;
  }

  if (tournament.championId) {
    const championName = getTournamentPlayerName(tournament, tournament.championId);
    tournament.status = "complete";
    setTournamentStatus(`Champion: ${championName}`, "complete");
  } else {
    setTournamentStatus("Turnier erstellt. Warte auf die erste Begegnung.", "pending");
  }
  setViewMode("tournament");
}

function buildTournamentStructure(players) {
  const sanitized = Array.isArray(players) ? players.slice(0, MAX_TOURNAMENT_PLAYERS) : [];
  if (!sanitized.length) {
    return { rounds: [], matchLookup: {} };
  }

  const participantCount = sanitized.length;
  const minParticipants = Math.max(participantCount, 2);
  const exponent = Math.max(
    1,
    Math.ceil(Math.log2(Math.min(MAX_TOURNAMENT_PLAYERS, minParticipants)))
  );
  const bracketSize = Math.min(MAX_TOURNAMENT_PLAYERS, 2 ** exponent);
  const roundsToUse = TOURNAMENT_ROUNDS.slice(TOURNAMENT_ROUNDS.length - exponent);

  const slots = new Array(bracketSize).fill(null);
  sanitized.forEach((player, index) => {
    if (index < slots.length) {
      slots[index] = player;
    }
  });

  const rounds = [];
  const matchLookup = {};
  let previousMatches = null;
  let workingSlots = slots;

  roundsToUse.forEach((roundDef) => {
    const roundIndex = rounds.length;
    const matches = [];

    for (let slotIndex = 0; slotIndex < workingSlots.length; slotIndex += 2) {
      const first = workingSlots[slotIndex] || null;
      const second = workingSlots[slotIndex + 1] || null;
      const match = {
        id: `${roundDef.id}-${matches.length + 1}`,
        roundId: roundDef.id,
        players: [
          first
            ? {
                participantId: first.id,
                name: first.name,
                seed: first.seed,
                profileId: first.profileId || "",
              }
            : null,
          second
            ? {
                participantId: second.id,
                name: second.name,
                seed: second.seed,
                profileId: second.profileId || "",
              }
            : null,
        ],
        winnerId: null,
        status: first || second ? "pending" : "empty",
        nextMatchId: null,
        nextMatchSlot: null,
      };
      matches.push(match);
      matchLookup[match.id] = { roundIndex, matchIndex: matches.length - 1 };
    }

    if (previousMatches) {
      previousMatches.forEach((prevMatch, index) => {
        const target = matches[Math.floor(index / 2)];
        if (!target) return;
        const slotIndex = index % 2;
        prevMatch.nextMatchId = target.id;
        prevMatch.nextMatchSlot = slotIndex;
        if (!Array.isArray(target.players)) {
          target.players = [null, null];
        }
        const existingSlot = target.players[slotIndex];
        if (existingSlot && typeof existingSlot === "object") {
          target.players[slotIndex] = {
            participantId: existingSlot.participantId || null,
            name: existingSlot.name || "",
            seed: existingSlot.seed || null,
            profileId: existingSlot.profileId || "",
            sourceMatchId: prevMatch.id,
          };
        } else {
          target.players[slotIndex] = {
            participantId: null,
            name: "",
            seed: null,
            profileId: "",
            sourceMatchId: prevMatch.id,
          };
        }
      });
    }

    rounds.push({
      id: roundDef.id,
      label: roundDef.label,
      matches,
    });

    previousMatches = matches;
    workingSlots = matches.map(() => null);
  });

  return { rounds, matchLookup };
}

function autoAdvanceTournamentByes(tournament) {
  let changed = false;
  tournament.rounds.forEach((round) => {
    round.matches.forEach((match) => {
      if (!match) return;
      if (match.status === "completed" || match.status === "in-progress") return;
      const slots = Array.isArray(match.players) ? match.players : [];
      const first = slots[0];
      const second = slots[1];
      const hasFirst = Boolean(first?.participantId);
      const hasSecond = Boolean(second?.participantId);
      if (!hasFirst && !hasSecond) {
        match.status = "empty";
        return;
      }
      if (hasFirst && hasSecond) {
        if (match.status === "empty") {
          match.status = "pending";
        }
        return;
      }

      const winnerSlot = hasFirst ? first : second;
      const missingSlot = hasFirst ? second : first;
      if (!winnerSlot) return;

      let canAutoAdvance = true;
      const sourceMatchId = missingSlot?.sourceMatchId;
      if (sourceMatchId) {
        const sourceMatch = getTournamentMatchById(tournament, sourceMatchId);
        if (sourceMatch) {
          const sourceMayProduceOpponent =
            sourceMatch.status === "pending" ||
            sourceMatch.status === "in-progress" ||
            (sourceMatch.status === "completed" && sourceMatch.winnerId);
          if (sourceMayProduceOpponent) {
            canAutoAdvance = false;
          }
        }
      }

      if (!canAutoAdvance) {
        if (match.status === "empty") {
          match.status = "pending";
        }
        return;
      }

      if (match.winnerId === winnerSlot.participantId && match.status === "auto-advanced") {
        return;
      }
      match.winnerId = winnerSlot.participantId;
      match.status = "auto-advanced";
      propagateTournamentWinner(tournament, match, winnerSlot.participantId);
      changed = true;
    });
  });
  return changed;
}

function resolveTournamentByes(tournament) {
  if (!tournament) return;
  while (autoAdvanceTournamentByes(tournament)) {
    // repeat until no additional auto-advances occur
  }
}

function getTournamentParticipant(tournament, participantId) {
  if (!participantId || !Array.isArray(tournament?.players)) return null;
  return tournament.players.find((player) => player.id === participantId) || null;
}

function getTournamentMatchById(tournament, matchId) {
  if (!matchId) return null;
  const lookup = tournament?.matchLookup?.[matchId];
  if (!lookup) return null;
  return (
    tournament.rounds?.[lookup.roundIndex]?.matches?.[lookup.matchIndex] || null
  );
}

function getTournamentPlayerName(tournament, participantId) {
  if (!participantId) return "Unbekannt";
  const participant = getTournamentParticipant(tournament, participantId);
  if (!participant) return "Unbekannt";
  if (participant.profileId) {
    const profile = getProfileById(participant.profileId);
    if (profile) {
      const displayName = getProfileDisplayName(profile);
      if (displayName) return displayName;
    }
  }
  return participant.name || "Unbekannt";
}

function propagateTournamentWinner(tournament, match, winnerId) {
  if (!winnerId || !tournament) return;
  if (!match.nextMatchId) {
    tournament.championId = winnerId;
    tournament.status = "complete";
    return;
  }

  const lookup = tournament.matchLookup?.[match.nextMatchId];
  if (!lookup) return;
  const targetRound = tournament.rounds[lookup.roundIndex];
  if (!targetRound) return;
  const targetMatch = targetRound.matches[lookup.matchIndex];
  if (!targetMatch) return;

  const participant = getTournamentParticipant(tournament, winnerId);
  const payload = participant
    ? {
        participantId: participant.id,
        name: participant.name,
        seed: participant.seed,
        profileId: participant.profileId || "",
      }
    : { participantId: winnerId, name: "Unbekannt", seed: null, profileId: "" };

  if (!Array.isArray(targetMatch.players)) {
    targetMatch.players = [null, null];
  }
  const slotIndex = Number(match.nextMatchSlot) === 1 ? 1 : 0;
  const existingSlot = targetMatch.players[slotIndex];
  const sourceMatchId = existingSlot?.sourceMatchId || match.id;
  targetMatch.players[slotIndex] = {
    ...payload,
    sourceMatchId,
  };
  if (targetMatch.status === "empty") {
    targetMatch.status = "pending";
  }
}

function matchHasBothPlayers(match) {
  return (
    Array.isArray(match?.players) &&
    match.players.length >= 2 &&
    match.players.every((slot) => slot && slot.participantId)
  );
}

function findNextTournamentMatch(tournament) {
  if (!tournament?.rounds?.length) return null;
  for (let roundIndex = 0; roundIndex < tournament.rounds.length; roundIndex += 1) {
    const round = tournament.rounds[roundIndex];
    if (!round?.matches?.length) continue;
    for (let matchIndex = 0; matchIndex < round.matches.length; matchIndex += 1) {
      const match = round.matches[matchIndex];
      if (!match) continue;
      if (match.status === "pending" && matchHasBothPlayers(match)) {
        return { roundIndex, matchIndex };
      }
    }
  }
  return null;
}

function formatTournamentMatchLabel(tournament, roundIndex, matchIndex) {
  const round = tournament?.rounds?.[roundIndex];
  const matchNumber = matchIndex + 1;
  if (!round) {
    return `Spiel ${matchNumber}`;
  }
  return `${round.label} - Spiel ${matchNumber}`;
}

function describeTournamentMatchStatus(tournament, match) {
  if (!match) return "Unbekannt";
  if (match.status === "in-progress") {
    return "Laeuft";
  }
  if (match.status === "completed") {
    const name = match.winnerId ? getTournamentPlayerName(tournament, match.winnerId) : "Unbekannt";
    return `Sieger: ${name}`;
  }
  if (match.status === "auto-advanced") {
    const name = match.winnerId ? getTournamentPlayerName(tournament, match.winnerId) : "Freilos";
    return `Freilos fuer ${name}`;
  }
  if (match.status === "pending") {
    return matchHasBothPlayers(match) ? "Bereit" : "Wartet auf Teilnehmer";
  }
  return "Keine Teilnehmer";
}

function renderTournamentBracket() {
  if (!elements.tournamentBracket) return;
  const tournament = gameState.tournament;
  const hasVisibleMatches =
    tournament?.rounds?.some((round) =>
      round.matches?.some((match) => match && match.status !== "empty")
    ) || false;

  if (!hasVisibleMatches) {
    elements.tournamentBracket.innerHTML =
      '<p class="tournament-empty">Noch kein Turnier erstellt.</p>';
    return;
  }

  const fragment = document.createDocumentFragment();

  tournament.rounds.forEach((round, roundIndex) => {
    if (!round?.matches?.length) return;
    const visible = round.matches.some((match) => match && match.status !== "empty");
    if (!visible) return;

    const roundSection = document.createElement("section");
    roundSection.className = "tournament-round";
    roundSection.dataset.roundId = round.id;

    const title = document.createElement("h4");
    title.className = "tournament-round-title";
    title.textContent = round.label;
    roundSection.appendChild(title);

    const list = document.createElement("ul");
    list.className = "tournament-match-list";

    round.matches.forEach((match, matchIndex) => {
      if (!match || match.status === "empty") return;
      const item = document.createElement("li");
      let className = "tournament-match";
      if (match.status === "in-progress") className += " in-progress";
      if (match.status === "completed") className += " completed";
      if (match.status === "auto-advanced") className += " auto-advanced";
      item.className = className;
      item.dataset.matchId = match.id;

      const matchLabel = document.createElement("div");
      matchLabel.className = "tournament-match-label";
      matchLabel.textContent = formatTournamentMatchLabel(tournament, roundIndex, matchIndex);
      item.appendChild(matchLabel);

      const slotList = Array.isArray(match.players) ? match.players : [null, null];
      slotList.forEach((slot) => {
        const slotEl = document.createElement("div");
        let slotClass = "tournament-player-slot";
        if (!slot || !slot.participantId) {
          slotClass += " empty";
          slotEl.className = slotClass;
          slotEl.textContent = "Freilos";
        } else {
          if (match.winnerId && slot.participantId === match.winnerId) {
            slotClass += " winner";
          }
          slotEl.className = slotClass;
          const nameSpan = document.createElement("span");
          const slotName = getTournamentPlayerName(tournament, slot.participantId) || slot.name || "Teilnehmer";
          nameSpan.textContent = slotName;
          slotEl.appendChild(nameSpan);
          if (slot.seed) {
            const seedSpan = document.createElement("span");
            seedSpan.className = "seed";
            seedSpan.textContent = `#${slot.seed}`;
            slotEl.appendChild(seedSpan);
          }
        }
        item.appendChild(slotEl);
      });

      const statusEl = document.createElement("div");
      statusEl.className = "tournament-match-status";
      statusEl.textContent = describeTournamentMatchStatus(tournament, match);
      item.appendChild(statusEl);

      list.appendChild(item);
    });

    roundSection.appendChild(list);
    fragment.appendChild(roundSection);
  });

  elements.tournamentBracket.innerHTML = "";
  elements.tournamentBracket.appendChild(fragment);
}

function launchTournamentMatch(target) {
  const tournament = gameState.tournament;
  if (!tournament?.active) return;
  const round = tournament.rounds?.[target.roundIndex];
  const match = round?.matches?.[target.matchIndex];
  if (!match || !matchHasBothPlayers(match)) {
    setTournamentStatus("Keine weitere Begegnung verfuergbar.", "idle");
    return;
  }

  clearTournamentMatchTimer();

  tournament.currentRoundIndex = target.roundIndex;
  tournament.currentMatchIndex = target.matchIndex;
  tournament.currentMatchId = match.id;
  match.status = "in-progress";
  tournament.status = "in-progress";

  renderTournamentBracket();

  const playerConfigs = match.players.map((slot, index) => {
    const participant = slot?.participantId ? getTournamentParticipant(tournament, slot.participantId) : null;
    const participantName = participant?.name;
    const name = slot?.name || participantName || `Spieler ${index + 1}`;
    return {
      name,
      profileId: participant?.profileId || slot?.profileId || "",
      tournamentPlayerId: slot?.participantId || null,
      tournamentSeed: participant?.seed || slot?.seed || null,
    };
  });

  const matchupLabel = match.players
    .map((slot, index) =>
      slot?.participantId
        ? getTournamentPlayerName(tournament, slot.participantId)
        : playerConfigs[index]?.name || `Spieler ${index + 1}`
    )
    .join(" vs ");
  const roundLabel = round?.label || "Match";
  setTournamentStatus(`${roundLabel}: ${matchupLabel}`, "in-progress");

  const startScore = tournament.startingScore || DEFAULT_STARTING_SCORE;
  const outMode = tournament.outMode || DEFAULT_OUT_MODE;
  const matchMode = tournament.matchMode || DEFAULT_MATCH_MODE;

  startGame(playerConfigs, startScore, outMode, matchMode);
  setViewMode("play");
}

function handleTournamentMatchCompletion(winningPlayer) {
  const tournament = gameState.tournament;
  if (!tournament?.active || !tournament.currentMatchId) return;
  clearTournamentMatchTimer();
  const lookup = tournament.matchLookup?.[tournament.currentMatchId];
  if (!lookup) {
    tournament.currentMatchId = null;
    return;
  }

  const round = tournament.rounds?.[lookup.roundIndex];
  const match = round?.matches?.[lookup.matchIndex];
  if (!match) {
    tournament.currentMatchId = null;
    return;
  }

  const winnerId = winningPlayer?.tournamentPlayerId || null;
  if (winnerId) {
    match.winnerId = winnerId;
  }
  match.status = "completed";
  tournament.currentMatchId = null;
  tournament.currentRoundIndex = null;
  tournament.currentMatchIndex = null;

  if (winnerId) {
    propagateTournamentWinner(tournament, match, winnerId);
  }

  resolveTournamentByes(tournament);
  renderTournamentBracket();

  if (match.roundId === "final") {
    tournament.status = "complete";
    tournament.championId = winnerId;
    const championName = winnerId ? getTournamentPlayerName(tournament, winnerId) : "Unbekannt";
    setTournamentStatus(`Champion: ${championName}`, "complete");
    setViewMode("tournament");
    return;
  }

  const nextMatch = findNextTournamentMatch(tournament);
  if (nextMatch) {
    const nextRound = tournament.rounds[nextMatch.roundIndex];
    const nextMatchRef = nextRound?.matches?.[nextMatch.matchIndex];
    const playersLabel = nextMatchRef?.players
      ?.map((slot) =>
        slot?.participantId ? getTournamentPlayerName(tournament, slot.participantId) : "Freilos"
      )
      .join(" vs ") || "Freilos";
    setTournamentStatus(`${nextRound?.label || "Match"}: ${playersLabel}`, "pending");

    clearTournamentMatchTimer();
    const target = { roundIndex: nextMatch.roundIndex, matchIndex: nextMatch.matchIndex };
    tournament.nextMatchTimer = setTimeout(() => {
      tournament.nextMatchTimer = null;
      launchTournamentMatch(target);
    }, 1200);
    return;
  }

  if (tournament.championId) {
    const championName = getTournamentPlayerName(tournament, tournament.championId);
    tournament.status = "complete";
    setTournamentStatus(`Champion: ${championName}`, "complete");
    setViewMode("tournament");
  } else {
    setTournamentStatus("Turnier abgeschlossen.", "complete");
  }
}

function getActiveTournamentMatchLabel() {
  const tournament = gameState.tournament;
  if (!tournament?.active || !tournament.currentMatchId) return "";
  const lookup = tournament.matchLookup?.[tournament.currentMatchId];
  if (!lookup) return "";
  return formatTournamentMatchLabel(tournament, lookup.roundIndex, lookup.matchIndex);
}

const DARTBOARD_NUMBER_ORDER = [20, 1, 18, 4, 13, 6, 10, 15, 2, 17, 3, 19, 7, 16, 8, 11, 14, 9, 12, 5];
const HEATMAP_COLORS = {
  total: [36, 85, 245],
  double: [244, 63, 94],
  triple: [16, 185, 129],
  bull: [253, 224, 71],
};

function aggregateHistogramData(histogram) {
  const segments = DARTBOARD_NUMBER_ORDER.map((number) => {
    const single = Number(histogram?.[`S${number}`]) || 0;
    const double = Number(histogram?.[`D${number}`]) || 0;
    const triple = Number(histogram?.[`T${number}`]) || 0;
    return {
      number,
      single,
      double,
      triple,
      total: single + double + triple,
    };
  });

  const bulls = {
    single: Number(histogram?.SB) || 0,
    double: Number(histogram?.DB) || 0,
    total: (Number(histogram?.SB) || 0) + (Number(histogram?.DB) || 0),
  };

  const totalHits =
    segments.reduce((sum, segment) => sum + segment.total, 0) + bulls.single + bulls.double;

  return {
    segments,
    bulls,
    totalHits,
    maxSingle: Math.max(...segments.map((segment) => segment.single), 0) || 1,
    maxDouble: Math.max(...segments.map((segment) => segment.double), 0) || 1,
    maxTriple: Math.max(...segments.map((segment) => segment.triple), 0) || 1,
    maxTotal: Math.max(...segments.map((segment) => segment.total), 0) || 1,
    maxBullSingle: Math.max(bulls.single, 0) || 1,
    maxBullDouble: Math.max(bulls.double, 0) || 1,
  };
}

function heatColor(ratio, [r, g, b]) {
  const clamped = Math.max(0, Math.min(1, ratio));
  const alpha = clamped === 0 ? 0.06 : 0.18 + clamped * 0.72;
  return `rgba(${r}, ${g}, ${b}, ${alpha.toFixed(2)})`;
}

function polarCoordinate(radius, angle, center) {
  return `${center + radius * Math.cos(angle)},${center + radius * Math.sin(angle)}`;
}

function ringPath(innerRadius, outerRadius, startAngle, endAngle, center) {
  const largeArcFlag = endAngle - startAngle > Math.PI ? 1 : 0;
  const outerStart = polarCoordinate(outerRadius, startAngle, center);
  const outerEnd = polarCoordinate(outerRadius, endAngle, center);
  const innerEnd = polarCoordinate(innerRadius, endAngle, center);
  const innerStart = polarCoordinate(innerRadius, startAngle, center);
  return `M ${outerStart} A ${outerRadius} ${outerRadius} 0 ${largeArcFlag} 1 ${outerEnd} L ${innerEnd} A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 0 ${innerStart} Z`;
}

function generateProfileHeatmapMarkup(profile) {
  const histogram = profile?.stats?.dartHistogram;
  if (!histogram) return "";

  const data = aggregateHistogramData(histogram);
  if (!data.totalHits) return "";

  const center = 120;
  const segmentAngle = (Math.PI * 2) / DARTBOARD_NUMBER_ORDER.length;
  const baseAngle = -Math.PI / 2;

  const singleOuterInner = 74;
  const singleOuterOuter = 108;
  const singleInnerInner = 34;
  const singleInnerOuter = 58;
  const tripleInner = 58;
  const tripleOuter = 74;
  const doubleInner = 108;
  const doubleOuter = 118;

  const segmentsMarkup = [];

  data.segments.forEach((segment, index) => {
    const start = baseAngle + index * segmentAngle;
    const end = start + segmentAngle;

    const totalRatio = segment.total / data.maxTotal;
    const doubleRatio = segment.double / data.maxDouble;
    const tripleRatio = segment.triple / data.maxTriple;

    const singleColor = heatColor(totalRatio, HEATMAP_COLORS.total);
    const doubleColor = heatColor(doubleRatio, HEATMAP_COLORS.double);
    const tripleColor = heatColor(tripleRatio, HEATMAP_COLORS.triple);

    const outerSinglePath = ringPath(singleOuterInner, singleOuterOuter, start, end, center);
    const innerSinglePath = ringPath(singleInnerInner, singleInnerOuter, start, end, center);
    const triplePath = ringPath(tripleInner, tripleOuter, start, end, center);
    const doublePath = ringPath(doubleInner, doubleOuter, start, end, center);

    segmentsMarkup.push(
      `<path class="board-segment single" data-number="${segment.number}" fill="${singleColor}" d="${outerSinglePath}" />`
    );
    segmentsMarkup.push(
      `<path class="board-segment single" data-number="${segment.number}" fill="${singleColor}" d="${innerSinglePath}" />`
    );
    segmentsMarkup.push(
      `<path class="board-segment triple" data-number="${segment.number}" fill="${tripleColor}" d="${triplePath}" />`
    );
    segmentsMarkup.push(
      `<path class="board-segment double" data-number="${segment.number}" fill="${doubleColor}" d="${doublePath}" />`
    );
  });

  const singleBullColor = heatColor(data.bulls.single / data.maxBullSingle, HEATMAP_COLORS.total);
  const doubleBullColor = heatColor(data.bulls.double / data.maxBullDouble, HEATMAP_COLORS.bull);

  const svgMarkup = `
    <svg class="profile-dartboard" viewBox="0 0 240 240" role="img" aria-label="Heatmap der Wurftreffer">
      <circle class="board-background" cx="${center}" cy="${center}" r="118" />
      ${segmentsMarkup.join("\n")}
      <circle class="board-bull sb" cx="${center}" cy="${center}" r="16" fill="${singleBullColor}" />
      <circle class="board-bull db" cx="${center}" cy="${center}" r="6" fill="${doubleBullColor}" />
      <circle class="board-outline" cx="${center}" cy="${center}" r="118" />
    </svg>
  `;

  const legendMarkup = `
    <div class="heatmap-legend">
      <span class="heatmap-legend-item"><span class="heatmap-swatch singles"></span>Singles</span>
      <span class="heatmap-legend-item"><span class="heatmap-swatch doubles"></span>Doubles</span>
      <span class="heatmap-legend-item"><span class="heatmap-swatch triples"></span>Triples</span>
      <span class="heatmap-legend-item"><span class="heatmap-swatch bulls"></span>Bull</span>
      <span class="heatmap-legend-item total">Treffer insgesamt: ${data.totalHits}</span>
    </div>
  `;

  return `
    <div class="profile-heatmap">
      <span class="profile-heatmap-title">Trefferheatmap</span>
      ${svgMarkup}
      ${legendMarkup}
    </div>
  `;
}

function ensureProfileStats(profile) {
  profile.stats = profile.stats || {};
  profile.stats.gamesPlayed = profile.stats.gamesPlayed || 0;
  profile.stats.legsWon = profile.stats.legsWon || 0;
  profile.stats.setsWon = profile.stats.setsWon || 0;
  profile.stats.totalPoints = profile.stats.totalPoints || 0;
  profile.stats.totalDarts = profile.stats.totalDarts || 0;
  profile.stats.dartHistogram = cloneHistogram(profile.stats.dartHistogram);
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


