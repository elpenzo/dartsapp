const DEFAULT_STARTING_SCORE = 501;
const DEFAULT_OUT_MODE = "single";
const MAX_DARTS_PER_TURN = 3;
const MULTIPLIER_CONFIG = {
  1: { label: "Single", short: "S", isDouble: false },
  2: { label: "Double", short: "D", isDouble: true },
  3: { label: "Triple", short: "T", isDouble: false },
};
const DART_NUMBER_SEQUENTIAL_ORDER = Array.from({ length: 21 }, (_, index) => index);
const DART_NUMBER_ADJACENT_ORDER = [
  0,
  1,
  20,
  5,
  12,
  9,
  14,
  11,
  8,
  16,
  7,
  19,
  3,
  17,
  2,
  15,
  10,
  6,
  13,
  4,
  18,
];
const DART_NUMBER_ORDERS = {
  sequential: DART_NUMBER_SEQUENTIAL_ORDER,
  adjacent: DART_NUMBER_ADJACENT_ORDER,
};
const DARTBOARD_NUMBERS = [20, 1, 18, 4, 13, 6, 10, 15, 2, 17, 3, 19, 7, 16, 8, 11, 14, 9, 12, 5];
const HOT_NUMBER_BASE_ORDER = DARTBOARD_NUMBERS.slice();
const CLOCKWISE_AROUND_ORDER = buildBoardAroundOrder(true);
const COUNTER_AROUND_ORDER = buildBoardAroundOrder(false);
const NUMERIC_AROUND_ORDER = Array.from({ length: 20 }, (_, index) => index + 1);
const OUT_MODE_LABELS = {
  double: "Double Out",
  single: "Single Out",
};
const AROUND_THE_CLOCK_TARGETS = [
  ...Array.from({ length: 20 }, (_, index) => index + 1),
  "SB",
];
const TRAINING_121_BASE_TARGET = 121;
const TRAINING_121_MAX_DARTS = 9;
const TRAINING_121_PENALTY = 10;
const TRAINING_VARIANTS = {
  boardClockwise: {
    id: "boardClockwise",
    label: "Rundlauf linksrum",
    build: () => CLOCKWISE_AROUND_ORDER.slice(),
  },
  boardCounter: {
    id: "boardCounter",
    label: "Rundlauf rechtsrum",
    build: () => COUNTER_AROUND_ORDER.slice(),
  },
  numeric: {
    id: "numeric",
    label: "Numerisch 1-20",
    build: () => NUMERIC_AROUND_ORDER.slice(),
  },
};
const TRAINING_MODES = {
  around: {
    id: "around",
    label: "Around the Clock",
    description:
      "Triff jede Zahl von 1 bis 20 und beende mit Single Bull.",
    supportsVariants: true,
  },
  game121: {
    id: "game121",
    label: "121 Game",
    description:
      "Checkout-Challenge: Starte bei 121 Punkten, erledige das Leg in bis zu 9 Darts. Erfolg erhöht das Ziel, ein Fehlschlag zieht 10 Punkte ab.",
    supportsVariants: false,
  },
};
const TRAINING_PLAYER_CONFIGS = [
  {
    slot: 0,
    fallback: "Spieler A",
    profileSelectKey: "trainingPlayerOneProfileSelect",
    inputKey: "trainingPlayerOneInput",
  },
  {
    slot: 1,
    fallback: "Spieler B",
    profileSelectKey: "trainingPlayerTwoProfileSelect",
    inputKey: "trainingPlayerTwoInput",
  },
];
const LEG_WIN_AUDIO_TRACKS_URL = "data/leg-win-tracks.json";

function buildBoardAroundOrder(clockwise = true) {
  const startIndex = DARTBOARD_NUMBERS.indexOf(1);
  const sequence = [];
  for (let offset = 0; offset < DARTBOARD_NUMBERS.length; offset += 1) {
    const index = clockwise
      ? (startIndex + offset) % DARTBOARD_NUMBERS.length
      : (startIndex - offset + DARTBOARD_NUMBERS.length) % DARTBOARD_NUMBERS.length;
    sequence.push(DARTBOARD_NUMBERS[index]);
  }
  return sequence;
}

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
  dartboardPicker: document.getElementById("dartboard-picker"),
  dartNumberGrid: document.getElementById("dart-number-grid"),
  dartNumberOrderButtons: Array.from(document.querySelectorAll(".dart-number-order-btn")),
  template: document.getElementById("scoreboard-item-template"),
  trainingCard: document.querySelector(".training-card"),
  trainingModeSelect: document.getElementById("training-mode"),
  trainingVariantSelect: document.getElementById("training-variant"),
  trainingVariantField: document.getElementById("training-variant-field"),
  trainingStartBtn: document.getElementById("training-start"),
  trainingResetBtn: document.getElementById("training-reset"),
  trainingStatusMessage: document.getElementById("training-status-message"),
  trainingModeLabel: document.getElementById("training-mode-label"),
  trainingDescription: document.getElementById("training-description"),
  trainingPlayerContainers: Array.from(document.querySelectorAll(".training-player")),
  trainingPlayerProfiles: Array.from(document.querySelectorAll(".training-player-profile")),
  trainingPlayerNameInputs: Array.from(document.querySelectorAll(".training-player-name")),
  trainingPlayerHitButtons: Array.from(document.querySelectorAll(".training-hit-btn")),
  trainingPlayerMissButtons: Array.from(document.querySelectorAll(".training-miss-btn")),
  trainingPlayerOneProfileSelect: document.getElementById("training-player-1-profile"),
  trainingPlayerTwoProfileSelect: document.getElementById("training-player-2-profile"),
  trainingPlayerOneInput: document.getElementById("training-player-1-name"),
  trainingPlayerTwoInput: document.getElementById("training-player-2-name"),
  startingScoreSelect: document.getElementById("starting-score"),
  outModeSelect: document.getElementById("out-mode"),
  matchModeSelect: document.getElementById("match-mode"),
  playerOneProfileSelect: document.getElementById("player-one-profile"),
  playerTwoProfileSelect: document.getElementById("player-two-profile"),
  playerThreeProfileSelect: document.getElementById("player-three-profile"),
  playerFourProfileSelect: document.getElementById("player-four-profile"),
  playerOneInput: document.getElementById("player-one"),
  playerTwoInput: document.getElementById("player-two"),
  playerThreeInput: document.getElementById("player-three"),
  playerFourInput: document.getElementById("player-four"),
  gameSettings: document.getElementById("game-settings"),
  activePlayerBanner: document.getElementById("active-player-banner"),
  scoreboardCard: document.querySelector(".scoreboard"),
  scoreboardHeatmap: document.getElementById("scoreboard-heatmap"),
  scoreboardInsights: document.getElementById("scoreboard-insights"),
  hotNumberGrid: document.getElementById("hot-number-grid"),
  hotNumberMeta: document.getElementById("hot-number-meta"),
  hotBoardModeButtons: Array.from(document.querySelectorAll(".hot-board-mode-btn")),
  hotBoardButtons: [],
  undoBtn: document.getElementById("undo-btn"),
  dartModeSwitch: document.querySelector(".dart-mode-switch"),
  dartModeButtons: Array.from(document.querySelectorAll(".dart-mode-button")),
  dartNumberButtons: Array.from(document.querySelectorAll(".dart-number")),
  comboButtons: Array.from(document.querySelectorAll(".combo-button")),
  viewToggleButtons: Array.from(document.querySelectorAll(".view-toggle-btn")),
  mainMenu: document.getElementById("main-menu"),
  mainMenuTrigger: document.getElementById("main-menu-trigger"),
  layoutToggleButtons: Array.from(document.querySelectorAll(".layout-toggle-btn")),
  themeToggleBtn: document.getElementById("theme-toggle"),
  rematchBtn: document.getElementById("rematch-btn"),
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
  profileExportBtn: document.getElementById("profile-export"),
  profileImportBtn: document.getElementById("profile-import"),
  profileImportInput: document.getElementById("profile-import-file"),
  profileStorageSelect: document.getElementById("profile-storage-select"),
  profileStorageIndicator: document.getElementById("profile-storage-indicator"),
  chaseAudioPlayBtn: document.getElementById("chase-audio-play-btn"),
  chaseAudio: document.getElementById("chase-audio"),
  anthemPlayBtn: document.getElementById("anthem-play-btn"),
  anthemAudio: document.getElementById("anthem-audio"),
  dartsAudioPlayBtn: document.getElementById("darts-audio-play-btn"),
  dartsAudio: document.getElementById("darts-audio"),
  profileDataStatus: document.getElementById("profile-data-status"),
  leaderboardCard: document.querySelector(".leaderboard-card"),
  leaderboardSortButtons: Array.from(document.querySelectorAll(".leaderboard-sort-btn")),
  leaderboardBody: document.getElementById("leaderboard-body"),
  leaderboardEmpty: document.getElementById("leaderboard-empty"),
};

const trainingPlayerUi = new Map();
if (Array.isArray(elements.trainingPlayerContainers)) {
  elements.trainingPlayerContainers.forEach((container) => {
    if (!container || typeof container.dataset.trainingSlot === "undefined") return;
    const slot = Number(container.dataset.trainingSlot);
    if (!Number.isFinite(slot)) return;
    trainingPlayerUi.set(slot, {
      container,
      title: container.querySelector('[data-role="player-title"]'),
      profileSelect: container.querySelector(".training-player-profile"),
      nameInput: container.querySelector(".training-player-name"),
      targetLabel: container.querySelector('[data-role="target-label"]'),
      targetMeta: container.querySelector('[data-role="target-meta"]'),
      targetGrid: container.querySelector('[data-role="target-grid"]'),
      progressTitle: container.querySelector('[data-role="progress-title"]'),
      progressLabel: container.querySelector('[data-role="progress-label"]'),
      dartsLabel: container.querySelector('[data-role="darts-label"]'),
      durationLabel: container.querySelector('[data-role="duration-label"]'),
      historyList: container.querySelector('[data-role="history"]'),
      hitButton: container.querySelector(".training-hit-btn"),
      missButton: container.querySelector(".training-miss-btn"),
    });
  });
}

const PLAYER_SLOTS = [
  {
    slot: 1,
    fieldName: "playerOne",
    fallback: "Player 1",
    optional: false,
    selectKey: "playerOneProfileSelect",
    inputKey: "playerOneInput",
  },
  {
    slot: 2,
    fieldName: "playerTwo",
    fallback: "Player 2",
    optional: false,
    selectKey: "playerTwoProfileSelect",
    inputKey: "playerTwoInput",
  },
  {
    slot: 3,
    fieldName: "playerThree",
    fallback: "Player 3",
    optional: true,
    selectKey: "playerThreeProfileSelect",
    inputKey: "playerThreeInput",
  },
  {
    slot: 4,
    fieldName: "playerFour",
    fallback: "Player 4",
    optional: true,
    selectKey: "playerFourProfileSelect",
    inputKey: "playerFourInput",
  },
];

function forEachPlayerSlot(callback) {
  PLAYER_SLOTS.forEach((config) => {
    const select = elements[config.selectKey];
    const input = elements[config.inputKey];
    callback(config, select, input);
  });
}

function getPlayerSlotConfig(slot) {
  return PLAYER_SLOTS.find((config) => config.slot === slot) || null;
}

function forEachTrainingPlayer(callback) {
  TRAINING_PLAYER_CONFIGS.forEach((config) => {
    const select = elements[config.profileSelectKey];
    const input = elements[config.inputKey];
    callback(config, select, input);
  });
}

function getTrainingPlayerConfig(slot) {
  return TRAINING_PLAYER_CONFIGS.find((config) => config.slot === slot) || null;
}

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

