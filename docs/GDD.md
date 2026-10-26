# Dungeon-Spiel – Game Design Document

Version 2.0 · Oct 26, 2026 · @Christian

## Versionen

Jede Änderung am GDD erhöht die Version. Kleine Ergänzungen und Umbenennungen zählen hinten hoch (1.1 → 1.2), grundlegende Umbauten des Regelwerks vorne (1.x → 2.0). Jede Version bekommt eine Zeile in dieser Tabelle.

| Version | Datum | Änderungen |
| --- | --- | --- |
| 2.0 | 26.10.2026 | Attribut-Skala −1 bis +10 statt +3; Proben-Zuschlag pro Thema verdoppelt (+0 bis +8); Monster-Richtwerte angepasst; Verstand als drittes Trefferattribut für magische Waffen; neuer Nutzen-Effekt `freeze`; Einzelpreise pro Gegenstand (Feld `preis`); neue Gegenstandsliste mit 25 Gegenständen; neue Startausrüstung |
| 1.2 | 26.10.2026 | Gegenstände haben einen Rang statt einer Stufe (Feld `rang`); Verbrauchsgegenstände bekommen Ränge (Heiltrank 1, Feuerball-Schriftrolle 2, Schild-Schriftrolle 3); Händler führt sie im Angebot der Beutestufe |
| 1.1 | 26.10.2026 | Volks-Anforderung für Gegenstände (`req.volk`); einheitlich „Elf“ statt „Elfin“ |
| 1.0 | 25.10.2026 | Stand nach Meilenstein 4 für die Ebenen 1–3: Regelwerk, Völker, Gegenstände, Event-System, Themen, Raumtypen, Bosse, Preise |

## Vision und Core Loop

Ein Dungeon-Crawler im Browser in Low-Poly-3D mit isometrischer Ansicht. Der Spieler erkundet frei, und in jedem Raum kann ein Event aus der Tabelle des Raumtyps ausgelöst werden. Events werden rundenbasiert über Auswahl im Textfenster gelöst, mit vereinfachten Pen-&-Paper-Regeln.

Ablauf eines Raums:

1. Der Spieler betritt einen Raum durch eine Tür.
2. Das Spiel würfelt gegen die Event-Chance des Raumtyps.
3. Kein Event: Der Spieler erkundet frei (Truhen, Gegenstände, Türen).
4. Event: Die Erkundung pausiert, das Textfenster zeigt Beschreibung und Optionen, Proben laufen Runde für Runde.
5. Folgen werden angewendet: Schaden, Beute, Erfahrung, Türzustand.
6. Der Spieler wählt eine Tür und betritt den nächsten Raum.

Jeder Ausgang führt eine Ebene tiefer, ein Durchlauf endet erst mit dem Tod. Ziel ist, so tief wie möglich zu kommen. Bossgegner und Artefakte können als Events vorkommen, sind aber kein Pflichtziel. Stirbt der Spieler, zeigt ein Endbildschirm die erreichte Ebene und einen witzigen Satz zur Todesursache, danach beginnt ein neuer Durchlauf mit Volkswahl und neuem Dungeon (Permadeath). Setting ist klassische Fantasy mit humorvollem Ton.

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
- **Dungeongröße:** wächst mit der Tiefe (siehe Raumtypen und Ebenen), auf einem Gitter von 8×8 Plätzen.
- **Generierung:** Ein Random Walk startet im Startraum und legt Räume an, bis die Zielanzahl erreicht ist. Jede Verbindung setzt die Tür in beiden Räumen.
- **Raumtypen verteilen:** Startraum fest. Der Ausgang liegt im Raum mit dem größten Abstand zum Start. Alle weiteren Regeln für die Verteilung stehen im Abschnitt Raumtypen und Ebenen.
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
| Kraft | Nahkampf; Kraftakt (Türen und Schlösser aufbrechen, schwere Dinge bewegen); Widerstand (Gift, Krankheit) | −1 bis +10 |
| Geschick | Ausweichen (Fallen, Steinschlag); Fingerfertigkeit (Schlösser, Fallen entschärfen); Flucht | −1 bis +10 |
| Verstand | Diplomatie (Gespräche, Überzeugen, Handeln); Wahrnehmung; Wissen (Rätsel, Runen, Magie) | −1 bis +10 |

