# Dungeon Gametest

Ein isometrischer Dungeon-Crawler im Browser: frei erkunden, zufällig generierte Dungeons,
Events in jedem Raum, gelöst über ein Textfenster mit vereinfachten Pen-&-Paper-Regeln.

**Spielen:** https://herrjakob-games.github.io/dungeon-gametest/

## Stand

Meilensteine 1 bis 3 sind fertig: Räume mit 15×15 Kacheln, Klick-Bewegung mit Wegfindung, Türen und
Raumwechsel, Dungeon-Generator mit Seed (12 bis 20 Räume), Minimap mit Schnellreise, Truhe und Abstieg
als Test-Events. Alle Regeln stehen im [Game Design Document](docs/GDD.md).

## Lokal starten

```bash
npm start   # startet einen kleinen Webserver
npm test    # prüft den Dungeon-Generator mit 3.000 Seeds
```

Danach http://localhost:8000 im Browser öffnen.