function createTrainingPlayerState(config = {}) {
  const slot = Number.isFinite(Number(config.slot)) ? Number(config.slot) : 0;
  const fallback = typeof config.fallback === "string" && config.fallback.trim()
    ? config.fallback.trim()
    : `Spieler ${slot + 1}`;
  const customHistory = { around: [], game121: [] };
  return {
    slot,
    name: fallback,
    profileId: "",
    active: false,
    completed: false,
    startTime: null,
    lastDurationMs: 0,
    darts: 0,
    hits: 0,
    currentIndex: 0,
    currentTarget: TRAINING_121_BASE_TARGET,
    bestTarget: TRAINING_121_BASE_TARGET,
    attemptDarts: 0,
    attempts: 0,
    successes: 0,
    history: customHistory,
    customHistory,
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
  dartNumberOrder: "sequential",
  hotBoardMode: "live",
  hotBoardLockedOrder: null,
  hotBoardLockedPlayerId: null,
  lastHotNumberOrder: HOT_NUMBER_BASE_ORDER.slice(),
  training: {
    mode: "around",
    variant: "boardClockwise",
    active: false,
    players: TRAINING_PLAYER_CONFIGS.map((config) => createTrainingPlayerState(config)),
  },
  viewMode: "setup",
  layoutMode: "auto",
  theme: "light",
  themePreference: null,
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
  lastGameConfig: null,
  lastRematchConfig: null,
};

let profiles = [];
let pendingProfileImage = null;
let editingProfileId = null;
const PROFILES_API_URL = "/api/profiles";
const PROFILE_STORAGE_INFO_URL = "/api/profile-storage";
const LAYOUT_MODE_STORAGE_KEY = "friendDartLayoutMode";
const VALID_LAYOUT_MODES = ["auto", "desktop", "mobile"];
const THEME_STORAGE_KEY = "friendDartTheme";
const VALID_THEMES = ["light", "dark"];
let pendingServerSync = null;
let serverSyncDisabled = false;
let profileStorageInfo = null;
let suppressProfileStorageChange = false;
const audioPlaybackErrors = new Set();
let legWinAudioClips = [];
let legWinAudioLoadingPromise = null;
let lastLegWinClipIndex = -1;
let systemThemeMediaQuery = null;
let systemThemeChangeHandler = null;

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

function playAudioClip(audioElement, errorKey) {
  if (!audioElement) return;
  try {
    audioElement.currentTime = 0;
    const playPromise = audioElement.play();
    if (playPromise && typeof playPromise.catch === "function") {
      playPromise.catch((error) => {
        if (!audioPlaybackErrors.has(errorKey)) {
          audioPlaybackErrors.add(errorKey);
          console.warn("Sound konnte nicht abgespielt werden:", error);
        }
      });
    }
  } catch (error) {
    if (!audioPlaybackErrors.has(errorKey)) {
      audioPlaybackErrors.add(errorKey);
      console.warn("Sound konnte nicht abgespielt werden:", error);
    }
  }
}

function playChaseAudio() {
  playAudioClip(elements.chaseAudio, "chase");
}

function playAnthemAudio() {
  playAudioClip(elements.anthemAudio, "anthem");
}

function playDartsAudio() {
  playAudioClip(elements.dartsAudio, "darts");
}

function celebrateBigScore(total) {
  if (!Number.isFinite(total)) {
    return;
  }
  if (total >= 100) {
    playAnthemAudio();
  } else if (total > 60) {
    playChaseAudio();
  }
}

function normalizeLegWinAudioEntry(entry) {
  if (typeof entry === "string") {
    return entry.trim();
  }
  if (entry && typeof entry === "object" && typeof entry.src === "string") {
    return entry.src.trim();
  }
  return "";
}

function createLegWinAudioClip(entry, index) {
  const source = normalizeLegWinAudioEntry(entry);
  if (!source || typeof Audio !== "function") {
    return null;
  }
  try {
    const audio = new Audio();
    audio.preload = "auto";
    audio.src = source;
    const clipId =
      entry && typeof entry === "object" && entry.id
        ? String(entry.id)
        : `clip-${index + 1}`;
    const sanitizedId = clipId.trim().toLowerCase().replace(/\s+/g, "-") || `clip-${index + 1}`;
    return {
      id: sanitizedId,
      source,
      audio,
      errorKey: `leg-win-${sanitizedId}`,
    };
  } catch (error) {
    console.warn("Leg-Win Sound konnte nicht initialisiert werden:", error);
    return null;
  }
}

function loadLegWinAudioClips() {
  if (legWinAudioClips.length) {
    return Promise.resolve(legWinAudioClips);
  }
  if (legWinAudioLoadingPromise) {
    return legWinAudioLoadingPromise;
  }
  if (typeof fetch !== "function") {
    return Promise.resolve(legWinAudioClips);
  }
  legWinAudioLoadingPromise = fetch(LEG_WIN_AUDIO_TRACKS_URL, { cache: "no-store" })
    .then((response) => {
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      return response.json();
    })
    .then((payload) => {
      if (!Array.isArray(payload)) {
        legWinAudioClips = [];
        return legWinAudioClips;
      }
      legWinAudioClips = payload
        .map((entry, index) => createLegWinAudioClip(entry, index))
        .filter(Boolean);
      return legWinAudioClips;
    })
    .catch((error) => {
      console.warn("Leg-Win Sounds konnten nicht geladen werden:", error);
      legWinAudioClips = [];
      return legWinAudioClips;
    })
    .finally(() => {
      legWinAudioLoadingPromise = null;
    });
  return legWinAudioLoadingPromise;
}

function playLegWinCelebrationAudio() {
  if (!legWinAudioClips.length) return;
  const clipCount = legWinAudioClips.length;
  let index = Math.floor(Math.random() * clipCount);
  if (clipCount > 1 && index === lastLegWinClipIndex) {
    index = (index + 1) % clipCount;
  }
  lastLegWinClipIndex = index;
  const clip = legWinAudioClips[index];
  if (clip?.audio) {
    playAudioClip(clip.audio, clip.errorKey || clip.id || `leg-win-${index}`);
  }
}

function triggerLegWinCelebrationAudio() {
  if (legWinAudioClips.length) {
    playLegWinCelebrationAudio();
    return;
  }
  loadLegWinAudioClips().then(() => {
    playLegWinCelebrationAudio();
  });
}

function getDefaultProfileStorageInfo() {
  return {
    mode: "file",
    label: "Lokale Datei (profiles.json)",
    options: [{ mode: "file", label: "Lokale Datei (profiles.json)" }],
  };
}

function applyProfileStorageInfo(info) {
  const normalized = (() => {
    if (!info || typeof info !== "object") {
      return getDefaultProfileStorageInfo();
    }
    const options =
      Array.isArray(info.options) && info.options.length
        ? info.options
        : getDefaultProfileStorageInfo().options;
    const mode = info.mode && options.some((option) => option.mode === info.mode) ? info.mode : options[0].mode;
    const activeOption = options.find((option) => option.mode === mode);
    return {
      mode,
      label: info.label || activeOption?.label || getDefaultProfileStorageInfo().label,
      description: info.description || activeOption?.description || "",
      options,
    };
  })();

  profileStorageInfo = normalized;

  if (elements.profileStorageIndicator) {
    elements.profileStorageIndicator.textContent = `Quelle: ${normalized.label}`;
  }

  if (elements.profileStorageSelect) {
    suppressProfileStorageChange = true;
    elements.profileStorageSelect.innerHTML = "";
    normalized.options.forEach((option) => {
      const optionElement = document.createElement("option");
      optionElement.value = option.mode;
      optionElement.textContent = option.label;
      elements.profileStorageSelect.appendChild(optionElement);
    });
    if (!normalized.options.length) {
      const optionElement = document.createElement("option");
      optionElement.value = "";
      optionElement.textContent = "Keine Quelle verf\u00fcgbar";
      elements.profileStorageSelect.appendChild(optionElement);
      elements.profileStorageSelect.disabled = true;
    } else {
      elements.profileStorageSelect.disabled = normalized.options.length <= 1;
      elements.profileStorageSelect.value = normalized.mode;
    }
    suppressProfileStorageChange = false;
  }
}

async function refreshProfileStorageInfo(options = {}) {
  const { silent = false } = options;
  if (typeof fetch !== "function") {
    const fallback = getDefaultProfileStorageInfo();
    applyProfileStorageInfo(fallback);
    return fallback;
  }

  try {
    const response = await fetch(PROFILE_STORAGE_INFO_URL, { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`Serverantwort ${response.status}`);
    }
    const data = await response.json();
    applyProfileStorageInfo(data);
    if (!silent) {
      setProfileDataStatus("", `Profilbasis: ${profileStorageInfo.label}`);
    }
    return data;
  } catch (error) {
    console.warn("Profilbasis konnte nicht geladen werden:", error);
    const fallback = getDefaultProfileStorageInfo();
    applyProfileStorageInfo(fallback);
    if (!silent) {
      setProfileDataStatus("error", "Profilbasis konnte nicht vom Server geladen werden.");
    }
    return fallback;
  }
}

async function changeProfileStorageMode(mode) {
  if (typeof fetch !== "function") return null;
  const previousMode = profileStorageInfo?.mode || getDefaultProfileStorageInfo().mode;
  setProfileDataStatus("", "Profilbasis wird gewechselt \u2026");
  try {
    const response = await fetch(PROFILE_STORAGE_INFO_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode }),
    });
    if (!response.ok) {
      throw new Error(`Serverantwort ${response.status}`);
    }
    const data = await response.json();
    applyProfileStorageInfo(data);
    setProfileDataStatus("success", `Profilbasis: ${profileStorageInfo.label}`);
    await reloadProfilesFromServer();
    return data;
  } catch (error) {
    console.error("Profilbasis konnte nicht gewechselt werden:", error);
    setProfileDataStatus("error", "Profilbasis konnte nicht gewechselt werden.");
    if (elements.profileStorageSelect) {
      suppressProfileStorageChange = true;
      elements.profileStorageSelect.value = previousMode;
      suppressProfileStorageChange = false;
    }
    applyProfileStorageInfo(profileStorageInfo || getDefaultProfileStorageInfo());
    throw error;
  }
}

async function onProfileStorageSelectChange(event) {
  if (suppressProfileStorageChange) return;
  const mode = event.target.value;
  if (!mode || mode === profileStorageInfo?.mode) return;
  try {
    await changeProfileStorageMode(mode);
  } catch (_error) {
    // Fehler wurden bereits gemeldet.
  }
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
  triggerLegWinCelebrationAudio();
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
    prepareRematchConfig();
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
  if (elements.mainMenuTrigger && elements.mainMenu) {
    elements.mainMenuTrigger.addEventListener("click", () => toggleMainMenu());
  }
  if (elements.layoutToggleButtons.length) {
    elements.layoutToggleButtons.forEach((button) => {
      button.addEventListener("click", () => setLayoutMode(button.dataset.layout || "auto"));
    });
  }
  initializeTheme();
  if (elements.hotBoardModeButtons?.length) {
    elements.hotBoardModeButtons.forEach((button) => {
      button.addEventListener("click", () => setHotBoardMode(button.dataset.mode || "live"));
    });
    updateHotBoardModeButtons();
  }
  if (elements.hotNumberGrid) {
    elements.hotNumberGrid.addEventListener("click", onHotNumberGridClick);
  }
  if (elements.trainingStartBtn) {
    elements.trainingStartBtn.addEventListener("click", () => startTrainingSession());
  }
  if (elements.trainingResetBtn) {
    elements.trainingResetBtn.addEventListener("click", () => resetTrainingSession());
  }
  if (elements.trainingPlayerHitButtons.length) {
    elements.trainingPlayerHitButtons.forEach((button) => {
      const slot = Number(button.dataset.trainingSlot);
      if (!Number.isFinite(slot)) return;
      button.addEventListener("click", () => handleTrainingHitForSlot(slot));
    });
  }
  if (elements.trainingPlayerMissButtons.length) {
    elements.trainingPlayerMissButtons.forEach((button) => {
      const slot = Number(button.dataset.trainingSlot);
      if (!Number.isFinite(slot)) return;
      button.addEventListener("click", () => handleTrainingMissForSlot(slot));
    });
  }
  if (elements.trainingModeSelect) {
    elements.trainingModeSelect.addEventListener("change", (event) =>
      setTrainingMode(event.target.value)
    );
  }
  if (elements.trainingVariantSelect) {
    elements.trainingVariantSelect.addEventListener("change", (event) =>
      setTrainingVariant(event.target.value)
    );
  }
  if (elements.trainingPlayerProfiles.length) {
    elements.trainingPlayerProfiles.forEach((select) => {
      select.addEventListener("change", () => {
        const slot = getTrainingSlotFromElement(select);
        if (slot == null) return;
        handleTrainingProfileSelection(slot);
      });
    });
  }
  if (elements.trainingPlayerNameInputs.length) {
    elements.trainingPlayerNameInputs.forEach((input) => {
      input.addEventListener("input", () => handleTrainingNameInput(input));
      input.addEventListener("blur", () => handleTrainingNameBlur(input));
    });
  }
  initializeTrainingPlayers();
  forEachTrainingPlayer((config) => {
    handleTrainingProfileSelection(config.slot, { silent: true });
  });
  setTrainingMessage("Starte das Training, um deine Runde zu tracken.");
  renderTrainingView();
  restoreLayoutModePreference();
  window.addEventListener("resize", closeMainMenu);
  window.addEventListener("orientationchange", closeMainMenu);
  if (elements.rematchBtn) {
    elements.rematchBtn.addEventListener("click", () => restartMatchWithSameSettings());
  }
  setRematchVisibility(false);
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
  if (elements.dartboardPicker) {
    elements.dartboardPicker.addEventListener("click", onDartboardPickerClick);
  }
  if (elements.dartModeSwitch) {
    elements.dartModeSwitch.addEventListener("click", onDartModeClick);
  }
  if (elements.comboButtons.length) {
    elements.comboButtons.forEach((button) => {
      button.addEventListener("click", () => applyCombo(button.dataset.combo));
    });
  }
  if (elements.dartNumberOrderButtons?.length) {
    elements.dartNumberOrderButtons.forEach((button) => {
      button.addEventListener("click", () => setDartNumberOrder(button.dataset.order || "sequential"));
    });
  }
  if (elements.leaderboardSortButtons.length) {
    elements.leaderboardSortButtons.forEach((button) => {
      button.addEventListener("click", () => setLeaderboardSort(button.dataset.sort || "average"));
    });
  }
  forEachPlayerSlot(({ fallback, optional }, select, input) => {
    if (select && input) {
      select.addEventListener("change", () =>
        handleProfileSelection(select, input, optional ? "" : fallback)
      );
    }
  });
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
  if (elements.profileExportBtn) {
    elements.profileExportBtn.addEventListener("click", onProfileExportClick);
  }
  if (elements.profileImportBtn) {
    elements.profileImportBtn.addEventListener("click", onProfileImportClick);
  }
  if (elements.profileImportInput) {
    elements.profileImportInput.addEventListener("change", onProfileImportFileChange);
  }
  if (elements.profileStorageSelect) {
    elements.profileStorageSelect.addEventListener("change", onProfileStorageSelectChange);
  }
  if (elements.chaseAudioPlayBtn) {
    elements.chaseAudioPlayBtn.addEventListener("click", () => playChaseAudio());
  }
  if (elements.anthemPlayBtn) {
    elements.anthemPlayBtn.addEventListener("click", () => playAnthemAudio());
  }
  if (elements.dartsAudioPlayBtn) {
    elements.dartsAudioPlayBtn.addEventListener("click", () => playDartsAudio());
  }

  await loadLegWinAudioClips();
  await refreshProfileStorageInfo({ silent: true });
  await reloadProfilesFromServer();

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

  const playerConfigs = PLAYER_SLOTS.map((config) =>
    createPlayerConfig(
      config.slot,
      formData,
      elements[config.selectKey],
      elements[config.inputKey],
      { fieldName: config.fieldName, fallbackName: config.fallback, optional: config.optional }
    )
  ).filter(Boolean);

  startGame(playerConfigs, startingScore, outMode, matchMode);
  setViewMode("play");
}

function startGame(
  playerConfigs,
  startingScore,
  outMode = DEFAULT_OUT_MODE,
  matchMode = DEFAULT_MATCH_MODE
) {
  const sanitizedConfigs = Array.isArray(playerConfigs)
    ? playerConfigs.filter((entry) => Boolean(entry))
    : [];
  if (sanitizedConfigs.length < 2) {
    window.alert("Bitte mindestens zwei Spieler festlegen, um ein Spiel zu starten.");
    return;
  }
  const configs = sanitizedConfigs.map((entry, index) => {
    if (typeof entry === "string") {
      return { name: entry.trim(), profileId: "" };
    }
    const normalizedName = (entry.name || entry.displayName || `Player ${index + 1}`).trim();
    return {
      ...entry,
      name: normalizedName,
      profileId: entry.profileId || "",
    };
  });

  if (!configs.length) {
    configs.push({ name: "Player 1", profileId: "" }, { name: "Player 2", profileId: "" });
  }

  gameState.lastGameConfig = {
    startingScore,
    outMode,
    matchMode,
    playerConfigs: configs.map((config) => ({
      name: config.name,
      profileId: config.profileId || "",
    })),
  };
  gameState.lastRematchConfig = null;
  setRematchVisibility(false);

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
      dartsThrownThisGame: 0,
      first12PointsThisGame: 0,
      first12DartsThisGame: 0,
      tripleHitsThisGame: 0,
      doubleHitsThisGame: 0,
      checkoutAttemptsThisGame: 0,
      checkoutHitsThisGame: 0,
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
  forEachPlayerSlot(({ fallback, optional }, select, input) => {
    if (select) {
      select.value = "";
    }
    if (input) {
      input.readOnly = false;
      input.classList.remove("read-only");
      if (optional) {
        input.value = "";
      } else {
        input.value = fallback;
      }
    }
    handleProfileSelection(select, input, optional ? "" : fallback);
  });
  if (elements.matchModeSelect) {
    elements.matchModeSelect.value = DEFAULT_MATCH_MODE;
  }
  const defaultConfigs = PLAYER_SLOTS.filter((config) => !config.optional).map((config) => ({
    name: elements[config.inputKey]
      ? elements[config.inputKey].value.trim() || config.fallback
      : config.fallback,
    profileId: "",
  }));
  startGame(defaultConfigs, DEFAULT_STARTING_SCORE, DEFAULT_OUT_MODE, DEFAULT_MATCH_MODE);
  elements.manualScoreInput.value = "";
  elements.lastUtterance.textContent = "-";
  elements.lastInterpretation.textContent = "-";
  resetProfileForm(true);
  disarmVoiceControl();
}