Jede Probe gehört zu genau einer dieser Kategorien und damit zu einem Attribut. Die Startwerte der Völker liegen zwischen −1 und +2, höhere Werte gibt es nur über Stufenaufstiege. Damit Proben in der Tiefe fordernd bleiben, steigen die Schwierigkeiten pro Thema mit (siehe Raumtypen und Ebenen).

### Völker

Der Spieler wählt vor dem ersten Dungeon ein Volk. Das Volk legt Attribute, Lebenspunkte und Fähigkeit fest. Es gibt bewusst keine Klassen: Ob ein Charakter eine Waffe, Rüstung oder einen Zauber nutzen kann, hängt von seinen Attributen ab (zum Beispiel Plattenpanzer erst ab Kraft +5). Einzelne Gegenstände können zusätzlich an ein Volk gebunden sein (siehe Ausrüstung).

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
- **Ausrüstung:** Waffen, Rüstungen und Zauber-Schriftrollen können ein Mindestattribut und ein Volk verlangen. Wer eine Anforderung nicht erfüllt, kann den Gegenstand tragen, aber nicht anlegen oder benutzen. Die Werte stehen in `data/items.json` (siehe Tabelle unten).
- **Volks-Anforderung:** In `data/items.json` als `"volk"` im Feld `req`, mit dem Wert `zwerg`, `elf` oder `mensch`, zum Beispiel `"req": { "kraft": 2, "volk": "zwerg" }`. Ohne `volk` darf jedes Volk den Gegenstand nutzen. Volks-Gegenstände sind für besondere Stücke gedacht; die Grundausrüstung bleibt für alle Völker offen.
- **Kampfrunde:** Der Spieler wählt Angreifen, Verteidigen (Rüstung +2 bis zur nächsten Runde), Gegenstand nutzen oder Fliehen. Danach handelt der Gegner.
- **Angreifen:** W20 + Trefferattribut der Waffe gegen die Rüstung des Gegners (Kategorie Nahkampf). Schwere Waffen treffen mit Kraft, leichte (Dolch, Kurzschwert, Rapier, Elfenklinge) mit Geschick, magische (Eismesser, Buch des Feuers) mit Verstand. Welches Attribut gilt, steht beim Gegenstand im Feld `hit`. Ein Treffer macht den Schaden der Waffe, ohne Waffe 1.
- **Gegnerzug:** W20 + Angriffsbonus des Gegners gegen die Rüstung der Spielfigur: 10 plus Bonus der angelegten Rüstung, plus 2 beim Verteidigen, plus Schild-Schriftrolle. Ein Treffer macht den Schaden des Gegners.
- **Gegenstand nutzen:** Heiltrank oder Schriftrolle aus dem Rucksack, kostet die Runde.
- **Einfrieren:** Eine Schriftrolle mit dem Nutzen `freeze` lässt den Gegner die angegebene Zahl an Runden aussetzen. Er greift in dieser Zeit nicht an, Angriffe auf ihn laufen normal. Ein neuer `freeze` verlängert nicht, sondern setzt die Runden neu.
- **Fliehen:** Probe Flucht gegen SG 12. Erfolg: Rückzug durch die Tür, durch die der Raum betreten wurde (im Startraum endet nur der Kampf). Das Event ist dann vorbei, ohne Beute und ohne Folge-Event. Fehlschlag: Der Gegner handelt normal.
- **Fähigkeit im Kampf:** gilt für das tatsächlich gewürfelte Attribut. Der Elf kann also einen verfehlten Angriff mit leichter Waffe retten, der Zwerg einen mit schwerer Waffe, der Mensch einen mit magischer Waffe.
- **Kampf in Events:** Der Effekt `combat` startet einen Rundenkampf. Die Effekte danach (etwa Beute) gelten erst nach einem Sieg.
- **Gegner:** Lebenspunkte, Rüstungswert, Angriffsbonus, Schaden (z. B. W6) und ein witziger Satz für den Endbildschirm. Wie Gegner mit der Tiefe stärker werden, steht im Abschnitt Raumtypen und Ebenen.
- **Fortschritt:** Erfahrung aus Events. Stufe 2 bei 10, Stufe 3 bei 25, Stufe 4 bei 45, Stufe 5 bei 70 Erfahrung, danach alle 30 Erfahrung eine weitere Stufe. Beim Stufenaufstieg wählt der Spieler ein Attribut für +1 (höchstens +10) und bekommt +3 maximale Lebenspunkte, die ihn auch um 3 heilen. Sind alle Attribute auf +10, gibt es nur die Lebenspunkte.
- **Beute:** Beutestufe `tier1` = 2W6 Gold und mit 1/3 Chance ein einfacher Gegenstand. `tier2` = 4W6 Gold und immer ein besserer Gegenstand. Welchen Rang ein Gegenstand hat, steht in `data/items.json`. Die Beutestufen verschieben sich mit dem Thema (siehe Raumtypen und Ebenen). Gold ist Zahlungsmittel beim Händler.
- **Abstieg:** Jeder Ausgang führt eine Ebene tiefer, endlos. Lebenspunkte, Gold, Erfahrung und Ausrüstung bleiben. Die Fähigkeit ist im neuen Dungeon wieder bereit.
- **Inventar:** Je ein Platz für die angelegte Waffe und Rüstung, dazu sechs Rucksackplätze. Ist der Rucksack voll, fragt das Spiel, was liegen bleibt. Außerhalb von Events lassen sich Gegenstände anlegen, ablegen, benutzen (Heiltrank) und wegwerfen. Während Events und Kämpfen geht das nur über „Gegenstand nutzen“.

