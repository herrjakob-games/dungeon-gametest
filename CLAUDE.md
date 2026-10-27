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
- Inhalte gehören in Daten, nicht in Code: Raumtypen, Events, Monster, Völker, Gegenstände und Texte
  liegen als JSON in `data/`. `npm test` prüft alle Daten gegen das Regelwerk. Neue Effekt-Typen oder Bedingungen werden zuerst im GDD
  festgelegt, dann programmiert, dann in Events genutzt.

## Meilensteine

1–5 sind erledigt (Raum, Türen und Raumwechsel, Dungeon-Generator mit Seed, Minimap, Schnellreise,
Event-System aus JSON mit Proben-Kategorien, Volkswahl, Rundenkampf, Inventar, Stufenaufstieg, Tod mit
Endbildschirm, endlose Ebenen). Dazu kommt „Themen und Ebenen“: Themen je drei Ebenen, 25 Raumtypen mit
Lage- und Anzahlregeln, Bosse, Rastplatz und Händler. Monster, Bosse, Gegenstände der Stufen 5 und 6 und die
Events der neuen Raumtypen sind Platzhalter (`"placeholder": true` bzw. Text „[Platzhalter]“), die das
Content-Projekt ersetzt. Nächster Schritt ist Meilenstein 6: echte Assets, Animationen und Licht.
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
| `src/config.js` | Konstanten: Raumgröße 11×11, Türen als Bitmaske, Raster-Helfer |
| `src/generator.js` | Ebenen-Generator (Größe nach Tiefe, Random Walk, Raumtypen nach Thema, Lage- und Anzahlregeln), rein logisch |
| `src/world.js` | Themen und Ebenen: Thema je Tiefe, Größe, Anteil feindlicher Räume, Boss, Rastplatz, Monster-Wachstum; rein logisch |
| `src/shop.js` | Händler: Preise, Angebot, Kaufen, Verkaufen; rein logisch |
| `src/pathfinding.js` | A*-Wegfindung, rein logisch |
| `src/rng.js` | Seed-basierte Zufallszahlen und Würfel |
| `src/state.js` | gemeinsamer Spielzustand |
| `data/themes.json` | Themen: Name, Stufe, Proben-Zuschlag, Raumtypen, Nachbar des Starts, Monster, Boss, Regel-Ausnahmen (`overrides`) |
| `data/room-types.json` | Raumtypen: Name, Farben, Einrichtung als Daten (`decor`, `themeDecor`) oder altes Muster (`layout`), Bewertung, Lage- und Anzahlregeln, Event-Chance, Event-Tabelle; beim Bossraum Tabellen pro Thema (`themeEvents`) |
| `data/events.json` | alle Events (auch die Truhe) |
| `data/monsters.json` | Monster und Bosse mit Lebenspunkten, Rüstung, Angriff, Schaden, Satz zur Todesursache |
| `data/characters.json` | Völker: Attribute, Lebenspunkte, LP je Stufe, Fähigkeit, Startausrüstung, Modell |
| `data/items.json` | Gegenstände mit Rang 1–6, Preis (`preis`), Schaden/Rüstung/Nutzen, Mindestattribut und Volk (`req`); erzeugt aus `data/gegenstaende.csv` |
| `data/gegenstaende.csv` | Gegenstandsliste als Tabelle (Quelle für `items.json`) |
| `data/texts.json` | Sätze zur Todesursache bei Events, eigene Sätze pro Event unter `death.events` |
| `src/data.js` | lädt `data/*.json` und prüft die Daten |
| `src/eventLogic.js` | Event-Regeln: Proben-Kategorien, Auswahl, Effekte, Beute, Bedingungen, Datenprüfung; rein logisch |
| `src/character.js` | Figur: Volk, Inventar, Anlegen, Stufenaufstieg, Fähigkeit; rein logisch |
| `src/combat.js` | Rundenkampf: Angriff, Gegnerzug, Verteidigen, Gegenstände, Flucht, Tiefe; rein logisch |
| `src/roomTypes.js` | Raumtypen-Tabelle, befüllt aus `data/room-types.json` |
| `src/decor.js` | Einrichtung als Daten: Requisiten-Größen, Platzierung (`center`, `wall-back`, `corner`, `free`, `around:`, `above:`), Wendeltreppen, Erreichbarkeit, Datenprüfung; rein logisch |
| `src/props.js` | Requisiten und Wendeltreppen aus Grundformen |
| `src/roomBuilder.js` | baut einen Raum als 3D-Szene: Boden, Wände, Türen, Fackeln, Wendeltreppe, Einrichtung (aus `decor.js` oder altes Muster) |
| `src/player.js` | Spielfigur, Platzierung; `setFigure(volk)` tauscht das Modell |
| `src/figures.js` | Platzhalterfiguren der Völker: Zwerg, Elf, Mensch (Grundformen) |
| `src/movement.js` | Laufbewegung entlang des Weges |
| `src/events.js` | Event-Ablauf im Textfenster, Proben-Zuschlag, Fundstücke, Stufenaufstieg, Tod, Truhe, Boss, Rastplatz, Abstieg |
| `src/combatUI.js` | Kampf im Textfenster |
| `src/checkUI.js` | Würfelzeile und Angebot der Volks-Fähigkeit |
| `src/inventory.js` | Ausrüstungs- und Rucksack-Feld oben rechts |
| `src/shopUI.js` | Händler im Textfenster |
| `src/screens.js` | Volkswahl und Endbildschirm |
| `src/dialog.js` | Textfenster mit Optionen, Würfelergebnis und Effektzeilen |
| `src/hud.js` | Infotafel (Werte der Figur) und Minimap |
| `src/main.js` | Ablauf, Raumwechsel, Schnellreise, Eingabe, Spielschleife |

## Feste Regeln im Code

- Einrichtung als Daten (`decor`): Türkacheln und die Kachel davor bleiben frei, jede Tür und jedes anklickbare
  Objekt bleibt erreichbar; passt ein Requisit nicht, lässt `decor.js` es weg. `tests/decor.test.mjs` prüft das
  für alle Varianten und Türkombinationen. Das alte Muster in `furnish()` lässt weiter das Kreuz aus Reihe und
  Spalte 4 bis 6 (gezählt ab 0) frei.
- Wendeltreppen belegen die Raummitte, gezählt ab 0 die Kacheln 3 bis 7 (im GDD ab 1 gezählt: 4 bis 8).
- Alles, was reproduzierbar sein muss (Dungeon, Einrichtung), läuft über Seeds aus `rng.js`.
  `Math.random()` nur für Würfelwürfe im Spiel.
- Grafik bleibt bis Meilenstein 6 im Platzhalter-Stil (Grundformen, Flat Shading).

## Zusammenarbeit mit Christian

- Antworte auf Deutsch, in einfacher Sprache ohne Fachjargon.
- Beende jede Aufgabe mit einer kurzen Liste, was neu ist und was Christian im Spiel testen soll.
- Commit-Nachrichten auf Deutsch, kurz und beschreibend.