function createPlayerConfig(slot, formData, select, input, options = {}) {
  const { fieldName = `player${slot}`, fallbackName = `Player ${slot}`, optional = false } = options;
  const formValue = formData.get(fieldName);
  const inputValue = input ? input.value : "";
  const profileId = select?.value || "";
  const nameFromForm = (formValue || inputValue || "").toString().trim();
  const hasProfile = Boolean(profileId);
  const hasName = Boolean(nameFromForm);
  if (optional && !hasProfile && !hasName) {
    return null;
  }
  const finalName = hasName ? nameFromForm : fallbackName;
  return { slot, name: finalName, profileId };
}

function createNewTurn() {
  const player = gameState.players[gameState.activeIndex];
  if (!player) return null;
  clearHotNumberBoardLock();
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
    case "rematch":
      return restartMatchWithSameSettings({ announce: true });
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

function onHotNumberGridClick(event) {
  const button = event.target.closest(".hot-number-button");
  if (!button || !gameState.legActive) return;

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

function onDartboardPickerClick(event) {
  if (!gameState.legActive) return;
  const segment = event.target.closest("[data-dart-segment]");
  if (!segment || segment.hasAttribute("hidden")) return;

  const score = parseInt(segment.dataset.score || "0", 10);
  const multiplier = parseInt(segment.dataset.multiplier || "1", 10);
  const readable = segment.dataset.readable || segment.dataset.label || segment.textContent || "";
  const label = segment.dataset.label || readable || `${score}`;
  const isDouble = segment.dataset.double === "true";

  applyDart({
    type: "dart",
    readable,
    dart: {
      label,
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
    rematch: [
      "neues leg",
      "gleiche spieler",
      "gleiche einstellung",
      "rematch",
      "selbe reihenfolge",
      "restart",
    ],
    newGame: ["neues spiel", "neues match", "setup"],
  };

  if (containsCommand(input, commands.bust)) return { type: "bust", readable: "Bust" };
  if (containsCommand(input, commands.undo)) return { type: "undo", readable: "Rueckgaengig" };
  if (containsCommand(input, commands.rematch)) {
    return { type: "rematch", readable: "Rematch starten" };
  }
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
  const scoreBefore = player.score;
  const remaining = scoreBefore - dart.score;
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
  player.lastTurn = formatTurnPreview(gameState.currentTurn);
  recordDartHit(player, normalizedDart);
  recordDartAccuracyStats(player, normalizedDart);
  recordCheckoutStats(player, scoreBefore, remaining === 0);

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

  const scoreBefore = player.score;
  const remaining = scoreBefore - result.score;
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
  const manualDarts = Number(result.dartsCount) || 3;
  recordDartStats(player, result.score, manualDarts);
  recordCheckoutStats(player, scoreBefore, remaining === 0, manualDarts);

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
  clearHotNumberBoardLock();

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
  clearHotNumberBoardLock();
}

function pushHistory(turn, player, legWon = false) {
  const total = turn.darts.reduce((sum, dart) => sum + (dart.score || 0), 0);
  if (!turn.bust) {
    celebrateBigScore(total);
  }
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
      dartsThrownThisGame: player.dartsThrownThisGame || 0,
      first12PointsThisGame: player.first12PointsThisGame || 0,
      first12DartsThisGame: player.first12DartsThisGame || 0,
      tripleHitsThisGame: player.tripleHitsThisGame || 0,
      doubleHitsThisGame: player.doubleHitsThisGame || 0,
      checkoutAttemptsThisGame: player.checkoutAttemptsThisGame || 0,
      checkoutHitsThisGame: player.checkoutHitsThisGame || 0,
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
    hotBoardLockedOrder: gameState.hotBoardLockedOrder
      ? [...gameState.hotBoardLockedOrder]
      : null,
    hotBoardLockedPlayerId: gameState.hotBoardLockedPlayerId || null,
    lastHotNumberOrder: gameState.lastHotNumberOrder
      ? [...gameState.lastHotNumberOrder]
      : null,
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
      player.dartsThrownThisGame = snapshotPlayer.dartsThrownThisGame || 0;
      player.first12PointsThisGame = snapshotPlayer.first12PointsThisGame || 0;
      player.first12DartsThisGame = snapshotPlayer.first12DartsThisGame || 0;
      player.tripleHitsThisGame = snapshotPlayer.tripleHitsThisGame || 0;
      player.doubleHitsThisGame = snapshotPlayer.doubleHitsThisGame || 0;
      player.checkoutAttemptsThisGame = snapshotPlayer.checkoutAttemptsThisGame || 0;
      player.checkoutHitsThisGame = snapshotPlayer.checkoutHitsThisGame || 0;
      player.dartHitsThisGame = cloneHistogram(snapshotPlayer.dartHitsThisGame);
    }
  });
  gameState.history = lastSnapshot.history;
  gameState.currentTurn = lastSnapshot.currentTurn;
  gameState.hotBoardLockedOrder = lastSnapshot.hotBoardLockedOrder
    ? [...lastSnapshot.hotBoardLockedOrder]
    : null;
  gameState.hotBoardLockedPlayerId = lastSnapshot.hotBoardLockedPlayerId || null;
  gameState.lastHotNumberOrder =
    lastSnapshot.lastHotNumberOrder && lastSnapshot.lastHotNumberOrder.length
      ? [...lastSnapshot.lastHotNumberOrder]
      : HOT_NUMBER_BASE_ORDER.slice();
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
  return turn.darts.map((dart) => shortLabelForDart(dart)).join(" · ");
}

function findBestThreeDartTurn(turns) {
  if (!Array.isArray(turns)) return null;
  let best = null;

  turns.forEach((turn) => {
    if (!turn || turn.bust || !Array.isArray(turn.darts) || !turn.darts.length) {
      return;
    }

    const total = turn.darts.reduce(
      (sum, dart) => sum + (Number(dart?.score) || 0),
      0
    );
    const labels = turn.darts.map((dart) => shortLabelForDart(dart));
    const dartsUsed = turn.darts.length;

    if (
      !best ||
      total > best.total ||
      (total === best.total && dartsUsed > best.dartsUsed) ||
      (total === best.total && dartsUsed === best.dartsUsed && labels.join("|") < best.labels.join("|"))
    ) {
      best = { total, labels, dartsUsed };
    }
  });

  return best;
}

function formatTurnPreview(turn) {
  if (!turn || !Array.isArray(turn.darts) || !turn.darts.length) {
    return "-";
  }
  const labels = turn.darts.map((dart) => shortLabelForDart(dart));
  while (labels.length < MAX_DARTS_PER_TURN) {
    labels.push("–");
  }
  return labels.join(" · ");
}

function render() {
  renderScoreboard();
  renderHistory();
  updateUndoAvailability();
}

const MAX_DOUBLE_OUT_CHECKOUT = 170;
const MAX_SINGLE_OUT_CHECKOUT = 180;
const FIRST12_TRACKING_DARTS = 12;
const CHECKOUT_TRACKING_THRESHOLD = 170;
const CHECKOUT_SHOTS = createCheckoutShotCatalog();
const CHECKOUT_DOUBLE_SHOTS = CHECKOUT_SHOTS.filter((shot) => shot.isDouble);
const CHECKOUT_CACHE = new Map();

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
    const threeDartNode = fragment.querySelector(".player-three-dart");
    const lastNode = fragment.querySelector(".player-last");
    const setsNode = fragment.querySelector(".player-sets");
    const legsNode = fragment.querySelector(".player-legs");
    const checkoutNode = fragment.querySelector(".player-checkout");
    const checkoutWrapper = fragment.querySelector(".player-checkout-wrapper");
    const heatmapOverlay = fragment.querySelector(".player-card-heatmap");

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
    if (threeDartNode) {
      const dartsThrown = Number(player.totalDartsThisGame) || 0;
      const pointsScored = Number(player.totalPointsThisGame) || 0;
      const averageValue = dartsThrown > 0 ? pointsScored / dartsThrown : 0;
      threeDartNode.textContent = dartsThrown > 0 ? (averageValue * 3).toFixed(2) : "0.00";
    }
    if (heatmapOverlay) {
      const { svgMarkup } = generateHeatmapSvgMarkup(player.dartHitsThisGame);
      if (svgMarkup) {
        heatmapOverlay.innerHTML = svgMarkup;
        heatmapOverlay.hidden = false;
      } else {
        heatmapOverlay.innerHTML = "";
        heatmapOverlay.hidden = true;
      }
    }
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
  renderScoreboardInsights();
  renderHotNumberBoard();
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
    titleNode.textContent = `Trefferheatmap - ${displayName}`;
  }
}

function renderScoreboardInsights() {
  const container = elements.scoreboardInsights;
  if (!container) return;

  container.innerHTML = "";

  if (gameState.viewMode !== "play" || !gameState.players.length) {
    container.innerHTML =
      '<p class="scoreboard-insights-empty">Die Hot Numbers erscheinen, sobald ein Leg läuft.</p>';
    return;
  }

  const fragment = document.createDocumentFragment();
  let hasData = false;

  gameState.players.forEach((player) => {
    const card = document.createElement("article");
    card.className = "insights-card";

    const header = document.createElement("header");
    const title = document.createElement("h4");
    title.textContent = getPlayerDisplayName(player) || "Spieler";
    header.appendChild(title);

    const summary = summarizePlayerNumberInsights(player);
    const hotness = document.createElement("span");
    hotness.className = "insights-hotness";
    hotness.textContent =
      summary.totalHits > 0
        ? `${summary.totalHits} Treffer gesamt`
        : "Noch keine Daten";
    header.appendChild(hotness);
    card.appendChild(header);

    if (summary.totalHits === 0) {
      const empty = document.createElement("p");
      empty.className = "insights-card-empty";
      empty.textContent = "Noch keine Heatmap-Würfe.";
      card.appendChild(empty);
    } else {
      const chipWrapper = document.createElement("div");
      chipWrapper.className = "insights-number-chips";
      summary.topNumbers.forEach((entry) => {
        hasData = true;
        chipWrapper.appendChild(createInsightChipNode(entry, summary.totalHits));
      });
      if (summary.bullHits.total > 0) {
        hasData = true;
        chipWrapper.appendChild(
          createInsightChipNode(
            {
              label: "Bull",
              total: summary.bullHits.total,
              breakdownLabel: buildBullBreakdown(summary.bullHits),
            },
            summary.totalHits
          )
        );
      }
      card.appendChild(chipWrapper);
    }

    fragment.appendChild(card);
  });

  if (!hasData) {
    container.innerHTML =
      '<p class="scoreboard-insights-empty">Noch keine Würfe registriert.</p>';
    return;
  }

  container.appendChild(fragment);
}

function lockHotNumberBoard(playerId) {
  const source =
    Array.isArray(gameState.lastHotNumberOrder) && gameState.lastHotNumberOrder.length
      ? gameState.lastHotNumberOrder
      : HOT_NUMBER_BASE_ORDER;
  gameState.hotBoardLockedOrder = source.slice();
  gameState.hotBoardLockedPlayerId = playerId || null;
}

function clearHotNumberBoardLock() {
  gameState.hotBoardLockedOrder = null;
  gameState.hotBoardLockedPlayerId = null;
}

function renderHotNumberBoard() {
  const grid = elements.hotNumberGrid;
  if (!grid) return;
  const meta = elements.hotNumberMeta;
  const emptyMarkup = '<p class="hot-number-empty">Noch keine Würfe registriert.</p>';

  if (!gameState.players.length) {
    grid.innerHTML = emptyMarkup;
    if (meta) meta.textContent = "Hotboard benötigt mindestens einen Spieler.";
    return;
  }

  const fallbackPlayer = gameState.players[0];
  const activePlayer =
    gameState.players[gameState.activeIndex] || fallbackPlayer;
  if (!activePlayer) {
    grid.innerHTML = emptyMarkup;
    if (meta) meta.textContent = "Kein Spieler aktiv.";
    return;
  }

  const mode = gameState.hotBoardMode;
  const summary = summarizePlayerNumberInsights(activePlayer, { source: mode });
  const requestedHistory = mode === "history";
  const showingHistory = summary.source === "history";
  const currentMultiplier = gameState.dartMultiplier;
  const multiplierLabel =
    currentMultiplier === 2 ? "Double" : currentMultiplier === 3 ? "Triple" : "Single";
  const displayName = getPlayerDisplayName(activePlayer) || `Spieler ${gameState.activeIndex + 1}`;
  const boardData = computeHotNumberBoardData(summary, currentMultiplier);
  const modeHits = boardData.modeHits;
  const shareBase =
    modeHits ||
    getMultiplierTotal(summary, currentMultiplier) ||
    summary.totalHits ||
    0;

  if (meta) {
    if (requestedHistory && !showingHistory) {
      meta.textContent = summary.totalHits
        ? `Keine historischen Daten – zeige Live ${multiplierLabel}-Treffer von ${displayName}`
        : `Keine historischen Daten für ${displayName}.`;
    } else if (modeHits > 0) {
      meta.textContent = `${showingHistory ? "Historische" : "Live"} ${multiplierLabel}-Treffer (${modeHits}×) von ${displayName}`;
    } else if (summary.totalHits > 0) {
      meta.textContent = `Noch keine ${multiplierLabel}-Treffer – nutze ${showingHistory ? "historische" : "Live"} Reihenfolge für ${displayName}`;
    } else {
      meta.textContent = `Noch keine Würfe für ${displayName}.`;
    }
  }

  grid.innerHTML = "";
  const isTurnLocked =
    gameState.currentTurn &&
    gameState.currentTurn.playerId === activePlayer.id &&
    Array.isArray(gameState.currentTurn.darts) &&
    gameState.currentTurn.darts.length > 0;

  if (isTurnLocked) {
    if (
      !gameState.hotBoardLockedOrder ||
      gameState.hotBoardLockedPlayerId !== activePlayer.id
    ) {
      lockHotNumberBoard(activePlayer.id);
    }
  } else if (gameState.hotBoardLockedPlayerId === activePlayer.id) {
    clearHotNumberBoardLock();
  }

  const orderedNumbers =
    gameState.hotBoardLockedOrder && gameState.hotBoardLockedPlayerId === activePlayer.id
      ? gameState.hotBoardLockedOrder.slice()
      : boardData.order.length
        ? boardData.order.slice()
        : HOT_NUMBER_BASE_ORDER.slice();
  const multiplierConfig = MULTIPLIER_CONFIG[currentMultiplier] || MULTIPLIER_CONFIG[1];

  orderedNumbers.slice(0, 10).forEach((value) => {
    const stats = boardData.counts.get(value);
    grid.appendChild(
      createHotNumberButton(value, multiplierConfig, stats, shareBase, currentMultiplier)
    );
  });
  grid.appendChild(createHotSpecialButton("SB", 25, false, "Single Bull"));
  grid.appendChild(createHotSpecialButton("DB", 50, true, "Double Bull"));
  grid.appendChild(createHotSpecialButton("0", 0, false, "Nullwurf"));

  elements.hotBoardButtons = Array.from(grid.querySelectorAll(".hot-number-button"));
  setupDartSwipeGestures(elements.hotBoardButtons);
  gameState.lastHotNumberOrder = orderedNumbers.slice();
}