### Völker: Startausrüstung

| Volk | Waffe | Rüstung | Rucksack |
| --- | --- | --- | --- |
| Zwerg | Streitaxt | Lederwams | Kleiner Heiltrank |
| Elf | Rapier | Lederwams | Kleiner Heiltrank |
| Mensch | Eismesser | Stofftunika | Feuerpfeil-Schriftrolle, Kleiner Heiltrank |

Jedes Volk erfüllt die Mindestwerte seiner Startausrüstung mit den Startattributen.

### Gegenstände

| Gegenstand | Art | Rang | Preis | Wert | Trifft mit | Mindestwert | Volk |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Knüppel | Waffe | 1 | 20 Gold | Schaden W4 | Kraft | – | – |
| Dolch | Waffe | 1 | 20 Gold | Schaden W4 | Geschick | – | – |
| Kurzschwert | Waffe | 1 | 40 Gold | Schaden W6 | Geschick | Geschick +1 | – |
| Langschwert | Waffe | 2 | 40 Gold | Schaden W8 | Kraft | Kraft +2 | – |
| Eismesser | Waffe | 2 | 40 Gold | Schaden W6 | Verstand | Verstand +2 | – |
| Rapier | Waffe | 2 | 40 Gold | Schaden W6 | Geschick | Geschick +1 | – |
| Streitaxt | Waffe | 3 | 70 Gold | Schaden W8 | Kraft | Kraft +2 | – |
| Buch des Feuers | Waffe | 3 | 70 Gold | Schaden W10+2 | Verstand | Verstand +5 | – |
| Elfenklinge | Waffe | 4 | 110 Gold | Schaden W10+2 | Geschick | Geschick +5 | Elf |
| Kriegshammer | Waffe | 4 | 110 Gold | Schaden W10+2 | Kraft | Kraft +5 | – |
| Zwergische Kriegsaxt | Waffe | 5 | 190 Gold | Schaden W12+4 | Kraft | Kraft +10 | Zwerg |
| Stoffweste | Rüstung | 1 | 5 Gold | +0 | – | – | – |
| Stofftunika | Rüstung | 1 | 10 Gold | +1 | – | Geschick 0 | – |
| Lederwams | Rüstung | 1 | 20 Gold | +2 | – | Geschick +1 | – |
| Kettenhemd | Rüstung | 2 | 40 Gold | +3 | – | Kraft +3 | – |
| Elfenmantel | Rüstung | 3 | 70 Gold | +4 | – | Geschick +3 | Elf |
| Plattenpanzer | Rüstung | 4 | 110 Gold | +6 | – | Kraft +5 | – |
| Elfenrüstung | Rüstung | 4 | 110 Gold | +6 | – | Geschick +5 | Elf |
| Mithrilpanzer | Rüstung | 5 | 500 Gold | +10 | – | Kraft +10 | – |
| Gelehrtenrobe | Rüstung | 5 | 500 Gold | +4 | – | Verstand +5 | – |
| Kleiner Heiltrank | Verbrauch | 1 | 15 Gold | heilt 2W4+2, jederzeit außer in Events (im Kampf als „Gegenstand nutzen“) | – | – | – |
| Feuerpfeil-Schriftrolle | Verbrauch | 1 | 25 Gold | W10+2 Schaden, trifft immer, nur im Kampf | – | Verstand +2 | – |
| Schild-Schriftrolle | Verbrauch | 1 | 25 Gold | Rüstung +3 bis Kampfende, nur im Kampf | – | Verstand +2 | – |
| Eis-Schriftrolle | Verbrauch | 3 | 40 Gold | Gegner setzt 2 Runden aus, nur im Kampf | – | Verstand +5 | – |
| Feuerball-Schriftrolle | Verbrauch | 3 | 40 Gold | 4W6 Schaden, trifft immer, nur im Kampf | – | Verstand +5 | – |
| Großer Heiltrank | Verbrauch | 4 | 110 Gold | heilt 4W4+4, jederzeit außer in Events (im Kampf als „Gegenstand nutzen“) | – | – | – |

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
- **Dateien:** `data/room-types.json`, `data/events.json`, `data/monsters.json`, `data/characters.json`, `data/items.json`, `data/texts.json` (Sätze zur Todesursache bei Events). Ein Event hat zusätzlich einen `title` für das Textfenster. Ein Ergebnis kann mit `next` ein Folge-Event starten, so laufen Proben Runde für Runde.
- **Proben in Events:** Jede Probe nennt ihre Kategorie, zum Beispiel `{ "category": "kraftakt", "dc": 12 }`. Das Attribut ergibt sich aus der Kategorie.
- **Event-Typen:** combat, choice, trap, treasure, npc. Bossgegner und Artefakte laufen als normale Events über die Tabellen.
- **Effekte:** damage, heal, loot, combat, gainXp, lockDoor, unlockDoor, setFlag. Mengen als Zahl oder Würfel, etwa `"W4"` oder `"2W6"`.
- **once:** Das Event kommt höchstens einmal pro Dungeon vor.
- **Bedingungen:** `flag:name` (Flag ist gesetzt), `notFlag:name` (Flag fehlt) und `volk:zwerg`, `volk:elf`, `volk:mensch`. Flags gelten pro Dungeon. `hasItem:id` ist erfüllt, wenn der Gegenstand angelegt ist oder im Rucksack liegt.
- **Volks-Bedingungen:** Ein ganzes Event kann an ein Volk gebunden sein, dann erscheint es nur für dieses Volk. Bei ausgewählten Events kann auch eine einzelne Option an ein Volk gebunden sein, andere Völker sehen sie nicht.
- **Türen:** `lockDoor` und `unlockDoor` nennen eine Richtung (`N`, `E`, `S`, `W`) oder `back`, die Tür, durch die der Spieler kam. Eine verschlossene Tür zeigt ein Schloss und lässt sich nicht benutzen, bis `unlockDoor` sie öffnet. Sind am Ende eines Events alle Türen eines Raums zu, öffnet sich die Rück-Tür von selbst.
- **Monster:** Name, Lebenspunkte, Rüstung, Angriffsbonus, Schaden (z. B. W6).
- **Regel:** Neue Effekt-Typen oder Bedingungen werden zuerst im Game Design festgelegt, dann programmiert, dann in Events genutzt.

