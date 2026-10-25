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

- **Raumgröße:** 11×11 Kacheln für alle Räume. Türen sitzen mittig auf der jeweiligen Seite, also auf der sechsten Kachel.
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

| Attribut | Kategorien | Wertebereich |
| --- | --- | --- |
| Kraft | Nahkampf; Kraftakt (Türen und Schlösser aufbrechen, schwere Dinge bewegen); Widerstand (Gift, Krankheit) | −1 bis +3 |
| Geschick | Ausweichen (Fallen, Steinschlag); Fingerfertigkeit (Schlösser, Fallen entschärfen); Flucht | −1 bis +3 |
| Verstand | Diplomatie (Gespräche, Überzeugen, Handeln); Wahrnehmung; Wissen (Rätsel, Runen, Magie) | −1 bis +3 |

Jede Probe gehört zu genau einer dieser Kategorien und damit zu einem Attribut.

### Völker

Der Spieler wählt vor dem ersten Dungeon ein Volk. Das Volk legt Attribute, Lebenspunkte und Fähigkeit fest. Es gibt bewusst keine Klassen: Ob ein Charakter eine Waffe, Rüstung oder einen Zauber nutzen kann, hängt allein von seinen Attributen ab (zum Beispiel schwere Rüstung erst ab Kraft +3).

| Volk | Kraft | Geschick | Verstand | Lebenspunkte | Fähigkeit |
| --- | --- | --- | --- | --- | --- |
| Zwerg | +2 | +1 | −1 | 14 | Kraftprotz |
| Elf | −1 | +2 | +1 | 10 | Scharfe Sinne |
| Mensch | 0 | 0 | +2 | 12 | Wacher Geist |

- **Fähigkeiten:** Jedes Volk darf einmal pro Dungeon eine misslungene Probe seines Hauptattributs als bestanden werten, ohne neu zu würfeln. Das gilt für alle Kategorien dieses Attributs, also auch im Kampf (Nahkampf, Flucht). Kraftprotz (Zwerg) gilt für Kraft, Scharfe Sinne (Elf) für Geschick, Wacher Geist (Mensch) für Verstand.
- **Auswahl:** Nach einer misslungenen passenden Probe bietet das Textfenster an, die Fähigkeit einzusetzen. Der Spieler entscheidet.
- **Daten:** Völker stehen in `data/characters.json` mit Name, Attributen, Lebenspunkten, Fähigkeit, Startausrüstung und Modell.
- **Auswahlbildschirm:** Vor dem ersten Dungeon und nach jedem Tod.

### Proben, Kampf und Fortschritt

