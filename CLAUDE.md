# Projektregeln für Claude

Isometrischer Dungeon-Crawler im Browser (Three.js, Low-Poly-3D). Christian entwickelt das Spiel
mit Claude. Er programmiert nicht selbst: Claude schreibt den Code, Christian testet im Browser
und trifft die Designentscheidungen.

## Verbindliche Grundlage

- `docs/GDD.md` ist das Game Design Document und die einzige Quelle für Spielregeln und Mechanik.
- Erfinde keine neuen Regeln. Wenn eine Aufgabe eine Mechanik braucht, die im GDD fehlt oder
  unklar ist, frage Christian mit konkreten Optionen und einer Empfehlung, bevor du sie baust.
- Hat Christian in einer Sitzung etwas entschieden, trage es in `docs/GDD.md` ein (passender
  Abschnitt und Liste „Getroffene Entscheidungen“) und weise ihn darauf hin, dass er die
  Änderung auch in sein GDD in Claude Docs übernehmen sollte.
- Inhalte gehören in Daten, nicht in Code: Raumtypen, Events, Monster und Gegenstände liegen ab
  Meilenstein 4 als JSON in `data/`. Neue Effekt-Typen oder Bedingungen werden zuerst im GDD
  festgelegt, dann programmiert, dann in Events genutzt.

## Meilensteine

1–3 sind erledigt (Raum, Türen und Raumwechsel, Dungeon-Generator mit Seed, Minimap, Schnellreise).
Nächster Schritt ist Meilenstein 4: Event-System aus JSON mit Textfenster und Proben.
Die Liste aller Meilensteine steht im GDD.

## Technik

- Kein Build-Schritt. Statische Dateien, direkt über GitHub Pages ausgeliefert.
- Three.js r128 wird per `<script>` aus cdnjs geladen und ist als `window.THREE` verfügbar.
  Die Spiellogik besteht aus ES-Modulen in `src/`, Einstieg ist `src/main.js`.
- Lokal starten: `npm start` und dann http://localhost:8000 öffnen (Module brauchen einen Server).
- Tests: `npm test` (Node, ohne Abhängigkeiten). Reine Logik wie Generator und Wegfindung bleibt
  frei von Three.js, damit sie testbar ist. Für neue Logik passende Tests in `tests/` ergänzen.

## Aufbau

| Datei | Inhalt |
| --- | --- |
| `src/config.js` | Konstanten: Raumgröße 15×15, Türen als Bitmaske, Raster-Helfer |
| `src/generator.js` | Dungeon-Generator (Random Walk, Raumtypen, Ausgang), rein logisch |
| `src/pathfinding.js` | A*-Wegfindung, rein logisch |
| `src/rng.js` | Seed-basierte Zufallszahlen und Würfel |
| `src/state.js` | gemeinsamer Spielzustand |
| `src/roomTypes.js` | Raumtypen (Name, Farben); wird in Meilenstein 4 durch `data/` ergänzt |
| `src/roomBuilder.js` | baut einen Raum als 3D-Szene inklusive Einrichtung |
| `src/player.js` | Zwergenkrieger (Platzhalter aus Grundformen) |
| `src/movement.js` | Laufbewegung entlang des Weges |
| `src/events.js` | Test-Events Truhe und Abstieg (wird in Meilenstein 4 ersetzt) |
| `src/dialog.js` | Textfenster mit Optionen und Würfelergebnis |
| `src/hud.js` | Infotafel und Minimap |
| `src/main.js` | Ablauf, Raumwechsel, Schnellreise, Eingabe, Spielschleife |

## Feste Regeln im Code

- Die Einrichtung eines Raums lässt das Kreuz aus Reihe und Spalte 6 bis 8 frei, damit alle
  Türen immer erreichbar sind. Neue Möbel nur außerhalb dieses Kreuzes platzieren.
- Alles, was reproduzierbar sein muss (Dungeon, Einrichtung), läuft über Seeds aus `rng.js`.
  `Math.random()` nur für Würfelwürfe im Spiel.
- Grafik bleibt bis Meilenstein 6 im Platzhalter-Stil (Grundformen, Flat Shading).

## Zusammenarbeit mit Christian

- Antworte auf Deutsch, in einfacher Sprache ohne Fachjargon.
- Beende jede Aufgabe mit einer kurzen Liste, was neu ist und was Christian im Spiel testen soll.
- Commit-Nachrichten auf Deutsch, kurz und beschreibend.
