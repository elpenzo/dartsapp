# friendDartBoard – Kurz-Dokumentation

## Überblick
- Sprachgesteuerte 501/301-Darts-App für Tablets, Laptops oder Touch-Displays direkt am Board.
- Fokus auf Freihand-Bedienung: Spielstände, Ansagen und Busts werden per Sprache erkannt, manuelle Eingaben dienen als Fallback.
- Einfache Express-API sorgt für persistente Spielerprofile (lokale Datei oder Azure Table Storage) und liefert die Single-Page-App aus.

## Projektstruktur
- `index.html`, `styles.css`, `app.js`: Hauptoberfläche inkl. Setup-Formular, Scoreboard, Turnier- und Leaderboard-Ansichten, Voice-Konsole, Hot-Board sowie Audio-Feedback.
- `profile.html`, `profile-page.js`: Öffentliche Profil-Detailseite (`/profile.html?id=<profil-id>`) mit Statistiken, History und Avatar.
- `server.js`: Express-Server, JSON-API unter `/api/profile-storage` und `/api/profiles`, statische Auslieferung.
- `lib/profilesStore.js`: Abstraktion für lokale JSON-Datei (`data/profiles.json`) und Azure Table Storage (Chunking der Profilbilder).
- `data/`: Audio-Snippets (Chase the Sun, Hymne, 180-Sound) und Default-Profilliste.

## Installation & Start
1. Node.js 18+ installieren (unterstützt lokale `fetch`-Aufrufe und moderne Syntax).
2. Abhängigkeiten holen: `npm install`.
3. Optionale Umgebungsvariablen setzen:
   - `PORT`: abweichender HTTP-Port.
   - `PROFILE_STORAGE_MODE`: `file` oder `azure` (Default: bevorzugt Azure, sonst Datei).
   - `AZURE_STORAGE_CONNECTION_STRING` / `AZURE_TABLES_CONNECTION_STRING` und `AZURE_TABLE_NAME`: für Azure Table Storage.
4. Entwicklung starten: `npm start` → Express auf `http://localhost:3000`.
5. Nur statisches Preview? `npm run serve:static` nutzt `serve` und benötigt kein Backend (Profile werden dann ausschließlich aus `localStorage` gelesen).

## Bedienung & Spielablauf
### Setup & Scoreboard
- Bis zu vier Spieler konfigurieren (optional Profile auswählen). Startwerte 501/301 und Checkout-Regeln (Single oder Double Out) werden im Formular gesetzt.
- Match-Modi: Einzel-Leg oder Best-of-3-Legs; UI zeigt Sätze/Legs sowie aktiven Spielerbanner.
- Scoreboard liefert Heatmap, Hot-Number-Board, Combo-Buttons und Turn-History (inkl. Bust-Markierung, Checkout-Info, Set/Leg-Kontext).
- Undo/Reset/Rematch jederzeit möglich; Audioeffekte signalisieren große Scores oder Matchgewinn.

### Sprachsteuerung
- Aktivierung über „Listen“-Button – anschließend das Wake-Word `hey siri` nennen (frei definierter Code) → App ist 15 s lang aufnahmebereit.
- Unterstützte Befehlsarten:
  - Einzelne Darts: „Triple zwanzig“, „Double sechzehn“, „Bull“ (inkl. Bullseye-Erkennung).
  - Aggregierte Scores: „140“, „85“, „null“.
  - Steuerbefehle: „Bust“, „Rückgängig“, „Neues Leg“, „Neues Spiel“.
  - Sequenzen mit „und/plus“ oder Kommata: „Triple zwanzig und Double 16“.
- Interpretation basiert auf Web Speech API (Chrome/Edge); bei Browsern ohne Support liefert die Voice-Konsole Hinweise und Nutzer:innen greifen auf manuelle Buttons zurück.