function computeHotNumberBoardData(summary, multiplier) {
  const stats = summary.numberStats instanceof Map ? summary.numberStats : new Map();
  const order = HOT_NUMBER_BASE_ORDER.slice();
  let modeHits = 0;

  order.sort((a, b) => {
    const hitsA = scoreHotHits(stats.get(a), multiplier);
    const hitsB = scoreHotHits(stats.get(b), multiplier);
    if (hitsB !== hitsA) return hitsB - hitsA;
    return HOT_NUMBER_BASE_ORDER.indexOf(a) - HOT_NUMBER_BASE_ORDER.indexOf(b);
  });

  order.forEach((value) => {
    modeHits += scoreHotHits(stats.get(value), multiplier);
  });

  return {
    order,
    counts: stats,
    hasData: summary.totalHits > 0,
    modeHits,
  };
}

function scoreHotHits(entry, multiplier) {
  if (!entry) return 0;
  if (multiplier === 2) return entry?.double || 0;
  if (multiplier === 3) return entry?.triple || 0;
  return entry?.single || entry?.total || 0;
}

function getMultiplierTotal(summary, multiplier) {
  const totals = summary?.multiplierTotals;
  if (!totals) return 0;
  if (multiplier === 2) return totals.double || 0;
  if (multiplier === 3) return totals.triple || 0;
  return totals.single || 0;
}

function createHotNumberButton(baseValue, multiplierConfig, entry, totalHits, multiplier) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "dart-button hot-number-button";

  const score = baseValue * multiplier;
  const label = multiplier === 1 ? `${baseValue}` : `${multiplierConfig.short}${baseValue}`;
  const readable =
    multiplier === 1 ? `Single ${baseValue}` : `${multiplierConfig.label} ${baseValue}`;
  const isDouble = multiplier === 2;

  button.dataset.number = String(baseValue);
  button.dataset.label = label;
  button.dataset.readable = readable;
  button.dataset.score = String(score);
  button.dataset.multiplier = String(multiplier);
  button.dataset.double = String(isDouble);
  if (baseValue > 0) {
    button.dataset.swipeLeft = "\u2190 T";
    button.dataset.swipeRight = "D \u2192";
  } else {
    delete button.dataset.swipeLeft;
    delete button.dataset.swipeRight;
  }

  const abbr = document.createElement("span");
  abbr.className = "abbr";
  abbr.textContent = label;

  const valueSpan = document.createElement("span");
  valueSpan.className = "value";
  valueSpan.textContent = String(score);

  const meta = document.createElement("span");
  meta.className = "hot-number-meta";
  const hotHits = scoreHotHits(entry, multiplier);
  const share = hotHits > 0 && totalHits > 0 ? ` (${Math.round((hotHits / totalHits) * 100)}%)` : "";
  const prefix = multiplier === 2 ? "D" : multiplier === 3 ? "T" : "S";
  meta.textContent = hotHits > 0 ? `${hotHits}×${share}` : `${prefix}${baseValue}`;

  button.append(abbr, valueSpan, meta);
  return button;
}

function createHotSpecialButton(label, score, isDouble, readable) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "dart-button hot-number-button";
  button.dataset.label = label;
  button.dataset.readable = readable;
  button.dataset.score = String(score);
  button.dataset.multiplier = String(isDouble ? 2 : 1);
  button.dataset.double = String(isDouble);
  delete button.dataset.swipeLeft;
  delete button.dataset.swipeRight;

  const abbr = document.createElement("span");
  abbr.className = "abbr";
  abbr.textContent = label;

  const valueSpan = document.createElement("span");
  valueSpan.className = "value";
  valueSpan.textContent = String(score);

  const meta = document.createElement("span");
  meta.className = "hot-number-meta";
  meta.textContent = readable;

  button.append(abbr, valueSpan, meta);
  return button;
}

function summarizePlayerNumberInsights(player, options = {}) {
  const requestedSource = options.source === "history" ? "history" : "live";
  const profile = player?.profileId ? getProfileById(player.profileId) : null;
  const liveHistogram = player?.dartHitsThisGame || null;
  const historyHistogram = profile?.stats?.dartHistogram || null;

  const liveHasData = hasHistogramData(liveHistogram);
  const historyHasData = hasHistogramData(historyHistogram);

  let histogram = null;
  let sourceUsed = requestedSource;

  if (requestedSource === "history") {
    if (historyHasData) {
      histogram = historyHistogram;
    } else if (liveHasData) {
      histogram = liveHistogram;
      sourceUsed = "live";
    }
  } else {
    if (liveHasData) {
      histogram = liveHistogram;
    } else if (historyHasData) {
      histogram = historyHistogram;
      sourceUsed = "history";
    }
  }

  const summary = buildHistogramSummary(histogram);
  summary.source = histogram ? sourceUsed : requestedSource;
  summary.profileId = profile?.id || "";
  return summary;
}

function buildHistogramSummary(histogram) {
  const buckets = new Map();
  let totalHits = 0;
  let singleBull = 0;
  let doubleBull = 0;
  let singleTotal = 0;
  let doubleTotal = 0;
  let tripleTotal = 0;

  const applyEntry = (key, rawValue) => {
    const hits = Number(rawValue) || 0;
    if (!hits) return;
    if (key === "MISS") return;
    if (key === "SB") {
      singleBull += hits;
      totalHits += hits;
      singleTotal += hits;
      return;
    }
    if (key === "DB") {
      doubleBull += hits;
      totalHits += hits;
      doubleTotal += hits;
      return;
    }
    const prefix = key.charAt(0);
    const base = parseInt(key.slice(1), 10);
    if (!Number.isFinite(base) || base <= 0) return;
    totalHits += hits;
    const bucket =
      buckets.get(base) ||
      {
        label: `${base}`,
        number: base,
        single: 0,
        double: 0,
        triple: 0,
        total: 0,
      };
    bucket.total += hits;
    if (prefix === "S") {
      bucket.single += hits;
      singleTotal += hits;
    } else if (prefix === "D") {
      bucket.double += hits;
      doubleTotal += hits;
    } else if (prefix === "T") {
      bucket.triple += hits;
      tripleTotal += hits;
    }
    buckets.set(base, bucket);
  };

  if (histogram instanceof Map) {
    histogram.forEach((value, key) => applyEntry(key, value));
  } else if (histogram && typeof histogram === "object") {
    Object.entries(histogram).forEach(([key, rawValue]) => applyEntry(key, rawValue));
  }

  const topNumbers = Array.from(buckets.values())
    .sort((a, b) => {
      if (b.total !== a.total) return b.total - a.total;
      if (b.triple !== a.triple) return b.triple - a.triple;
      if (b.double !== a.double) return b.double - a.double;
      return a.number - b.number;
    })
    .slice(0, 4);

  return {
    topNumbers,
    totalHits,
    bullHits: {
      sb: singleBull,
      db: doubleBull,
      total: singleBull + doubleBull,
    },
    multiplierTotals: {
      single: singleTotal,
      double: doubleTotal,
      triple: tripleTotal,
    },
    numberStats: buckets,
  };
}

function hasHistogramData(histogram) {
  if (!histogram) return false;
  if (histogram instanceof Map) {
    for (const value of histogram.values()) {
      if (Number(value) > 0) return true;
    }
    return false;
  }
  return Object.values(histogram).some((value) => Number(value) > 0);
}

function createInsightChipNode(entry, totalHits) {
  const chip = document.createElement("div");
  chip.className = "insights-chip";

  const title = document.createElement("strong");
  const share = totalHits > 0 ? Math.round((entry.total / totalHits) * 100) : 0;
  const titleParts = [`${entry.label || entry.number || "-"}`];
  if (entry.total) {
    titleParts.push(`${entry.total} Treffer`);
  }
  if (share) {
    titleParts.push(`${share}%`);
  }
  title.textContent = titleParts.join(" · ");

  const detail = document.createElement("span");
  detail.textContent = entry.breakdownLabel || buildInsightBreakdownLabel(entry);

  chip.appendChild(title);
  chip.appendChild(detail);
  return chip;
}

function buildInsightBreakdownLabel(entry) {
  const parts = [];
  if (entry.triple) parts.push(`T${entry.triple}`);
  if (entry.double) parts.push(`D${entry.double}`);
  if (entry.single) parts.push(`S${entry.single}`);
  if (!parts.length) {
    return "Variiert";
  }
  return parts.join(" · ");
}

