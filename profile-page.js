(function () {
  const PROFILES_API_URL = "/api/profiles";
  const PROFILE_STORAGE_KEY = "dartsProfiles";

  const elements = {
    detail: document.getElementById("profile-detail"),
    loading: document.getElementById("profile-loading"),
    error: document.getElementById("profile-error"),
    nicknameTag: document.getElementById("profile-nickname-tag"),
    pageTitle: document.getElementById("profile-page-title"),
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

    renderProfile(profile);
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
    let clone;
    if (typeof structuredClone === "function") {
      clone = structuredClone(profile);
    } else {
      clone = JSON.parse(JSON.stringify(profile));
    }
    ensureProfileStats(clone);
    return clone;
  }

  function ensureProfileStats(profile) {
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
    profile.stats.dartHistogram = profile.stats.dartHistogram || {};

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

    profile.history = Array.isArray(profile.history) ? profile.history : [];
    return profile;
  }

  function renderProfile(profile) {
    if (!elements.detail) return;

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

    const bestSet = normalizeBestSet(profile.stats.bestThreeDartSet);
    const bestSetValue = bestSet ? escapeHtml(bestSet.darts.join(" - ")) : "Noch kein 3-Dart-Set gespeichert";
    const bestSetScore = bestSet ? `${bestSet.total.toLocaleString("de-DE")} Punkte` : "";
    const bestSetMeta = bestSet?.date ? `vom ${escapeHtml(formatProfileDate(bestSet.date))}` : "";

    const avatarMarkup = profile.image
      ? `<img src="${escapeHtml(profile.image)}" alt="${escapeHtml(displayName)}" class="profile-detail-avatar" />`
      : `<div class="profile-detail-avatar fallback">${escapeHtml(initial)}</div>`;

    const metricsHtml = renderMetrics(profile.stats);
    const historyHtml = renderHistory(profile.history);
    const topSegmentsHtml = renderTopSegments(profile.stats.dartHistogram);

    elements.detail.innerHTML = `
      <section class="profile-overview">
        <div class="profile-identity">
          ${avatarMarkup}
          <div class="profile-identity-text">
            <h2>${escapeHtml(displayName)}</h2>
            ${fullName ? `<p class="profile-full-name">${escapeHtml(fullName)}</p>` : ""}
          </div>
        </div>
        <div class="best-set-card ${bestSet ? "has-data" : "is-empty"}">
          <span class="best-set-label">Bestes 3-Dart-Set</span>
          <strong class="best-set-value">${bestSetValue}</strong>
          ${bestSet ? `<span class="best-set-score">${escapeHtml(bestSetScore)}</span>` : ""}
          ${bestSetMeta ? `<span class="best-set-meta">${bestSetMeta}</span>` : ""}
        </div>
      </section>
      <section class="profile-section">
        <h3>Leistungswerte</h3>
        <div class="metrics-grid">${metricsHtml}</div>
      </section>
      <section class="profile-section">
        <h3>Treffer-Hotspots</h3>
        ${topSegmentsHtml}
      </section>
      <section class="profile-section">
        <h3>Historische Spiele</h3>
        ${historyHtml}
      </section>
    `;
  }

  function renderMetrics(stats) {
    const metrics = [
      { label: "Spiele", value: stats.gamesPlayed },
      { label: "Sätze", value: stats.setsWon },
      { label: "Legs", value: stats.legsWon },
      { label: "Gesamtpunkte", value: stats.totalPoints, format: formatNumber },
      { label: "Geworfene Darts", value: stats.totalDarts, format: formatNumber },
      {
        label: "Ø pro Dart",
        value: stats.totalPoints,
        format: () => formatAverage(stats.totalPoints, stats.totalDarts),
      },
      {
        label: "Ø 3 Darts",
        value: stats.totalPoints,
        format: () => formatAverage(stats.totalPoints * 3, stats.totalDarts),
      },
      {
        label: "Ø erste 12",
        value: stats.first12Points,
        format: () => formatAverage(stats.first12Points, stats.first12Darts),
      },
      {
        label: "Checkout-Quote",
        value: stats.checkoutHits,
        format: () => formatPercentage(stats.checkoutHits, stats.checkoutAttempts),
      },
      {
        label: "Triple-Quote",
        value: stats.tripleHits,
        format: () => formatPercentage(stats.tripleHits, stats.totalDarts),
      },
      {
        label: "Double-Quote",
        value: stats.doubleHits,
        format: () => formatPercentage(stats.doubleHits, stats.totalDarts),
      },
    ];

    return metrics
      .map((metric) => {
        const normalizedValue = metric.format
          ? metric.format(metric.value)
          : Number(metric.value || 0).toLocaleString("de-DE");
        return `
          <article class="metric-card">
            <span class="metric-label">${escapeHtml(metric.label)}</span>
            <strong class="metric-value">${escapeHtml(String(normalizedValue))}</strong>
          </article>
        `;
      })
      .join("");
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
        const bestTurnLabel = bestTurn ? `${bestTurn.darts.join(" - ")} (${bestTurn.total.toLocaleString("de-DE")})` : "–";
        const setsWon = Number(entry.setsWon) || 0;
        const legsWon = Number(entry.legsWon) || 0;
        const resultLabel = `Sätze: ${setsWon.toLocaleString("de-DE")} · Legs: ${legsWon.toLocaleString("de-DE")}`;
        const dartsThrown = Number(entry.darts) || 0;
        const pointsScored = Number(entry.points) || 0;
        return `
          <tr>
            <td>${escapeHtml(date)}</td>
            <td>${escapeHtml(pointsScored.toLocaleString("de-DE"))}</td>
            <td>${escapeHtml(dartsThrown.toLocaleString("de-DE"))}</td>
            <td>${escapeHtml(average)}</td>
            <td>${escapeHtml(checkout)}</td>
            <td>${escapeHtml(resultLabel)}</td>
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
              <th>Sätze · Legs</th>
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
      let label = key.toUpperCase();
      if (label === "MISS") {
        label = "0";
      }
      entries.push({ label, value: count });
    });
    entries.sort((a, b) => b.value - a.value);
    return entries.slice(0, limit);
  }

  function normalizeBestSet(best) {
    if (!best || typeof best !== "object") {
      return null;
    }
    const darts = Array.isArray(best.darts)
      ? best.darts.map((label) => (label != null ? String(label) : "")).filter(Boolean)
      : [];
    const total = Number(best.total) || 0;
    if (!darts.length && !total) {
      return null;
    }
    let dartsUsed = Number(best.dartsUsed);
    if (!Number.isFinite(dartsUsed) || dartsUsed < darts.length) {
      dartsUsed = darts.length;
    }
    return {
      darts,
      total,
      dartsUsed,
      date: typeof best.date === "string" ? best.date : best.date ? new Date(best.date).toISOString() : null,
    };
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