## Raumtypen und Ebenen

Der Dungeon führt durch Themen, die alle drei Ebenen wechseln. Das Thema bestimmt Raumtypen, Farben, Einrichtung und Monster, die Tiefe bestimmt Größe, Schwierigkeit und Beute.

### Themen

| Ebenen | Thema | Typische Raumtypen | Monster (Beispiele) |
| --- | --- | --- | --- |
| 1–3 | Keller | Vorratskammer, Küche, Speisesaal, Wachstube, Brunnenraum, Säulenhalle, Gruft | Ratten, Skelette |
| 4–6 | Katakomben | Gruft, Schrein, Säulenhalle, Kerker | Skelette, Geister, Mimik |
| 7–9 | Zwergenminen | Säulenhalle, Bibliothek, Schrein, Speisesaal, Wachstube, Schmiede | Höhlenspinnen, Steingolems, Eisengolems, Dunkelzwerge |
| 10–12 | Goblin-Höhlen | Kerker, Folterkammer, Goblin-Lager, Vorratshöhle, Pilzzucht | Goblins, Goblin-Schamanen, Spinnen |
| 13–15 | Ork-Lager | Ork-Lager, Folterkammer, Gefangenen-Lager, Friedhof, Wolfs-Höhle | Orks, Wölfe, Ork-Kriegsherr |