function buildBullBreakdown(bullHits) {
  const parts = [];
  if (bullHits.sb) parts.push(`SB ${bullHits.sb}`);
  if (bullHits.db) parts.push(`DB ${bullHits.db}`);
  return parts.join(" · ") || "Bull";
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

function normalizeDartPickerMode(order) {
  if (order === "dartboard") return "dartboard";
  if (typeof order === "string" && DART_NUMBER_ORDERS[order]) return order;
  return "sequential";
}

function updateDartNumberOrderButtons() {
  if (!elements.dartNumberOrderButtons?.length) return;
  elements.dartNumberOrderButtons.forEach((button) => {
    const targetOrder = button.dataset.order || "sequential";
    const isActive = targetOrder === gameState.dartNumberOrder;
    button.classList.toggle("active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  });
}

function setDartNumberOrder(order) {
  const normalized = normalizeDartPickerMode(order);
  if (gameState.dartNumberOrder === normalized) return;
  gameState.dartNumberOrder = normalized;
  updateDartNumberOrderButtons();
  updateDartPickerView();
}

function setHotBoardMode(mode) {
  const normalized = mode === "history" ? "history" : "live";
  if (gameState.hotBoardMode === normalized) return;
  gameState.hotBoardMode = normalized;
  updateHotBoardModeButtons();
  renderHotNumberBoard();
}

function updateHotBoardModeButtons() {
  elements.hotBoardModeButtons?.forEach((button) => {
    const target = button.dataset.mode === "history" ? "history" : "live";
    const isActive = target === gameState.hotBoardMode;
    button.classList.toggle("active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  });
}

function renderDartNumberButtons() {
  const container = elements.dartNumberGrid;
  if (!container) return;
  container.innerHTML = "";

  const order = DART_NUMBER_ORDERS[gameState.dartNumberOrder] || DART_NUMBER_ORDERS.sequential;
  order.forEach((value) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "dart-button dart-number";
    button.dataset.number = String(value);

    const valueNode = document.createElement("span");
    valueNode.className = "value";
    valueNode.textContent = String(value);
    button.appendChild(valueNode);

    container.appendChild(button);
  });

  elements.dartNumberButtons = Array.from(container.querySelectorAll(".dart-number"));
}

function renderDartboardPicker() {
  const container = elements.dartboardPicker;
  if (!container || container.dataset.rendered === "true") return;

  const svgNS = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(svgNS, "svg");
  svg.setAttribute("viewBox", "-210 -210 420 420");
  svg.setAttribute("role", "group");
  svg.setAttribute("aria-label", "Virtuelles Dartboard");

  const background = document.createElementNS(svgNS, "circle");
  background.setAttribute("cx", "0");
  background.setAttribute("cy", "0");
  background.setAttribute("r", "206");
  background.setAttribute("fill", "#0f172a");
  svg.appendChild(background);

  const doubleColors = ["#d64045", "#4ca16b"];
  const tripleColors = ["#d64045", "#4ca16b"];
  const singleColors = ["#1f2937", "#15202b"];
  const innerSingleColors = ["#273447", "#1c2433"];

  const radii = {
    doubleOuter: 200,
    doubleInner: 173,
    singleOuterOuter: 171,
    singleOuterInner: 113,
    tripleOuter: 111,
    tripleInner: 93,
    singleInnerOuter: 91,
    singleInnerInner: 45,
    outerBull: 20,
    innerBull: 7,
  };

  const segmentAngle = 360 / DARTBOARD_NUMBERS.length;
  const halfAngle = segmentAngle / 2;

  DARTBOARD_NUMBERS.forEach((number, index) => {
    const startAngle = -halfAngle + index * segmentAngle;
    const endAngle = startAngle + segmentAngle;
    const colorIndex = index % 2;

    const segments = [
      {
        ring: ["doubleOuter", "doubleInner"],
        fill: doubleColors[colorIndex],
        className: "dartboard-segment double",
        multiplier: 2,
        readable: `Double ${number}`,
        label: `D${number}`,
      },
      {
        ring: ["singleOuterOuter", "singleOuterInner"],
        fill: singleColors[colorIndex],
        className: "dartboard-segment single outer",
        multiplier: 1,
        readable: `Single ${number}`,
        label: `S${number}`,
      },
      {
        ring: ["tripleOuter", "tripleInner"],
        fill: tripleColors[colorIndex],
        className: "dartboard-segment triple",
        multiplier: 3,
        readable: `Triple ${number}`,
        label: `T${number}`,
      },
      {
        ring: ["singleInnerOuter", "singleInnerInner"],
        fill: innerSingleColors[colorIndex],
        className: "dartboard-segment single inner",
        multiplier: 1,
        readable: `Single ${number}`,
        label: `S${number}`,
      },
    ];

    segments.forEach(({ ring, fill, className, multiplier, readable, label }) => {
      const [outerKey, innerKey] = ring;
      const path = document.createElementNS(svgNS, "path");
      path.setAttribute("d", createRingPath(radii[outerKey], radii[innerKey], startAngle, endAngle));
      path.setAttribute("fill", fill);
      path.setAttribute("class", className);
      path.dataset.dartSegment = "true";
      path.dataset.number = String(number);
      path.dataset.multiplier = String(multiplier);
      path.dataset.score = String(number * multiplier);
      path.dataset.label = label;
      path.dataset.readable = readable;
      path.dataset.double = String(multiplier === 2);
      svg.appendChild(path);
    });
  });

  const outerBull = document.createElementNS(svgNS, "circle");
  outerBull.setAttribute("cx", "0");
  outerBull.setAttribute("cy", "0");
  outerBull.setAttribute("r", String(radii.outerBull));
  outerBull.setAttribute("class", "dartboard-bull outer");
  outerBull.setAttribute("fill", "#438767");
  outerBull.dataset.dartSegment = "true";
  outerBull.dataset.number = "25";
  outerBull.dataset.multiplier = "1";
  outerBull.dataset.score = "25";
  outerBull.dataset.label = "SB";
  outerBull.dataset.readable = "Single Bull";
  outerBull.dataset.double = "false";
  svg.appendChild(outerBull);

  const innerBull = document.createElementNS(svgNS, "circle");
  innerBull.setAttribute("cx", "0");
  innerBull.setAttribute("cy", "0");
  innerBull.setAttribute("r", String(radii.innerBull));
  innerBull.setAttribute("class", "dartboard-bull inner");
  innerBull.setAttribute("fill", "#d64045");
  innerBull.dataset.dartSegment = "true";
  innerBull.dataset.number = "25";
  innerBull.dataset.multiplier = "2";
  innerBull.dataset.score = "50";
  innerBull.dataset.label = "DB";
  innerBull.dataset.readable = "Double Bull";
  innerBull.dataset.double = "true";
  svg.appendChild(innerBull);

  const numbersGroup = document.createElementNS(svgNS, "g");
  numbersGroup.setAttribute("class", "dartboard-numbers");

  DARTBOARD_NUMBERS.forEach((number, index) => {
    const angle = index * segmentAngle;
    const { x, y } = polarToCartesian(189, angle);
    const text = document.createElementNS(svgNS, "text");
    text.setAttribute("x", x.toFixed(2));
    text.setAttribute("y", y.toFixed(2));
    text.setAttribute("dy", "6");
    text.textContent = String(number);
    numbersGroup.appendChild(text);
  });

  svg.appendChild(numbersGroup);
  container.appendChild(svg);
  container.dataset.rendered = "true";
}

function updateDartPickerView() {
  const isBoard = gameState.dartNumberOrder === "dartboard";
  if (elements.dartNumberGrid) {
    elements.dartNumberGrid.hidden = isBoard;
    if (isBoard) {
      elements.dartNumberGrid.innerHTML = "";
      elements.dartNumberButtons = [];
    }
  }
  if (elements.dartboardPicker) {
    elements.dartboardPicker.hidden = !isBoard;
  }
  elements.dartPicker?.classList.toggle("board-mode", isBoard);

  if (isBoard) {
    renderDartboardPicker();
  } else {
    renderDartNumberButtons();
    updateDartNumberButtons();
    setupDartSwipeGestures();
  }
}

function polarToCartesian(radius, angleDegrees) {
  const angleRadians = ((angleDegrees - 90) * Math.PI) / 180;
  return {
    x: radius * Math.cos(angleRadians),
    y: radius * Math.sin(angleRadians),
  };
}

function createRingPath(outerRadius, innerRadius, startAngle, endAngle) {
  const outerStart = polarToCartesian(outerRadius, startAngle);
  const outerEnd = polarToCartesian(outerRadius, endAngle);
  const innerStart = polarToCartesian(innerRadius, endAngle);
  const innerEnd = polarToCartesian(innerRadius, startAngle);

  return [
    "M",
    outerStart.x.toFixed(3),
    outerStart.y.toFixed(3),
    "A",
    outerRadius.toFixed(3),
    outerRadius.toFixed(3),
    "0",
    "0",
    "1",
    outerEnd.x.toFixed(3),
    outerEnd.y.toFixed(3),
    "L",
    innerStart.x.toFixed(3),
    innerStart.y.toFixed(3),
    "A",
    innerRadius.toFixed(3),
    innerRadius.toFixed(3),
    "0",
    "0",
    "0",
    innerEnd.x.toFixed(3),
    innerEnd.y.toFixed(3),
    "Z",
  ].join(" ");
}

function initializeDartPicker() {
  gameState.dartMultiplier = MULTIPLIER_CONFIG[gameState.dartMultiplier] ? gameState.dartMultiplier : 1;
  updateDartModeButtons();
  updateDartNumberOrderButtons();
  updateDartPickerView();
}

function setDartMultiplier(multiplier) {
  if (gameState.dartMultiplier === multiplier || !MULTIPLIER_CONFIG[multiplier]) return;
  gameState.dartMultiplier = multiplier;
  updateDartModeButtons();
  updateDartNumberButtons();
  renderHotNumberBoard();
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
  if (gameState.dartNumberOrder === "dartboard") return;
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

function setupDartSwipeGestures(buttons = elements.dartNumberButtons) {
  if (!buttons?.length) return;
  buttons.forEach((button) => {
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

function accumulateFirst12Stats(player, points, dartsCount) {
  if (!player) return;
  const currentDarts = player.first12DartsThisGame || 0;
  const capacity = Math.max(0, FIRST12_TRACKING_DARTS - currentDarts);
  if (capacity <= 0 || dartsCount <= 0) return;
  const dartsApplied = Math.min(capacity, dartsCount);
  const pointsPerDart = dartsCount > 0 ? points / dartsCount : 0;
  player.first12PointsThisGame = (player.first12PointsThisGame || 0) + pointsPerDart * dartsApplied;
  player.first12DartsThisGame = currentDarts + dartsApplied;
}

function recordDartAccuracyStats(player, dart) {
  if (!player || !dart) return;
  const multiplier = Number(dart.multiplier) || 1;
  if (multiplier === 3) {
    player.tripleHitsThisGame = (player.tripleHitsThisGame || 0) + 1;
  } else if (multiplier === 2) {
    player.doubleHitsThisGame = (player.doubleHitsThisGame || 0) + 1;
  }
}

function recordCheckoutStats(player, scoreBefore, didCheckout, dartsUsed = 1) {
  if (!player || scoreBefore == null) return;
  if (scoreBefore > CHECKOUT_TRACKING_THRESHOLD) return;
  player.checkoutAttemptsThisGame = (player.checkoutAttemptsThisGame || 0) + (dartsUsed || 1);
  if (didCheckout) {
    player.checkoutHitsThisGame = (player.checkoutHitsThisGame || 0) + 1;
  }
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
  player.dartsThrownThisGame = (player.dartsThrownThisGame || 0) + normalizedDarts;
  accumulateFirst12Stats(player, normalizedPoints, normalizedDarts);
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
    profile.stats.first12Points = (profile.stats.first12Points || 0) + (player.first12PointsThisGame || 0);
    profile.stats.first12Darts = (profile.stats.first12Darts || 0) + (player.first12DartsThisGame || 0);
    profile.stats.tripleHits = (profile.stats.tripleHits || 0) + (player.tripleHitsThisGame || 0);
    profile.stats.doubleHits = (profile.stats.doubleHits || 0) + (player.doubleHitsThisGame || 0);
    profile.stats.checkoutAttempts =
      (profile.stats.checkoutAttempts || 0) + (player.checkoutAttemptsThisGame || 0);
    profile.stats.checkoutHits =
      (profile.stats.checkoutHits || 0) + (player.checkoutHitsThisGame || 0);
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
      first12Average:
        player.first12DartsThisGame > 0
          ? Number((player.first12PointsThisGame / player.first12DartsThisGame).toFixed(2))
          : 0,
      checkoutAttempts: player.checkoutAttemptsThisGame || 0,
      checkoutHits: player.checkoutHitsThisGame || 0,
      tripleHits: player.tripleHitsThisGame || 0,
      doubleHits: player.doubleHitsThisGame || 0,
      dartHistogram: entryHistogram,
    };

    const bestTurn = findBestThreeDartTurn(player.history);
    if (bestTurn) {
      entry.bestTurn = {
        total: bestTurn.total,
        darts: bestTurn.labels,
        dartsUsed: bestTurn.dartsUsed,
      };

      const previousBest = profile.stats.bestThreeDartSet || {};
      const previousBestTotal = Number(previousBest.total) || 0;
      const previousBestDarts = Number(previousBest.dartsUsed) || (Array.isArray(previousBest.darts) ? previousBest.darts.length : 0);
      if (
        bestTurn.total > previousBestTotal ||
        (bestTurn.total === previousBestTotal && bestTurn.dartsUsed > previousBestDarts)
      ) {
        profile.stats.bestThreeDartSet = {
          total: bestTurn.total,
          darts: bestTurn.labels,
          dartsUsed: bestTurn.dartsUsed,
          date: entry.date,
        };
      }
    }

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
  const allowedViews = ["setup", "play", "training", "tournament", "profiles", "leaderboard"];
  const normalized = allowedViews.includes(view) ? view : "setup";
  if (gameState.viewMode === normalized) {
    updateViewModeUI();
    closeMainMenu();
    return;
  }
  gameState.viewMode = normalized;
  updateViewModeUI();
  if (normalized === "play") {
    requestAnimationFrame(() => {
      elements.scoreboardCard?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  } else if (normalized === "training") {
    requestAnimationFrame(() => {
      elements.trainingCard?.scrollIntoView({ behavior: "smooth", block: "start" });
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
  document.body.classList.toggle("training-view", currentView === "training");
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
  } else if (currentView === "training") {
    if (elements.trainingCard) {
      elements.trainingCard.hidden = false;
    }
    renderTrainingView();
  } else if (currentView === "tournament") {
    renderTournamentBracket();
  } else if (currentView === "leaderboard") {
    renderLeaderboard();
  }
  if (elements.trainingCard && currentView !== "training") {
    elements.trainingCard.hidden = true;
  }
  closeMainMenu();
}

function getTrainingPlayerUi(slot) {
  return trainingPlayerUi.get(slot) || null;
}

function getTrainingPlayerState(slot) {
  return gameState.training.players.find((player) => player.slot === slot) || null;
}

function ensureTrainingHistoryContainer(container) {
  const history = container && typeof container === "object" ? container : {};
  if (!Array.isArray(history.around)) {
    history.around = [];
  }
  if (!Array.isArray(history.game121)) {
    history.game121 = [];
  }
  return history;
}

function ensureTrainingPlayerStateShape(player) {
  if (!player) return;
  player.history = ensureTrainingHistoryContainer(player.history);
  player.customHistory = ensureTrainingHistoryContainer(player.customHistory);
}

function getTrainingSlotFromElement(element) {
  const container = element?.closest?.(".training-player");
  if (!container) return null;
  const slot = Number(container.dataset.trainingSlot);
  return Number.isFinite(slot) ? slot : null;
}

function syncTrainingPlayerTitle(slot) {
  const player = getTrainingPlayerState(slot);
  const ui = getTrainingPlayerUi(slot);
  const fallback = getTrainingPlayerConfig(slot)?.fallback || `Spieler ${slot + 1}`;
  const name = player?.name?.trim() || fallback;
  if (ui?.title) {
    ui.title.textContent = name;
  }
}

function cloneTrainingHistory(entries, mode) {
  if (!Array.isArray(entries)) return [];
  return entries
    .filter((entry) => entry && typeof entry === "object" && entry.mode === mode)
    .slice(0, 10)
    .map((entry) => ({
      id: typeof entry.id === "string" && entry.id ? entry.id : uid(),
      mode: entry.mode,
      label: typeof entry.label === "string" ? entry.label : TRAINING_MODES[entry.mode]?.label || "",
      darts: Number(entry.darts) || 0,
      durationMs: Number(entry.durationMs) || 0,
      finishedAt: Number(entry.finishedAt) || Date.now(),
      targets: Number(entry.targets) || 0,
      meta: entry.meta && typeof entry.meta === "object" ? { ...entry.meta } : {},
      variant: typeof entry.variant === "string" ? entry.variant : undefined,
      playerName: typeof entry.playerName === "string" ? entry.playerName : undefined,
    }));
}

function loadProfileTrainingHistoryIntoPlayer(player, profile) {
  if (!player || !profile) return;
  ensureProfileTrainingData(profile);
  player.history = {
    around: cloneTrainingHistory(profile.trainingHistory, TRAINING_MODES.around.id),
    game121: cloneTrainingHistory(profile.trainingHistory, TRAINING_MODES.game121.id),
  };
}

function initializeTrainingPlayers() {
  forEachTrainingPlayer((config, select, input) => {
    const player = getTrainingPlayerState(config.slot);
    if (!player) return;
    ensureTrainingPlayerStateShape(player);
    player.customHistory = ensureTrainingHistoryContainer(player.customHistory);
    if (!player.profileId) {
      player.history = player.customHistory;
    }
    const fallback = config.fallback;
    const currentName = input?.value?.trim();
    if (currentName) {
      player.name = currentName;
    } else if (!player.name) {
      player.name = fallback;
      if (input) {
        input.value = fallback;
      }
    }
    syncTrainingPlayerTitle(config.slot);
    if (select) {
      select.value = player.profileId || "";
    }
  });
}

function updateTrainingSessionActiveState() {
  const someoneActive = gameState.training.players.some(
    (player) => player.active && !player.completed
  );
  if (!someoneActive) {
    gameState.training.active = false;
  }
}

function createTrainingHistoryEntry(player, base) {
  return {
    id: uid(),
    playerName: player?.name,
    ...base,
    meta: base.meta ? { ...base.meta } : {},
  };
}

function getTrainingModeConfig(mode = gameState.training.mode) {
  return TRAINING_MODES[mode] || TRAINING_MODES.around;
}

function getTrainingTargets(mode = gameState.training.mode) {
  const variantId = gameState.training.variant || "boardClockwise";
  const variant = TRAINING_VARIANTS[variantId] || TRAINING_VARIANTS.boardClockwise;
  const base = typeof variant.build === "function" ? variant.build() : AROUND_THE_CLOCK_TARGETS.slice();
  const targets = base.slice();
  if (!targets.includes("SB")) {
    targets.push("SB");
  }
  return targets;
}

function describeTrainingTarget(target, variant = "long") {
  if (typeof target === "number") {
    return variant === "short" ? `${target}` : `Zahl ${target}`;
  }
  if (target === "SB") {
    return variant === "short" ? "SB" : "Single Bull";
  }
  if (target === "DB") {
    return variant === "short" ? "DB" : "Double Bull";
  }
  return String(target);
}

function setTrainingMessage(message, tone = "info") {
  if (!elements.trainingStatusMessage) return;
  elements.trainingStatusMessage.textContent = message;
  if (tone && tone !== "info") {
    elements.trainingStatusMessage.dataset.tone = tone;
  } else {
    delete elements.trainingStatusMessage.dataset.tone;
  }
}

function setTrainingMode(mode) {
  const config = TRAINING_MODES[mode];
  if (!config) return;
  if (gameState.training.mode === config.id) {
    if (elements.trainingModeSelect) {
      elements.trainingModeSelect.value = config.id;
    }
    return;
  }
  gameState.training.mode = config.id;
  resetTrainingSession({ silent: true, skipHistory: true });
  setTrainingMessage(`${config.label} bereit. Klicke auf Training starten.`);
  renderTrainingView();
}

function setTrainingVariant(variant) {
  const config = getTrainingModeConfig();
  if (!config.supportsVariants) return;
  if (!TRAINING_VARIANTS[variant]) return;
  if (gameState.training.variant === variant) return;
  gameState.training.variant = variant;
  resetTrainingSession();
  setTrainingMessage(`Variante: ${TRAINING_VARIANTS[variant].label} gewählt.`);
  if (elements.trainingVariantSelect) {
    elements.trainingVariantSelect.value = variant;
  }
  renderTrainingView();
}

function resetTrainingPlayerState(player, mode = gameState.training.mode) {
  if (!player) return;
  ensureTrainingPlayerStateShape(player);
  player.active = false;
  player.completed = false;
  player.startTime = null;
  player.lastDurationMs = 0;
  player.darts = 0;
  player.hits = 0;
  player.currentIndex = 0;
  player.attemptDarts = 0;
  player.attempts = 0;
  player.successes = 0;
  if (mode === TRAINING_MODES.game121.id) {
    player.currentTarget = TRAINING_121_BASE_TARGET;
    player.bestTarget = TRAINING_121_BASE_TARGET;
  } else {
    player.currentTarget = null;
    player.bestTarget = TRAINING_121_BASE_TARGET;
  }
}

function startTrainingSession(mode = gameState.training.mode) {
  const config = getTrainingModeConfig(mode);
  gameState.training.mode = config.id;
  const now = Date.now();
  gameState.training.active = true;
  gameState.training.players.forEach((player) => {
    resetTrainingPlayerState(player, config.id);
    player.active = true;
    player.startTime = now;
  });
  setTrainingMessage(`Training gestartet: ${config.label}`);
  renderTrainingView();
}

function resetTrainingSession(options = {}) {
  const { silent = false, skipHistory = false } = options;
  const wasActive = gameState.training.active;
  const config = getTrainingModeConfig();
  if (wasActive && config.id === TRAINING_MODES.game121.id && !skipHistory) {
    gameState.training.players.forEach((player) => finalize121SessionForPlayer(player));
  }
  gameState.training.active = false;
  gameState.training.players.forEach((player) => {
    resetTrainingPlayerState(player, config.id);
  });
  if (!silent) {
    setTrainingMessage(wasActive ? "Training gestoppt." : "Training zurückgesetzt.");
  }
  renderTrainingView();
}

function ensureTrainingSessionActive() {
  if (gameState.training.active) {
    return true;
  }
  setTrainingMessage("Starte zuerst das Training.", "warning");
  return false;
}

function handleTrainingMissForSlot(slot) {
  if (!ensureTrainingSessionActive()) return;
  const player = getTrainingPlayerState(slot);
  if (!player) return;
  if (player.completed) {
    setTrainingMessage(`${player.name} hat die Session bereits beendet.`, "warning");
    return;
  }
  const mode = getTrainingModeConfig().id;
  if (mode === TRAINING_MODES.game121.id) {
    handle121MissForPlayer(player);
  } else {
    handleAroundMissForPlayer(player);
  }
  renderTrainingView();
}

function handleTrainingHitForSlot(slot) {
  if (!ensureTrainingSessionActive()) return;
  const player = getTrainingPlayerState(slot);
  if (!player) return;
  if (player.completed) {
    setTrainingMessage(`${player.name} hat die Session bereits beendet.`, "warning");
    return;
  }
  const config = getTrainingModeConfig();
  if (config.id === TRAINING_MODES.game121.id) {
    handle121HitForPlayer(player);
  } else {
    const targets = getTrainingTargets(config.id);
    handleAroundHitForPlayer(player, config, targets);
  }
  renderTrainingView();
}

function handleAroundMissForPlayer(player) {
  player.darts += 1;
  setTrainingMessage(`${player.name}: Weiter geht's - Ziel noch offen.`);
}

function handleAroundHitForPlayer(player, config, targets) {
  const totalTargets = targets.length;
  if (!totalTargets) return;
  player.darts += 1;
  player.currentIndex = Math.min(player.currentIndex + 1, totalTargets);
  player.hits = Math.min(player.currentIndex, totalTargets);
  if (player.currentIndex >= totalTargets) {
    player.completed = true;
    player.active = false;
    const durationMs = player.startTime ? Math.max(0, Date.now() - player.startTime) : 0;
    player.lastDurationMs = durationMs;
    const entry = createTrainingHistoryEntry(player, {
      mode: config.id,
      label: config.label,
      darts: player.darts,
      durationMs,
      finishedAt: Date.now(),
      targets: totalTargets,
      meta: {
        variant: TRAINING_VARIANTS[gameState.training.variant]?.label || null,
      },
    });
    recordTrainingEntryForPlayer(player, entry);
    setTrainingMessage(`${player.name}: Alle ${totalTargets} Ziele in ${entry.darts} Darts erledigt!`, "success");
    updateTrainingSessionActiveState();
  } else {
    const nextTarget = targets[player.currentIndex];
    setTrainingMessage(`${player.name}: Weiter mit ${describeTrainingTarget(nextTarget)}.`);
  }
}

function handle121MissForPlayer(player) {
  player.darts += 1;
  player.attemptDarts += 1;
  const remaining = Math.max(0, TRAINING_121_MAX_DARTS - player.attemptDarts);
  if (remaining <= 0) {
    register121FailureForPlayer(player);
  } else {
    setTrainingMessage(`${player.name}: Noch ${remaining} Darts für ${player.currentTarget}.`);
  }
}

function handle121HitForPlayer(player) {
  player.darts += 1;
  player.attemptDarts += 1;
  player.attempts += 1;
  player.successes += 1;
  const finishedTarget = player.currentTarget || TRAINING_121_BASE_TARGET;
  player.bestTarget = Math.max(player.bestTarget || TRAINING_121_BASE_TARGET, finishedTarget);
  const dartsUsed = player.attemptDarts;
  player.currentTarget = finishedTarget + 1;
  player.attemptDarts = 0;
  setTrainingMessage(`${player.name}: Checkout ${finishedTarget} geschafft in ${dartsUsed} Darts!`, "success");
}

function register121FailureForPlayer(player) {
  const failedTarget = player.currentTarget || TRAINING_121_BASE_TARGET;
  player.attempts += 1;
  player.attemptDarts = 0;
  const nextTarget = Math.max(TRAINING_121_BASE_TARGET, failedTarget - TRAINING_121_PENALTY);
  player.currentTarget = nextTarget;
  setTrainingMessage(`${player.name}: Checkout ${failedTarget} verpasst - weiter mit ${nextTarget}.`, "warning");
}

function finalize121SessionForPlayer(player) {
  if (!player) return;
  if (!player.darts && !player.successes) {
    player.lastDurationMs = 0;
    return;
  }
  const durationMs = player.startTime ? Math.max(0, Date.now() - player.startTime) : player.lastDurationMs || 0;
  const entry = createTrainingHistoryEntry(player, {
    mode: TRAINING_MODES.game121.id,
    label: TRAINING_MODES.game121.label,
    darts: player.darts,
    durationMs,
    finishedAt: Date.now(),
    targets: player.bestTarget,
    meta: {
      bestTarget: player.bestTarget,
      currentTarget: player.currentTarget,
      attempts: player.attempts,
      successes: player.successes,
    },
  });
  recordTrainingEntryForPlayer(player, entry);
  player.lastDurationMs = durationMs;
}

function recordTrainingEntryForPlayer(player, entry) {
  if (!player || !entry) return;
  ensureTrainingPlayerStateShape(player);
  const mode = entry.mode;
  if (player.profileId) {
    if (!player.history || typeof player.history !== "object") {
      player.history = { around: [], game121: [] };
    }
    if (!Array.isArray(player.history[mode])) {
      player.history[mode] = [];
    }
    player.history[mode].unshift(entry);
    if (player.history[mode].length > 10) {
      player.history[mode].length = 10;
    }
    const profile = getProfileById(player.profileId);
    if (profile) {
      ensureProfileTrainingData(profile);
      const storedEntry = { ...entry, playerName: player.name };
      profile.trainingHistory.unshift(storedEntry);
      if (profile.trainingHistory.length > 50) {
        profile.trainingHistory.length = 50;
      }
      profile.updatedAt = Date.now();
      saveProfiles();
    }
  } else {
    player.customHistory = ensureTrainingHistoryContainer(player.customHistory);
    if (!Array.isArray(player.customHistory[mode])) {
      player.customHistory[mode] = [];
    }
    player.customHistory[mode].unshift(entry);
    if (player.customHistory[mode].length > 10) {
      player.customHistory[mode].length = 10;
    }
    player.history = player.customHistory;
  }
}

function renderTrainingView() {
  if (!elements.trainingCard) return;
  const config = getTrainingModeConfig();
  const is121Mode = config.id === TRAINING_MODES.game121.id;
  const targets = is121Mode ? [] : getTrainingTargets(config.id);
  const totalTargets = targets.length;

  if (elements.trainingDescription) {
    elements.trainingDescription.textContent = config.description || "";
  }
  if (elements.trainingModeLabel) {
    elements.trainingModeLabel.textContent = config.label;
  }
  if (elements.trainingModeSelect) {
    elements.trainingModeSelect.value = config.id;
  }
  if (elements.trainingVariantField) {
    elements.trainingVariantField.hidden = !config.supportsVariants;
  }
  if (elements.trainingVariantSelect) {
    elements.trainingVariantSelect.value = gameState.training.variant || "boardClockwise";
    elements.trainingVariantSelect.disabled = !config.supportsVariants;
  }

  gameState.training.players.forEach((player) => {
    renderTrainingPlayerView(player, {
      config,
      is121Mode,
      targets,
      totalTargets,
    });
  });
}

function renderTrainingPlayerView(player, context) {
  const ui = getTrainingPlayerUi(player.slot);
  if (!ui) return;
  syncTrainingPlayerTitle(player.slot);
  if (ui.profileSelect && ui.profileSelect.value !== (player.profileId || "")) {
    ui.profileSelect.value = player.profileId || "";
  }
  if (ui.nameInput && !player.profileId) {
    const fallback = getTrainingPlayerConfig(player.slot)?.fallback || `Spieler ${player.slot + 1}`;
    const desired = player.name || fallback;
    if (ui.nameInput.value !== desired) {
      ui.nameInput.value = desired;
    }
  }

  if (context.is121Mode) {
    if (ui.targetLabel) {
      ui.targetLabel.textContent = String(player.currentTarget || TRAINING_121_BASE_TARGET);
    }
    if (ui.targetMeta) {
      const remaining = Math.max(0, TRAINING_121_MAX_DARTS - player.attemptDarts);
      ui.targetMeta.textContent = `Noch ${remaining} Darts · Bestes Ziel ${player.bestTarget}`;
    }
    if (ui.progressTitle) {
      ui.progressTitle.textContent = "Bestes Ziel";
    }
    if (ui.progressLabel) {
      ui.progressLabel.textContent = `${player.bestTarget}`;
    }
    if (ui.targetGrid) {
      ui.targetGrid.hidden = true;
      ui.targetGrid.innerHTML = "";
    }
  } else {
    const currentIndex = Math.min(player.currentIndex, context.totalTargets);
    const nextTarget = context.targets[currentIndex] ?? null;
    if (ui.targetLabel) {
      if (player.completed || currentIndex >= context.totalTargets) {
        ui.targetLabel.textContent = "Geschafft!";
      } else if (nextTarget != null) {
        ui.targetLabel.textContent = describeTrainingTarget(nextTarget);
      } else {
        ui.targetLabel.textContent = "-";
      }
    }
    if (ui.targetMeta) {
      if (player.completed || currentIndex >= context.totalTargets) {
        ui.targetMeta.textContent = `Alle ${context.totalTargets} Ziele getroffen`;
      } else if (nextTarget != null) {
        const progress = Math.min(player.hits, context.totalTargets);
        ui.targetMeta.textContent = `Serie ${progress} / ${context.totalTargets}`;
      } else {
        ui.targetMeta.textContent = "";
      }
    }
    if (ui.progressTitle) {
      ui.progressTitle.textContent = "Fortschritt";
    }
    if (ui.progressLabel) {
      const progress = Math.min(player.hits, context.totalTargets);
      ui.progressLabel.textContent = `${progress} / ${context.totalTargets}`;
    }
    if (ui.targetGrid) {
      ui.targetGrid.hidden = false;
      renderTrainingTargetGrid(context.targets, currentIndex, ui.targetGrid);
    }
  }

  if (ui.dartsLabel) {
    ui.dartsLabel.textContent = String(player.darts);
  }
  if (ui.durationLabel) {
    const duration = player.active && player.startTime
      ? Math.max(0, Date.now() - player.startTime)
      : player.lastDurationMs || 0;
    ui.durationLabel.textContent = formatTrainingDuration(duration);
  }
  if (ui.hitButton) {
    ui.hitButton.disabled = !gameState.training.active || player.completed;
  }
  if (ui.missButton) {
    ui.missButton.disabled = !gameState.training.active || player.completed;
  }

  renderTrainingHistoryForPlayer(player, context.config.id, ui.historyList);
}

function renderTrainingTargetGrid(targets, currentIndex, container) {
  if (!container) return;
  container.innerHTML = "";
  const fragment = document.createDocumentFragment();
  targets.forEach((target, index) => {
    const node = document.createElement("span");
    node.className = "training-target";
    if (index < currentIndex) {
      node.classList.add("completed");
    } else if (index === currentIndex) {
      node.classList.add("active");
    }
    node.textContent = describeTrainingTarget(target, "short");
    fragment.appendChild(node);
  });
  container.appendChild(fragment);
}

function renderTrainingHistoryForPlayer(player, mode, listElement) {
  if (!listElement) return;
  ensureTrainingPlayerStateShape(player);
  const history = player.history?.[mode] || [];
  if (!history.length) {
    listElement.innerHTML =
      '<li class="training-history-empty">Noch keine Trainingseinheit gespeichert.</li>';
    return;
  }
  const fragment = document.createDocumentFragment();
  history.forEach((entry) => {
    const item = document.createElement("li");
    const heading = document.createElement("div");
    const title = document.createElement("strong");
    title.textContent = entry.label;
    heading.appendChild(title);
    const targetMeta = document.createElement("span");
    targetMeta.className = "training-history-meta";
    if (entry.mode === TRAINING_MODES.game121.id) {
      const best = entry.meta?.bestTarget ?? entry.targets;
      targetMeta.textContent = `Bestes Ziel ${best}`;
    } else {
      const variantLabel = entry.meta?.variant ? ` · ${entry.meta.variant}` : "";
      targetMeta.textContent = `${entry.targets} Ziele${variantLabel}`;
    }
    heading.appendChild(targetMeta);
    const meta = document.createElement("div");
    meta.className = "training-history-meta";
    const durationLabel = formatTrainingDuration(entry.durationMs || 0);
    const dateLabel = formatProfileDate(entry.finishedAt);
    const metaParts = [];
    if (entry.mode === TRAINING_MODES.game121.id) {
      const successes = entry.meta?.successes ?? 0;
      const attempts = entry.meta?.attempts ?? 0;
      metaParts.push(`${successes} Checkouts`);
      metaParts.push(`${attempts} Versuche`);
    }
    metaParts.push(`${entry.darts} Darts`);
    metaParts.push(durationLabel);
    if (dateLabel) {
      metaParts.push(dateLabel);
    }
    meta.textContent = metaParts.join(" · ");
    item.appendChild(heading);
    item.appendChild(meta);
    fragment.appendChild(item);
  });
  listElement.innerHTML = "";
  listElement.appendChild(fragment);
}

function handleTrainingProfileSelection(slot, options = {}) {
  const { silent = false } = options;
  const config = getTrainingPlayerConfig(slot);
  if (!config) return;
  const select = elements[config.profileSelectKey];
  const input = elements[config.inputKey];
  const player = getTrainingPlayerState(slot);
  if (!player) return;

  const fallback = config.fallback;
  const profileId = select?.value || "";
  player.profileId = profileId;

  if (profileId) {
    const profile = getProfileById(profileId);
    if (profile) {
      const displayName = getProfileDisplayName(profile);
      player.name = displayName || fallback;
      if (input) {
        input.value = player.name;
        input.readOnly = true;
        input.classList.add("read-only");
      }
      loadProfileTrainingHistoryIntoPlayer(player, profile);
    } else {
      player.profileId = "";
    }
  }

  if (!player.profileId) {
    if (input) {
      input.readOnly = false;
      input.classList.remove("read-only");
      if (!input.value.trim()) {
        input.value = fallback;
      }
      player.name = input.value.trim() || fallback;
    } else {
      player.name = fallback;
    }
    player.customHistory = ensureTrainingHistoryContainer(player.customHistory);
    player.history = player.customHistory;
  }

  syncTrainingPlayerTitle(slot);
  if (!silent) {
    renderTrainingView();
  }
}

function handleTrainingNameInput(element) {
  const slot = getTrainingSlotFromElement(element);
  if (slot == null) return;
  const player = getTrainingPlayerState(slot);
  if (!player || player.profileId) return;
  const config = getTrainingPlayerConfig(slot);
  const fallback = config?.fallback || `Spieler ${slot + 1}`;
  const value = element.value.trim();
  player.name = value || fallback;
  player.customHistory = ensureTrainingHistoryContainer(player.customHistory);
  player.history = player.customHistory;
  syncTrainingPlayerTitle(slot);
}

function handleTrainingNameBlur(element) {
  const slot = getTrainingSlotFromElement(element);
  if (slot == null) return;
  const player = getTrainingPlayerState(slot);
  if (!player || player.profileId) return;
  const config = getTrainingPlayerConfig(slot);
  const fallback = config?.fallback || `Spieler ${slot + 1}`;
  if (!element.value.trim()) {
    element.value = fallback;
    player.name = fallback;
    syncTrainingPlayerTitle(slot);
  }
}

function initializeTheme() {
  if (!document.body) return;
  const storedPreference = getStoredThemePreference();
  if (typeof window !== "undefined" && typeof window.matchMedia === "function") {
    systemThemeMediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
  }
  const prefersDark = systemThemeMediaQuery?.matches;
  const initialTheme = storedPreference || (prefersDark ? "dark" : "light");
  setTheme(initialTheme, { preference: storedPreference ? "manual" : null });
  if (elements.themeToggleBtn) {
    elements.themeToggleBtn.addEventListener("click", onThemeToggleClick);
  }
  if (systemThemeMediaQuery) {
    systemThemeChangeHandler = (event) => {
      if (gameState.themePreference === "manual") return;
      setTheme(event.matches ? "dark" : "light");
    };
    if (typeof systemThemeMediaQuery.addEventListener === "function") {
      systemThemeMediaQuery.addEventListener("change", systemThemeChangeHandler);
    } else if (typeof systemThemeMediaQuery.addListener === "function") {
      systemThemeMediaQuery.addListener(systemThemeChangeHandler);
    }
  }
  updateThemeToggleUI();
}

function setTheme(theme, options = {}) {
  const { persist = false, preference } = options;
  const normalized = VALID_THEMES.includes(theme) ? theme : "light";
  gameState.theme = normalized;
  if (Object.prototype.hasOwnProperty.call(options, "preference")) {
    gameState.themePreference = preference;
    if (preference !== "manual") {
      try {
        localStorage.removeItem(THEME_STORAGE_KEY);
      } catch (error) {
        console.warn("Themenpräferenz konnte nicht entfernt werden:", error);
      }
    }
  }
  if (document.body) {
    document.body.classList.remove("theme-light", "theme-dark");
    document.body.classList.add(normalized === "dark" ? "theme-dark" : "theme-light");
  }
  updateThemeToggleUI();
  if (persist) {
    try {
      localStorage.setItem(THEME_STORAGE_KEY, normalized);
    } catch (error) {
      console.warn("Themenpräferenz konnte nicht gespeichert werden:", error);
    }
  }
}

function onThemeToggleClick() {
  const nextTheme = gameState.theme === "dark" ? "light" : "dark";
  setTheme(nextTheme, { persist: true, preference: "manual" });
}

function updateThemeToggleUI() {
  if (!elements.themeToggleBtn) return;
  const isDark = gameState.theme === "dark";
  elements.themeToggleBtn.setAttribute("aria-pressed", String(isDark));
  elements.themeToggleBtn.dataset.theme = isDark ? "dark" : "light";
  const actionLabel = isDark ? "Heller Modus" : "Dunkler Modus";
  const statusLabel = isDark ? "Aktuell: Dunkel" : "Aktuell: Hell";
  elements.themeToggleBtn.setAttribute(
    "aria-label",
    isDark ? "Zum hellen Modus wechseln" : "Zum dunklen Modus wechseln"
  );
  elements.themeToggleBtn.title = isDark ? "Zum hellen Modus wechseln" : "Zum dunklen Modus wechseln";
  const labelElement = elements.themeToggleBtn.querySelector(".theme-toggle-label");
  if (labelElement) {
    labelElement.textContent = actionLabel;
  }
  const descriptionElement = elements.themeToggleBtn.querySelector(".theme-toggle-description");
  if (descriptionElement) {
    descriptionElement.textContent = statusLabel;
  }
}

function getStoredThemePreference() {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (VALID_THEMES.includes(stored)) {
      return stored;
    }
    if (stored) {
      localStorage.removeItem(THEME_STORAGE_KEY);
    }
  } catch (error) {
    console.warn("Themenpräferenz konnte nicht geladen werden:", error);
  }
  return null;
}

function setLayoutMode(mode) {
  const normalized = VALID_LAYOUT_MODES.includes(mode) ? mode : "auto";
  if (gameState.layoutMode === normalized) {
    updateLayoutToggleButtons();
    closeMainMenu();
    return;
  }
  gameState.layoutMode = normalized;
  applyLayoutMode();
  updateLayoutToggleButtons();
  try {
    localStorage.setItem(LAYOUT_MODE_STORAGE_KEY, normalized);
  } catch (error) {
    console.warn("Layoutmodus konnte nicht gespeichert werden:", error);
  }
  closeMainMenu();
}

function restoreLayoutModePreference() {
  let initial = "auto";
  try {
    const stored = localStorage.getItem(LAYOUT_MODE_STORAGE_KEY);
    if (VALID_LAYOUT_MODES.includes(stored)) {
      initial = stored;
    }
  } catch (error) {
    console.warn("Layoutmodus konnte nicht geladen werden:", error);
  }
  gameState.layoutMode = initial;
  applyLayoutMode();
  updateLayoutToggleButtons();
}

function applyLayoutMode() {
  if (!document.body) return;
  document.body.classList.remove("layout-desktop", "layout-mobile");
  if (gameState.layoutMode === "desktop") {
    document.body.classList.add("layout-desktop");
  } else if (gameState.layoutMode === "mobile") {
    document.body.classList.add("layout-mobile");
  }
}

function updateLayoutToggleButtons() {
  if (!elements.layoutToggleButtons?.length) return;
  elements.layoutToggleButtons.forEach((button) => {
    const target = button.dataset.layout || "auto";
    const isActive = target === gameState.layoutMode;
    button.classList.toggle("active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  });
}

function setRematchVisibility(isVisible) {
  if (!elements.rematchBtn) return;
  elements.rematchBtn.hidden = !isVisible;
  elements.rematchBtn.disabled = !isVisible;
}

function toggleMainMenu(forceOpen) {
  if (!elements.mainMenu || !elements.mainMenuTrigger) return;
  const shouldOpen =
    typeof forceOpen === "boolean"
      ? forceOpen
      : !document.body.classList.contains("main-menu-open");
  if (shouldOpen) {
    openMainMenu();
  } else {
    closeMainMenu();
  }
}

function openMainMenu() {
  if (!elements.mainMenu || !elements.mainMenuTrigger) return;
  if (document.body.classList.contains("main-menu-open")) return;
  document.body.classList.add("main-menu-open");
  elements.mainMenuTrigger.setAttribute("aria-expanded", "true");
  elements.mainMenu.setAttribute("aria-hidden", "false");
  document.addEventListener("click", handleMainMenuOutsideClick, true);
  document.addEventListener("keydown", handleMainMenuKeydown);
}

function closeMainMenu() {
  if (!elements.mainMenu || !elements.mainMenuTrigger) return;
  if (!document.body.classList.contains("main-menu-open")) return;
  document.body.classList.remove("main-menu-open");
  elements.mainMenuTrigger.setAttribute("aria-expanded", "false");
  elements.mainMenu.setAttribute("aria-hidden", "true");
  document.removeEventListener("click", handleMainMenuOutsideClick, true);
  document.removeEventListener("keydown", handleMainMenuKeydown);
}

function handleMainMenuOutsideClick(event) {
  if (!elements.mainMenu || !elements.mainMenuTrigger) return;
  const isInsideMenu = elements.mainMenu.contains(event.target);
  const isTrigger = elements.mainMenuTrigger.contains(event.target);
  if (!isInsideMenu && !isTrigger) {
    closeMainMenu();
  }
}

function handleMainMenuKeydown(event) {
  if (event.key === "Escape") {
    closeMainMenu();
  }
}

function restartMatchWithSameSettings(options = {}) {
  const announce = Boolean(options.announce);
  const config = gameState.lastRematchConfig;
  if (!config || !Array.isArray(config.playerConfigs) || config.playerConfigs.length < 2) {
    if (announce) {
      notifyVoiceStatus("error", "Kein abgeschlossenes Spiel zum Neustart gefunden");
    }
    return false;
  }
  startGame(config.playerConfigs, config.startingScore, config.outMode, config.matchMode);
  setViewMode("play");
  if (announce) {
    notifyVoiceStatus("success", "Rematch gestartet");
  }
  return true;
}

function prepareRematchConfig() {
  const playerConfigs = buildRematchPlayerConfigs();
  if (!playerConfigs.length) {
    gameState.lastRematchConfig = null;
    setRematchVisibility(false);
    return;
  }
  gameState.lastRematchConfig = {
    startingScore: gameState.startingScore,
    outMode: gameState.outMode,
    matchMode: gameState.matchMode,
    playerConfigs,
  };
  setRematchVisibility(true);
}

function buildRematchPlayerConfigs() {
  if (!gameState.players.length) return [];
  const winnerId = gameState.winnerId;
  const playersCopy = gameState.players.map((player) => ({
    ref: player,
    finalScore: Number(player.score) || 0,
    totalPoints: Number(player.totalPointsThisGame) || 0,
    totalDarts: Number(player.totalDartsThisGame) || 0,
    id: player.id,
  }));
  const winnerEntry = playersCopy.find((entry) => entry.id === winnerId) || null;
  const losers = playersCopy.filter((entry) => entry.id !== winnerId);
  losers.sort((a, b) => {
    if (b.finalScore !== a.finalScore) return b.finalScore - a.finalScore;
    const avgA = getPlayerAverageValue(a);
    const avgB = getPlayerAverageValue(b);
    return avgA - avgB;
  });
  const ordered = [...losers];
  if (winnerEntry) {
    ordered.push(winnerEntry);
  } else if (ordered.length > 1) {
    const fallback = ordered.pop();
    ordered.push(fallback);
  }
  return ordered
    .map((entry, index) => {
      const player = entry.ref;
      return {
        name: getPlayerDisplayName(player) || player.name || `Player ${index + 1}`,
        profileId: player.profileId || "",
      };
    })
    .filter((config) => config.name);
}

function getPlayerAverageValue(entry) {
  if (!entry) return Number.POSITIVE_INFINITY;
  const darts = entry.totalDarts || 0;
  if (!darts) return Number.POSITIVE_INFINITY;
  return entry.totalPoints / darts;
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
    forEachPlayerSlot(({ fallback, optional }, select, input) => {
      handleProfileSelection(select, input, optional ? "" : fallback);
    });
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
  forEachPlayerSlot(({ fallback, optional }, select, input) => {
    handleProfileSelection(select, input, optional ? "" : fallback);
  });
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

function setProfileDataStatus(state, message) {
  if (!elements.profileDataStatus) return;
  elements.profileDataStatus.textContent = message || "";
  elements.profileDataStatus.classList.remove("success", "error");
  if (state === "success" || state === "error") {
    elements.profileDataStatus.classList.add(state);
  }
}

function formatProfileExportFilename() {
  const now = new Date();
  const pad = (value) => String(value).padStart(2, "0");
  return `profiles-${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(
    now.getHours()
  )}${pad(now.getMinutes())}${pad(now.getSeconds())}.json`;
}

function onProfileExportClick() {
  try {
    const exportData = structuredClone(profiles);
    const count = Array.isArray(exportData) ? exportData.length : 0;
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
    const filename = formatProfileExportFilename();
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    requestAnimationFrame(() => URL.revokeObjectURL(url));
    setProfileDataStatus(
      "success",
      count
        ? `${count} Profile exportiert (${filename}).`
        : `Leere Profildatei exportiert (${filename}).`
    );
  } catch (error) {
    console.error("Profile konnten nicht exportiert werden:", error);
    setProfileDataStatus("error", "Export fehlgeschlagen.");
  }
}

function onProfileImportClick() {
  if (!elements.profileImportInput) return;
  elements.profileImportInput.value = "";
  elements.profileImportInput.click();
}

function onProfileImportFileChange(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const text = typeof reader.result === "string" ? reader.result : "";
      const parsed = JSON.parse(text);
      const normalized = normalizeImportedProfiles(parsed);
      if (!normalized.length) {
        setProfileDataStatus("error", "Keine gültigen Profile in der Datei gefunden.");
        return;
      }
      const mergeResult = mergeImportedProfiles(normalized);
      saveProfiles();
      renderProfileOptions();
      renderProfileList();
      renderLeaderboard();
      forEachPlayerSlot(({ fallback, optional }, select, input) => {
        handleProfileSelection(select, input, optional ? "" : fallback);
      });
      let playersUpdated = false;
      mergeResult.updatedIds.forEach((profileId) => {
        if (refreshPlayersForProfile(profileId)) {
          playersUpdated = true;
        }
      });
      if (playersUpdated) {
        render();
      }
      const parts = [];
      if (mergeResult.replacedCount) {
        parts.push(`${mergeResult.replacedCount} Profile aktualisiert`);
      }
      if (mergeResult.addedCount) {
        parts.push(`${mergeResult.addedCount} neue Profile`);
      }
      const summary = parts.length ? parts.join(", ") : "Keine Änderungen";
      const fileName = file.name || "Datei";
      setProfileDataStatus("success", `Profile aus "${fileName}" importiert: ${summary}.`);
    } catch (error) {
      console.error("Profile konnten nicht importiert werden:", error);
      setProfileDataStatus("error", "Import fehlgeschlagen. Bitte Datei prüfen.");
    } finally {
      if (elements.profileImportInput) {
        elements.profileImportInput.value = "";
      }
    }
  };
  reader.onerror = () => {
    console.error("Profil-Import: Datei konnte nicht gelesen werden:", reader.error);
    setProfileDataStatus("error", "Datei konnte nicht gelesen werden.");
    if (elements.profileImportInput) {
      elements.profileImportInput.value = "";
    }
  };
  reader.readAsText(file, "utf-8");
}

function normalizeImportedProfiles(source) {
  const candidates = Array.isArray(source)
    ? source
    : Array.isArray(source?.profiles)
    ? source.profiles
    : [];
  if (!candidates.length) return [];
  const normalized = [];
  const seenIds = new Set();

  candidates.forEach((entry) => {
    if (!entry || typeof entry !== "object") return;

    const profile = {
      id: typeof entry.id === "string" && entry.id.trim() ? entry.id.trim() : uid(),
      firstName: typeof entry.firstName === "string" ? entry.firstName.trim() : "",
      lastName: typeof entry.lastName === "string" ? entry.lastName.trim() : "",
      nickname: typeof entry.nickname === "string" ? entry.nickname.trim() : "",
      image: typeof entry.image === "string" ? entry.image : "",
      stats: {},
      history: [],
      trainingHistory: Array.isArray(entry.trainingHistory) ? entry.trainingHistory : [],
      createdAt: Number.isFinite(Number(entry.createdAt)) ? Number(entry.createdAt) : Date.now(),
      updatedAt: Number.isFinite(Number(entry.updatedAt)) ? Number(entry.updatedAt) : Date.now(),
    };

    if (entry.stats && typeof entry.stats === "object") {
      profile.stats = {
        gamesPlayed: Number(entry.stats.gamesPlayed) || 0,
        legsWon: Number(entry.stats.legsWon) || 0,
        setsWon: Number(entry.stats.setsWon) || 0,
        totalPoints: Number(entry.stats.totalPoints) || 0,
        totalDarts: Number(entry.stats.totalDarts) || 0,
        first12Points: Number(entry.stats.first12Points) || 0,
        first12Darts: Number(entry.stats.first12Darts) || 0,
        tripleHits: Number(entry.stats.tripleHits) || 0,
        doubleHits: Number(entry.stats.doubleHits) || 0,
        checkoutAttempts: Number(entry.stats.checkoutAttempts) || 0,
        checkoutHits: Number(entry.stats.checkoutHits) || 0,
        dartHistogram:
          entry.stats.dartHistogram && typeof entry.stats.dartHistogram === "object"
            ? entry.stats.dartHistogram
            : undefined,
      };
    }

    if (Array.isArray(entry.history)) {
      profile.history = entry.history
        .filter((item) => item && typeof item === "object")
        .map((item) => ({
          date: item.date || null,
          points: Number(item.points) || 0,
          darts: Number(item.darts) || 0,
          legWon: Boolean(item.legWon),
          legsWon: Number(item.legsWon) || 0,
          setsWon: Number(item.setsWon) || 0,
          opponent: typeof item.opponent === "string" ? item.opponent : undefined,
        }));
    }

    ensureProfileStats(profile);
    if (!profile.nickname) {
      profile.nickname =
        profile.firstName ||
        profile.lastName ||
        `Spieler ${normalized.length + 1}`;
    }

    if (seenIds.has(profile.id)) {
      profile.id = uid();
    }
    seenIds.add(profile.id);
    normalized.push(profile);
  });

  return normalized;
}

function mergeImportedProfiles(importedProfiles) {
  if (!Array.isArray(importedProfiles) || !importedProfiles.length) {
    return { addedCount: 0, replacedCount: 0, updatedIds: [] };
  }
  const mergedMap = new Map(profiles.map((profile) => [profile.id, profile]));
  let addedCount = 0;
  let replacedCount = 0;
  const updatedIds = new Set();

  importedProfiles.forEach((incoming) => {
    if (!incoming || typeof incoming !== "object") return;
    if (mergedMap.has(incoming.id)) {
      const target = mergedMap.get(incoming.id);
      Object.assign(target, incoming);
      ensureProfileStats(target);
      target.updatedAt = incoming.updatedAt || Date.now();
      updatedIds.add(incoming.id);
      replacedCount += 1;
    } else {
      ensureProfileStats(incoming);
      mergedMap.set(incoming.id, incoming);
      addedCount += 1;
    }
  });

  profiles = Array.from(mergedMap.values());
  return { addedCount, replacedCount, updatedIds: Array.from(updatedIds) };
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
  profile.stats.first12Points = 0;
  profile.stats.first12Darts = 0;
  profile.stats.tripleHits = 0;
  profile.stats.doubleHits = 0;
  profile.stats.checkoutAttempts = 0;
  profile.stats.checkoutHits = 0;
  profile.stats.dartHistogram = createEmptyHistogram();
  profile.stats.bestThreeDartSet = { total: 0, darts: [], dartsUsed: 0, date: null };
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

  if (action === "view") {
    window.location.href = `profile.html?id=${encodeURIComponent(profileId)}`;
    return;
  }

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
    forEachPlayerSlot(({ fallback, optional }, select, input) => {
      if (select?.value === profileId) {
        select.value = "";
        handleProfileSelection(select, input, optional ? "" : fallback);
      }
    });
  }
}

function assignProfileToSlot(profileId, slot) {
  const config = getPlayerSlotConfig(slot);
  if (!config) return;
  const select = elements[config.selectKey];
  const input = elements[config.inputKey];
  const fallback = config.optional ? "" : config.fallback;
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

async function reloadProfilesFromServer() {
  await loadProfiles();
  forEachPlayerSlot(({ fallback, optional }, select, input) => {
    handleProfileSelection(select, input, optional ? "" : fallback);
  });
  renderLeaderboard();
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

  forEachPlayerSlot((_, select) => {
    updateSelect(select);
  });

  forEachTrainingPlayer((config, select) => {
    updateSelect(select);
    handleTrainingProfileSelection(config.slot, { silent: true });
  });

  if (Array.isArray(elements.tournamentPlayerSelects)) {
    elements.tournamentPlayerSelects.forEach((select, index) => {
      updateSelect(select);
      syncTournamentPlayerField(index);
    });
  }

  forEachPlayerSlot(({ fallback, optional }, select, input) => {
    handleProfileSelection(select, input, optional ? "" : fallback);
  });
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
      const first12Average = formatAverage(profile.stats.first12Points, profile.stats.first12Darts);
      const checkoutRate = formatPercentage(profile.stats.checkoutHits, profile.stats.checkoutAttempts);
      const tripleRate = formatPercentage(profile.stats.tripleHits || 0, profile.stats.totalDarts || 0);
      const doubleRate = formatPercentage(profile.stats.doubleHits || 0, profile.stats.totalDarts || 0);
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
          return `<li>${dateLabel}: ${entry.points} Punkte · ${entry.darts} Darts · Ø ${avg}${setInfo}${entry.legWon ? " · Sieg" : ""
            }</li>`;
        })
        .join("");
      const heatmapMarkup = generateProfileHeatmapMarkup(profile);

      li.innerHTML = `
        ${avatarMarkup}
        <div class="profile-info">
          <h4>${displayName}</h4>
          <span>${fullName || ""}</span>
          <p class="profile-stats">Spiele: ${games} · Sätze: ${sets} · Legs: ${legs} · Ø/Dart: ${averagePerDart}${profile.stats.totalDarts ? ` · 3-Dart Ø: ${averageThreeDart}` : ""
        }</p>
          <p class="profile-stats secondary">Ø12: ${first12Average} · Checkout: ${checkoutRate} · Triple%: ${tripleRate} · Double%: ${doubleRate}</p>
          ${historyEntries ? `<ul class="profile-history">${historyEntries}</ul>` : ""}
          ${heatmapMarkup}
          <div class="profile-actions-inline">
            <button type="button" class="ghost" data-action="view" data-id="${profile.id}">Details</button>
            <button type="button" class="ghost" data-action="edit" data-id="${profile.id}">Bearbeiten</button>
            <button type="button" class="ghost" data-action="reset-stats" data-id="${profile.id}">Statistiken zurücksetzen</button>
            <button type="button" class="ghost" data-action="assign" data-slot="1" data-id="${profile.id}">Als Spieler 1 wählen</button>
            <button type="button" class="ghost" data-action="assign" data-slot="2" data-id="${profile.id}">Als Spieler 2 wählen</button>
            <button type="button" class="ghost" data-action="assign" data-slot="3" data-id="${profile.id}">Als Spieler 3 wählen</button>
            <button type="button" class="ghost" data-action="assign" data-slot="4" data-id="${profile.id}">Als Spieler 4 wählen</button>
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

const LEADERBOARD_COLUMN_LABELS = {
  rank: "Platz",
  player: "Spieler",
  average: "O/Dart",
  threeDart: "O 3-Dart",
  first12: "O erste 12",
  checkout: "Checkout %",
  triple: "Triple %",
  double: "Double %",
  sets: "Saetze",
  legs: "Legs",
  games: "Spiele",
};

function setLeaderboardCellLabel(cell, key) {
  if (!cell) return;
  const label = LEADERBOARD_COLUMN_LABELS[key];
  if (label) {
    cell.dataset.label = label;
  } else {
    delete cell.dataset.label;
  }
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
      const first12AverageValue =
        Number(stats.first12Darts) > 0 ? Number(stats.first12Points) / Number(stats.first12Darts) : 0;
      const first12AverageLabel = formatAverage(stats.first12Points, stats.first12Darts);
      const checkoutRateValue =
        Number(stats.checkoutAttempts) > 0 ? Number(stats.checkoutHits || 0) / Number(stats.checkoutAttempts) : 0;
      const checkoutRateLabel = formatPercentage(stats.checkoutHits || 0, stats.checkoutAttempts || 0);
      const tripleRateValue = darts > 0 ? (Number(stats.tripleHits) || 0) / darts : 0;
      const doubleRateValue = darts > 0 ? (Number(stats.doubleHits) || 0) / darts : 0;
      const tripleRateLabel = formatPercentage(stats.tripleHits || 0, darts || 0);
      const doubleRateLabel = formatPercentage(stats.doubleHits || 0, darts || 0);
      return {
        profile,
        displayName: getProfileDisplayName(profile),
        fullName: `${profile.firstName || ""} ${profile.lastName || ""}`.trim(),
        averageValue,
        threeDartAverageValue: averageValue * 3,
        averageLabel: formatAverage(points, darts),
        threeDartLabel: darts > 0 ? (averageValue * 3).toFixed(2) : "0.00",
        first12AverageValue,
        first12AverageLabel,
        checkoutRateValue,
        checkoutRateLabel,
        tripleRateValue,
        tripleRateLabel,
        doubleRateValue,
        doubleRateLabel,
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
    setLeaderboardCellLabel(rankCell, "rank");
    tr.appendChild(rankCell);

    const playerCell = document.createElement("td");
    setLeaderboardCellLabel(playerCell, "player");
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
    setLeaderboardCellLabel(averageCell, "average");
    tr.appendChild(averageCell);

    const threeDartCell = document.createElement("td");
    threeDartCell.textContent = entry.threeDartLabel;
    setLeaderboardCellLabel(threeDartCell, "threeDart");
    tr.appendChild(threeDartCell);

    const first12Cell = document.createElement("td");
    first12Cell.textContent = entry.first12AverageLabel;
    setLeaderboardCellLabel(first12Cell, "first12");
    tr.appendChild(first12Cell);

    const checkoutCell = document.createElement("td");
    checkoutCell.textContent = entry.checkoutRateLabel;
    setLeaderboardCellLabel(checkoutCell, "checkout");
    tr.appendChild(checkoutCell);

    const tripleCell = document.createElement("td");
    tripleCell.textContent = entry.tripleRateLabel;
    setLeaderboardCellLabel(tripleCell, "triple");
    tr.appendChild(tripleCell);

    const doubleCell = document.createElement("td");
    doubleCell.textContent = entry.doubleRateLabel;
    setLeaderboardCellLabel(doubleCell, "double");
    tr.appendChild(doubleCell);

    const setsCell = document.createElement("td");
    setsCell.textContent = String(entry.sets);
    setLeaderboardCellLabel(setsCell, "sets");
    tr.appendChild(setsCell);

    const legsCell = document.createElement("td");
    legsCell.textContent = String(entry.legs);
    setLeaderboardCellLabel(legsCell, "legs");
    tr.appendChild(legsCell);

    const gamesCell = document.createElement("td");
    gamesCell.textContent = String(entry.games);
    setLeaderboardCellLabel(gamesCell, "games");
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

function generateHeatmapSvgMarkup(histogram) {
  if (!histogram) {
    return { svgMarkup: "", totalHits: 0 };
  }

  const data = aggregateHistogramData(histogram);
  if (!data.totalHits) {
    return { svgMarkup: "", totalHits: 0 };
  }

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

  return { svgMarkup, totalHits: data.totalHits };
}

function generateProfileHeatmapMarkup(profile) {
  const histogram = profile?.stats?.dartHistogram;
  const { svgMarkup, totalHits } = generateHeatmapSvgMarkup(histogram);
  if (!svgMarkup) return "";

  const legendMarkup = `
    <div class="heatmap-legend">
      <span class="heatmap-legend-item"><span class="heatmap-swatch singles"></span>Singles</span>
      <span class="heatmap-legend-item"><span class="heatmap-swatch doubles"></span>Doubles</span>
      <span class="heatmap-legend-item"><span class="heatmap-swatch triples"></span>Triples</span>
      <span class="heatmap-legend-item"><span class="heatmap-swatch bulls"></span>Bull</span>
      <span class="heatmap-legend-item total">Treffer insgesamt: ${totalHits}</span>
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
  ensureProfileTrainingData(profile);
  profile.stats = profile.stats || {};
  profile.stats.gamesPlayed = profile.stats.gamesPlayed || 0;
  profile.stats.legsWon = profile.stats.legsWon || 0;
  profile.stats.setsWon = profile.stats.setsWon || 0;
  profile.stats.totalPoints = profile.stats.totalPoints || 0;
  profile.stats.totalDarts = profile.stats.totalDarts || 0;
  profile.stats.first12Points = profile.stats.first12Points || 0;
  profile.stats.first12Darts = profile.stats.first12Darts || 0;
  profile.stats.tripleHits = profile.stats.tripleHits || 0;
  profile.stats.doubleHits = profile.stats.doubleHits || 0;
  profile.stats.checkoutAttempts = profile.stats.checkoutAttempts || 0;
  profile.stats.checkoutHits = profile.stats.checkoutHits || 0;
  profile.stats.dartHistogram = cloneHistogram(profile.stats.dartHistogram);

  const best = profile.stats.bestThreeDartSet;
  if (!best || typeof best !== "object") {
    profile.stats.bestThreeDartSet = { total: 0, darts: [], dartsUsed: 0, date: null };
  } else {
    const darts = Array.isArray(best.darts)
      ? best.darts.map((label) => (label != null ? String(label) : "")).filter(Boolean)
      : [];
    let dartsUsed = Number(best.dartsUsed);
    if (!Number.isFinite(dartsUsed) || dartsUsed < darts.length) {
      dartsUsed = darts.length;
    }
    profile.stats.bestThreeDartSet = {
      total: Number(best.total) || 0,
      darts,
      dartsUsed,
      date: typeof best.date === "string" ? best.date : best.date ? new Date(best.date).toISOString() : null,
    };
  }

  profile.history = profile.history || [];
}

function ensureProfileTrainingData(profile) {
  if (!profile) return;
  if (!Array.isArray(profile.trainingHistory)) {
    profile.trainingHistory = [];
    return;
  }
  profile.trainingHistory = profile.trainingHistory
    .filter((entry) => entry && typeof entry === "object" && typeof entry.mode === "string")
    .map((entry) => ({
      id: typeof entry.id === "string" && entry.id ? entry.id : uid(),
      mode: entry.mode,
      label: typeof entry.label === "string" ? entry.label : TRAINING_MODES[entry.mode]?.label || "",
      darts: Number(entry.darts) || 0,
      durationMs: Number(entry.durationMs) || 0,
      finishedAt: Number(entry.finishedAt) || Date.now(),
      targets: Number(entry.targets) || 0,
      meta: entry.meta && typeof entry.meta === "object" ? entry.meta : {},
      variant: typeof entry.variant === "string" ? entry.variant : undefined,
      playerName: typeof entry.playerName === "string" ? entry.playerName : undefined,
    }));
}

function formatAverage(points, darts) {
  if (!darts) return "0.00";
  return Number(points / darts).toFixed(2);
}

function formatPercentage(value, total, decimals = 1) {
  if (!total) return (0).toFixed(decimals) + "%";
  const percentage = (Number(value) / Number(total)) * 100;
  return `${percentage.toFixed(decimals)}%`;
}

function formatTrainingDuration(durationMs) {
  if (!Number.isFinite(durationMs) || durationMs <= 0) {
    return "00:00";
  }
  const totalSeconds = Math.max(0, Math.round(durationMs / 1000));
  const minutes = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, "0");
  const seconds = (totalSeconds % 60).toString().padStart(2, "0");
  return `${minutes}:${seconds}`;
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