- **Probe:** W20 + Attribut gegen Schwierigkeit. Leicht 8, mittel 12, schwer 16. Jede Probe nennt ihre Kategorie. Der Wurf wird im Textfenster angezeigt.
- **Lebenspunkte:** Startwert je nach Volk, Heilung höchstens bis zum Maximum. Bei 0 Lebenspunkten ist der Durchlauf vorbei, es folgt die Volkswahl und ein neuer Dungeon. Tränke und Rasten heilen.
- **Ausrüstung:** Waffen, Rüstungen und Zauber können ein Mindestattribut verlangen. Konkrete Werte folgen mit Meilenstein 5.
- **Kampfrunde:** Der Spieler wählt Angreifen (Kraft gegen Rüstung des Gegners), Verteidigen (Rüstung +2 bis zur nächsten Runde), Gegenstand nutzen oder Fliehen (Geschick-Probe, Rückzug durch die zuletzt genutzte Tür). Danach handelt der Gegner.
- **Gegner:** Lebenspunkte, Rüstungswert, Angriffsbonus, Schaden (z. B. W6).
- **Ersatz-Kampf bis Meilenstein 5:** Der Effekt `combat` ist eine einzige Kraft-Probe (W20 + Kraft) gegen die Rüstung des Monsters. Erfolg ist ein Sieg. Fehlschlag kostet den Schaden des Monsters, die übrigen Effekte des Ergebnisses (etwa Beute) entfallen dann.
- **Fortschritt:** Erfahrung aus Events. Beim Stufenaufstieg +1 auf ein Attribut und +3 Lebenspunkte. Bis Meilenstein 5 wird Erfahrung nur gezählt, die Schwellen für den Aufstieg folgen dort.
- **Gold:** Bis Meilenstein 5 besteht Beute nur aus Gold. Beutestufe `tier1` = 2W6 Gold, `tier2` = 4W6 Gold.
- **Abstieg:** Wer den Ausgang nimmt, behält Lebenspunkte, Gold und Erfahrung.
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
      "check": { "category": "kraftakt", "dc": 12 },
      "success": { "text": "Darin liegt ein Amulett.", "effects": [{ "loot": "tier1" }] },
      "failure": { "text": "Knochen regen sich.", "effects": [{ "combat": "skeleton" }] }
    },
    { "label": "Weitergehen", "effects": [] }
  ]
}
```

- **Ablauf:** Beim ersten Betreten eines Raums würfelt das Spiel gegen die Event-Chance und wählt dann gewichtet ein Event, dessen Bedingung erfüllt ist. Der Startraum hat die Chance 100 %: Jeder Dungeon beginnt mit einem kurzen, harmlosen Begrüßungs-Event.
- **Dateien:** `data/room-types.json`, `data/events.json`, `data/monsters.json`, `data/characters.json`. Ein Event hat zusätzlich einen `title` für das Textfenster. Ein Ergebnis kann mit `next` ein Folge-Event starten, so laufen Proben Runde für Runde.
- **Proben in Events:** Jede Probe nennt ihre Kategorie, zum Beispiel `{ "category": "kraftakt", "dc": 12 }`. Das Attribut ergibt sich aus der Kategorie.
- **Event-Typen:** combat, choice, trap, treasure, npc. Bossgegner und Artefakte laufen als normale Events über die Tabellen.
- **Effekte:** damage, heal, loot, combat, gainXp, lockDoor, unlockDoor, setFlag. Mengen als Zahl oder Würfel, etwa `"W4"` oder `"2W6"`.
- **once:** Das Event kommt höchstens einmal pro Dungeon vor.
- **Bedingungen:** `flag:name` (Flag ist gesetzt), `notFlag:name` (Flag fehlt) und `volk:zwerg`, `volk:elf`, `volk:mensch`. Flags gelten pro Dungeon. `hasItem:name` kommt mit dem Inventar in Meilenstein 5.
- **Volks-Bedingungen:** Ein ganzes Event kann an ein Volk gebunden sein, dann erscheint es nur für dieses Volk. Bei ausgewählten Events kann auch eine einzelne Option an ein Volk gebunden sein, andere Völker sehen sie nicht.
- **Türen:** `lockDoor` und `unlockDoor` nennen eine Richtung (`N`, `E`, `S`, `W`) oder `back`, die Tür, durch die der Spieler kam. Eine verschlossene Tür zeigt ein Schloss und lässt sich nicht benutzen, bis `unlockDoor` sie öffnet. Sind am Ende eines Events alle Türen eines Raums zu, öffnet sich die Rück-Tür von selbst.
- **Monster:** Name, Lebenspunkte, Rüstung, Angriffsbonus, Schaden (z. B. W6).
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
- [x] Raumgröße und Dungeongröße festlegen: 11×11 Kacheln (vorher 15×15), 12 bis 20 Räume
- [x] Setting und Ton: klassische Fantasy, humorvoll
- [x] Ziel eines Durchlaufs: Ausgang (Bossgegner oder Artefakt sind mögliche Events)
- [x] Tod: Neustart mit neuem Dungeon (Permadeath)
- [x] Verhalten beim erneuten Betreten eines Raums: Durchlaufen ohne neues Event
- [x] Nur Desktop
- [x] Schnellreise über die Minimap: nur besuchte Räume, sofort mit Abblende, ohne Kosten, Ankunft in der Raummitte, gesperrt während Events
- [x] Lebenspunkte gelten ab Meilenstein 4, bei 0 neuer Dungeon
- [x] Beute bis Meilenstein 5 nur Gold: tier1 = 2W6, tier2 = 4W6
- [x] Ersatz-Kampf bis Meilenstein 5: eine Kraft-Probe gegen die Rüstung des Monsters
- [x] Erfahrung wird gezählt, Stufenaufstieg ab Meilenstein 5
- [x] lockDoor/unlockDoor mit Richtung oder „back“, Rück-Tür öffnet sich, wenn sonst alles zu ist
- [x] Startraum: Begrüßungs-Event zu Beginn jedes Dungeons
- [x] once gilt pro Dungeon; Bedingungen flag und notFlag
- [x] Volkswahl statt Klassen: Zwerg, Elf, Mensch legen Attribute, Lebenspunkte und Fähigkeit fest (ersetzt die festen Startwerte des Zwergenkriegers)
- [x] Ausrüstung und Zauber über Mindestattribute, Skala bleibt −1 bis +3
- [x] Fähigkeit pro Volk, einmal pro Dungeon: misslungene Probe des Hauptattributs gilt als bestanden (Kraftprotz, Scharfe Sinne, Wacher Geist)
- [x] Jede Probe hat eine von neun Kategorien unter den drei Attributen
- [x] Volks-Bedingungen für ganze Events und für einzelne Optionen bei ausgewählten Events
