# Projektregeln für Claude

Isometrischer Dungeon-Crawler im Browser (Three.js, Low-Poly-3D). Christian entwickelt das Spiel
mit Claude. Er programmiert nicht selbst: Claude schreibt den Code, Christian testet im Browser
und trifft die Designentscheidungen.

## Verbindliche Grundlage

- `docs/GDD.md` ist das Game Design Document und die einzige Quelle für Spielregeln und Mechanik.
- Erfinde keine neuen Regeln. Wenn eine Aufgabe eine Mechanik braucht, die im GDD fehlt oder
  unklar ist, frage Christian mit konkreten Optionen und einer Empfehlung, bevor du sie baust.
- Hat Christian in einer Sitzung etwas entschieden, trage es in `docs/GDD.md` ein (passender
  Abschnitt, Liste „Getroffene Entscheidungen“ und Versionstabelle). `docs/GDD.md` ist die einzige
  gepflegte Fassung; eine Kopie in Claude Docs gibt es nicht mehr.
- Inhalte gehören in Daten, nicht in Code: Raumtypen, Events, Monster, Völker, Gegenstände und Texte
  liegen als JSON in `data/`. `npm test` prüft alle Daten gegen das Regelwerk. Neue Effekt-Typen oder Bedingungen werden zuerst im GDD
  festgelegt, dann programmiert, dann in Events genutzt.

## Meilensteine

1–5 sind erledigt (Raum, Türen und Raumwechsel, Dungeon-Generator mit Seed, Minimap, Schnellreise,
Event-System aus JSON mit Proben-Kategorien, Volkswahl, Rundenkampf, Inventar, Stufenaufstieg, Tod mit
Endbildschirm, endlose Ebenen). Dazu kommt „Themen und Ebenen“: Themen je drei Ebenen, 25 Raumtypen mit
Lage- und Anzahlregeln, Bosse, Rastplatz und Händler. Monster, Bosse, Gegenstände der Stufen 5 und 6 und die
Events der neuen Raumtypen sind Platzhalter (`"placeholder": true` bzw. Text „[Platzhalter]“), die das
Content-Projekt ersetzt. Meilenstein 6a (echte Modelle für Umgebung und Requisiten des Kellers, Licht nach Stilguide)
ist umgesetzt; was noch kein Modell hat, bleibt Platzhalter. Meilenstein 6b (Figuren und Animationen) läuft: Die Spielfiguren der drei Völker kommen aus KayKit Adventurers
(Stand und Laufen animiert); die Monster sind noch Grundformen.
Die Liste aller Meilensteine steht im GDD.

## Technik

- Kein Build-Schritt. Statische Dateien, direkt über GitHub Pages ausgeliefert.
- Three.js r128 wird per `<script>` aus cdnjs geladen und ist als `window.THREE` verfügbar, der passende
  `GLTFLoader` und `SkeletonUtils` liegen in `vendor/three/`.
- Modelle: `assets/` (Rohdateien der Pakete in `assets/source/`, Quellen in `assets/CREDITS.md`). `npm run build:assets`
  baut aus `tools/asset-recipes.json` die Dateien in `assets/tiles/`, `assets/props/` und `assets/figures/` (braucht einmal `npm install`);
  das Spiel selbst braucht keinen Build-Schritt. Zuordnung in `data/models.json`. `tools/palette-texture.py` erzeugt
  die erste Fassung der Paletten-Textur.
  Die Spiellogik besteht aus ES-Modulen in `src/`, Einstieg ist `src/main.js`.
- Lokal starten: `npm start` und dann http://localhost:8000 öffnen (Module brauchen einen Server).
- Testmodus, lokal und auf GitHub Pages: `?event=<id>` startet das Event im ersten passenden Raum, `?room=<raumtyp-id>` betritt
  den ersten passenden Raum (Bossraum mit `&sieg=1` nach dem Sieg), `?grid=1` zeigt die Kachelnamen x|y, `?fight=<monster-id>` einen Kampf
  in der Vorkammer, optional `&volk=zwerg|elf|mensch`.
- Tests: `npm test` (Node, ohne Abhängigkeiten). Reine Logik wie Generator und Wegfindung bleibt
  frei von Three.js, damit sie testbar ist. Für neue Logik passende Tests in `tests/` ergänzen.

## Aufbau