- **Ab Ebene 16:** Weitere Themen sind geplant. Bis dahin bleibt das Ork-Lager endlos.

### Raumtypen

| Raumtyp | Bewertung | Lage | Anzahl pro Ebene |
| --- | --- | --- | --- |
| Vorkammer (Start) | neutral | fest, Begrüßungs-Event, in jedem Thema | 1 |
| Abstieg | neutral | Raum mit dem größten Abstand zum Start | 1 |
| Bossraum | feindlich | am Ende jeder Themenwelt (Ebene 3, 6, 9, 12, 15) statt des Abstiegs; der Abstieg öffnet sich erst nach dem Sieg über den Boss | 1 auf Boss-Ebenen |
| Schatzkammer | feindlich | nur in Sackgassen, in jedem Thema | höchstens 1 |
| Rastplatz | neutral | etwa auf halber Strecke zwischen Start und Abstieg, in jedem Thema | 1 auf jeder zweiten Ebene |
| Händler | neutral | beliebig, in jedem Thema | genau 1 |
| Wachstube | feindlich | immer direkt neben dem Start (Keller, Zwergenminen) | – |
| Gruft | feindlich | nie direkt neben dem Start | – |
| Küche | gemischt | neben einem Speisesaal | höchstens 1 |
| Speisesaal | gemischt | nie in Sackgassen | höchstens 1 |
| Vorratskammer | gemischt | bevorzugt in Sackgassen, neben einer Küche | höchstens 2 |
| Brunnenraum | gemischt | – | höchstens 1 |
| Säulenhalle | gemischt | nie in Sackgassen, bevorzugt an Kreuzungen (3–4 Türen) | höchstens 3 |
| Schrein | gemischt | – | höchstens 1 |
| Kerker | feindlich | bevorzugt in Sackgassen, neben einer Folterkammer; in den Katakomben direkt neben dem Start | höchstens 2 |
| Bibliothek | gemischt | bevorzugt in Sackgassen | höchstens 1 |
| Schmiede | gemischt | neben einer Wachstube | höchstens 1 |
| Folterkammer | feindlich | nie neben dem Start, neben einem Kerker oder Gefangenen-Lager | – |
| Goblin-Lager | feindlich | in den Goblin-Höhlen direkt neben dem Start | höchstens 3 |
| Vorratshöhle | gemischt | bevorzugt in Sackgassen, neben einem Goblin-Lager | – |
| Pilzzucht | gemischt | bevorzugt in Sackgassen, neben einer Vorratshöhle | höchstens 2 |
| Ork-Lager | feindlich | im Ork-Lager direkt neben dem Start | höchstens 3 |
| Gefangenen-Lager | feindlich | bevorzugt in Sackgassen, neben einer Folterkammer | – |
| Friedhof | gemischt | bevorzugt in Sackgassen | – |
| Wolfs-Höhle | feindlich | bevorzugt in Sackgassen | höchstens 2 |

