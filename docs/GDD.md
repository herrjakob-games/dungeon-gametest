# Dungeon-Spiel – Game Design Document

Stand: 25.10.2026 · Quelle: Claude Docs (https://claude.ai/artifact/2r7ivDuaJWGdaeh6LpReZK)

## Vision und Core Loop

Ein Dungeon-Crawler im Browser in Low-Poly-3D mit isometrischer Ansicht. Der Spieler erkundet frei, und in jedem Raum kann ein Event aus der Tabelle des Raumtyps ausgelöst werden. Events werden rundenbasiert über Auswahl im Textfenster gelöst, mit vereinfachten Pen-&-Paper-Regeln.

Ablauf eines Raums:

1. Der Spieler betritt einen Raum durch eine Tür.
2. Das Spiel würfelt gegen die Event-Chance des Raumtyps.
3. Kein Event: Der Spieler erkundet frei (Truhen, Gegenstände, Türen).
4. Event: Die Erkundung pausiert, das Textfenster zeigt Beschreibung und Optionen, Proben laufen Runde für Runde.
5. Folgen werden angewendet: Schaden, Beute, Erfahrung, Türzustand.
6. Der Spieler wählt eine Tür und betritt den nächsten Raum.

Ziel eines Durchlaufs ist der Ausgang. Bossgegner und Artefakte können als Events vorkommen, sind aber kein Pflichtziel. Stirbt der Spieler, beginnt ein neuer Durchlauf mit neuem Dungeon (Permadeath). Setting ist klassische Fantasy mit humorvollem Ton.

## Technische Eckdaten

Das Spiel läuft im Browser auf Basis von Three.js. Claude schreibt den Code, Christian testet.

| Bereich | Entscheidung |
| --- | --- |
| Plattform | Browser, nur Desktop |
| 3D-Bibliothek | Three.js (WebGL) |
| Kamera | Orthografisch, fester Iso-Winkel (45° gedreht, ca. 35° geneigt) |
| Modelle | Low-Poly im Format glTF/GLB, Startpaket KayKit (CC0, mit Animationen) |
| Spieldaten | JSON-Dateien für Raumtypen, Events, Monster und Gegenstände |
| Text-UI | HTML-Fenster über der 3D-Szene |
| Entwicklung | Claude Code mit GitHub-Repository |
| Veröffentlichung | GitHub Pages oder itch.io |

Grundregel: Inhalte stehen in den JSON-Dateien, nicht im Code. Neue Räume und Events brauchen dadurch keine Programmierung.

## Raster, Räume, Türen, Generierung

Der Dungeon ist ein Gitter aus Raumplätzen, jeder Raum ein Gitter aus Kacheln. Ein Raum hat einen Typ und null bis vier Türen.

- **Raumgröße:** 15×15 Kacheln für alle Räume. Türen sitzen mittig auf der jeweiligen Seite, also auf der achten Kachel.
- **Türen als Bitmaske:** Norden = 1, Osten = 2, Süden = 4, Westen = 8. Ein Raum mit Türen nach Norden und Osten hat den Wert 3. Daraus ergeben sich 16 Raumformen. Werte 1, 2, 4 und 8 sind Sackgassen.
- **Dungeongröße:** 12 bis 20 Räume auf einem Gitter von 8×8 Plätzen.
- **Generierung:** Ein Random Walk startet im Startraum und legt Räume an, bis die Zielanzahl erreicht ist. Jede Verbindung setzt die Tür in beiden Räumen.
- **Raumtypen verteilen:** Startraum fest. Der Ausgang liegt im Raum mit dem größten Abstand zum Start. Schatzkammern bevorzugt in Sackgassen. Alle übrigen Räume per gewichtetem Zufall.
- **Seed:** Jeder Dungeon entsteht aus einer Startzahl. Gleicher Seed ergibt gleichen Dungeon, das macht Fehler nachstellbar.

## Bewegung und Erkundung

Das Spiel kennt zwei Modi: freie Erkundung in Echtzeit und rundenbasierte Events im Textfenster.

- **Klick zum Bewegen:** Der Spieler klickt auf eine Kachel, die Figur läuft per Wegfindung (A\*) dorthin. Säulen, Truhen und Möbel blockieren Kacheln.
- **Interaktion:** Klick auf ein Objekt lässt die Figur hinlaufen und interagieren, etwa eine Truhe öffnen.
- **Raumwechsel:** Klick auf eine Tür. Das Bild blendet kurz ab, die Figur steht im neuen Raum an der gegenüberliegenden Tür.
- **Kamera:** Zentriert auf den aktuellen Raum. Die vorderen Wände sind ausgeblendet, damit nichts die Figur verdeckt.
- **Modus-Wechsel:** Löst ein Event aus, stoppt die Bewegung und das Textfenster übernimmt. Events gibt es nur beim ersten Betreten eines Raums, danach durchläuft der Spieler ihn ohne neues Event.
- **Minimap:** Zeigt besuchte Räume und bekannte Türen. Ein Klick auf einen besuchten Raum reist sofort mit Abblende dorthin, ohne Kosten. Die Figur erscheint in der Raummitte, ist diese blockiert, auf dem nächsten freien Feld. Unbesuchte Räume sind kein Reiseziel. Während eines Events oder Kampfes ist die Schnellreise gesperrt.

## Regelwerk

Drei Attribute, ein W20 und feste Schwierigkeiten. Das Regelwerk ist so beschlossen.

| Attribut | Wofür | Wertebereich |
| --- | --- | --- |
| Kraft | Nahkampf, Türen aufbrechen, schwere Dinge bewegen | −1 bis +3 |
| Geschick | Ausweichen, Fallen entschärfen, Schlösser, Flucht | −1 bis +3 |
| Verstand | Magie, Rätsel, Wahrnehmung, Gespräche | −1 bis +3 |

- **Probe:** W20 + Attribut gegen Schwierigkeit. Leicht 8, mittel 12, schwer 16. Der Wurf wird im Textfenster angezeigt.
- **Lebenspunkte:** Start mit 12. Tränke und Rasten heilen.
- **Kampfrunde:** Der Spieler wählt Angreifen (Kraft gegen Rüstung des Gegners), Verteidigen (Rüstung +2 bis zur nächsten Runde), Gegenstand nutzen oder Fliehen (Geschick-Probe, Rückzug durch die zuletzt genutzte Tür). Danach handelt der Gegner.
- **Gegner:** Lebenspunkte, Rüstungswert, Angriffsbonus, Schaden (z. B. W6).
- **Fortschritt:** Erfahrung aus Events. Beim Stufenaufstieg +1 auf ein Attribut und +3 Lebenspunkte.
- **Inventar:** Sechs Plätze.

## Raumtypen und Event-System

Jeder Raumtyp hat eine Event-Chance und eine gewichtete Event-Tabelle. Jedes Event besteht aus Text, Optionen, Proben und Effekten.

**Raumtyp:**

```json
{
  "id": "crypt",
  "name": "Gruft",
  "eventChance": 0.6,
  "events": [
    { "id": "skeleton_ambush", "weight": 5 },
    { "id": "cursed_sarcophagus", "weight": 2, "once": true },
    { "id": "whispering_voice", "weight": 3, "condition": "hasItem:torch" }
  ]
}
```

**Event:**

```json
{
  "id": "cursed_sarcophagus",
  "type": "choice",
  "text": "Ein steinerner Sarkophag. Der Deckel ist einen Spalt verschoben.",
  "options": [
    {
      "label": "Deckel aufstemmen",
      "check": { "attr": "kraft", "dc": 12 },
      "success": { "text": "Darin liegt ein Amulett.", "effects": [{ "loot": "tier1" }] },
      "failure": { "text": "Knochen regen sich.", "effects": [{ "combat": "skeleton" }] }
    },
    { "label": "Weitergehen", "effects": [] }
  ]
}
```

- **Event-Typen:** combat, choice, trap, treasure, npc. Bossgegner und Artefakte laufen als normale Events über die Tabellen.
- **Effekte:** damage, heal, loot, combat, gainXp, lockDoor, unlockDoor, setFlag.
- **Regel:** Neue Effekt-Typen oder Bedingungen werden zuerst im Game Design festgelegt, dann programmiert, dann in Events genutzt.

## Grafik und Animation

Die Grafik besteht aus einem modularen Low-Poly-Baukasten auf dem Kachelraster, die Animationen stecken in den Modelldateien.

- **Stil:** Low-Poly mit Flat Shading und begrenzter Farbpalette. Den Stilguide legt das Art-Direction-Projekt fest.
- **Baukasten:** Bodenkachel, Wandstück, Türrahmen, Ecke und Requisiten, alle exakt 1×1 Kachel groß oder ein Vielfaches davon.
- **Figurenanimationen:** Idle, Laufen, Angriff, Treffer, Tod, Interagieren. Three.js spielt sie aus der GLB-Datei ab.
- **Licht:** Fackeln als Punktlichter mit Schatten, gedämpftes Grundlicht.
- **Ablauf:** Erst Platzhalter (Würfel, Kegel), dann KayKit-Assets, dann eigene Farbpalette per Textur-Tausch, später eigene Modelle in Blender oder per KI-3D-Generator.
- **Lizenzen:** Jede fremde Datei kommt mit Quelle und Lizenz in eine Credits-Liste im Repository.

## Meilensteine

Sieben Schritte, jeder endet mit etwas Spielbarem, das Christian im Browser testet.

| Nr. | Ergebnis | Test |
| --- | --- | --- |
| 1 | Ein Raum mit Iso-Kamera, Platzhaltern und Klick-Bewegung | Figur läuft um ein Hindernis herum |
| 2 | Drei handgebaute Räume mit Türen und Raumwechsel | Figur kommt an der richtigen Tür an |
| 3 | Dungeon-Generator mit Seed und Minimap | Alle Türen passen, keine unerreichbaren Räume |
| 4 | Event-System aus JSON mit Textfenster und Proben | Event aus der Tabelle startet, Probe wird angezeigt |
| 5 | Kampf, Lebenspunkte, Inventar, Tod und Sieg | Ein Durchlauf ist vollständig spielbar |
| 6 | Echte Assets, Animationen und Licht | Optik entspricht dem Stilguide |
| 7 | Speichern, Menüs, Sound, Veröffentlichung | Spiel läuft über einen öffentlichen Link |

## Getroffene Entscheidungen

- [x] Zwei Modi bestätigen: freie Erkundung in Echtzeit, Rundenmodus nur während Events
- [x] Regelvorschlag annehmen: drei Attribute, W20, Schwierigkeiten 8/12/16
- [x] Raumgröße und Dungeongröße festlegen: 15×15 Kacheln, 12 bis 20 Räume
- [x] Setting und Ton: klassische Fantasy, humorvoll
- [x] Ziel eines Durchlaufs: Ausgang (Bossgegner oder Artefakt sind mögliche Events)
- [x] Tod: Neustart mit neuem Dungeon (Permadeath)
- [x] Verhalten beim erneuten Betreten eines Raums: Durchlaufen ohne neues Event
- [x] Nur Desktop