| Datei | Inhalt |
| --- | --- |
| `src/config.js` | Konstanten: Raumgröße 9×9, Türen als Bitmaske, Raster-Helfer, Kachelnamen x\|y (`tileName`) |
| `src/generator.js` | Ebenen-Generator (Größe nach Tiefe, Random Walk, Raumtypen nach Thema, Lage- und Anzahlregeln), rein logisch |
| `src/world.js` | Themen und Ebenen: Thema je Tiefe, Größe, Anteil feindlicher Räume, Boss, Rastplatz, Monster-Wachstum; rein logisch |
| `src/shop.js` | Händler: Preise, Angebot, Kaufen, Verkaufen; rein logisch |
| `src/pathfinding.js` | A*-Wegfindung, rein logisch |
| `src/rng.js` | Seed-basierte Zufallszahlen und Würfel |
| `src/state.js` | gemeinsamer Spielzustand |
| `data/themes.json` | Themen: Name, Stufe, Proben-Zuschlag, Raumtypen, Nachbar des Starts, Monster, Boss, Regel-Ausnahmen (`overrides`), Palette (`palette`, `roomPalettes`) |
| `data/room-types.json` | Raumtypen: Name, Farben, Einrichtung als Daten (`decor`, `themeDecor`) oder altes Muster (`layout`), Bewertung, Lage- und Anzahlregeln, Event-Chance, Event-Tabelle; beim Bossraum Tabellen pro Thema (`themeEvents`) |
| `data/events.json` | alle Events (auch die Truhe), Figuren beim Event-Start (`figures`) |
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
| `src/props.js` | Requisiten und Wendeltreppen aus Grundformen (Platzhalter, wenn ein Modell fehlt) |
| `src/models.js` | Modell-Lader: `data/models.json`, Paletten-Textur des Themas, Klone pro Instanz, Figuren mit Animationen (`makeFigureModel`), Rückfall auf Platzhalter |
| `src/outline.js` | goldene Umrisslinie für anklickbare Objekte beim Überfahren mit der Maus |
| `data/models.json` | Zuordnung der Modelle: Datei, Maßstab, Drehung, Versatz, Einfärbung (`tint`), Lichtpunkte |
| `src/figurePlan.js` | Figuren im Raum: Figurenliste (Größe, Varianten), Platzierung für `figures` (inkl. `near:`), Platz im Kampf, Datenprüfung; rein logisch |
| `src/monsterFigures.js` | Figuren der Monster und der Kröte aus Grundformen, Ersatzfigur für Monster ohne eigene Figur |
| `src/roomFigures.js` | Figuren im Raum: erscheinen, laufen, wippen, zucken, versinken, huschen davon; `stay` |
| `src/roomBuilder.js` | baut einen Raum als 3D-Szene: Boden, Wände, Türen, Fackeln, Wendeltreppe, Einrichtung (aus `decor.js` oder altes Muster) |
| `src/player.js` | Spielfigur, Platzierung; `setFigure(volk)` tauscht das Modell (KayKit-Figur oder Platzhalter), `animateFigure` wechselt Stehen und Laufen |
| `src/figures.js` | Platzhalterfiguren der Völker aus Grundformen (Rückfall, wenn ein Modell fehlt) |
| `src/movement.js` | Laufbewegung entlang des Weges |
| `src/events.js` | Event-Ablauf im Textfenster, Proben-Zuschlag, Fundstücke, Stufenaufstieg, Tod, Truhe, Boss, Rastplatz, Abstieg |
| `src/combatUI.js` | Kampf im Textfenster |
| `src/checkUI.js` | Würfelzeile und Angebot der Volks-Fähigkeit |
| `src/inventory.js` | Ausrüstungs- und Rucksack-Feld oben rechts |
| `src/shopUI.js` | Händler im Textfenster |
| `src/screens.js` | Volkswahl und Endbildschirm |
| `src/dialog.js` | Textfenster mit Optionen, Würfelergebnis und Effektzeilen |
| `src/hud.js` | Infotafel (Werte der Figur) und Minimap |
| `src/gridOverlay.js` | Testhilfe `?grid=1`: Kachelnamen x\|y auf dem Boden |
| `src/main.js` | Ablauf, Raumwechsel, Schnellreise, Eingabe, Spielschleife, Testmodus |

## Feste Regeln im Code

- Einrichtung als Daten (`decor`): Türkacheln und die Kachel davor bleiben frei, jede Tür und jedes anklickbare
  Objekt bleibt erreichbar; passt ein Requisit nicht, lässt `decor.js` es weg. `tests/decor.test.mjs` prüft das
  für alle Varianten und alle 16 Türkombinationen, dazu die Pflichtstücke (`required`); Korrekturablauf siehe GDD.
  Das alte Muster in `furnish()` lässt das Kreuz aus Reihe und Spalte 3 bis 5 (gezählt ab 0) frei.
- Kacheln heißen im GDD x|y, ab 1 gezählt; im Code zählen x und z ab 0 (`tileName(x, z)` übersetzt).
- Wendeltreppen belegen die Nordwest-Ecke 1|1 bis 3|3 (gezählt ab 0: 0 bis 2), Start auf 4|4.
- Alles, was reproduzierbar sein muss (Dungeon, Einrichtung), läuft über Seeds aus `rng.js`.
  `Math.random()` nur für Würfelwürfe im Spiel.
- Grafik nach Stilguide „Knetkeller“ (GDD): Teile mit Modell kommen aus `data/models.json`, alle anderen bleiben
  Platzhalter aus Grundformen. Neues Modell einbinden: Datei nach `assets/props/<id>.glb`, Eintrag in `data/models.json`.
- Licht: Halbkugellicht mit dem Grundlicht der Palette (`data/themes.json`, `palette`, `roomPalettes`), Fackeln neben
  jeder Tür, höchstens zwei schattenwerfende Lichter pro Raum (heute nur das schwache Licht von oben). Werte heute: Halbkugellicht 0,32, Licht von oben 0,12,
  Fackeln 1,8 mit 6 Kacheln Reichweite; die Ecken liegen damit bei etwa 15 bis 35 % der hellsten Stelle am Boden.

## Zusammenarbeit mit Christian

- Antworte auf Deutsch, in einfacher Sprache ohne Fachjargon.
- Beende jede Aufgabe mit einer kurzen Liste, was neu ist und was Christian im Spiel testen soll.
- Commit-Nachrichten auf Deutsch, kurz und beschreibend.