- **Lesart der Lage:** „nur“, „nie“ und „direkt neben dem Start“ sind feste Regeln. „Bevorzugt“ und „neben X“ gelten, wenn der Grundriss es zulässt und der andere Raumtyp auf der Ebene vorkommt.
- **Feindlich:** Events mit Kämpfen und Fallen. **Neutral:** Rätsel, Gespräche, Fundstücke oder gar kein Event, nur Start, Abstieg, Rastplatz und Händler sind verlässlich sicher. Gemischt: Wenn ein Event auslöst, ist es in etwa 30 % der Fälle ein Gegner oder eine Falle, sonst harmlos. Dafür trägt jedes Event in der Tabelle eines gemischten Raumtyps die Markierung feindlich oder neutral. Für den Anteil feindlicher Räume zählen gemischte Räume nicht als feindlich.
- **Anteil feindlicher Räume:** steigt von etwa 40 % auf Ebene 1 auf 70 % ab Ebene 13.
- **Sackgassen:** Sackgassen, die keine Schatzkammer werden, bekommen einen anderen Raumtyp des Themas.
- **Händler:** bietet 4 zufällige Gegenstände vom Rang der aktuellen Beutestufe an (Verbrauchsgegenstände eingeschlossen) und immer Heiltränke. Verkaufen bringt den halben Preis.
- **Bosse:** passend zum Thema, einer am Ende jeder Themenwelt.

### Ebenen

- **Größe:** Ebene 1 hat 8 bis 12 Räume, jede weitere Ebene 2 mehr. Ab Ebene 9 bleibt es bei 24 bis 28 Räumen.
- **Proben:** Pro Thema +2 auf jede Schwierigkeit: Keller ±0, Katakomben +2, Zwergenminen +4, Goblin-Höhlen +6, Ork-Lager +8, auch im endlosen Ork-Lager. Der Zuschlag hält mit den Attributen Schritt, die über Stufenaufstiege bis +10 wachsen (Werte im Spiel testen). In den Event-Daten bleiben die Werte 8, 12 und 16, der Zuschlag kommt automatisch dazu und wird im Textfenster angezeigt.
- **Monster:** Jedes Thema hat eigene Monster. Innerhalb eines Themas bekommen Gegner +1 Lebenspunkt pro Ebene (erste Ebene des Themas +0, zweite +1, dritte +2), im endlosen Ork-Lager wächst das weiter. Das ersetzt das bisherige Wachstum von +2 Lebenspunkten und +1 Angriff je Ebene. Richtwert für neue Monster: pro Thema tiefer etwa +3 Lebenspunkte, +2 Rüstung, +2 Angriff und eine Würfelstufe mehr Schaden, damit sie gegen Attribute bis +10 und Rüstungen bis +10 bestehen (im Spiel testen).
- **Beute:** Die Beutestufen verschieben sich mit dem Thema. `tier1` ergibt Gegenstände vom Rang der Stufe des Themas (Keller 1 bis Ork-Lager 5), `tier2` einen Rang höher. Dafür braucht `data/items.json` Gegenstände bis Rang 6.
- **Ergebnis:** Der Endbildschirm zeigt die erreichte Ebene als Ergebnis.

