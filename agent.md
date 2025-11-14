# Agent-Plan: Sprachgesteuerte 501-Dartsapp (HTML/JavaScript)

## Vision & Ziele
- Echtzeit-Mitschnitt eines 501-Leg per Spracheingabe im Browser.
- Minimale Interaktion mit Maus/Tastatur, Fokus auf Sprachbefehle.
- Klarer Spielfluss: Ansage ΓåÆ Validierung ΓåÆ Aktualisierung des Scoreboards.
- Offline-first, aber modular erweiterbar (z.ΓÇ»B. Spielhistorie, Multiplayer).

## Zielgruppe & Nutzungsszenarien
- Casual- und Vereinsspieler:innen, die w├ñhrend einer Partie die H├ñnde frei haben wollen.
- Tablets/Notebooks am Dartboard, ggf. mit zus├ñtzlichem Mikrofon und Toucheingabe.
- Eins├ñtze bei Trainings, Ligaspielen oder Events zur schnellen Dokumentation.

## Projektumfang (MVP)
1. Startbildschirm mit Spielkonfiguration (Leg/Lives, Spieleranzahl).
2. Scoreboard-Ansicht f├╝r bis zu zwei Spieler:innen (MVP).
3. Sprachaufnahme ├╝ber Web Speech API (Chromium-Browser).
4. Erkennung von Scores (0ΓÇô180) und speziellen Begriffen (ΓÇ₧BustΓÇ£, ΓÇ₧Double OutΓÇ£).
5. Regel-Engine f├╝r 501 Double-Out (inkl. Bust-Logik).
6. Verlauf mit letztem Check-out sowie Fehlerfeedback (Missverst├ñndnis, ung├╝ltige Eingabe).

## Architektur├╝berblick
- **Frontend**: Single-Page-App, HTML + Vanilla JS, modulare Komponentenstruktur.
- **State Management**: Event-getrieben, zentrales `GameState`-Objekt (aktuelle Scores, Runden, Verlauf).
- **Sprachsteuerung**: Wrapper um die Web Speech API; Fallback auf manuellen Input.
- **UI-Komponenten**:
  - `MatchSetup`: Konfiguration, Start.
  - `Scoreboard`: Anzeigen aktueller Scores, Rechner f├╝r Restpunkte.
  - `VoiceConsole`: Status (lauscht, versteht, Fehler).
  - `TurnHistory`: Chronologischer Log der Aufnahmen.
- **Persistenz (optional sp├ñter)**: LocalStorage f├╝r Spielst├ñnde und Statistiken.

## Technische Bausteine
- HTML5-Struktur mit semantischen Bereichen (`<header>`, `<main>`, `<section>`).
- CSS Grid/Flexbox f├╝r responsive Darstellung (mobile ΓåÆ tablet).
- Web Speech API (`SpeechRecognition`); f├╝r Browser ohne Support: Hinweis + manueller Input.
- Testbare Units: Score-Berechnung, Bust-Logik, Parsing der Sprachbefehle.
- Build/Tooling: lightweight (npm + Vite optional), Fokus auf schnelles Iterieren.

## Sprachbefehl-Design
- Eingabeformat: ΓÇ₧Ein Triple zwanzigΓÇ£, ΓÇ₧140ΓÇ£, ΓÇ₧Single f├╝nfΓÇ£, ΓÇ₧BustΓÇ£.
- Normalisierung: Map der gesprochenen Zahlen/W├╢rter auf int-Werte.
- Fehlertoleranz: Konfidenzschwelle; bei Unklarheit Nachfrage (ΓÇ₧Bitte wiederholenΓÇ£).
- Steuerbefehle: ΓÇ₧Neues SpielΓÇ£, ΓÇ₧R├╝ckg├ñngigΓÇ£, ΓÇ₧StoppΓÇ£, ΓÇ₧WeiterΓÇ£.

## Workflow einer Runde
1. **Start Turn**: Aktiver Spieler wird hervorgehoben, Timer optional.
2. **Voice Capture**: Aufnahme starten ΓåÆ Resultat parsen ΓåÆ validieren.
3. **Validation**:
   - Score Γëñ verbleibende Punkte.
   - Double-Out: Letzter Dart muss Doppel sein (Audio-Intent ΓÇ₧DoubleΓÇ£).
   - Bust: Automatisch erkannt und Runde beendet.
