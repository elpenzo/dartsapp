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
  gameSettings: document.getElementById("game-settings"),
  activePlayerBanner: document.getElementById("active-player-banner"),
  scoreboardCard: document.querySelector(".scoreboard"),
  undoBtn: document.getElementById("undo-btn"),
  dartModeSwitch: document.querySelector(".dart-mode-switch"),
  dartModeButtons: Array.from(document.querySelectorAll(".dart-mode-button")),
  dartNumberButtons: Array.from(document.querySelectorAll(".dart-number")),
  comboButtons: Array.from(document.querySelectorAll(".combo-button")),
  viewToggleButtons: Array.from(document.querySelectorAll(".view-toggle-btn")),
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
};

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
  const playerNames = [formData.get("playerOne"), formData.get("playerTwo")].filter(Boolean);
  const startingScore = parseInt(formData.get("startingScore"), 10) || DEFAULT_STARTING_SCORE;
  const outModeRaw = formData.get("outMode");
  const outMode = OUT_MODE_LABELS[outModeRaw] ? outModeRaw : DEFAULT_OUT_MODE;

  startGame(playerNames, startingScore, outMode);
}

function startGame(playerNames, startingScore, outMode = DEFAULT_OUT_MODE) {
  gameState.players = playerNames.map((name, index) => ({
    id: `p${index + 1}`,
    name,
    score: startingScore,
    history: [],
    lastTurn: null,
  }));
  gameState.activeIndex = 0;
  gameState.startingScore = startingScore;
  gameState.outMode = OUT_MODE_LABELS[outMode] ? outMode : DEFAULT_OUT_MODE;
  gameState.legActive = true;
  gameState.currentTurn = createNewTurn();
  gameState.history = [];
  gameState.snapshots = [];
  gameState.winnerId = null;

  render();
}

function resetGame() {
  startGame(["Player 1", "Player 2"], DEFAULT_STARTING_SCORE, DEFAULT_OUT_MODE);
  elements.setupForm.reset();
  elements.manualScoreInput.value = "";
  elements.lastUtterance.textContent = "-";
  elements.lastInterpretation.textContent = "-";
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

  return { type: "noop", readable: `Keine Zuordnung für „${raw}“` };
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
  player.score = remaining;
  gameState.currentTurn.darts.push(normalizedDart);
  gameState.currentTurn.spoken.push(interpretation.readable);
  player.lastTurn = normalizedDart.label;

  if (remaining === 0) {
    finishTurn(false, true);
    gameState.legActive = false;
    gameState.winnerId = player.id;
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
    playerName: player.name,
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
    const scoreNode = fragment.querySelector(".player-score");
    const lastNode = fragment.querySelector(".player-last");

    nameNode.textContent = player.name;
    scoreNode.textContent = player.score;
    lastNode.textContent = player.lastTurn || "–";

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
    const summary = entry.darts.map((dart) => shortLabelForDart(dart)).join(", ") || "-";
    li.innerHTML = `
      <span class="player">${entry.playerName}</span>
      <span class="summary">${summary}</span>
      <span class="remaining">${entry.bust ? "Bust" : `Rest: ${entry.remaining}`}${entry.legWon ? " 🎯" : ""}</span>
    `;
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

function setViewMode(view) {
  const normalized = view === "play" ? "play" : "setup";
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
  }
}

function updateViewModeUI() {
  const isPlayView = gameState.viewMode === "play";
  document.body.classList.toggle("play-view", isPlayView);
  elements.viewToggleButtons.forEach((button) => {
    const isActive = button.dataset.view === (isPlayView ? "play" : "setup");
    button.classList.toggle("active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  });
  if (isPlayView) {
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
    message = winner ? `Leg gewonnen von ${winner.name}` : "";
  } else if (!gameState.legActive) {
    const starter = gameState.players[gameState.activeIndex] || gameState.players[0];
    message = starter ? `Bereit: ${starter.name} startet das nächste Leg` : "";
  } else {
    const active = gameState.players[gameState.activeIndex];
    if (active) {
      const dartsThrown = gameState.currentTurn?.darts.length ?? 0;
      const dartsInfo = dartsThrown ? ` – ${dartsThrown}/3 Darts` : "";
      message = `Am Zug: ${active.name} – Rest ${active.score}${dartsInfo}`;
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