### Bosse, Gold und Händler

| Themenwelt | Boss | Ebene |
| --- | --- | --- |
| Keller | Monsterratte | 3 |
| Katakomben | Skelett-König | 6 |
| Zwergenminen | Dunkelzwerg-Schmiedemeister | 9 |
| Goblin-Höhlen | Höhlentroll | 12 |
| Ork-Lager | Ork-Kriegsherr | 15 |
| Endloses Ork-Lager | zufällig Riesenspinne, Höhlentroll oder Ork-Kriegsherr | 18, 21, 24 … |

Werte und Texte der Bosse entstehen im Content-Projekt.

- **Gold:** Der Goldbetrag der Beute wird mit der Stufe des Themas malgenommen: Keller ×1, Katakomben ×2, Zwergenminen ×3, Goblin-Höhlen ×4, Ork-Lager ×5, auch im endlosen Ork-Lager.
- **Rang der Gegenstände:** Jeder Gegenstand hat in `data/items.json` einen Rang von 1 bis 6 (Feld `rang`), auch Verbrauchsgegenstände. „Rang“ gilt nur für Gegenstände, „Stufe“ meint die Charakterstufe und die Stufe des Themas. Der Rang bestimmt, wo ein Gegenstand als Beute und beim Händler auftaucht. Welcher Gegenstand welchen Rang hat, steht in der Gegenstandstabelle. Rang 6 füllt das Content-Projekt.
- **Preis:** Jeder Gegenstand hat in `data/items.json` einen eigenen Kaufpreis (Feld `preis`). Verkaufen bringt die Hälfte, abgerundet. Die Tabelle unten ist nur Richtwert für neue Ausrüstung.
- **Ziel der Preise:** Etwa alle ein bis zwei Ebenen ist ein neues Ausrüstungsteil bezahlbar.

| Richtwert Ausrüstung vom Rang | Kaufpreis | Verkaufspreis |
| --- | --- | --- |
| 1 | 20 Gold | 10 Gold |
| 2 | 40 Gold | 20 Gold |
| 3 | 70 Gold | 35 Gold |
| 4 | 110 Gold | 55 Gold |
| 5 | 160 Gold | 80 Gold |
| 6 | 220 Gold | 110 Gold |

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

* [x] Gegnerzug: W20 + Angriffsbonus gegen Rüstung der Figur (10 + Rüstungsbonus)
* [x] Spielerschaden kommt von der Waffe, ohne Waffe 1
* [x] Leichte Waffen treffen mit Geschick statt Kraft
* [x] Flucht: SG 12, Fehlschlag lässt den Gegner handeln, Erfolg führt durch die Rück-Tür und beendet das Event ohne Beute
* [x] Erfahrungsschwellen 10 / 25 / 45 / 70, danach alle 30; Spieler wählt das Attribut beim Aufstieg
* [x] Endlos tiefer: kein Sieg, Endbildschirm mit Ebene und witziger Todesursache
* [x] Gegner wachsen ab Ebene 2 um +2 LP und +1 Angriff je Ebene, höchstens 5 Ebenen
* [x] Inventar: Waffe und Rüstung angelegt extra, sechs Rucksackplätze
* [x] Gegenstandsliste, Startausrüstung je Volk, Beute als Gold plus Gegenstand (Ersatz-Kampf und Nur-Gold-Beute aus Meilenstein 4 sind damit abgelöst)

