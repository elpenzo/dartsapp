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
};

let profiles = [];
let pendingProfileImage = null;

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

initialize();

function initialize() {
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

  loadProfiles();
  handleProfileSelection(elements.playerOneProfileSelect, elements.playerOneInput, "Player 1");
  handleProfileSelection(elements.playerTwoProfileSelect, elements.playerTwoInput, "Player 2");

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

  const playerConfigs = [
    createPlayerConfig(1, formData, elements.playerOneProfileSelect, elements.playerOneInput),
    createPlayerConfig(2, formData, elements.playerTwoProfileSelect, elements.playerTwoInput),
  ];

  startGame(playerConfigs, startingScore, outMode);
}

function startGame(playerConfigs, startingScore, outMode = DEFAULT_OUT_MODE) {
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
    };
  });
  gameState.activeIndex = 0;
  gameState.startingScore = startingScore;
  gameState.outMode = OUT_MODE_LABELS[outMode] ? outMode : DEFAULT_OUT_MODE;
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
  startGame(defaultConfigs, DEFAULT_STARTING_SCORE, DEFAULT_OUT_MODE);
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
    gameState.legActive = false;
    gameState.winnerId = player.id;
    finalizeGameStats();
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
    gameState.legActive = false;
    gameState.winnerId = player.id;
    finalizeGameStats();
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
    })),
    history: structuredClone(gameState.history),
    currentTurn: gameState.currentTurn ? structuredClone(gameState.currentTurn) : null,
    legActive: gameState.legActive,
    winnerId: gameState.winnerId,
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
  gameState.statsCommitted = false;
  gameState.players.forEach((player) => {
    const snapshotPlayer = lastSnapshot.players.find((p) => p.id === player.id);
    if (snapshotPlayer) {
      player.score = snapshotPlayer.score;
      player.lastTurn = snapshotPlayer.lastTurn;
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
  if (elements.gameSettings) {
    elements.gameSettings.textContent = `Modus: ${gameState.startingScore} Punkte - ${outModeLabel()}`;
  }

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

    const summarySpan = document.createElement("span");
    summarySpan.className = "summary";
    summarySpan.textContent = entry.darts.map((dart) => shortLabelForDart(dart)).join(", ") || "-";

    const remainingSpan = document.createElement("span");
    remainingSpan.className = "remaining";
    const remainingText = entry.bust ? "Bust" : `Rest: ${entry.remaining}`;
    remainingSpan.textContent = entry.legWon ? `${remainingText} 🎯` : remainingText;

    li.appendChild(playerSpan);
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
    if (player.id === gameState.winnerId) {
      profile.stats.legsWon += 1;
    }

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
  });

  gameState.statsCommitted = true;
}

function setViewMode(view) {
  const normalized = view === "play" || view === "profiles" ? view : "setup";
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
  }
}

function updateViewModeUI() {
  const currentView = gameState.viewMode;
  document.body.classList.toggle("play-view", currentView === "play");
  document.body.classList.toggle("profiles-view", currentView === "profiles");
  elements.viewToggleButtons.forEach((button) => {
    const isActive = button.dataset.view === currentView;
    button.classList.toggle("active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  });
  if (currentView === "play") {
    updateActivePlayerBanner();
  }
}

function updateActivePlayerBanner() {
  if (!elements.activePlayerBanner) return;
  let message = "";

  if (!gameState.players.length) {
    message = "";
  } else if (gameState.winnerId) {
    const winner = gameState.players.find((player) => player.id === gameState.winnerId);
    const winnerName = getPlayerDisplayName(winner);
    message = winnerName ? `Leg gewonnen von ${winnerName}` : "";
  } else if (!gameState.legActive) {
    const starter = gameState.players[gameState.activeIndex] || gameState.players[0];
    const starterName = getPlayerDisplayName(starter);
    message = starterName ? `Bereit: ${starterName} startet das nächste Leg` : "";
  } else {
    const active = gameState.players[gameState.activeIndex];
    if (active) {
      const activeName = getPlayerDisplayName(active);
      const dartsThrown = gameState.currentTurn?.darts.length ?? 0;
      const dartsInfo = dartsThrown ? ` - ${dartsThrown}/3 Darts` : "";
      message = `Am Zug: ${activeName} - Rest ${active.score}${dartsInfo}`;
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

function loadProfiles() {
  try {
    const raw = localStorage.getItem(PROFILE_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        profiles = parsed.map((profile) => {
          ensureProfileStats(profile);
          return profile;
        });
      }
    }
  } catch (error) {
    profiles = [];
  }

  renderProfileOptions();
  renderProfileList();
}

function saveProfiles() {
  try {
    localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profiles));
  } catch (error) {
    console.error("Profile konnten nicht gespeichert werden", error);
  }
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
      const initial = (profile.nickname || profile.firstName || displayName || "?").charAt(0).toUpperCase();

      const avatarMarkup = profile.image
        ? `<img src="${profile.image}" alt="${displayName}" />`
        : `<div class="profile-avatar-fallback">${initial}</div>`;

      const historyEntries = (profile.history || [])
        .slice(0, 3)
        .map((entry) => {
          const dateLabel = formatProfileDate(entry.date);
          const avg = entry.darts ? formatAverage(entry.points, entry.darts) : "0.00";
          return `<li>${dateLabel}: ${entry.points} Punkte · ${entry.darts} Darts · Ø ${avg}${entry.legWon ? " · Sieg" : ""}</li>`;
        })
        .join("");

      li.innerHTML = `
        ${avatarMarkup}
        <div class="profile-info">
          <h4>${displayName}</h4>
          <span>${fullName || ""}</span>
          <p class="profile-stats">Spiele: ${games} · Legs: ${legs} · Ø/Dart: ${averagePerDart}${
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

function ensureProfileStats(profile) {
  profile.stats = profile.stats || {};
  profile.stats.gamesPlayed = profile.stats.gamesPlayed || 0;
  profile.stats.legsWon = profile.stats.legsWon || 0;
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


