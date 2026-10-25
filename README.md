# Dungeon Gametest

Ein isometrischer Dungeon-Crawler im Browser: frei erkunden, zufällig generierte Dungeons,
Events in jedem Raum, gelöst über ein Textfenster mit vereinfachten Pen-&-Paper-Regeln.

**Spielen:** https://herrjakob-games.github.io/dungeon-gametest/

## Stand

Meilensteine 1 bis 4 sind fertig: Räume mit 11×11 Kacheln, Klick-Bewegung mit Wegfindung, Türen und
Raumwechsel, Dungeon-Generator mit Seed (12 bis 20 Räume), Minimap mit Schnellreise und ein Event-System:
Raumtypen, Events und Monster liegen als JSON in `data/`, Proben werden im Textfenster gewürfelt.
Alle Regeln stehen im [Game Design Document](docs/GDD.md).

## Lokal starten

```bash
npm start   # startet einen kleinen Webserver
npm test    # prüft Dungeon-Generator, Event-Regeln und die Daten in data/
```

Danach http://localhost:8000 im Browser öffnen.