- [x] Themen alle drei Ebenen: Keller, Katakomben, Zwergenminen, Goblin-Höhlen, Ork-Lager; danach weitere Themen geplant, bis dahin Ork-Lager endlos
- [x] 19 Raumtypen mit Bewertung feindlich oder neutral; Anteil feindlicher Räume steigt mit der Tiefe
- [x] Schatzkammer nur in Sackgassen und höchstens eine pro Ebene; Wachstube neben, Gruft nie neben dem Start
- [x] Rastplatz auf jeder zweiten Ebene, Händler höchstens einer pro Ebene
- [x] Ebenengröße 8–12 Räume, +2 je Ebene, höchstens 24–28
- [x] Proben +1 pro Thema, Monster je Thema plus +1 LP pro Ebene innerhalb des Themas
- [x] Bossraum alle sechs Ebenen statt des Abstiegs
- [x] Beutestufen verschieben sich mit dem Thema
- [x] Ergebnis ist die erreichte Ebene, Gold ist Zahlungsmittel

* [x] Bossraum am Ende jeder Themenwelt (Ebene 3, 6, 9, 12, 15) statt alle sechs Ebenen, Boss passend zum Thema
* [x] Händler auf jeder Ebene genau einmal, Lage beliebig; 4 Gegenstände der Beutestufe plus Heiltränke, Verkauf zum halben Preis
* [x] Rastplatz etwa auf halber Strecke zwischen Start und Abstieg
* [x] Ersatz für die Wachstube neben dem Start: Kerker (Katakomben), Goblin-Lager (Goblin-Höhlen), Ork-Lager (Ork-Lager)
* [x] Lage- und Anzahlregeln für alle Raumtypen (Tabelle im Abschnitt Raumtypen)

- [x] Bosse: Monsterratte, Skelett-König, Dunkelzwerg-Schmiedemeister, Höhlentroll, Ork-Kriegsherr; im endlosen Ork-Lager alle drei Ebenen zufällig Riesenspinne, Höhlentroll oder Ork-Kriegsherr
- [x] Gold der Beute ×Stufe des Themas, Gegenstände mit Stufe 1–6
- [x] Händlerpreise nach Stufe (20 bis 220 Gold), Verbrauchsgegenstände zum Festpreis

* [x] Dritte Bewertung „gemischt“ für elf bisher neutrale Raumtypen: 30 % feindliche Events, sonst harmlos; neutral bleiben nur Start, Abstieg, Rastplatz und Händler

- [x] Volks-Anforderung für Gegenstände: `req.volk` (zwerg, elf, mensch) zusätzlich zum Mindestattribut; Grundausrüstung bleibt für alle Völker offen
- [x] Einheitliche Bezeichnung „Elf“ für das Volk, keine weibliche Form
- [x] Gegenstände haben einen Rang (Feld `rang`, vorher `stufe`), um sie von Charakterstufe und Stufe des Themas zu unterscheiden
- [x] Verbrauchsgegenstände bekommen ebenfalls einen Rang: Heiltrank 1, Feuerball-Schriftrolle 2, Schild-Schriftrolle 3; Festpreise bleiben, der Händler führt sie im Angebot der Beutestufe

- [x] GDD 2.0: Attribute von −1 bis +10 (ersetzt −1 bis +3), Stufenaufstieg bis +10, Proben-Zuschlag +2 pro Thema, Monster pro Thema +2 Rüstung und +2 Angriff
- [x] Magische Waffen treffen mit Verstand; Feld `hit` kennt kraft, geschick und verstand
- [x] Neuer Nutzen-Effekt `freeze`: Gegner setzt die angegebene Zahl an Runden aus, nur im Kampf
- [x] Einzelpreise pro Gegenstand (Feld `preis`), Verkauf zum halben Preis abgerundet; Rang-Preistabelle nur noch Richtwert
- [x] Neue Gegenstandsliste mit 25 Gegenständen; Startausrüstung: Zwerg Streitaxt und Lederwams, Elf Rapier und Lederwams, Mensch Eismesser, Stofftunika und Feuerpfeil-Schriftrolle, alle mit Kleinem Heiltrank