4. **State Update**: Score abziehen, Rest anzeigen, Check-out-Optionen.
5. **Feedback**: Visuelle + akustische Best├ñtigung (Text-to-Speech optional).
6. **Turn Switch**: N├ñchster Spieler; History aktualisieren.

## UI-Wireframe (konzeptionell)
- **Header**: Spielstatus, aktive:r Spieler:in, Restdarts.
- **Main**:
  - Linke Spalte: Scoreboard mit Namen, Restpunkten, Checkout-Tipps.
  - Rechte Spalte: VoiceConsole (Status, letzter Befehl, Retry).
  - Unterhalb: TurnHistory (letzte 20 Eingaben, Scroll). Profil Heatmap
- **Footer**: Controls (Pause, R├╝ckg├ñngig, Einstellungen).

## Datenmodell (MVP)
```mermaid
classDiagram
    class Player {
      +id: string
      +name: string
      +score: number
      +history: Turn[]
    }

    class Turn {
      +playerId: string
      +darts: DartResult[]
      +timestamp: Date
      +bust: boolean
    }

    class DartResult {
      +segment: string
      +multiplier: number
      +value(): number
    }
```

## Zustandslogik (Pseudo-Code)
```javascript
function applyDart(gameState, dartResult) {
  const score = dartResult.value();
  const remaining = gameState.activePlayer.score - score;

  if (remaining < 0) return { bust: true };
  if (remaining === 0 && !dartResult.isDouble()) return { bust: true };

  return {
    bust: false,
    updatedScore: remaining
  };
}
```

## Risiken & Annahmen
- Web Speech API funktioniert nur in modernen Chromium-Browsern ΓåÆ Browserpr├╝fung.
- St├╢rger├ñusche beim Dartspiel erschweren Sprachverst├ñndnis ΓåÆ Option f├╝r Push-to-Talk / Headset.
- Mehrspieler >2 erst in sp├ñteren Iterationen, Fokus MVP auf 1v1.
- Datenschutz: Keine externe ├£bertragung (rein lokal).

## Milestones
1. **Prototyp UI**: Statisches Scoreboard + manuelle Eingabe (1 Tag).
2. **Game Engine**: Scorelogik, Bust, Rundenwechsel (1ΓÇô2 Tage).
3. **Sprachintegration**: Befehle erkennen, Feedback anzeigen (2 Tage).
4. **UX Feinschliff**: Fehlerbehandlung, responsive Layout, Audiofeedback (1 Tag).
5. **Testing & Doku**: Unit Tests f├╝r Logik, Kurzanleitung (1 Tag).

## Erweiterungen (nach MVP)
- Statistik-Dashboard (Average, Checkout-Quote).
- Mehrsprachige Sprachbefehle.
- Export (CSV/JSON), Teilen von Legs/Matches.
- Integration mit Darts-Hardware (automatische Treffer).
- Online-Multiplayer mit WebRTC + Voice Rooms.

## N├ñchste Schritte
- Turniermodus
- Sprachsteuerung starten per Codewort (Spielername 1,20,Triple 1)
- Soundeffekte 180
- Match- & Turnierverwaltung



Ligamodus: Jeder gegen jeden (Round Robin)

Spielplan automatisch erstellen


## Update 2025-11-14
- `doku.md` ergänzt eine kompakte Projektdokumentation inkl. Setup, Voice-Befehlen, Turnier/Leaderboard sowie jetzt auch detaillierter Trainingsbeschreibung.
- Trainingskarte unterstützt nun zwei Modi: Around the Clock (mit Varianten) und das 121 Game (Checkout-Challenge mit 9 Darts, automatischer Bestwert- und Verlaufs-Tracking).
- UI angepasst (Modus-Auswahl, Statusanzeigen, Verlauf) sowie Logik in `app.js` erweitert, damit Treffer/Fehlwurf-Buttons zwischen Zahlenlauf und 121-Session unterscheiden.
