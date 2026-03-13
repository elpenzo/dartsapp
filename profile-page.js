(function () {
  const PROFILES_API_URL = "/api/profiles";
  const PROFILE_STORAGE_KEY = "dartsProfiles";
  const RANGE_CONFIG = {
    all: { label: "Gesamt", button: "Gesamt", durationMs: null },
    day: { label: "24 Stunden", button: "24h", durationMs: 24 * 60 * 60 * 1000 },
    week: { label: "7 Tage", button: "7 Tage", durationMs: 7 * 24 * 60 * 60 * 1000 },
    month: { label: "30 Tage", button: "30 Tage", durationMs: 30 * 24 * 60 * 60 * 1000 },
  };

  const elements = {
    detail: document.getElementById("profile-detail"),
    loading: document.getElementById("profile-loading"),
    error: document.getElementById("profile-error"),
    nicknameTag: document.getElementById("profile-nickname-tag"),
    pageTitle: document.getElementById("profile-page-title"),
  };

  const state = {
    profile: null,
    range: "all",
  };

  init().catch((error) => {
    console.error("Profilseite konnte nicht initialisiert werden:", error);
    showError("Die Profilseite konnte nicht geladen werden.");
  });

  async function init() {
    const profileId = getProfileIdFromQuery();
    if (!profileId) {
      showError("Kein Profil angegeben.");
      return;
    }

    setLoading(true);
    const profile = await loadProfile(profileId);
    setLoading(false);

    if (!profile) {
      showError("Profil wurde nicht gefunden.");
      return;
    }

    state.profile = profile;
    renderProfile();
  }

  function getProfileIdFromQuery() {
    try {
      const params = new URLSearchParams(window.location.search);
      return params.get("id") || "";
    } catch (_error) {
      return "";
    }
  }

  function setLoading(isLoading) {
    if (!elements.loading) return;
    elements.loading.hidden = !isLoading;
  }

  function showError(message) {
    if (elements.loading) {
      elements.loading.hidden = true;
    }
    if (elements.detail) {
      elements.detail.innerHTML = "";
    }
    if (elements.error) {
      elements.error.textContent = message;
      elements.error.hidden = false;
    }
  }

  async function loadProfile(profileId) {
    const serverProfiles = await fetchProfilesFromServer();
    if (Array.isArray(serverProfiles)) {
      const profile = serverProfiles.find((entry) => entry && entry.id === profileId);
      if (profile) {
        return ensureProfile(profile);
      }
    }

    const localProfiles = loadProfilesFromStorage();
    const fallback = localProfiles.find((entry) => entry && entry.id === profileId);
    return fallback ? ensureProfile(fallback) : null;
  }

  async function fetchProfilesFromServer() {
    if (typeof fetch !== "function") {
      return null;
    }
    try {
      const response = await fetch(PROFILES_API_URL, { cache: "no-store" });
      if (!response.ok) {
        throw new Error(`Serverantwort ${response.status}`);
      }
      const data = await response.json();
      return Array.isArray(data) ? data : null;
    } catch (error) {
      console.warn("Profile konnten nicht vom Server geladen werden:", error);
      return null;
    }
  }

  function loadProfilesFromStorage() {
    try {
      const raw = localStorage.getItem(PROFILE_STORAGE_KEY);
      if (!raw) {
        return [];
      }
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      console.warn("Profile konnten nicht aus dem lokalen Speicher gelesen werden:", error);
      return [];
    }
  }

  function ensureProfile(profile) {
    const clone = typeof structuredClone === "function"
      ? structuredClone(profile)
      : JSON.parse(JSON.stringify(profile));
    ensureProfileStats(clone);
    return clone;
  }

  function ensureProfileStats(profile) {
    profile.stats = profile.stats || {};
    profile.stats.gamesPlayed = profile.stats.gamesPlayed || 0;
    profile.stats.legsWon = profile.stats.legsWon || 0;
    profile.stats.legsPlayed = profile.stats.legsPlayed || 0;
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
    profile.stats.bestThreeDartSet = normalizeBestSet(profile.stats.bestThreeDartSet);
    profile.history = Array.isArray(profile.history)
      ? profile.history.map((entry) => normalizeHistoryEntry(entry)).filter(Boolean)
      : [];
    return profile;
  }

  function normalizeHistoryEntry(entry) {
    if (!entry || typeof entry !== "object") return null;
    return {
      id: typeof entry.id === "string" && entry.id ? entry.id : `history-${Date.now()}-${Math.random()}`,
      date: typeof entry.date === "string" ? entry.date : entry.date ? new Date(entry.date).toISOString() : null,
      points: Number(entry.points) || 0,
      darts: Number(entry.darts) || 0,
      average: Number(entry.average) || 0,
      legWon: Boolean(entry.legWon),
      legsWon: Number(entry.legsWon) || 0,
      legsPlayed: Number(entry.legsPlayed) || 0,
      first12Points: Number(entry.first12Points) || 0,
      first12Darts: Number(entry.first12Darts) || 0,
      first12Average: Number(entry.first12Average) || 0,
      checkoutAttempts: Number(entry.checkoutAttempts) || 0,
      checkoutHits: Number(entry.checkoutHits) || 0,
      tripleHits: Number(entry.tripleHits) || 0,
      doubleHits: Number(entry.doubleHits) || 0,
      dartHistogram: cloneHistogram(entry.dartHistogram),
      bestTurn: normalizeBestSet(entry.bestTurn),
    };
  }

  function cloneHistogram(source) {
    const histogram = { SB: 0, DB: 0, MISS: 0 };
    for (let value = 1; value <= 20; value += 1) {
      histogram[`S${value}`] = 0;
      histogram[`D${value}`] = 0;
      histogram[`T${value}`] = 0;
    }
    if (!source || typeof source !== "object") {
      return histogram;
    }
    Object.keys(histogram).forEach((key) => {
      histogram[key] = Number(source[key]) || 0;
    });
    return histogram;
  }

  function normalizeBestSet(best) {
    if (!best || typeof best !== "object") {
      return { total: 0, darts: [], dartsUsed: 0, date: null };
    }
    const darts = Array.isArray(best.darts)
      ? best.darts.map((label) => (label != null ? String(label) : "")).filter(Boolean)
      : [];
    let dartsUsed = Number(best.dartsUsed);
    if (!Number.isFinite(dartsUsed) || dartsUsed < darts.length) {
      dartsUsed = darts.length;
    }
    return {
      total: Number(best.total) || 0,
      darts,
      dartsUsed,
      date: typeof best.date === "string" ? best.date : best.date ? new Date(best.date).toISOString() : null,
    };
  }

  function getFilteredHistory(history, rangeKey) {
    const config = RANGE_CONFIG[rangeKey] || RANGE_CONFIG.all;
    const rangeStart = config.durationMs ? Date.now() - config.durationMs : null;
    return history.filter((entry) => {
      if (!rangeStart) return true;
      if (!entry.date) return false;
      const timestamp = new Date(entry.date).getTime();
      return Number.isFinite(timestamp) && timestamp >= rangeStart;
    });
  }

  function getSnapshot(profile, rangeKey) {
    const historyEntries = getFilteredHistory(profile.history || [], rangeKey);
    let stats;
    if (rangeKey === "all") {
      stats = {
        gamesPlayed: Number(profile.stats.gamesPlayed) || 0,
        wins: historyEntries.reduce((sum, entry) => sum + (entry.legWon ? 1 : 0), 0),
        legsWon: Number(profile.stats.legsWon) || 0,
        legsPlayed: Number(profile.stats.legsPlayed) || 0,
        totalPoints: Number(profile.stats.totalPoints) || 0,
        totalDarts: Number(profile.stats.totalDarts) || 0,
        first12Points: Number(profile.stats.first12Points) || 0,
        first12Darts: Number(profile.stats.first12Darts) || 0,
        checkoutAttempts: Number(profile.stats.checkoutAttempts) || 0,
        checkoutHits: Number(profile.stats.checkoutHits) || 0,
        tripleHits: Number(profile.stats.tripleHits) || 0,
        doubleHits: Number(profile.stats.doubleHits) || 0,
        dartHistogram: cloneHistogram(profile.stats.dartHistogram),
        bestThreeDartSet: normalizeBestSet(profile.stats.bestThreeDartSet),
      };
    } else {
      const sumFirst12Points = historyEntries.reduce((sum, entry) => {
        const darts = entry.first12Darts || (entry.first12Average ? 12 : 0);
        const points = entry.first12Points || (entry.first12Average ? entry.first12Average * darts : 0);
        return sum + points;
      }, 0);
      const sumFirst12Darts = historyEntries.reduce((sum, entry) => {
        return sum + (entry.first12Darts || (entry.first12Average ? 12 : 0));
      }, 0);
      stats = {
        gamesPlayed: historyEntries.length,
        wins: historyEntries.reduce((sum, entry) => sum + (entry.legWon ? 1 : 0), 0),
        legsWon: historyEntries.reduce((sum, entry) => sum + (entry.legsWon || 0), 0),
        legsPlayed: historyEntries.reduce((sum, entry) => sum + (entry.legsPlayed || 0), 0),
        totalPoints: historyEntries.reduce((sum, entry) => sum + (entry.points || 0), 0),
        totalDarts: historyEntries.reduce((sum, entry) => sum + (entry.darts || 0), 0),
        first12Points: sumFirst12Points,
        first12Darts: sumFirst12Darts,
        checkoutAttempts: historyEntries.reduce((sum, entry) => sum + (entry.checkoutAttempts || 0), 0),
        checkoutHits: historyEntries.reduce((sum, entry) => sum + (entry.checkoutHits || 0), 0),
        tripleHits: historyEntries.reduce((sum, entry) => sum + (entry.tripleHits || 0), 0),
        doubleHits: historyEntries.reduce((sum, entry) => sum + (entry.doubleHits || 0), 0),
        dartHistogram: historyEntries.reduce((histogram, entry) => {
          Object.keys(histogram).forEach((key) => {
            histogram[key] += entry.dartHistogram[key] || 0;
          });
          return histogram;
        }, cloneHistogram()),
        bestThreeDartSet: historyEntries.reduce((best, entry) => {
          if ((entry.bestTurn?.total || 0) > (best?.total || 0)) {
            return normalizeBestSet(entry.bestTurn);
          }
          return best;
        }, normalizeBestSet(null)),
      };
    }

    const totalDarts = Number(stats.totalDarts) || 0;
    const totalPoints = Number(stats.totalPoints) || 0;
    const gamesPlayed = Number(stats.gamesPlayed) || 0;
    const legsPlayed = Number(stats.legsPlayed) || 0;
    return {
      historyEntries,
      stats,
      averages: {
        perDart: totalDarts > 0 ? totalPoints / totalDarts : 0,
        threeDart: totalDarts > 0 ? (totalPoints * 3) / totalDarts : 0,
        first12: Number(stats.first12Darts) > 0 ? Number(stats.first12Points) / Number(stats.first12Darts) : 0,
      },
      rates: {
        win: gamesPlayed > 0 ? Number(stats.wins || 0) / gamesPlayed : 0,
        legs: legsPlayed > 0 ? Number(stats.legsWon || 0) / legsPlayed : 0,
        checkout: Number(stats.checkoutAttempts) > 0 ? Number(stats.checkoutHits || 0) / Number(stats.checkoutAttempts) : 0,
        triple: totalDarts > 0 ? Number(stats.tripleHits || 0) / totalDarts : 0,
        double: totalDarts > 0 ? Number(stats.doubleHits || 0) / totalDarts : 0,
      },
    };
  }

  function renderProfile() {
    if (!elements.detail || !state.profile) return;

    const profile = state.profile;
    const snapshot = getSnapshot(profile, state.range);
    const displayName = getProfileDisplayName(profile);
    const fullName = `${profile.firstName || ""} ${profile.lastName || ""}`.trim();
    const nickname = (profile.nickname || "").trim();
    const initial = (nickname || profile.firstName || displayName || "?").charAt(0).toUpperCase();

    if (elements.pageTitle) {
      elements.pageTitle.textContent = `Profil von ${displayName}`;
    }
    if (elements.nicknameTag) {
      if (nickname) {
        elements.nicknameTag.textContent = nickname;
        elements.nicknameTag.hidden = false;
      } else {
        elements.nicknameTag.hidden = true;
      }
    }
    document.title = `${displayName} · Profil-Insights`;

    const avatarMarkup = profile.image
      ? `<img src="${escapeHtml(profile.image)}" alt="${escapeHtml(displayName)}" class="profile-detail-avatar" />`
      : `<div class="profile-detail-avatar fallback">${escapeHtml(initial)}</div>`;

    const bestSet = state.range === "all"
      ? normalizeBestSet(profile.stats.bestThreeDartSet)
      : normalizeBestSet(snapshot.stats.bestThreeDartSet);
    const bestSetValue = bestSet.total ? escapeHtml(bestSet.darts.join(" - ")) : "Noch kein 3-Dart-Set gespeichert";
    const bestSetScore = bestSet.total ? `${bestSet.total.toLocaleString("de-DE")} Punkte` : "";
    const bestSetMeta = bestSet.date ? `vom ${escapeHtml(formatProfileDate(bestSet.date))}` : "";

    elements.detail.innerHTML = `
      <section class="profile-overview">
        <div class="profile-identity">
          ${avatarMarkup}
          <div class="profile-identity-text">
            <h2>${escapeHtml(displayName)}</h2>
            ${fullName ? `<p class="profile-full-name">${escapeHtml(fullName)}</p>` : ""}
            <div class="profile-range-controls" role="group" aria-label="Stats Zeitraum">
              ${renderRangeButtons()}
            </div>
          </div>
        </div>
        <div class="best-set-card ${bestSet.total ? "has-data" : "is-empty"}">
          <span class="best-set-label">Bestes 3-Dart-Set</span>
          <strong class="best-set-value">${bestSetValue}</strong>
          ${bestSet.total ? `<span class="best-set-score">${escapeHtml(bestSetScore)}</span>` : ""}
          ${bestSetMeta ? `<span class="best-set-meta">${bestSetMeta}</span>` : ""}
        </div>
      </section>
      <section class="profile-section">
        <h3>Performance Snapshot</h3>
        <p class="profile-section-intro">Zeitraum: <strong>${escapeHtml(RANGE_CONFIG[state.range].label)}</strong></p>
        <div class="metrics-grid">${renderMetrics(snapshot)}</div>
      </section>
      <section class="profile-section">
        <h3>Match Form</h3>
        ${renderFormStrip(snapshot.historyEntries)}
      </section>
      <section class="profile-section">
        <h3>Treffer-Hotspots</h3>
        ${renderTopSegments(snapshot.stats.dartHistogram)}
      </section>
      <section class="profile-section">
        <h3>Historische Spiele</h3>
        ${renderHistory(snapshot.historyEntries)}
      </section>
    `;

    bindRangeButtons();
  }

  function renderRangeButtons() {
    return Object.entries(RANGE_CONFIG)
      .map(([key, config]) => {
        const active = key === state.range;
        return `<button type="button" class="profile-range-btn ${active ? "active" : ""}" data-range="${key}" aria-pressed="${active}">${escapeHtml(config.button)}</button>`;
      })
      .join("");
  }

  function bindRangeButtons() {
    elements.detail.querySelectorAll(".profile-range-btn").forEach((button) => {
      button.addEventListener("click", () => {
        const nextRange = button.dataset.range || "all";
        if (!RANGE_CONFIG[nextRange] || nextRange === state.range) return;
        state.range = nextRange;
        renderProfile();
      });
    });
  }

  function renderMetrics(snapshot) {
    const stats = snapshot.stats;
    const metrics = [
      { label: "Spiele", value: formatNumber(stats.gamesPlayed) },
      { label: "Siege", value: formatNumber(stats.wins || 0) },
      { label: "Winrate", value: formatPercentageFromRate(snapshot.rates.win) },
      { label: "Leg-Winrate", value: formatPercentageFromRate(snapshot.rates.legs) },
      { label: "Ø pro Dart", value: formatAverage(stats.totalPoints, stats.totalDarts) },
      { label: "3-Dart Ø", value: formatAverage(stats.totalPoints * 3, stats.totalDarts) },
      { label: "Ø erste 12", value: formatAverage(stats.first12Points, stats.first12Darts) },
      { label: "Checkout-Quote", value: formatPercentage(stats.checkoutHits, stats.checkoutAttempts) },
      { label: "Triple-Quote", value: formatPercentage(stats.tripleHits, stats.totalDarts) },
      { label: "Double-Quote", value: formatPercentage(stats.doubleHits, stats.totalDarts) },
      { label: "Gesamtpunkte", value: formatNumber(stats.totalPoints) },
      { label: "Geworfene Darts", value: formatNumber(stats.totalDarts) },
    ];

    return metrics
      .map((metric) => `
        <article class="metric-card">
          <span class="metric-label">${escapeHtml(metric.label)}</span>
          <strong class="metric-value">${escapeHtml(String(metric.value))}</strong>
        </article>
      `)
      .join("");
  }

  function renderFormStrip(historyEntries) {
    if (!historyEntries.length) {
      return '<p class="profile-empty">Keine Matches im gewählten Zeitraum.</p>';
    }
    const items = historyEntries
      .slice(0, 8)
      .map((entry) => {
        const resultClass = entry.legWon ? "win" : "loss";
        const resultLabel = entry.legWon ? "Sieg" : "Niederlage";
        return `
          <li class="profile-form-item ${resultClass}">
            <strong>${entry.legWon ? "W" : "L"}</strong>
            <span>${escapeHtml(formatProfileDate(entry.date))}</span>
            <span>Ø ${escapeHtml(formatAverage(entry.points, entry.darts))}</span>
            <span>${escapeHtml(resultLabel)}</span>
          </li>
        `;
      })
      .join("");
    return `<ul class="profile-form-list">${items}</ul>`;
  }

  function renderTopSegments(histogram) {
    const segments = computeTopSegments(histogram, 6);
    if (!segments.length) {
      return '<p class="profile-empty">Noch keine Treffer gespeichert.</p>';
    }
    const items = segments
      .map(
        (segment) => `
          <li class="top-hit-item">
            <span class="top-hit-label">${escapeHtml(segment.label)}</span>
            <span class="top-hit-value">${segment.value.toLocaleString("de-DE")}</span>
          </li>
        `
      )
      .join("");
    return `<ol class="profile-top-hits">${items}</ol>`;
  }

  function renderHistory(history) {
    if (!Array.isArray(history) || !history.length) {
      return '<p class="profile-empty">Noch keine historischen Daten vorhanden.</p>';
    }

    const rows = history
      .map((entry) => {
        const date = formatProfileDate(entry.date);
        const average = formatAverage(entry.points, entry.darts);
        const checkout = formatPercentage(entry.checkoutHits, entry.checkoutAttempts);
        const bestTurn = normalizeBestSet(entry.bestTurn);
        const bestTurnLabel = bestTurn.total ? `${bestTurn.darts.join(" - ")} (${bestTurn.total.toLocaleString("de-DE")})` : "–";
        const legsWon = Number(entry.legsWon) || 0;
        const dartsThrown = Number(entry.darts) || 0;
        const pointsScored = Number(entry.points) || 0;
        return `
          <tr>
            <td>${escapeHtml(date)}</td>
            <td>${escapeHtml(pointsScored.toLocaleString("de-DE"))}</td>
            <td>${escapeHtml(dartsThrown.toLocaleString("de-DE"))}</td>
            <td>${escapeHtml(average)}</td>
            <td>${escapeHtml(checkout)}</td>
            <td>${escapeHtml(String(legsWon))}</td>
            <td>${escapeHtml(bestTurnLabel)}</td>
          </tr>
        `;
      })
      .join("");

    return `
      <div class="profile-history-wrapper">
        <table class="profile-history-table">
          <thead>
            <tr>
              <th>Datum</th>
              <th>Punkte</th>
              <th>Darts</th>
              <th>Ø/Dart</th>
              <th>Checkout</th>
              <th>Legs</th>
              <th>Bestes Set</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    `;
  }

  function computeTopSegments(histogram, limit) {
    if (!histogram) return [];
    const entries = [];
    Object.entries(histogram).forEach(([key, value]) => {
      const count = Number(value) || 0;
      if (!count) return;
      entries.push({ label: key === "MISS" ? "0" : key.toUpperCase(), value: count });
    });
    entries.sort((a, b) => b.value - a.value);
    return entries.slice(0, limit);
  }

  function getProfileDisplayName(profile) {
    if (!profile) return "";
    const nickname = (profile.nickname || "").trim();
    if (nickname) return nickname;
    return `${profile.firstName || ""} ${profile.lastName || ""}`.trim() || "Unbenannt";
  }

  function formatAverage(points, darts) {
    if (!darts) return "0,00";
    const value = Number(points) / Number(darts);
    return value.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function formatPercentage(value, total) {
    if (!total) return "0,0%";
    const percentage = (Number(value) / Number(total)) * 100;
    return `${percentage.toLocaleString("de-DE", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;
  }

  function formatPercentageFromRate(rate) {
    return `${(Number(rate) * 100).toLocaleString("de-DE", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;
  }

  function formatNumber(value) {
    return Number(value || 0).toLocaleString("de-DE");
  }

  function formatProfileDate(value) {
    if (!value) return "";
    try {
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) return "";
      return new Intl.DateTimeFormat("de-DE", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(date);
    } catch (_error) {
      return "";
    }
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }
})();