### Training
- Umschaltbare Modi direkt in der Training-Karte: „Around the Clock“ (1–20 + Single Bull) und neu „121 Game“.
- Around the Clock: Variante wählen (Dartboard-Reihenfolge oder numerisch), mit „Treffer“ markierst du jede Zahl; „Fehlwurf“ zählt Darts weiter. Nach 22 Treffern wird der Run automatisch gespeichert.
- 121 Game: Checkout-Challenge – starte bei 121 Punkten und hast 9 Darts pro Versuch. „Checkout geschafft“ markiert einen Erfolg (nächstes Ziel +1, Bestwert aktualisiert), „Fehlwurf“ zählt nur den Dart. Sind 9 Darts verbraucht, wird das Ziel automatisch um 10 Punkte gesenkt (niemals unter 121) und ein Versuch verbucht.
- Reset während eines aktiven 121-Trainings speichert die Session im Verlauf (Bestes Ziel, Anzahl Checkouts/Versuche, Gesamtdarts, Dauer). Around-the-Clock-Runs landen weiterhin automatisch nach erfolgreichem Durchlauf im Verlauf.
- Die Statusleiste zeigt je Modus passende Kennzahlen (Serie bzw. bestes Ziel, verbleibende Darts, Gesamtdarts, Zeit) und das Zielpanel blendet Meta-Infos wie Restdarts und Bestwert ein.

### Turnier & Leaderboard
- Turnierkarte verwaltet bis zu 16 Spieler:innen samt Profilzuordnung, erzeugt KO-Baum (Achtel- bis Finale) und aktualisiert Status nach jedem Ergebnis.
- Leaderboard-Karte sortiert Spielerprofile nach Average, Legs/Sets oder Checkout-Quote und greift dabei auf gespeicherte Statistiken zurück.

### Profile & Datenpflege
- Profile enthalten Stammdaten, Spitznamen, Bilder (Base64) sowie Stats (Averages, Checkout, Dart-Histogramme, Best-3-Dart-Set).
- Verwaltung erfolgt innerhalb der App (Profilmanager: anlegen, bearbeiten, löschen, Import/Export von JSON) und wird serverseitig persistent gespeichert.
- Externe Darstellung via `profile.html?id=<id>` inklusive History-Ribbon und Segment-Histogramm.

## Datenhaltung & APIs
- **Lokale Datei**: `data/profiles.json` wird beim ersten Start erzeugt (siehe `createFileProfilesStore`). Ideal für Offline-Läufe.
- **Azure Table Storage**: Tabellenname frei konfigurierbar; Profilmetadaten + Bild-Chunks werden pro Partition (`profile.id`) gespeichert, Delta-Sync sorgt für Löschung verwaister Einträge.
- **API-Routen**:
  - `GET /api/profile-storage` → aktueller Speicher + verfügbare Modi.
  - `POST /api/profile-storage` `{ "mode": "file" | "azure" }` → Wechsel inkl. `ensureReady`.
  - `GET /api/profiles` → Liste aller Profile.
  - `POST /api/profiles` `{ profiles: [...] }` → persistiert komplette Liste (Client sendet gesamte Sammlung).
- Frontend cached ein Abbild in `localStorage` (`dartsProfiles`) als Offline-Fallback; `profile-page.js` liest zuerst vom Server, anschließend lokal.

## Erweiterungshinweise
- Sprachbefehle lassen sich in `interpretSegment`, `parseDartPhrase` und `containsCommand` erweitern (z. B. weitere Codewörter oder mehrsprachige Zahlen).
- Neue Audio- oder Layout-Optionen: Assets kommen in `data/`, UI-Controls sind modular über `view-toggle`, `layout-toggle` und Theme-Switch realisiert.
- Für zusätzliche Persistenzlayer (REST, DB) genügt eine weitere Implementierung im Stil von `createAzureProfilesStore` + Registrierung im `storageProviders`-Objekt.

## Voraussetzungen & Troubleshooting
- Web Speech API benötigt HTTPS bzw. `localhost` und Nutzerfreigabe für das Mikrofon. Falls Recognition fehlschlägt, zeigt die Voice-Konsole Status (Info/Error) und empfiehlt manuellen Input.
- Die App ist offline-first: Netzwerkverlust beeinträchtigt nur das Synchronisieren der Profile; laufende Legs, Turnierbäume und Leaderboards bleiben im Speicher.
- Bei Konflikten zwischen Browser-Cache und Serverdaten einfach im Profilmanager „Neu laden“ bzw. `localStorage` löschen (`Application → Local Storage → dartsProfiles`).
