# Dungeon-Spiel – Game Design Document

Version 2.45 · Oct 30, 2026 · @Christian

## Versionen

Jede Änderung am GDD erhöht die Version. Kleine Ergänzungen und Umbenennungen zählen hinten hoch (1.1 → 1.2), grundlegende Umbauten des Regelwerks vorne (1.x → 2.0). Jede Version bekommt eine Zeile in dieser Tabelle.

| Version | Datum | Änderungen |
| --- | --- | --- |
| 2.45 | 30.10.2026 | Katakomben Paket 1 und 2: Monster Skelettkrieger, Geist, Poltergeist, Skelett-König; Begegnungen; Events für Kerker und Schrein; Skelett-König als Warrior 1,3-fach mit goldener Krone; Kerker auch in den Katakomben höchstens 2 |
| 2.44 | 30.10.2026 | Poltergeist mit denselben Tönen wie der Geist |
| 2.43 | 30.10.2026 | Töne des Geists: Angriffsklang `geist`, `treffer_geist`, `tod_geist`; Bewegung mit `schweben` statt Schritten |
| 2.42 | 30.10.2026 | Geister zu 60 % deckend und ohne Handschuhe (Hände in Hautfarbe) |
| 2.41 | 30.10.2026 | Geister mit weißer Haut und grauen Haaren, zu 70 % deckend (durchscheinend) |
| 2.40 | 30.10.2026 | Skelette ohne festgelegte Variante als Minion statt nach Raum-Seed; Skelettkrieger als Warrior; Geister aus KayKit Rogue in Hellblau mit kaltem blauen Leuchten |
| 2.39 | 30.10.2026 | Gruft und Brunnenraum: gesprungene Platten 70 %, Platten mit Unkraut 30 %; die verzierte Platte `boden_deko` ist entfernt |
| 2.38 | 30.10.2026 | Bodenplatten: Keller `boden`, `boden_bruch_a`, `boden_bruch_b`; Gruft und Brunnenraum `boden_unkraut_a`, `boden_unkraut_b`; Katakomben `boden_bruch_a`, `boden_bruch_b`, `boden_unkraut_a`, `boden_unkraut_b` |
| 2.37 | 30.10.2026 | Event-Tabellen (`themeEvents`) und Bewertung (`themeRating`) pro Thema für alle Raumtypen; Begegnungen ab den Katakomben: Monster stehen per Zufall im Raum, der Kampf beginnt ohne Event (`encounters` in `data/themes.json`); Bodenplatten pro Thema und Raumtyp aus KayKit-Varianten (`floorTiles`) |
| 2.36 | 30.10.2026 | Eigener Sound für den Tod der Spielfigur: `tod_<volk>`, sonst `tod_spieler`, sonst `tod` |
| 2.35 | 29.10.2026 | Rastplatz: zwei Kacheln frei um das Feuer; 2 bis 3 Schlaflager (`bed_floor`) nie neben Türen, daneben dünne Kerzen; 2 bis 3 Flaschen und 2 bis 3 Fässer statt Säcken |
| 2.34 | 29.10.2026 | Vorkammer: kein Wegweiser mehr; das Pult mit Buch steht immer auf 4\|3 seitlich der Treppe |
| 2.33 | 29.10.2026 | Vorkammer: keine Fackel hinter oder neben der Treppe (Wandkacheln 1 bis 4 von Nord- und Westwand) |
| 2.32 | 29.10.2026 | Treppe nach oben: das obere Ende wird nur dunkler, ohne Farbstich; kein bläulicher Lichtschein von oben |
| 2.31 | 29.10.2026 | Bossraum: bis zum Sieg liegt über Loch und Treppe ein begehbares Metallgitter; Treppe und Loch aus Grundformen als Rückfall ohne Modell |
| 2.30 | 29.10.2026 | Steintreppe `stairs` aus KayKit statt Wendeltreppe, weiter 3×3 in der Nordwest-Ecke, Laufrichtung zur Nordwand; Einstieg steigt bis unter die Decke, Abstieg führt in ein Loch im Boden mit kühlem Schimmer von unten; ids `treppe_hoch`, `treppe_runter`; Startposition 2\|4 statt 4\|4 |
| 2.29 | 29.10.2026 | Zwerg: Haare und Augenbrauen in der Bartfarbe #4A3020 (eigene Textur) |
| 2.28 | 29.10.2026 | Zwerg: breiter und kleiner (Maßstab ungleich, heutiger Wert × 1,3 / 0,85 / 1,3), ohne Helm, mit Bart aus Grundformen (Zubehör `bart`) |
| 2.27 | 29.10.2026 | Fackeln an Süd- und Ostwand wie die Wände ausgeblendet, ohne Pfosten, nur ihr Licht bleibt; Säulenhalle nur mit dem Säulengang, 3 bis 4 Fackeln an den Säulen zum Gang, Banner und Waffenständer an der Wand; Gruft mit 4 bis 5 Sarkophagen mit Abstand und zwei blauen Fackeln |
| 2.26 | 29.10.2026 | Schatzkammer nur auf der mittleren Ebene jedes Themas (Ebene 2, 5, 8 …); 2 bis 3 Truhen, eine echt, die übrigen sind Mimiken; Münzstapel verschiedener Typen um die Truhe |
| 2.25 | 29.10.2026 | Münzstapel: derselbe Typ steht nie im Umkreis von zwei Kacheln (`spread`); Schatzkammer A mit einem Goldhaufen an der Truhe und drei frei im Raum |
| 2.24 | 29.10.2026 | Gold auf dem Boden einheitlich aus den KayKit-Münzen (`coin`, `coin_stack_small`, `coin_stack_medium`, `coin_stack_large`) in gleicher Größe |
| 2.23 | 29.10.2026 | Schatzkammer: ein Banner in derselben Farbe links und rechts jeder hinteren Tür mit einer Kachel Abstand, sonst kein Wandschmuck; an jeder Säule nur eine leuchtende Fackel zur Raummitte |
| 2.22 | 29.10.2026 | Schatzkammer: Säulen fest auf 2\|2, 8\|2, 2\|8 und 8\|8, Fackeln an allen vier Seiten jeder Säule statt an den Wänden, Banner an den Wänden; Speisesaal nur mit der langen Tafel und Bannern an freien Wänden; keine abgebrannten Kerzen als Deko auf dem Boden |
| 2.21 | 29.10.2026 | Wandrequisiten (Regale, Fahnen, Herd …) dürfen Fackeln nicht verdecken oder überlagern; Tisch des Händlers nur mit Flaschen |
| 2.20 | 29.10.2026 | Händler auf den Kacheln 2\|2 bis 2\|8 oder 2\|2 bis 8\|2, schaut zur Raummitte; hinter ihm Wandregale mit Flaschen, vor ihm `table_medium_decorated_A` mit Kerze statt Tisch mit Gold (2.21: `table_medium` nur mit Flaschen und Kerze) |
| 2.19 | 29.10.2026 | Neue Requisiten aus dem KayKit Dungeon Kit für Händler, Wachstube, Vorratskammer, Küche, Schatzkammer, Speisesaal, Säulenhalle und Gruft; Händler mit dem Rücken zur Nord- oder Westwand, davor sein Tisch mit Kerze; Händlerraum heller (`brightness` in `roomPalettes`) |
| 2.18 | 29.10.2026 | Händler aus KayKit Rogue (ohne Kapuze, ohne Waffen) mit dunkelblauem statt grünem Outfit |
| 2.17 | 29.10.2026 | Requisit Knochen aus Schädel, Kiefer und Armen der KayKit-Skelette (gleiche Textur wie die Skelett-Gegner) statt Grundformen |
| 2.16 | 29.10.2026 | Neue Raum-Stimmung `kitchen` (Küche) und neuer Boden `stone` (trockener Stein) für alle Keller-Räume außer Gruft, Brunnenraum und Säulenhalle (`hall`); Event-Sound `klopfen_stein` beim Sarkophag; erste Sounds von Freepik |
| 2.15 | 29.10.2026 | Sound-System (`data/sounds.json`, Meilenstein 6c): Angriffsklänge für Waffen (holz, schwert, axt, hammer, eigene für magische Waffen) und Monster (`sound` in `data/monsters.json`), Treffer und Fehlschlag getrennt; Klang pro Verbrauchsgegenstand; Raum-Stimmung (`mood`) und Boden (`floor`) mit Loop, Zufallsgeräuschen und Schritten; optionaler Event-Sound; Spielgeräusche für Türen, Truhe, Gold, Stufe, Treppe, Treffer und Tod; fehlende Sounds bleiben stumm; Lautstärke und Menü in Meilenstein 7 |
| 2.14 | 29.10.2026 | Inszenierung: Gastgeber und schlafender Goblin bleiben nach dem Event (`stay` pro Event in `data/staging.json`); Goblin liegt flach neben dem Tisch (Anker mit `flat`, `front`); Würfelspiel-Skelette sind Warrior, Skelett mit Rücken ist Minion |
| 2.13 | 29.10.2026 | Inszenierung der Figuren (`data/staging.json`): Anker an Requisiten, Ablauf bei Kampfbeginn, Blickrichtungen, Gruppen laufen gemeinsam an und sterben gemeinsam, Besiegte bleiben liegen, friedliche Figuren gehen zur Tür (ersetzt 2.12, außer `stay`); unbekannte Anzahl 1 bis 3; Skelette aus KayKit Skeletons 1.0 mit Paletten-Textur |
| 2.12 | 29.10.2026 | Figuren, die nicht sterben und nicht kämpfen, bleiben nach dem Event an ihrem Platz; Gabelkrone der Monsterratte kleiner und am Kopf; Figuren ohne Animation stehen fest am Boden (atmen statt wippen) |
| 2.11 | 29.10.2026 | Ratten, Küchenchef, Monsterratte und Kröte aus dem Easy Animated Enemy Pack (Quaternius) statt KI-Generator; Goblin aus Basic_Goblin (standout7) ohne Animationen, Bewegung per Code; Zubehör aus Grundformen an Knochen (`accessories`); Figuren der Monster spielen Laufen, Angriff und Sterben |
| 2.10 | 28.10.2026 | Meilenstein 6b begonnen: Spielfiguren der drei Völker aus KayKit Adventurers mit Stand- und Laufanimation; Paketfiguren behalten ihre eigene Textur; Zubehör nach der Startwaffe; Licht nach Stilguide gedimmt |
| 2.9 | 28.10.2026 | Meilenstein 6a umgesetzt: Zuordnung kennt zusätzlich `tint` (Einfärben eines Modells); Wandecken aus KayKit-Endstücken; Fackeln an vorderen Türen auf einem Pfosten |
| 2.8 | 28.10.2026 | Stilguide „Knetkeller“ und Asset-Spezifikation aus dem Art-Direction-Projekt; Maßstab KayKit 0,5, Wände 2 Kacheln hoch; Zuordnung der Modelle über data/models.json; Wendeltreppen-Modelle 3×3; Zwerg aus KayKit Knight; Goblin aus Goblin Lowpoly Assets, Mimik aus der Truhe des KayKit Dungeon Pack |
| 2.7 | 28.10.2026 | Raumgröße 9×9 statt 11×11, Türen auf der fünften Kachel; Kachelnamen x\|y; Wendeltreppen 3×3 in der Nordwest-Ecke statt 5×5 in der Mitte; Startposition 4\|4; Einrichtung mit Pflichtstücken (`required`) und festem Korrekturablauf |
| 2.6 | 28.10.2026 | Meilenstein 6 geteilt in 6a (Umgebung) und 6b (Figuren); Stilguide kommt aus dem Art-Direction-Projekt; Modelle aus CC0-Paketen plus KI-Generator; volles Animationsset |
| 2.5 | 27.10.2026 | Figuren im Raum: Gegner erscheinen im Kampf, Events können Figuren schon beim Start zeigen (Feld `figures`), Regeln nach dem Event; Figurenliste |
| 2.4 | 27.10.2026 | Wendeltreppen: nach oben in der Vorkammer, nach unten im Abstieg und im Bossraum nach dem Sieg (ersetzt den Torbogen); Startposition am Fuß der Treppe; Einrichtung pro Raumtyp als Daten (`decor`, `themeDecor`) mit Platzierungsregeln; Requisitenliste |
| 2.3 | 27.10.2026 | Boss-Events pro Thema (Feld `themeEvents` beim Bossraum), bei jedem Betreten neu gewürfelt; erster Boss-Inhalt Monsterratte im Keller; eigene Todessätze pro Event in `data/texts.json` (`death.events`) |
| 2.2 | 26.10.2026 | Lebenspunkte je Stufe nach Volk (Zwerg +5, Elf +3, Mensch +4); Händler-Angebot genauer (4 Gegenstände je einmal, Heiltränke immer); leerer Rang: es gilt der höchste Rang darunter; Effekte `gold`, `item`, `loseGold`; Abstieg, Rastplatz und Bossraum ergänzt; 26 Gegenstände; veraltete Entscheidungen entfernt |
| 2.1 | 26.10.2026 | Neue Startausrüstung: Zwerg Langschwert und Lederwams, Elf Dolch und Stofftunika, Mensch Knüppel, Stoffweste, Feuerpfeil- und Schild-Schriftrolle; alle mit Kleinem Heiltrank |
| 2.0 | 26.10.2026 | Attribut-Skala −1 bis +10 statt +3; Proben-Zuschlag pro Thema verdoppelt (+0 bis +8); Monster-Richtwerte angepasst; Verstand als drittes Trefferattribut für magische Waffen; neuer Nutzen-Effekt `freeze`; Einzelpreise pro Gegenstand (Feld `preis`); neue Gegenstandsliste mit 26 Gegenständen; neue Startausrüstung |
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
| Modelle | Low-Poly im Format glTF/GLB, Pakete KayKit Dungeon Remastered, Adventurers und Skeletons (CC0) im Maßstab 0,5, dazu KI-Modelle; fehlende Modelle bleiben Platzhalter aus Grundformen. |
| Spieldaten | JSON-Dateien für Raumtypen, Einrichtung, Events, Monster und Gegenstände |
| Text-UI | HTML-Fenster über der 3D-Szene |
| Sound | MP3 über die Web Audio API, Zuordnung in `data/sounds.json`; ohne festgelegten Sound bleibt es still |
| Entwicklung | Claude Code mit GitHub-Repository |
| Veröffentlichung | GitHub Pages oder itch.io |

Grundregel: Inhalte stehen in den JSON-Dateien, nicht im Code. Neue Räume und Events brauchen dadurch keine Programmierung.

## Raster, Räume, Türen, Generierung

Der Dungeon ist ein Gitter aus Raumplätzen, jeder Raum ein Gitter aus Kacheln. Ein Raum hat einen Typ und null bis vier Türen.

- **Raumgröße:** 9×9 Kacheln für alle Räume. Türen sitzen mittig auf der jeweiligen Seite, also auf der fünften Kachel.
- **Kachelnamen:** Kacheln heißen x|y. x zählt von West (1) nach Ost (9), y von Nord (1) nach Süd (9). Die Nordwest-Ecke ist 1|1 (hinten, oben im Bild), die Nordost-Ecke 9|1 (rechts), die Südwest-Ecke 1|9 (links), die Südost-Ecke 9|9 (vorne). Die Raummitte ist 5|5. Die Türen liegen auf 5|1 (Nord), 9|5 (Ost), 5|9 (Süd) und 1|5 (West).
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
- **Startposition:** Zu Beginn jedes Dungeons, auch nach jedem Abstieg, steht die Figur in der Vorkammer am Fuß der Treppe nach oben, auf Kachel 2|4.
- **Kamera:** Zentriert auf den aktuellen Raum. Die vorderen Wände sind ausgeblendet, damit nichts die Figur verdeckt.
- **Modus-Wechsel:** Löst ein Event aus, stoppt die Bewegung und das Textfenster übernimmt. Events gibt es nur beim ersten Betreten eines Raums, danach durchläuft der Spieler ihn ohne neues Event. Eine Begegnung (siehe Begegnungen) startet statt eines Events direkt den Kampf.
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

| Volk | Kraft | Geschick | Verstand | Lebenspunkte | LP je Stufe | Fähigkeit |
| --- | --- | --- | --- | --- | --- | --- |
| Zwerg | +2 | +1 | −1 | 14 | +5 | Kraftprotz |
| Elf | −1 | +2 | +1 | 10 | +3 | Scharfe Sinne |
| Mensch | 0 | 0 | +2 | 12 | +4 | Wacher Geist |

- **Fähigkeiten:** Jedes Volk darf einmal pro Dungeon eine misslungene Probe seines Hauptattributs als bestanden werten, ohne neu zu würfeln. Das gilt für alle Kategorien dieses Attributs, also auch im Kampf (Nahkampf, Flucht). Kraftprotz (Zwerg) gilt für Kraft, Scharfe Sinne (Elf) für Geschick, Wacher Geist (Mensch) für Verstand.
- **Auswahl:** Nach einer misslungenen passenden Probe bietet das Textfenster an, die Fähigkeit einzusetzen. Der Spieler entscheidet.
- **Daten:** Völker stehen in `data/characters.json` mit Name, Attributen, Lebenspunkten, Lebenspunkten je Stufe (`levelHp`), Fähigkeit, Startausrüstung und Modell.
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
- **Gegner im Raum:** Startet ein Kampf, laufen alle Figuren dieses Gegners auf freie Kacheln neben der Spielfigur; zeigt kein Event sie, erscheint der Gegner dort. Bei einer Begegnung stehen die Figuren schon beim Betreten im Raum (siehe Begegnungen). Im Bossraum treffen sich beide in der Raummitte. Gekämpft wird nach den Regeln gegen einen Gegner; die Figuren der Gruppe greifen reihum an und sterben beim Sieg gemeinsam. Bei einem Treffer zuckt die Figur kurz, bei ihrem Tod spielt sie Death und bleibt liegen (Einzelheiten unter „Inszenierung der Figuren“).
- **Gegner:** Lebenspunkte, Rüstungswert, Angriffsbonus, Schaden (z. B. W6) und ein witziger Satz für den Endbildschirm. Wie Gegner mit der Tiefe stärker werden, steht im Abschnitt Raumtypen und Ebenen.
- **Fortschritt:** Erfahrung aus Events. Stufe 2 bei 10, Stufe 3 bei 25, Stufe 4 bei 45, Stufe 5 bei 70 Erfahrung, danach alle 30 Erfahrung eine weitere Stufe. Beim Stufenaufstieg wählt der Spieler ein Attribut für +1 (höchstens +10) und bekommt maximale Lebenspunkte je nach Volk (Zwerg +5, Elf +3, Mensch +4), die ihn auch um denselben Wert heilen. Sind alle Attribute auf +10, gibt es nur die Lebenspunkte.
- **Beute:** Beutestufe `tier1` = 2W6 Gold und mit 1/3 Chance ein einfacher Gegenstand. `tier2` = 4W6 Gold und immer ein besserer Gegenstand. Welchen Rang ein Gegenstand hat, steht in `data/items.json`. Gibt es für einen Rang noch keine Gegenstände, gilt der höchste Rang darunter, der welche hat. Die Beutestufen verschieben sich mit dem Thema (siehe Raumtypen und Ebenen). Gold ist Zahlungsmittel beim Händler.
- **Abstieg:** Jeder Ausgang führt eine Ebene tiefer, endlos. Der Spieler klickt die Treppe nach unten an und erscheint im neuen Dungeon am Fuß der Treppe nach oben. Lebenspunkte, Gold, Erfahrung und Ausrüstung bleiben. Die Fähigkeit ist im neuen Dungeon wieder bereit.
- **Inventar:** Je ein Platz für die angelegte Waffe und Rüstung, dazu sechs Rucksackplätze. Ist der Rucksack voll, fragt das Spiel, was liegen bleibt. Außerhalb von Events lassen sich Gegenstände anlegen, ablegen, benutzen (Heiltrank) und wegwerfen. Während Events und Kämpfen geht das nur über „Gegenstand nutzen“.

### Völker: Startausrüstung

| Volk | Waffe | Rüstung | Rucksack |
| --- | --- | --- | --- |
| Zwerg | Langschwert | Lederwams | Kleiner Heiltrank |
| Elf | Dolch | Stofftunika | Kleiner Heiltrank |
| Mensch | Knüppel | Stoffweste | Feuerpfeil-Schriftrolle, Schild-Schriftrolle, Kleiner Heiltrank |

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

Jeder Raumtyp hat eine Event-Chance und eine gewichtete Event-Tabelle, auf Wunsch eine eigene pro Thema. Jedes Event besteht aus Text, Optionen, Proben und Effekten.

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

**Raumtyp mit Tabellen pro Thema:**

```json
{
  "id": "gruft",
  "name": "Gruft",
  "eventChance": 0.6,
  "events": [],
  "themeEvents": {
    "keller": [ { "id": "gruft_sarkophag", "weight": 3 } ],
    "katakomben": [ { "id": "gruft_grabraeuber", "weight": 3 } ]
  },
  "themeRating": { "katakomben": "hostile" }
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

- **Ablauf:** Beim ersten Betreten eines Raums prüft das Spiel zuerst eine Begegnung (siehe Begegnungen). Kommt keine, würfelt es gegen die Event-Chance und wählt gewichtet ein Event aus der Tabelle des aktuellen Themas, dessen Bedingung erfüllt ist. Der Startraum hat die Chance 100 %: Jeder Dungeon beginnt mit einem kurzen, harmlosen Begrüßungs-Event.
- **Tabellen pro Thema:** Jeder Raumtyp kann in `data/room-types.json` im Feld `themeEvents` pro Thema eine eigene Event-Tabelle haben. Gibt es eine Tabelle für das aktuelle Thema, ersetzt sie `events` vollständig; ohne Tabelle gilt `events`. In `events` stehen deshalb nur Events, die in jedem Thema passen. Ein Raumtyp, der in mehreren Themen vorkommt, bekommt seine themenspezifischen Events in `themeEvents`. Der Bossraum nutzt dasselbe Feld.
- **Bewertung pro Thema:** Die Bewertung aus der Raumtyp-Tabelle (feindlich, neutral, gemischt) ist der Standard. Das Feld `themeRating` legt sie für einzelne Themen anders fest, Werte `hostile`, `neutral` und `mixed`. Sie gilt für den Anteil feindlicher Räume, für Begegnungen und für die Markierung der Events: Ist ein Raumtyp in einem Thema gemischt, tragen alle Einträge seiner Tabelle für dieses Thema `hostile` und `rating`. Vorkammer, Rastplatz und Händler bleiben in jedem Thema neutral, Schatzkammer und Bossraum feindlich.
- **Dateien:** `data/room-types.json`, `data/events.json`, `data/monsters.json`, `data/characters.json`, `data/items.json`, `data/texts.json` (Sätze zur Todesursache bei Events: allgemeine Sätze und unter `death.events` eigene Sätze für einzelne Events, nach Event-id). Ein Event hat zusätzlich einen `title` für das Textfenster. Ein Ergebnis kann mit `next` ein Folge-Event starten, so laufen Proben Runde für Runde. `data/sounds.json` ordnet Sound-ids den MP3-Dateien zu (siehe Sound). Ein Event kann im Feld `sound` eine Sound-id nennen.
- **Proben in Events:** Jede Probe nennt ihre Kategorie, zum Beispiel `{ "category": "kraftakt", "dc": 12 }`. Das Attribut ergibt sich aus der Kategorie.
- **Event-Typen:** combat, choice, trap, treasure, npc. Bossgegner und Artefakte laufen als normale Events über die Tabellen.
- **Effekte:** damage, heal, loot, gold, item, loseGold, combat, gainXp, lockDoor, unlockDoor, setFlag. Mengen als Zahl oder Würfel, etwa `"W4"` oder `"2W6"`.
- **Beute-Effekte:** `loot` gibt Gold und eventuell einen Gegenstand (siehe Beute). `gold` gibt nur Gold, der Würfelwert wird wie bei der Beute mit der Stufe des Themas malgenommen, etwa `{ "gold": "2W6" }`. `item` gibt sicher einen Gegenstand ohne Gold: `tier1` vom Rang der Stufe des Themas, `tier2` einen Rang höher. `loseGold` nimmt einen festen Betrag weg, nicht mit der Themenstufe malgenommen, etwa `{ "loseGold": 2 }`; Gold fällt nie unter 0.
- **once:** Das Event kommt höchstens einmal pro Dungeon vor.
- **Bedingungen:** `flag:name` (Flag ist gesetzt), `notFlag:name` (Flag fehlt) und `volk:zwerg`, `volk:elf`, `volk:mensch`. Flags gelten pro Dungeon. `hasItem:id` ist erfüllt, wenn der Gegenstand angelegt ist oder im Rucksack liegt.
- **Volks-Bedingungen:** Ein ganzes Event kann an ein Volk gebunden sein, dann erscheint es nur für dieses Volk. Bei ausgewählten Events kann auch eine einzelne Option an ein Volk gebunden sein, andere Völker sehen sie nicht.
- **Türen:** `lockDoor` und `unlockDoor` nennen eine Richtung (`N`, `E`, `S`, `W`) oder `back`, die Tür, durch die der Spieler kam. Eine verschlossene Tür zeigt ein Schloss und lässt sich nicht benutzen, bis `unlockDoor` sie öffnet. Sind am Ende eines Events alle Türen eines Raums zu, öffnet sich die Rück-Tür von selbst.
- **Monster:** Name, Lebenspunkte, Rüstung, Angriffsbonus, Schaden (z. B. W6).
- **Figuren in Events:** Ein Event kann im Feld `figures` Figuren nennen, die beim Start des Events im Raum erscheinen, etwa `"figures": [ { "figure": "kuechenratte", "place": "near:herd" } ]`. `figure` ist eine Monster-id oder eine Figur ohne Kampfwerte aus der Figurenliste. `place` nutzt die Platzierungen der Einrichtung und zusätzlich `near:<prop>` (eine freie Kachel direkt neben dem Requisit); fehlt das Requisit, steht die Figur auf einer freien Kachel. Optional: `count` (Anzahl), `variant` (etwa `sitzend`) und `stay` (true: die Figur bleibt nach dem Event stehen, solange der Spieler auf dieser Ebene ist). Wie die Figuren stehen und sich bewegen, regelt die Inszenierung (`data/staging.json`).
- **Figuren nach dem Event:** Besiegte Gegner bleiben in der Sterbe-Haltung liegen, auch beim erneuten Betreten (solange der Spieler auf dieser Ebene ist). Nach einer Flucht verschwinden die Gegner, sobald der Spieler den Raum verlässt. Friedliche Figuren gehen nach dem Event zur nächsten Tür und verschwinden. Figuren mit `stay` (im Event oder in `data/staging.json`, heute Kröte, Händler, der Gastgeber und der schlafende Goblin) bleiben an ihrem Platz, solange der Spieler auf dieser Ebene ist.
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
| Vorkammer (Start) | neutral | fest, Treppe nach oben in der Nordwest-Ecke, Begrüßungs-Event, in jedem Thema | 1 |
| Abstieg | neutral | Raum mit dem größten Abstand zum Start, Treppe nach unten in der Nordwest-Ecke | 1 |
| Bossraum | feindlich | am Ende jeder Themenwelt (Ebene 3, 6, 9, 12, 15) statt des Abstiegs; die Treppe nach unten erscheint erst nach dem Sieg über den Boss in der Nordwest-Ecke | 1 auf Boss-Ebenen |
| Schatzkammer | feindlich | nur in Sackgassen, in jedem Thema nur auf der mittleren Ebene (2, 5, 8 …) | höchstens 1 |
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
- **Bewertung pro Thema:** Die Spalte Bewertung ist der Standard. Einzelne Themen können sie über `themeRating` ändern (siehe Event-System).
- **Feindlich:** Events mit Kämpfen und Fallen. **Neutral:** Rätsel, Gespräche, Fundstücke oder gar kein Event, nur Start, Rastplatz und Händler sind verlässlich sicher. Der Abstieg ist neutral, seine Events dürfen aber kleine Folgen haben (etwas Schaden, Goldverlust) und einen Kampf, etwa mit dem Türsteher. **Gemischt:** Wenn ein Event auslöst, ist es in etwa 30 % der Fälle ein Gegner oder eine Falle, sonst harmlos. Dafür trägt jedes Event in der Tabelle eines Raumtyps, der im jeweiligen Thema gemischt ist, die Markierung feindlich oder neutral, und zwar doppelt: `"hostile": true` oder `false` (Feld des Content-Projekts) und `"rating": "hostile"` oder `"neutral"` (wertet der Code aus). Beide müssen übereinstimmen, `npm test` prüft das. Für den Anteil feindlicher Räume zählen gemischte Räume nicht als feindlich.
- **Anteil feindlicher Räume:** steigt von etwa 40 % auf Ebene 1 auf 70 % ab Ebene 13.
- **Sackgassen:** Sackgassen, die keine Schatzkammer werden, bekommen einen anderen Raumtyp des Themas.
- **Schatzkammer:** Sie kommt in jedem Thema nur einmal vor, auf der mittleren der drei Ebenen (Feld `"themeLevel": 2` im Raumtyp; im endlosen Ork-Lager auf jeder dritten Ebene, also 14, 17 …). Hat diese Ebene keine Sackgasse, fehlt die Schatzkammer in diesem Thema. Sie hat 2 bis 3 Truhen. Eine davon ist echt und öffnet sich wie jede Truhe (Event `chest`). Die übrigen sind Mimiken. Welche echt ist, sieht man nicht; der Raum-Seed legt es fest. Klickt man eine Mimik an, erwacht sie, und das Event `schatz_mimik` beginnt (Kampf mit Beute tier2, Zurücklächeln oder Rückzug). Danach ist die Truhe weg: Eine besiegte Mimik bleibt liegen, sonst hüpft sie zur Tür hinaus. Das Event `schatz_mimik` steht deshalb nicht mehr in der Event-Tabelle des Raums.
- **Händler:** bietet 4 zufällige Gegenstände vom Rang der aktuellen Beutestufe an (Rang = Stufe des Themas, Verbrauchsgegenstände eingeschlossen), jeden einmal. Dazu immer die Heiltränke (Kleiner und Großer Heiltrank) in beliebiger Menge; sie zählen nicht zu den 4 Gegenständen. Ist der Rang leer, gilt der höchste Rang darunter. Verkaufen bringt den halben Preis.
- **Rastplatz:** auf jeder geraden Ebene (2, 4, 6 …). Ein Lagerfeuer im Raum heilt einmal auf volle Lebenspunkte, danach ist es aus. Um das Feuer liegt im Umkreis von zwei Kacheln nichts, auch kein Schutt. Im Raum verteilt liegen 2 bis 3 Schlaflager, nie neben einer Tür; daneben stehen dünne Kerzen (eine brennend, eine aus). Dazu 2 bis 3 Flaschen und 2 bis 3 Fässer; keine Säcke.
- **Treppen:** Vorkammer und Abstieg haben in der Nordwest-Ecke eine gerade Steintreppe (KayKit `stairs`) aus 3×3 Kacheln (1|1 bis 3|3), die zur Nordwand hin läuft; ihr Fuß liegt an der Südkante (Reihe y=3). In der Vorkammer beginnt sie auf Bodenhöhe und steigt bis zur Wandoberkante (2 Kacheln); ihr oberes Ende wird dunkel, wie ein Schacht nach oben, ohne eigenes Licht und ohne Farbstich: Es kommt kein bläulicher Lichtschein von oben. Sie ist nicht anklickbar und zeigt, woher der Spieler kommt. Im Abstieg fehlt auf diesen Kacheln der Boden: Ein Loch mit Steinkante öffnet sich, die Treppe beginnt an der Südkante auf Bodenhöhe und führt nach Norden in die Tiefe. Die Innenwände des Lochs sind dunkel, unten verläuft alles in die Schattenfarbe, und ein schwacher, kühler Schimmer steigt von unten auf. Die ganze Fläche ist anklickbar und blockiert; ein Klick führt eine Ebene tiefer. Der Code setzt die Treppen fest, sie stehen nicht in der Einrichtung. Die Türen Nord (5|1) und West (1|5) und die Kacheln davor bleiben frei.
- **Bossraum:** Betreten startet den Bosskampf, auch bei jedem weiteren Betreten, bis der Boss besiegt ist. Flucht ist erlaubt, der Boss wartet dann mit vollen Lebenspunkten. Die Nordwest-Ecke (1|1 bis 3|3) bleibt bis zum Sieg frei: Über Loch und Treppe liegt ein Metallgitter, das man betreten kann; es ist nicht anklickbar. Sieg: Beute `tier2` und 10 Erfahrung, danach wechselt die Nordwest-Ecke mit kurzer Abblende (etwa 0,5 Sekunden) zu Loch und Treppe nach unten. Die Siegbeute vergibt das Spiel, nicht das Event.
- **Boss-Events:** Der Bossraum hat pro Thema eine eigene Event-Tabelle in `themeEvents` wie jeder Raumtyp, etwa `"themeEvents": { "keller": [ … ] }`, mit `eventChance` 1. Bei jedem Betreten wird daraus neu gewürfelt, bis der Boss besiegt ist. Die Events starten den Kampf gegen den Boss mit `combat`. Bedingungen wie `flag:name` unterscheiden die erste Begegnung von der Rückkehr. Themen ohne Tabelle zeigen den Einleitungstext des Bosses (`intro`) und starten den Kampf direkt. Bisher hat nur der Keller (Monsterratte) Boss-Events.
- **Bosse:** passend zum Thema, einer am Ende jeder Themenwelt.

### Ebenen

- **Größe:** Ebene 1 hat 8 bis 12 Räume, jede weitere Ebene 2 mehr. Ab Ebene 9 bleibt es bei 24 bis 28 Räumen.
- **Proben:** Pro Thema +2 auf jede Schwierigkeit: Keller ±0, Katakomben +2, Zwergenminen +4, Goblin-Höhlen +6, Ork-Lager +8, auch im endlosen Ork-Lager. Der Zuschlag hält mit den Attributen Schritt, die über Stufenaufstiege bis +10 wachsen (Werte im Spiel testen). In den Event-Daten bleiben die Werte 8, 12 und 16, der Zuschlag kommt automatisch dazu und wird im Textfenster angezeigt.
- **Monster:** Jedes Thema hat eigene Monster. Innerhalb eines Themas bekommen Gegner +1 Lebenspunkt pro Ebene (erste Ebene des Themas +0, zweite +1, dritte +2), im endlosen Ork-Lager wächst das weiter. Das ersetzt das bisherige Wachstum von +2 Lebenspunkten und +1 Angriff je Ebene. Richtwert für neue Monster: pro Thema tiefer etwa +3 Lebenspunkte, +2 Rüstung, +2 Angriff und eine Würfelstufe mehr Schaden, damit sie gegen Attribute bis +10 und Rüstungen bis +10 bestehen (im Spiel testen).
- **Beute:** Die Beutestufen verschieben sich mit dem Thema. `tier1` ergibt Gegenstände vom Rang der Stufe des Themas (Keller 1 bis Ork-Lager 5), `tier2` einen Rang höher. Dafür braucht `data/items.json` Gegenstände bis Rang 6; solange ein Rang leer ist, gilt der höchste Rang darunter.
- **Ergebnis:** Der Endbildschirm zeigt die erreichte Ebene als Ergebnis.

### Begegnungen

Ab den Katakomben können beim ersten Betreten eines Raums schon Monster im Raum stehen. Es gibt kein Event-Fenster, der Kampf beginnt direkt.

- **Wo:** nur in Räumen, die im aktuellen Thema feindlich oder gemischt sind. Nie in Vorkammer, Abstieg, Rastplatz, Händler, Schatzkammer und Bossraum.
- **Ablauf:** Beim ersten Betreten würfelt das Spiel zuerst gegen die Begegnungschance des Themas. Bei Erfolg wählt es gewichtet ein Monster aus der Begegnungstabelle, und der Raum bekommt kein Event. Ohne Begegnung folgt der normale Event-Wurf. Gleicher Raum-Seed ergibt dieselbe Begegnung.
- **Daten:** `data/themes.json` hält pro Thema das Feld `encounters` mit `chance`, `monsters` (Monster-id und Gewicht) und `reward` (Effekte nach dem Sieg). Ohne `encounters` gibt es im Thema keine Begegnungen, heute im Keller.

```json
"katakomben": {
  "encounters": {
    "chance": 0.15,
    "monsters": [ { "monster": "skelett_krieger", "weight": 3 }, { "monster": "geist", "weight": 2 } ],
    "reward": [ { "loot": "tier1" }, { "gainXp": 3 } ]
  }
}
```

- **Figuren:** 1 bis 3 nach Raum-Seed, wie bei Kämpfen ohne Anzahl. Beim Einblenden stehen sie auf freien Kacheln mit mindestens drei Kacheln Abstand zur Eingangstür, Blick zur Spielfigur, und laufen dann zum Kampf an. Das Kampffenster nennt den Gegner wie bei jedem Kampf, einen Event-Text gibt es nicht.
- **Kampf:** nach den normalen Regeln. Sieg: die Effekte aus `reward`, Besiegte bleiben liegen. Flucht: durch die Rück-Tür, die Begegnung ist danach vorbei wie ein Event. Tod: `deathText` des Monsters.
- **Richtwerte:** Chance Katakomben 0,15, pro Thema tiefer +0,05 (Zwergenminen 0,2, Goblin-Höhlen 0,25, Ork-Lager 0,3, auch im endlosen Ork-Lager). Siegbeute `tier1` und 3 Erfahrung. Werte im Spiel testen.
- Begegnungen zählen nicht zum Anteil feindlicher Räume.

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
- **Rang der Gegenstände:** Jeder Gegenstand hat in `data/items.json` einen Rang von 1 bis 6 (Feld `rang`), auch Verbrauchsgegenstände. „Rang“ gilt nur für Gegenstände, „Stufe“ meint die Charakterstufe und die Stufe des Themas. Der Rang bestimmt, wo ein Gegenstand als Beute und beim Händler auftaucht. Welcher Gegenstand welchen Rang hat, steht in der Gegenstandstabelle. Rang 6 füllt das Content-Projekt, bis dahin gilt dort Rang 5.
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

- **Stil:** Low-Poly, weich und blockig wie KayKit, ohne Normal Maps, begrenzte Palette. Details im Stilguide.
- **Baukasten:** Bodenkachel, Wandstück, Türrahmen, Ecke und Requisiten, alle exakt 1×1 Kachel groß oder ein Vielfaches davon.
- **Figurenanimationen:** volles Set für Spielfiguren und Monster: Idle, Laufen, Angriff, Treffer, Tod, Interagieren. Three.js spielt sie aus der GLB-Datei ab.
- **Licht:** Fackeln als Punktlichter mit Schatten, gedämpftes Grundlicht. Die Fackelfarbe kann pro Raumtyp in der Einrichtung stehen (`torchColor`).
- **Quellen:** eine Mischung aus fertigen CC0-Paketen (etwa KayKit, Quaternius, Kenney) für Boden, Wände und Requisiten und einem KI-3D-Generator für Figuren, die es nicht fertig gibt. Was noch fehlt, bleibt Platzhalter aus Grundformen.
- **Reihenfolge:** zuerst die Themenwelt Keller, dann die weiteren Themen. Meilenstein 6a bringt Umgebung und Requisiten, 6b Figuren und Animationen.
- **Lizenzen:** Jede fremde Datei kommt mit Quelle und Lizenz in eine Credits-Liste im Repository.

### Inszenierung der Figuren

Figuren aus Events stehen sichtbar im Raum. Wo sie stehen, wohin sie blicken und welche Animation sie zeigen, steht in `data/staging.json`, getrennt von den Events; Spielregeln, Texte und Ergebnisse ändert die Inszenierung nicht.

- **Standard:** freie Kachel, Blick zur Spielfigur, Idle. Welche Figuren ein Event zeigt: zuerst eine eigene Inszenierung (`events`), sonst das Feld `figures` des Events, sonst der Gegner aus dem Kampf. Nennt das Event keine Anzahl, sind es 1 bis 3 Figuren nach Raum-Seed.
- **Anker an Requisiten (`anchors`):** Requisiten-ids (`props`), Versatz in Kacheln (gedreht wie das Requisit, `world`: ungedreht), Blickrichtung (`player`, `target` = der Tisch zum Sitz, `prop`, `random`), Animation (`idle`, `sit`, `sit_floor`, `lie`, `awaken`). `seat`: die Figur sitzt auf dem Hocker oder Stuhl, `onProp`: sie steht auf dem Requisit (Monsterratte auf dem Käseberg, Kröte auf dem Brunnenrand). Anker heute: am Tisch sitzend, auf dem Hocker schlafend, am Herd, am Sarkophag (Skelett steht auf), am Lagerfeuer, zwischen Knochen liegend, auf dem Käseberg, im Mehlsack, vor der Treppe, mitten im Raum, am Brunnen.
- **Rückfall:** Fehlt die Requisite im Raum, steht die Figur auf einer freien Kachel, nie in Wänden, Türen oder auf Requisiten. Hat das Modell die Animation nicht (etwa der Goblin kein Sitzen), steht die Figur mit Idle neben dem Anker.
- **Liegen ohne Animation:** Ein Anker mit `flat` legt eine Figur ohne Liege-Animation starr auf den Rücken, statt sie stehen zu lassen (der schlafende Goblin). `front` wählt zuerst die Kachel auf der Seite zur Kamera, damit das Requisit die Figur nicht verdeckt.
- **Figuren (`figures`):** Modell-Varianten (Skelett: Minion, Warrior, Rogue, Mage; ohne Festlegung immer Minion; ein Event kann eine festlegen) und `stays` (bleibt nach dem Event stehen). Eine Event-Inszenierung kann `stay` auch für einzelne Figuren setzen. Eigene Skelett-Monster haben ihre eigene Figur, etwa der Skelettkrieger als Warrior.
- **Ablauf:** Die Figuren stehen schon da, bevor das Event-Fenster aufgeht. Beim Kampfbeginn laufen alle Figuren des Gegners mit Walk auf freie Nachbarkacheln der Spielfigur, ohne durch Wände, Türen oder Requisiten zu gehen; die Spielfigur bleibt stehen und dreht sich zum nächsten laufenden Gegner. Im Kampf blickt die Spielfigur zum Gegner, der gerade dran ist; bei mehreren wechselt er reihum mit jedem Zug. Gegner blicken immer zur Spielfigur. Attack beim eigenen Zug, Hit bei einem Treffer, Death beim Sieg. Nach dem Kampf behält die Spielfigur ihre Blickrichtung, bis der Spieler sie bewegt.
- **Drehungen:** weich über etwa 0,25 Sekunden, immer auf dem kürzeren Weg.
- **Lesbarkeit:** Gegner mit rotem Akzent und im Kampf mit rotem Bodenring.
- **Leistung:** höchstens 6 animierte Figuren pro Raum, weitere stehen still.

### Stilguide „Knetkeller“

Ein Dungeon wie aus warmem Ton geknetet: weiche, blockige Formen, gedeckte Erdtöne und Räume voller liebevoll schiefer Alltagsdinge. Farbe entsteht vor allem durch Licht; die Fackeln schneiden warme Inseln aus violettgrauen Schatten, und nur Gold, Gefahr und der Themenakzent leuchten heraus. Der Humor sitzt in Proportionen und Requisiten, nicht in grellen Farben.

**Referenzen**

- KayKit Dungeon Remastered: Formensprache und Baukasten; eine gemeinsame Atlas-Textur, daher zentral umfärbbar.
- KayKit Adventurers und Skeletons: Figurenproportionen und ein gemeinsames Rig, Animationen sind übertragbar.
- Wallace & Gromit: Materialgefühl (Knete, Wolle, abgenutztes Holz), Wärme, übergroße Alltagsgegenstände als Gag.
- Tunic: Low-Poly-Figuren in Iso-Ansicht, trotz dunkler Räume klar lesbar.
- Death's Door: starke Lichtinseln mit tiefen, aber farbigen Schatten statt Schwarz.

**Palette**

| Rolle | Hex | Verwendung |
| --- | --- | --- |
| Boden | #5B4A3C | Bodenkacheln |
| Wand | #7A6552 | Wände, Sockel, Stein |
| Holz | #8A5A34 | Möbel, Fässer, Türen |
| Metall | #5E6168 | Beschläge, Waffen, Gitter |
| Moos, Stoff | #6B7048 | Moos, Säcke, Kleidung |
| Kühl | #4E6670 | Wasser, Gruft, Brunnen |
| Schatten | #2A2230 | Schattenfarbe, tiefste Töne |
| Licht | #FF9A3C | Fackeln, Glut |
| Akzent | #E8B23A | Themenakzent, im Keller Käse |
| Gold | #F2C14E | Wertvolles und Anklickbares |
| Gefahr | #C8432F | Gegner, Fallen, verschlossene Türen |

**Farbregeln**

- Gold nur für Wertvolles und Anklickbares, Gefahr-Rot nur für Gegner, Fallen und verschlossene Türen. Beide bleiben in allen Themen gleich.
- Deko nutzt nie Akzentfarben.
- Pro Thema wechseln Boden, Wand, Akzent, Fackel und Grundlicht. Technisch wechselt der Code dafür die Paletten-Textur (`assets/textures/<thema>/`).

| Thema | Boden | Wand | Akzent | Fackel | Grundlicht |
| --- | --- | --- | --- | --- | --- |
| Keller | #5B4A3C | #7A6552 | #E8B23A | #FF9A3C | #3A3048 |
| Keller: Gruft, Brunnen | #4A4440 | #5F5A55 | #FFD08A | #FFC27A | #2C3448 |
| Katakomben | #5A5348 | #8A8070 | #9FE0C8 | #FFB05A | #2A3330 |
| Zwergenminen | #3E3A3A | #55504C | #4FB3C9 | #FF6A2A | #2A2228 |
| Goblin-Höhlen | #4A4A32 | #5E5A3E | #A6E05A | #E8B840 | #22301E |
| Ork-Lager | #5A3E30 | #6E4A38 | #B0B8C0 | #FF5A28 | #3A2420 |

Gruft und Brunnen sind im Keller die düsteren Räume: kälteres Grundlicht, Kerzen statt Fackeln. In der Gruft hängen höchstens zwei Fackeln mit blauem Licht und blauer Flamme, damit der Raum düster und kühl wirkt. Im Ork-Lager wird das Gefahr-Rot vor den rötlichen Wänden geprüft und bei Bedarf nachgeschärft.

**Böden**

- Neben der Farbe kann pro Thema und Raumtyp auch die Form der Bodenplatten wechseln. Dafür gibt es Bodenvarianten aus KayKit Dungeon Remastered, etwa glatte, gesprungene und verzierte Steinplatten, Holzdielen oder Erde.
- Nur Platten, die genau eine Kachel decken. Keine Platten mit Gittern, Löchern oder Stacheln: Sie würden wie Fallen oder Hindernisse wirken.
- Ein Raum mischt die Varianten gewichtet nach Raum-Seed, etwa meist glatte Platten mit wenigen gesprungenen. Feld `floorTiles`: `"floorTiles": [ { "tile": "boden", "weight": 8 }, { "tile": "boden_gesprungen", "weight": 1 } ]`.
- Reihenfolge: `floorTiles` in der Einrichtung des Raumtyps (`themeDecor` vor `decor`), sonst `floorTiles` des Themas in `data/themes.json`, sonst `boden`.
- Heute: Keller `boden` (86), `boden_bruch_a` (7) und `boden_bruch_b` (7); Gruft und Brunnenraum `boden_bruch_a` und `boden_bruch_b` zusammen 70 %, `boden_unkraut_a` und `boden_unkraut_b` zusammen 30 %, in jedem Thema; Katakomben `boden_bruch_a`, `boden_bruch_b`, `boden_unkraut_a` und `boden_unkraut_b` zu gleichen Teilen. Die verzierte Platte (`floor_tile_small_decorated`, mit Kerzen und Steinen) wird in keinem Raum verwendet und ist entfernt.
- Die Farbe bleibt Sache der Paletten-Textur des Themas, die Variante bestimmt nur die Form. Der Boden bleibt ruhig: Er ist Bühne, nicht Requisit.
- Der Schrittklang bleibt ein eigenes Feld (`floor` unter `sound`) und soll zur Variante passen, etwa Holzdielen mit `wood`, Erde mit `mud` oder `gravel`.

**Formensprache**

- Figuren etwa 1:3 (Kopf ein Drittel der Höhe), große Hände und Füße, Augen als einfache Formen.
- Kanten weich gefast. Spitze Formen nur bei Waffen und Gefahren: spitz heißt „tut weh“.
- Detail steckt in der Menge der Requisiten, nicht in der Geometrie einzelner Teile. Klare Silhouette zuerst.
- Leicht schief und handgemacht: durchgesessene Stühle, krumme Regale, zu große Käseräder.

**Licht**

- Grundlicht niedrig als Halbkugellicht: oben warmes Grau, unten das Grundlicht des Themas. Ecken sinken auf etwa 15 bis 20 % Helligkeit, nie auf Schwarz.
- Fackeln als warme Punktlichter mit 5 bis 6 Kacheln Reichweite und leichtem Flackern. Höchstens zwei schattenwerfende Lichter pro Raum.
- Requisiten mit eigenem Licht (Herd, Kerzen, Kronleuchter, Lagerfeuer) leuchten ohne Schatten.
- Die Spielfigur trägt einen kleinen, schwachen Lichtschein.
- Einzelne Raumtypen dürfen heller sein: `brightness` in `roomPalettes` (`data/themes.json`) verstärkt das Grundlicht, im Keller der Händlerraum (1,8).

**Lesbarkeit**

- Spielfigur mit hellem Bodenring, Gegner mit rotem Akzent und im Kampf rotem Ring.
- Türrahmen eine Stufe heller als die Wand, neben jeder Tür eine Fackel (Ausnahme: in der Schatzkammer hängt an jeder Säule eine Fackel). Verschlossene Tür: rotes Schloss.
- Anklickbare Objekte (Truhe, Lagerfeuer, Händler, Treppe nach unten): goldene Umrisslinie beim Überfahren mit der Maus, leichtes Aufhellen.
- Bodendeko (Sack, Moos, Pfütze, Geröll) flach und dunkel, damit sie nie wie ein Hindernis wirkt.

### Asset-Spezifikation

Gilt für alle Modelle. Bei Paketteilen gilt sie für das Ergebnis im Spiel; Abweichungen der Rohdatei korrigiert `data/models.json`.

- **Format:** GLB, Modell, Material und Animationen in einer Datei, möglichst unter 1 MB.
- **Maßstab:** 1 Einheit = 1 Kachel. Kachelteile 1×1 oder ein Vielfaches laut Requisitenliste. KayKit-Teile mit Faktor 0,5 (kleine KayKit-Bodenplatte = 1 Kachel).
- **Ausrichtung:** Ursprung am Boden, mittig auf der Grundfläche; Figuren blicken nach +Z, oben ist +Y. Wandteile: Ursprung mittig auf der Kachelkante, Vorderseite zeigt in den Raum.
- **Höhen:** Mensch und Elf 1,0 bis 1,2 Kacheln, Zwerg etwa 0,7 (gemessen 0,65 ohne Helm) und dafür breiter, Boss nach Größe in der Figurenliste. Hohe Wand 2 Kacheln, Sockel 0,25.
- **Dreiecke:** höchstens etwa 3.000 pro Figur (KayKit-Figuren nach dem Abspecken bis 4.000), 1.500 pro Requisit.
- **Material:** stilisiert, Schattierung wie KayKit, keine Normal Maps. Paketteile nutzen die gemeinsame Paletten-Textur des Themas (`assets/textures/keller/dungeon_texture.png`), KI-Modelle eine eigene Textur bis 512 px in den Palettenfarben. Ausnahme: KayKit-Figuren behalten die Textur ihres Pakets, weil ihre Texturkoordinaten nicht auf die Paletten-Textur passen.
- **Animationen:** Idle, Walk, Attack, Hit, Death, Interact. Heißen sie im Paket anders, ordnet `data/models.json` sie zu. Fehlt eine Animation, gilt die Bewegung aus dem Code: Hit als kurzes Zucken, Death als Versinken im Boden, eine Figur ganz ohne Animationen gleitet und wippt wie die Platzhalter.
- **Dateinamen:** id aus dem GDD; Varianten als `id_variante.glb`, etwa `fass_gruppe.glb`. Fehlt die Variante, gilt die Grunddatei. Eine Variante kann auch nur eine andere Animation sein (Skelett sitzend).
- **Ordner:** `assets/tiles/` (Boden, Wand, Sockel, Ecken, Türrahmen), `assets/props/`, `assets/figures/`, `assets/textures/`, `assets/sounds/`. Rohdateien der Pakete in `assets/source/`.
- **Bauteile:** `boden`, Bodenvarianten `boden_<name>` (siehe Stilguide, Böden), `wand`, `wand_ecke`, `sockel`, `sockel_ecke`, `tuerrahmen`, `fackel`, `schloss`. Der Türrahmen hinten deckt drei Kacheln (Tür mittig). Neben jeder Tür hängt eine Fackel. In der Vorkammer hängt keine Fackel hinter oder neben der Treppe, also nicht auf den Kacheln 1 bis 4 von Nord- und Westwand; die Fackel dort fällt weg. An den vorderen Türen (Süd, Ost) ist sie wie die vorderen Wände ausgeblendet: kein Modell und kein Pfosten, nur ihr Licht bleibt, damit der Raum gleich hell bleibt.
- **Zuordnung:** `data/models.json` hält pro id Datei, Maßstab (Zahl oder [x, y, z]), Drehung, Versatz, Einfärbung (`tint`, Farbe, mit der die Paletten-Textur multipliziert wird, etwa Holzton für graue Kisten), Animationszuordnung, Lichtpunkte (Position relativ zum Ursprung, Farbe, Stärke, Reichweite) und Zubehör (`accessories`: Teil aus Grundformen wie Kochmütze, Krone oder rote Augen, an einem Knochen der Figur, mit Versatz und Größe in Kacheln). Mehrere ids dürfen dieselbe Datei nutzen (Riesenratte, Küchenchef und Monsterratte).
- **Build-Skript:** `tools/build-assets.mjs` setzt Teile aus Paketen zu einer GLB zusammen (Tafel, Regal, Türrahmen) und speckt Paketfiguren ab (nur benötigte Animationen und Zubehörteile, komprimiert). FBX-Dateien wandelt es vorher in GLB um; es kann Materialfarben auf die Palette setzen (matt, ohne Metallglanz), eine Waffe an einen Knochen hängen und Figuren auf höchstens 3.000 Dreiecke vereinfachen. Requisiten kann es aus Teilen einer Paketfigur zusammensetzen (`extracts`), etwa die Knochen aus Schädel, Kiefer und Armen der Skelette.
- **Platzhalter:** Fehlt eine Datei oder lädt sie nicht, baut der Code das Teil wie bisher aus Grundformen.
- **Bart des Zwergs:** Zubehör `bart` aus Grundformen, Farbe `#4A3020`, matt und weich, in zwei Teilen: Kinnansatz mit Schnurrbart-Wulst am Kopfknochen (`part: "kinn"`, Knochen `head`) und ein breiter Keil bis zum Bauch, unten leicht gegabelt, am Brustknochen (`part: "keil"`, Knochen `chest`); beide überlappen leicht. Am Kinn etwa 0,27 Kacheln breit, der Keil oben 0,24 (schmaler als geplant, damit die Schwerthand beim Angriff frei bleibt), nach unten schmaler; gesamt etwa 0,34 Kacheln lang, weil der Kopf der Figur groß ist und 0,45 bis zu den Füßen reichen würde. Der Bart schneidet bei Stehen, Laufen und Angriff nicht ins Schwert.
- **Zubehör der Spielfiguren:** Die Figur trägt das Teil des Pakets, das der Startwaffe am nächsten kommt: Zwerg Schwert (Langschwert), Elf Messer (Dolch), Mensch Zauberstab (das Paket hat keinen Knüppel). Schilde, Zweithand-Waffen und Bücher fallen weg.
- **Quellen der Figuren im Keller:** Mensch KayKit `Mage`, Elf `Rogue_Hooded`, Zwerg `Knight` ohne Helm, Haare und Augenbrauen in der Bartfarbe (Textur `assets/textures/figures/zwerg/zwerg_texture.png`), ungleich skaliert (Maßstab `[0,429, 0,2805, 0,429]`: breiter und kleiner), mit Bart, Händler `Rogue` ohne Kapuze und Waffen, Outfit dunkelblau statt grün (KayKit Adventurers); Skelett aus KayKit Skeletons 1.0 (Minion, Warrior, Rogue, Mage; die Fassung 1.1 FREE hat kein Sitzen, Liegen und Angreifen, Textur gleich) mit der auf die Palette umgefärbten Textur `assets/textures/figures/skeleton/skeleton_keller.png`; Goblin aus Goblin Lowpoly Assets (standout7, itch.io); Mimik aus der Truhe des KayKit Dungeon Pack (itch.io); Riesenratte, Küchenchef und Monsterratte aus `Rat`, Kröte aus `Frog` (Easy Animated Enemy Pack, Quaternius). Goblin: `Basic_Goblin` mit `Rusty Shiv`; die kostenlose Fassung hat keine Animationen.
- **Quellen der Figuren in den Katakomben:** Skelettkrieger aus KayKit Skeletons `Warrior` mit der Skelett-Textur; Geister (Geist, Poltergeist) aus KayKit Adventurers `Rogue` ohne Kapuze und Waffen, Outfit hellblau, Haut weiß, Haare grau, ohne Handschuhe (Hände in Hautfarbe), mit kaltem blauem Licht an der Figur (Lichtpunkt ohne Schatten). Geister sind als ganze Figur durchscheinend (Deckkraft 0,6, `opacity` in `data/models.json`); innere Teile bleiben dabei verborgen. Skelett-König aus KayKit Skeletons `Warrior` mit der Skelett-Textur, 1,3-fach so groß wie die anderen Skelette, mit goldener Krone aus Grundformen auf dem Helm (`accessories`, Form `krone` am Kopfknochen).
- **Lizenzen:** Quelle und Lizenz jeder fremden Datei in `assets/CREDITS.md`.

### Einrichtung pro Raumtyp

Was in einem Raum steht, legen die Daten fest, nicht der Code. Jeder Raumtyp kann in `data/room-types.json` ein Feld `decor` haben. Für einzelne Themen gibt es zusätzlich `themeDecor`, etwa `"themeDecor": { "keller": { … } }`; es ersetzt dort `decor`. Raumtypen ohne beides behalten das bisherige Einrichtungsmuster aus dem Code.

```json
"kueche": {
  "decor": {
    "torchColor": "#ff8a30",
    "layouts": [
      { "id": "A", "props": [
        { "prop": "herd", "place": "wall-back" },
        { "prop": "tisch", "place": "center", "variant": "kueche" },
        { "prop": "regal", "place": "wall-back" },
        { "prop": "sack", "place": "corner", "count": 2 }
      ] }
    ]
  }
}
```

- **Varianten:** `layouts` enthält eine oder mehrere Varianten. Der Raum-Seed wählt eine davon, gleicher Seed ergibt gleiche Einrichtung.
- **Platzierung (`place`):** `center` (Raummitte), `wall-back` (an der Nord- oder Westwand, weil die vorderen Wände nur Sockel sind), `corner` (in einer Ecke, bei `count` über 1 in verschiedenen Ecken), `free` (beliebige freie Kachel), `around:<prop>` (um ein anderes Requisit herum, etwa Stühle um die Tafel), `above:<prop>` (über einem anderen Requisit, etwa der Kronleuchter über der Tafel), `tile:x|y` (genau diese Kachel, etwa die Säulen der Schatzkammer; ohne Korrektur, passt sie nicht, fällt das Requisit weg), `door-sides` (Wandschmuck links und rechts jeder Tür in Nord- und Westwand, eine Kachel Abstand zum Türrahmen, an der Nordwand also 3|1 und 7|1; alle in derselben Variante; an Süd- und Osttüren nicht, weil die vorderen Wände nur Sockel sind).
- **Fackeln an Säulen (`torches`):** Mit `"torches": "saeulen"` in der Einrichtung hängen keine Fackeln an den Wänden, und die Lichter der vorderen Fackeln fallen weg. Stattdessen trägt jede Säule eine leuchtende Fackel auf der Seite zur Raummitte; Säulen in Reihen (Säulengang) tragen sie auf der Seite zum Gang. Heute so in der Schatzkammer (alle Säulen) und in der Säulenhalle (3 bis 4 zufällige Säulen).
- **Anzahl der Fackeln (`torchCount`):** Zahl oder Bereich `[von, bis]`. Mit `torches: "saeulen"` zählt es die Säulen mit Fackel, sonst die Wandfackeln an Nord- und Westwand (Auswahl nach Raum-Seed); dann fallen auch die Lichter der vorderen Fackeln weg. `torchFlame` (Farbe) legt eine eigene Flamme über die des Modells. Heute: Gruft mit zwei Fackeln, Licht `#5d86e0`, Flamme `#8fb4ff`.
- **Weitere Felder:** `count` (Anzahl, Standard 1, oder ein Bereich wie `[2, 3]`, aus dem der Raum-Seed wählt), `mimics` (bei der Einrichtung: `true` heißt, von mehreren Truhen ist eine echt, die übrigen sind Mimiken), `variant` (Abwandlung eines Requisits, etwa der Tisch mit Töpfen statt Würfeln), `clear` (Freiraum: im Umkreis von so vielen Kacheln um dieses Requisit liegt nichts anderes, auch schräg gezählt; Lagerfeuer 2), `doorGap` (so viele Kacheln Abstand zu Türkachel und Kachel davor; Schlaflager im Rastplatz 1). `floorTiles` (Bodenvarianten mit Gewicht für diesen Raumtyp, siehe Stilguide, Böden).
- **Feste Regeln:** Türkacheln und die Kachel davor bleiben frei. Wandrequisiten (Regale, Fahnen, Schlüsselbund, Herd, Anrichte und alle anderen an der Wand) verdecken oder überlagern keine Fackel: Die Wandkachel einer Fackel bleibt für sie frei. Abgebrannte Kerzen (Kerzenstummel) stehen nicht als Deko auf dem Boden. Münzstapel (`goldhaufen`, `muenzen` mit allen Varianten) haben einen Mindestabstand (`spread: 2`): Derselbe Typ, also gleiches Requisit und gleiche Variante, steht nicht noch einmal im Umkreis von zwei Kacheln, auch schräg gezählt. Verschiedene Typen dürfen nebeneinander liegen, etwa mittlerer neben kleinem Stapel, aber nicht kleiner neben kleinem. Sarkophage halten eine Kachel Abstand zur Wand (`wallGap: 1`) und zum nächsten Sarkophag (`spread: 1`). Passt ein Stapel nirgends, gilt der Korrekturablauf. Jede Tür und jedes anklickbare Objekt bleibt erreichbar, `npm test` prüft das für alle Varianten. In Vorkammer, Abstieg und Bossraum bleibt die Nordwest-Ecke (1|1 bis 3|3) für die Treppe frei; `corner` meint dort nur die drei übrigen Ecken, `wall-back` nur die freien Abschnitte von Nord- und Westwand.
- **Pflichtstücke:** Ein Requisit mit `"required": true` macht den Raumtyp erkennbar (Herd in der Küche, Tafel im Speisesaal, Brunnen im Brunnenraum). Es wird immer zuerst platziert und nie weggelassen. Passt es in einer Variante bei einer Türkombination nicht, ist das ein Fehler in den Daten, und `npm test` schlägt fehl.
- **Korrektur:** Passt ein Requisit nicht, versucht der Code in dieser Reihenfolge: 1. eine andere Kachel mit derselben Platzierung, 2. die nächste Platzierung in der Reihe `center` → `corner` → `wall-back` → `free`, 3. eine kleinere Anzahl, 4. weglassen. Requisiten mit `around:` oder `above:` fallen mit ihrem Bezugsrequisit weg. Gleicher Seed ergibt immer dieselbe Korrektur.
- **Prüfung:** `npm test` platziert jede Variante jedes Raumtyps mit allen 16 Türkombinationen und prüft: keine Überlappung, nichts in Wänden oder auf Türkacheln, jede Tür und jedes anklickbare Objekt ist von jeder Tür aus erreichbar, Pflichtstücke sind vorhanden. Der Test gibt eine Liste aus, welche Requisiten wie oft korrigiert oder weggelassen wurden.
- **Modelle:** Bis Meilenstein 6 baut der Code jedes Requisit aus Grundformen. Die Requisiten-ids bleiben, wenn später Modelle sie ersetzen.

**Requisiten**

| id | Requisit | Größe | Blockiert | Anklickbar | Eigenes Licht | Für |
| --- | --- | --- | --- | --- | --- | --- |
| saeule | Säule | 1 | ja | nein | nein | mehrere |
| saeule_liegend | Umgestürzte Säule | 2×1 | ja | nein | nein | Säulenhalle |
| fass | Fass, meist als Gruppe aus 3 (`variant: gruppe`) | 1 | ja | nein | nein | mehrere |
| kiste | Kiste | 1 | ja | nein | nein | mehrere |
| sack | Sack | Deko | nein | nein | nein | Vorratskammer, Küche |
| regal | Regal mit Krügen | 2×1, Wand | ja | nein | nein | Vorratskammer, Küche, Händler |
| herd | Herd mit Kessel und Glut | 2×1, Wand | ja | nein | ja | Küche |
| tisch | Tisch | 3×1 | ja | nein | nein | Wachstube, Küche |
| hocker | Hocker | 1 | ja | nein | nein | Wachstube |
| tafel | Tafel mit Tellern und Kerzen | 5×1 | ja | nein | nein | Speisesaal |
| stuhl | Stuhl | 1 | ja | nein | nein | Speisesaal |
| kronleuchter | Kronleuchter, hängend | über Tafel | nein | nein | ja | Speisesaal |
| anrichte | Anrichte | 2×1, Wand | ja | nein | nein | Speisesaal |
| waffenstaender | Waffenständer | 2, Wand | nein | nein | nein | Wachstube, Säulenhalle |
| brunnen | Brunnen mit Kurbel und Eimer | 1 | ja | nein | nein | Brunnenraum |
| moos | Moos | Deko | nein | nein | nein | Brunnenraum, Säulenhalle |
| pfuetze | Pfütze | Deko | nein | nein | nein | Brunnenraum |
| sarkophag | Sarkophag (eine Kachel Abstand zur Wand und zum nächsten Sarkophag) | 1×2 | ja | nein | nein | Gruft |
| kerzen | Kerzengruppe | Deko | nein | nein | ja | Gruft, Speisesaal, Schatzkammer |
| knochen | Knochen | Deko | nein | nein | nein | Gruft, Bossraum |
| geroell | Geröll | Deko | nein | nein | nein | alle |
| goldhaufen | Goldhaufen (KayKit `coin_stack_large`) | Deko | nein | nein | nein | Schatzkammer |
| truhe | Truhe (in der Schatzkammer 2 bis 3, davon eine echt, die übrigen Mimiken) | 1 | ja | ja | nein | Schatzkammer |
| lagerfeuer | Lagerfeuer | 1 | ja | ja | ja | Rastplatz |
| haendlerfigur | Händler mit Wandregal hinter sich und Verkaufstisch mit Kerze vor sich; steht auf 2\|2 bis 2\|8 oder 2\|2 bis 8\|2 und schaut zur Raummitte | 1×3, Wand | ja | ja | ja | Händler |
| pult | Pult mit Gästebuch | 1 | ja | nein | nein | Vorkammer, immer auf 4\|3 seitlich der Treppe |
| wegweiser | Wegweiser | 1 | ja | nein | nein | derzeit in keinem Raum |
| zettelbrett | Zettelbrett | Wand | nein | nein | nein | Vorkammer |
| bank | Bank | 2×1 | ja | nein | nein | Abstieg |
| souvenirkiste | Souvenirkiste | 1 | ja | nein | nein | Abstieg |
| kaeseberg | Käseberg mit Thron | 2×2, Wand | ja | nein | ja | Bossraum (Keller) |
| kistenstapel | Gestapelte Kisten | 2×2 | ja | nein | nein | Händler, Vorratskammer, Küche |
| fassstapel | Kleine Fässer, gestapelt | 1 | ja | nein | nein | Händler |
| flaschen | Flaschen auf dem Boden (Variante `b`: andere Flaschen) | 1 | nein | nein | nein | Händler, Rastplatz |
| fahne | Fahne an der Wand (Varianten `blau`, `gruen`, `gelb`, `wappen`) | 1, Wand | nein | nein | nein | Wachstube, Schatzkammer, Speisesaal |
| fahne_dreifach | Drei Fahnen nebeneinander (Varianten `blau`, `gelb`) | 2, Wand | nein | nein | nein | Säulenhalle, Schatzkammer, Speisesaal |
| schluesselbund | Schlüsselbund am Haken | 1, Wand | nein | nein | nein | Wachstube |
| strohlager | Strohlager auf dem Boden (KayKit `bed_floor`) | 1×2 | ja | nein | nein | Wachstube, Rastplatz |
| kerze_duenn | Dünne Kerze (KayKit `candle_thin`; Variante `an`: brennend, `candle_thin_lit`, mit Licht) | 1 | nein | nein | an: ja | Rastplatz, neben dem Schlaflager |
| zapffass | Zapffass | 1 | ja | nein | nein | Vorratskammer, Küche |
| zapffass_verziert | Zapffass mit Gestell | 2×1 | ja | nein | nein | Vorratskammer, Küche |
| kistenberg | Kistenberg | 1 | ja | nein | nein | Vorratskammer, Küche |
| muenzen | Münzstapel aus KayKit-Münzen (Varianten `klein`, `einzeln`) | 1 | nein | nein | nein | Schatzkammer |
| saeule_verziert | Verzierte Säule | 1 | ja | nein | nein | Säulenhalle |
| geroell_gross | Großer Geröllhaufen | 2×1 | ja | nein | nein | Gruft |
| regal_gross, regal_klein | Wandbrett, groß und klein | 1, Wand | nein | nein | nein | Vorratskammer |
| regal_kerzen | Wandbrett mit Kerzen | 1, Wand | nein | nein | nein | Vorratskammer |
| wandregal | Hohes Wandregal | 2×1, Wand | ja | nein | nein | Vorratskammer |
| treppe_hoch | Steintreppe nach oben (KayKit `stairs`), steigt zur Nordwand | 3×3, Nordwest-Ecke | ja | nein | nein | Vorkammer, vom Code gesetzt |
| treppe_runter | Steintreppe nach unten in ein Loch im Boden (KayKit `stairs`), kühler Schimmer von unten | 3×3, Nordwest-Ecke | ja | ja | ja | Abstieg und Bossraum, vom Code gesetzt |

**Figuren**

| id | Figur | Art | Größe | Varianten |
| --- | --- | --- | --- | --- |
| rat | Riesenratte | Monster | 1 | – |
| skeleton | Skelett | Monster | 1 | sitzend |
| goblin | Goblin-Wache | Monster | 1 | – |
| mimic | Mimik, sieht aus wie eine Truhe | Monster | 1 | – |
| kuechenratte | Der Küchenchef, Ratte mit Kochmütze | Monster | 1 | – |
| monsterratte | Die Monsterratte, ponygroß mit Gabelkrone | Boss Keller | 2×2 | – |
| kroete | Die Kröte, mit Krone | Figur ohne Kampfwerte | Deko | – |

Jede Monster-id hat eine Figur mit derselben id. Figuren ohne Modell baut der Code aus Grundformen. Figuren ohne Animation atmen im Stand leicht, die Füße bleiben dabei am Boden.

## Sound

Geräusche kommen als MP3-Dateien. Welche Datei wann spielt, steht in den Daten, nicht im Code. Grundregel: Ist kein Sound festgelegt oder fehlt die Datei, spielt nichts. Es gibt keine Platzhalter-Geräusche.

### Zuordnung

- **Datei:** `data/sounds.json` hält pro Sound-id eine oder mehrere Dateien, die Lautstärke (0 bis 1) und optional `loopStart` und `loopEnd` in Sekunden, etwa `"schritt_wood": { "files": ["schritte/wood_1.mp3", "schritte/wood_2.mp3"], "volume": 0.6 }`. Bei mehreren Dateien wählt das Spiel zufällig eine.
- **Ordner:** `assets/sounds/` mit `angriff/`, `zauber/`, `spiel/`, `raum/`, `schritte/`, `events/`.
- **Kanäle:** Hintergrund, Effekte und Schritte unter einer Gesamtlautstärke. Regler und Stummschalten kommen in Meilenstein 7.
- **Start:** Der Ton beginnt mit dem ersten Klick, spätestens bei der Volkswahl (Vorgabe der Browser).
- **Loops:** MP3 hat am Anfang und Ende kurze Stille. Loops nutzen `loopStart` und `loopEnd`, damit keine Lücke hörbar ist.
- **Lizenzen:** Quelle und Lizenz jeder fremden Datei in `assets/CREDITS.md`, Abschnitt Sounds.

### Angriffe

Waffen in `data/items.json` und Monster in `data/monsters.json` nennen im Feld `sound` ihren Angriffsklang. Gespielt wird `angriff_<klang>_treffer` oder `angriff_<klang>_fehl`, je nach Ergebnis des Wurfs.

- **Klänge:** `holz`, `schwert`, `axt`, `hammer`, `faust`, `biss`, `kralle`. Magische Waffen haben einen eigenen Klang mit ihrem Namen.
- **Ohne Waffe** gilt `faust`.
- **Gruppen:** Jede Figur einer Gruppe spielt ihren Angriff, wenn sie dran ist.

| Waffe | Klang |
| --- | --- |
| Knüppel | holz |
| Dolch, Kurzschwert, Langschwert, Rapier, Elfenklinge | schwert |
| Streitaxt, Zwergische Kriegsaxt | axt |
| Kriegshammer | hammer |
| Eismesser | eismesser |
| Buch des Feuers | feuerbuch |

| Monster | Klang |
| --- | --- |
| Riesenratte, Küchenchef, Monsterratte | biss |
| Mimik | biss |
| Skelett | schwert |
| Goblin-Wache | schwert |

### Verbrauchsgegenstände

Verbrauchsgegenstände nennen im Feld `sound` eine Sound-id, die beim Benutzen spielt.

| Gegenstand | Sound-id |
| --- | --- |
| Kleiner Heiltrank, Großer Heiltrank | trank |
| Feuerpfeil-Schriftrolle | zauber_feuerpfeil |
| Schild-Schriftrolle | zauber_schild |
| Eis-Schriftrolle | zauber_eis |
| Feuerball-Schriftrolle | zauber_feuerball |

### Räume

Jeder Raumtyp hat in `data/room-types.json` das Feld `sound` mit `mood` und `floor`. Für einzelne Themen ersetzt `themeSound` es, etwa `"themeSound": { "katakomben": { "mood": "spooky", "floor": "gravel" } }`. Raumtypen ohne beides bleiben still, auch ohne Schritte.

- **`mood`:** `cozy`, `wet`, `spooky`, `empty` oder `kitchen`. Gespielt werden der Loop `raum_<mood>_loop` und Zufallsgeräusche `raum_<mood>_zufall` im Abstand von 8 bis 20 Sekunden, mit leicht wechselnder Lautstärke und Richtung.
- **`floor`:** `wood`, `hall`, `mud`, `gravel` oder `stone` (trockener Stein), bestimmt die Schritte.
- **Raumwechsel:** Der Hintergrund blendet mit dem Bild über, etwa 1 Sekunde, auch bei der Schnellreise.
- **Events und Kämpfe:** Der Hintergrund läuft mit halber Lautstärke weiter.

| Raumtyp (Keller) | mood | floor |
| --- | --- | --- |
| Vorkammer, Rastplatz, Händler, Speisesaal, Vorratskammer | cozy | stone |
| Küche | kitchen | stone |
| Brunnenraum | wet | hall |
| Gruft | spooky | hall |
| Bossraum, Schatzkammer | spooky | stone |
| Säulenhalle | empty | hall |
| Wachstube, Abstieg | empty | stone |

Im Keller (Ebene 1 bis 3) ist der Boden einheitlich `stone`, nur Gruft, Brunnenraum und Säulenhalle klingen mit Hall (`hall`).

### Schritte

- Läuft eine Figur, spielt `schritt_<floor>` des aktuellen Raums, für Spielfigur, Gegner und friedliche Figuren.
- Eine Figur kann in `data/staging.json` unter `figures` einen eigenen Schritt nennen (`steps`), dann spielt `schritt_<steps>`. Heute: Riesenratte, Küchenchef und Monsterratte mit `trippeln`, der Geist mit `schweben` (er läuft nicht, er schwebt).
- **Takt:** Schritte folgen der Laufanimation. Figuren ohne Laufanimation (Goblin, Platzhalter) machen alle 0,35 Sekunden einen Schritt.
- **Variation:** Jeder Schritt bekommt eine um bis zu 5 % andere Tonhöhe.
- **Lautstärke:** Gegner leiser als die Spielfigur, Figuren der Größe 2×2 tiefer. Höchstens zwei Gegner-Schritte gleichzeitig.

### Events

- Ein Event kann im Feld `sound` eine Sound-id nennen. Sie spielt, wenn das Textfenster aufgeht.
- Folge-Events über `next` und Boss-Events können eigene Sounds haben. Boss-Events spielen ihren Sound bei jedem Betreten.

### Spielgeräusche

Feste Sound-ids, die der Code an diesen Stellen spielt:

| Sound-id | Wann |
| --- | --- |
| tuer | Raumwechsel durch eine Tür |
| tuer_verschlossen | Klick auf eine verschlossene Tür |
| tuer_riegel | `lockDoor` oder `unlockDoor` |
| truhe | Truhe öffnet sich |
| gold | Gold erhalten |
| gold_zahlen | Kaufen beim Händler, `loseGold` |
| stufe | Stufenaufstieg |
| treppe | Klick auf die Treppe nach unten |
| treffer_<figur-id>, sonst treffer | Figur wird getroffen, zusammen mit dem Angriffsklang |
| tod_<figur-id>, sonst tod | Figur stirbt; bei einer Gruppe einmal |
| tod_<volk>, sonst tod_spieler, sonst tod | Spielfigur stirbt (im Kampf oder durch ein Event) |

Für die Spielfigur gilt als Figur-id das Volk (`zwerg`, `elf`, `mensch`).

Geist: Angriffsklang `geist` (`angriff_geist_treffer`, `angriff_geist_fehl`), `treffer_geist`, `tod_geist`, Bewegung `schritt_schweben`.
Poltergeist: dieselben Töne wie der Geist. `treffer_poltergeist` und `tod_poltergeist` nutzen in `data/sounds.json` dieselben Dateien; sobald der Poltergeist in `data/monsters.json` steht, bekommt er `"sound": "geist"` und in `data/staging.json` `"steps": "schweben"`.

## Meilensteine

Sieben Schritte, Meilenstein 6 in drei Teilen; jeder endet mit etwas Spielbarem, das Christian im Browser testet.

| Nr. | Ergebnis | Test |
| --- | --- | --- |
| 1 | Ein Raum mit Iso-Kamera, Platzhaltern und Klick-Bewegung | Figur läuft um ein Hindernis herum |
| 2 | Drei handgebaute Räume mit Türen und Raumwechsel | Figur kommt an der richtigen Tür an |
| 3 | Dungeon-Generator mit Seed und Minimap | Alle Türen passen, keine unerreichbaren Räume |
| 4 | Event-System aus JSON mit Textfenster und Proben | Event aus der Tabelle startet, Probe wird angezeigt |
| 5 | Kampf, Lebenspunkte, Inventar, Tod und Sieg | Ein Durchlauf ist vollständig spielbar |
| 6a | Echte Modelle für Boden, Wände, Türen, Fackeln und Requisiten des Kellers, Licht, Modell-Lader mit Platzhalter als Rückfall | Keller entspricht dem Stilguide, fehlende Modelle zeigen weiter Platzhalter |
| 6b | Echte Figuren für die drei Völker und die Keller-Monster mit Animationen | Figuren laufen, kämpfen, werden getroffen und sterben sichtbar |
| 6c | Sound-System mit `data/sounds.json`: Raum-Atmosphäre, Schritte, Angriffe, Zauber, Spielgeräusche und Event-Sounds im Keller | Räume, Schritte und Kampf klingen unterschiedlich; fehlende Sounds bleiben stumm, ohne Fehler |
| 7 | Speichern, Menüs mit Lautstärkereglern, Veröffentlichung | Spiel läuft über einen öffentlichen Link |

## Getroffene Entscheidungen

- [x] Zwei Modi bestätigen: freie Erkundung in Echtzeit, Rundenmodus nur während Events
- [x] Regelvorschlag annehmen: drei Attribute, W20, Schwierigkeiten 8/12/16
- [x] Raumgröße 9×9 Kacheln (vorher 11×11, davor 15×15); Türen auf der fünften Kachel
- [x] Setting und Ton: klassische Fantasy, humorvoll
- [x] Tod: Neustart mit neuem Dungeon (Permadeath)
- [x] Verhalten beim erneuten Betreten eines Raums: Durchlaufen ohne neues Event
- [x] Nur Desktop
- [x] Schnellreise über die Minimap: nur besuchte Räume, sofort mit Abblende, ohne Kosten, Ankunft in der Raummitte, gesperrt während Events
- [x] Lebenspunkte gelten, bei 0 neuer Dungeon
- [x] lockDoor/unlockDoor mit Richtung oder „back“, Rück-Tür öffnet sich, wenn sonst alles zu ist
- [x] Startraum: Begrüßungs-Event zu Beginn jedes Dungeons
- [x] once gilt pro Dungeon; Bedingungen flag und notFlag
- [x] Volkswahl statt Klassen: Zwerg, Elf, Mensch legen Attribute, Lebenspunkte und Fähigkeit fest
- [x] Ausrüstung und Zauber über Mindestattribute
- [x] Fähigkeit pro Volk, einmal pro Dungeon: misslungene Probe des Hauptattributs gilt als bestanden (Kraftprotz, Scharfe Sinne, Wacher Geist)
- [x] Jede Probe hat eine von neun Kategorien unter den drei Attributen
- [x] Volks-Bedingungen für ganze Events und für einzelne Optionen bei ausgewählten Events
- [x] Gegnerzug: W20 + Angriffsbonus gegen Rüstung der Figur (10 + Rüstungsbonus)
- [x] Spielerschaden kommt von der Waffe, ohne Waffe 1
- [x] Leichte Waffen treffen mit Geschick, schwere mit Kraft, magische mit Verstand; Feld `hit` kennt kraft, geschick und verstand
- [x] Flucht: SG 12, Fehlschlag lässt den Gegner handeln, Erfolg führt durch die Rück-Tür und beendet das Event ohne Beute
- [x] Erfahrungsschwellen 10 / 25 / 45 / 70, danach alle 30; Spieler wählt das Attribut beim Aufstieg
- [x] Lebenspunkte je Stufe nach Volk: Zwerg +5, Elf +3, Mensch +4
- [x] Endlos tiefer: kein Sieg, Endbildschirm mit Ebene und witziger Todesursache
- [x] Inventar: Waffe und Rüstung angelegt extra, sechs Rucksackplätze
- [x] Beute als Gold plus Gegenstand
- [x] Effekte `gold` (nur Gold, mal Themenstufe), `item` (sicher ein Gegenstand, ohne Gold) und `loseGold` (fester Betrag, nie unter 0)
- [x] Themen alle drei Ebenen: Keller, Katakomben, Zwergenminen, Goblin-Höhlen, Ork-Lager; danach weitere Themen geplant, bis dahin Ork-Lager endlos
- [x] Raumtypen mit Bewertung feindlich, neutral oder gemischt; gemischt heißt 30 % feindliche Events, sonst harmlos; Markierung doppelt als `hostile` und `rating`
- [x] Verlässlich sicher sind nur Start, Rastplatz und Händler; der Abstieg ist neutral, seine Events dürfen kleine Folgen und einen Kampf haben
- [x] Anteil feindlicher Räume steigt mit der Tiefe
- [x] Schatzkammer nur in Sackgassen und höchstens eine pro Ebene; Wachstube neben, Gruft nie neben dem Start
- [x] Ersatz für die Wachstube neben dem Start: Kerker (Katakomben), Goblin-Lager (Goblin-Höhlen), Ork-Lager (Ork-Lager)
- [x] Lage- und Anzahlregeln für alle Raumtypen (Tabelle im Abschnitt Raumtypen)
- [x] Ebenengröße 8–12 Räume, +2 je Ebene, höchstens 24–28
- [x] Monster je Thema, dazu +1 LP pro Ebene innerhalb des Themas; Richtwert für neue Monster pro Thema +2 Rüstung und +2 Angriff
- [x] Bossraum am Ende jeder Themenwelt (Ebene 3, 6, 9, 12, 15) statt des Abstiegs, Boss passend zum Thema
- [x] Bosse: Monsterratte, Skelett-König, Dunkelzwerg-Schmiedemeister, Höhlentroll, Ork-Kriegsherr; im endlosen Ork-Lager alle drei Ebenen zufällig Riesenspinne, Höhlentroll oder Ork-Kriegsherr
- [x] Bosskampf: Flucht erlaubt, Boss wartet bei jedem Betreten; Sieg bringt tier2-Beute und 10 Erfahrung, dann erscheint der Abstieg
- [x] Rastplatz auf geraden Ebenen, etwa auf halber Strecke zwischen Start und Abstieg; Lagerfeuer heilt einmal voll
- [x] Händler auf jeder Ebene genau einmal, Lage beliebig; 4 zufällige Gegenstände vom Rang der Beutestufe (je einmal) plus Kleiner und Großer Heiltrank in beliebiger Menge; Verkauf zum halben Preis, abgerundet
- [x] Beutestufen verschieben sich mit dem Thema; Gold der Beute ×Stufe des Themas
- [x] Ist ein Rang leer, gilt bei Beute und Händler der höchste Rang darunter
- [x] Ergebnis ist die erreichte Ebene, Gold ist Zahlungsmittel
- [x] Volks-Anforderung für Gegenstände: `req.volk` (zwerg, elf, mensch) zusätzlich zum Mindestattribut; Grundausrüstung bleibt für alle Völker offen
- [x] Einheitliche Bezeichnung „Elf“ für das Volk, keine weibliche Form
- [x] Gegenstände haben einen Rang von 1 bis 6 (Feld `rang`), auch Verbrauchsgegenstände; „Stufe“ meint Charakterstufe und Stufe des Themas
- [x] Attribute von −1 bis +10, Stufenaufstieg bis +10, Proben-Zuschlag +2 pro Thema
- [x] Nutzen-Effekt `freeze`: Gegner setzt die angegebene Zahl an Runden aus, nur im Kampf
- [x] Einzelpreise pro Gegenstand (Feld `preis`), Verkauf zum halben Preis abgerundet; Rang-Preistabelle nur Richtwert
- [x] Gegenstandsliste mit 26 Gegenständen (Tabelle im Abschnitt Gegenstände)
- [x] Boss-Events pro Thema (`themeEvents` beim Bossraum, `eventChance` 1), bei jedem Betreten neu gewürfelt, bis der Boss besiegt ist; Siegbeute vergibt das Spiel; vorerst nur im Keller
- [x] Eigene Todessätze pro Event in `data/texts.json` unter `death.events`
- [x] Startausrüstung: Zwerg Langschwert, Lederwams, Kleiner Heiltrank · Elf Dolch, Stofftunika, Kleiner Heiltrank · Mensch Knüppel, Stoffweste, Feuerpfeil-Schriftrolle, Schild-Schriftrolle, Kleiner Heiltrank
- [x] Wendeltreppen aus 5×5 Kacheln: nach oben in der Vorkammer, nach unten im Abstieg und im Bossraum nach dem Sieg; ersetzen den Torbogen; Start am Fuß der Treppe nach oben
- [x] Einrichtung pro Raumtyp als Daten (`decor`, `themeDecor`) mit Varianten, Platzierungsregeln und Erreichbarkeitstest; ohne Eintrag gilt das bisherige Muster
- [x] Figuren im Raum: jeder Kampf zeigt den Gegner; Events können Figuren beim Start zeigen (`figures` mit `figure`, `place`, `count`, `variant`, `stay`); neue Platzierung `near:<prop>`; Regeln für Sieg, Flucht und friedliches Ende
- [x] Meilenstein 6 in 6a (Umgebung, Requisiten, Licht) und 6b (Figuren, Animationen), beginnend mit dem Keller
- [x] Look wird erst im Stilguide des Art-Direction-Projekts festgelegt
- [x] Modelle aus CC0-Paketen plus KI-3D-Generator für fehlende Figuren; volles Animationsset
- [x] Kachelnamen x|y: x von West nach Ost, y von Nord nach Süd; Nordwest-Ecke 1|1, Mitte 5|5
- [x] Wendeltreppen 3×3 in der Nordwest-Ecke (vorher 5×5 in der Mitte), in Vorkammer, Abstieg und Bossraum; Start auf 4|4
- [x] Einrichtung mit Pflichtstücken (`required`), festem Korrekturablauf und Prüfung aller Varianten mit allen Türkombinationen
- [x] Stilguide Knetkeller mit Palette, Themen-Abwandlung, Licht und Lesbarkeit
- [x] Asset-Spezifikation mit Zuordnung über data/models.json, Maßstab KayKit 0,5, Wände 2 Kacheln hoch
- [x] Modelle der Wendeltreppen 3×3 in der Nordwest-Ecke (wie GDD 2.7), Türrahmen auf der fünften Kachel
- [x] Zwerg aus KayKit Knight; Goblin aus Goblin Lowpoly Assets (standout7), Mimik aus der Truhe des KayKit Dungeon Pack
- [x] Meilenstein 6a: Modelle über `data/models.json` mit Einfärbung `tint`; Fackeln an vorderen Türen auf einem Pfosten
- [x] Meilenstein 6b, erster Teil: Spielfiguren aus KayKit Adventurers (Zwerg Knight, Elf Rogue_Hooded, Mensch Mage) mit eigener Textur und Zubehör nach der Startwaffe; Licht nach Stilguide gedimmt
- [x] Ratten, Küchenchef, Monsterratte und Kröte aus dem Easy Animated Enemy Pack (Quaternius); Goblin aus `Basic_Goblin` ohne Animationen, bewegt per Code (Variante A); Ratte und Frosch auf höchstens 3.000 Dreiecke vereinfacht und auf die Palette umgefärbt (Ratte warmes Graubraun, Frosch Moos, rote Augen als Akzent)
- [x] Figuren, die nicht sterben und nicht kämpfen, bleiben nach dem Event an ihrem Platz, solange der Spieler auf der Ebene ist
- [x] Inszenierung der Event-Figuren in `data/staging.json` mit Ankern an Requisiten; Figuren stehen vor dem Event-Fenster im Raum
- [x] Kampf weiter gegen einen Gegner, aber alle Figuren des Gegners laufen zum Spieler, greifen reihum an und sterben gemeinsam; unbekannte Anzahl 1 bis 3 nach Raum-Seed
- [x] Besiegte bleiben liegen; friedliche Figuren gehen zur Tür und verschwinden, Kröte und Händler bleiben stehen (ersetzt die Entscheidung aus 2.12)
- [x] Goblin ohne Sitzen: steht neben dem Hocker; Skelette aus KayKit Skeletons 1.0, auf höchstens 4.000 Dreiecke vereinfacht
- [x] Gastgeber und schlafender Goblin bleiben nach dem Event; der Goblin liegt zu Beginn flach neben dem Tisch; Würfelspiel-Skelette sind Warrior, das Skelett mit Rücken ist ein Minion
- [x] Sound über `data/sounds.json`; ohne festgelegten Sound oder Datei bleibt es still, keine Platzhalter-Geräusche
- [x] Angriffsklänge holz, schwert, axt, hammer, faust, biss, kralle; magische Waffen eigener Klang; Treffer und Fehlschlag getrennt; Monster mit `sound` in `data/monsters.json`; ohne Waffe faust
- [x] Jeder Verbrauchsgegenstand mit eigenem `sound` (Zauber pro Schriftrolle, Heiltrank)
- [x] Räume mit `mood` (cozy, wet, spooky, empty) und `floor` (wood, hall, mud, gravel) im Feld `sound`, pro Thema `themeSound`; Loop und Zufallsgeräusche
- [x] Schritte nach Boden des Raums, eigene Schritte pro Figur über `steps`
- [x] Optionaler Event-Sound beim Öffnen des Textfensters
- [x] Spielgeräusche für Türen, Truhe, Gold, Stufenaufstieg, Treppe, Treffer und Tod
- [x] Sound als Meilenstein 6c; Lautstärkeregler und Menü bleiben in Meilenstein 7
- [x] Neue Raum-Stimmung `kitchen` für die Küche; neuer Boden `stone` (trockener Stein) einheitlich im Keller, nur Gruft, Brunnenraum und Säulenhalle mit `hall`; Event-Sound `klopfen_stein` beim Sarkophag
- [x] Knochen-Requisit aus Teilen der KayKit-Skelette (Schädel, Kiefer, zwei Arme) mit der Skelett-Textur
- [x] Händler aus KayKit Rogue ohne Kapuze, Outfit dunkelblau statt grün
- [x] Händler mit dem Rücken zur Nord- oder Westwand, vor ihm `table_small_decorated_B` mit brennender Kerze; Händlerraum heller; in den Ecken `box_stacked` und `barrel_small_stack`; Flaschen auf und neben Kisten
- [x] Neue Requisiten aus dem KayKit Dungeon Kit: Fahnen, Schlüsselbund und Strohlager (Wachstube), Zapffässer, Kistenberg und Kistenstapel (Vorratskammer, Küche), alle Wandregale in der Vorratskammer, Münzen (Schatzkammer), gedeckte Tische und Kerzen (Speisesaal), verzierte Säulen und dreifache Fahnen (Säulenhalle), Kerzenstummel und großes Geröll (Gruft)
- [x] Händler auf den Kacheln 2|2 bis 2|8 oder 2|2 bis 8|2, Blick zur Raummitte, hinter ihm Wandregale mit Flaschen, vor ihm `table_medium_decorated_A` mit Kerze; kein Gold als Dekoration beim Händler
- [x] Regel: Regale und andere Wandrequisiten verdecken oder überlagern keine Fackeln
- [x] Tisch des Händlers (`table_medium`) nur mit Flaschen und Kerze, keine Teller oder Küchensachen
- [x] Schatzkammer: Säulen immer auf 2|2, 8|2, 2|8 und 8|8 (`tile:x|y`); keine Fackeln an den Wänden, dafür vier an jeder Säule (`"torches": "saeulen"`); Banner an den Wänden
- [x] Schatzkammer, Korrektur: Banner derselben Farbe (`fahne`, gelb) links und rechts jeder hinteren Tür mit einer Kachel Abstand (`door-sides`), keine weitere Wanddekoration, keine Waffenständer; an jeder Säule nur eine leuchtende Fackel zur Raummitte
- [x] Gold auf dem Boden einheitlich aus den KayKit-Münzen, alle im selben Maßstab (der Goldhaufen war kleiner)
- [x] Münzstapel desselben Typs nie im Umkreis von zwei Kacheln, damit die Verteilung zufälliger aussieht; dafür in Schatzkammer A nur noch ein Goldhaufen an der Truhe, drei weitere frei im Raum
- [x] Schatzkammer nur noch einmal pro Thema, immer auf der mittleren Ebene; ohne Sackgasse dort fehlt sie im Thema
- [x] Schatzkammer mit 2 bis 3 Truhen: eine echt, die übrigen Mimiken (Event `schatz_mimik` beim Anklicken, nicht mehr beim Betreten)
- [x] Münzstapel: verschiedene Typen dürfen nebeneinander liegen, nur gleiche nicht; um die Truhe in Variante A je ein Goldhaufen, Münzstapel, kleiner Stapel und einzelne Münzen
- [x] Fackeln an Süd- und Ostwand wie die Wände ausgeblendet, kein Pfosten mehr; ihr Licht bleibt
- [x] Säulenhalle: nur der feste Säulengang (keine verzierten oder liegenden Säulen mehr), an den Wänden Banner und Waffenständer, nie zwei an derselben Stelle; 3 bis 4 Fackeln zufällig an den Säulen auf der Seite zum Gang, keine Wandfackeln
- [x] Gruft: immer 4 bis 5 Sarkophage, eine Kachel Abstand zur Wand und zueinander; zwei Fackeln mit blauem Licht
- [x] Zwerg breiter und kleiner (Maßstab × 1,3 / 0,85 / 1,3), Helm des KayKit `Knight` weggelassen, Bart aus Grundformen in zwei Teilen (Kinn und Schnurrbart am Kopf, Keil bis zum Bauch an der Brust)
- [x] Haare und Augenbrauen des Zwergs in der Farbe des Barts
- [x] Speisesaal: nur die lange Tafel, keine gedeckten Tische mehr; Banner an freien Wänden
- [x] Regel: keine abgebrannten Kerzen (Kerzenstummel) als Deko auf dem Boden; das Requisit `kerzenstummel` und der gedeckte Tisch `tisch_gedeckt` sind entfernt
- [x] Steintreppe `stairs` aus KayKit statt Wendeltreppe (ids `treppe_hoch`, `treppe_runter`), 3×3 in der Nordwest-Ecke zur Nordwand hin; Einstieg ohne Licht bis unter die Decke, Abstieg in ein Loch mit kühlem Schimmer von unten; Start auf 2|4
- [x] Bossraum: bis zum Sieg ein begehbares Metallgitter über Loch und Treppe, danach mit 0,5 Sekunden Abblende Loch und anklickbare Treppe; fehlt das Modell `stairs`, entstehen Treppe und Loch aus Grundformen
- [x] Treppe nach oben ohne bläulichen Lichtschein von oben: das obere Ende dunkelt nur ab, statt in die Schattenfarbe überzugehen
- [x] Vorkammer: keine Fackel hinter oder neben der Treppe; an Nord- und Westwand fällt die Fackel auf Kachel 3 weg
- [x] Vorkammer ohne Wegweiser; Pult mit Buch immer auf 4|3 rechts neben der untersten Stufe der Treppe
- [x] Rastplatz: zwei Kacheln frei um das Feuer (`clear`), 2 bis 3 Schlaflager nie neben Türen (`doorGap`) mit dünnen Kerzen daneben, 2 bis 3 Flaschen und 2 bis 3 Fässer, keine Säcke
- [x] Eigener Sound für den Tod der Spielfigur (`tod_spieler`, pro Volk überschreibbar mit `tod_<volk>`); `tod` bleibt für sterbende Gegner
- [x] Event-Tabellen pro Thema für alle Raumtypen (`themeEvents`), sie ersetzen `events` im jeweiligen Thema; Bewertung pro Thema (`themeRating`), ohne Eintrag gilt die Bewertung des Raumtyps
- [x] Begegnungen ab den Katakomben: Monster stehen per Zufall in feindlichen und gemischten Räumen, der Kampf beginnt ohne Event; Chance, Monster und Siegbeute pro Thema in `data/themes.json` (`encounters`)
- [x] Bodenplatten pro Thema und Raumtyp aus KayKit-Varianten (`floorTiles`), nur 1×1, ohne Gitter, Löcher und Stacheln
- [x] Bodenplatten: Keller `boden`, `boden_bruch_a`, `boden_bruch_b`; Gruft und Brunnenraum `boden_unkraut_a`, `boden_unkraut_b`; Katakomben `boden_bruch_a`, `boden_bruch_b`, `boden_unkraut_a`, `boden_unkraut_b`
- [x] Gruft und Brunnenraum: gesprungene Platten 70 %, Platten mit Unkraut 30 %; keine verzierte Bodenplatte (`boden_deko`) in irgendeinem Raum
- [x] Skelette ohne festgelegte Variante immer als Minion; Skelettkrieger als Warrior; Geister aus KayKit Rogue, hellblau mit kaltem blauen Leuchten
- [x] Geister mit weißer Haut und grauen Haaren, als ganze Figur durchscheinend (Deckkraft 0,7)
- [x] Geister zu 60 % deckend (Deckkraft 0,6) und ohne Handschuhe
- [x] Töne des Geists: Angriffsklang `geist`, eigener Treffer- und Tod-Ton, beim Bewegen ein Schwebe-Ton (`schweben`) statt Schritten
- [x] Poltergeist mit denselben Tönen wie der Geist
- [x] Katakomben Paket 1 und 2: Monster, Begegnungen, Events und Todessätze für Kerker und Schrein; Schrein mit Event-Chance 0,4 wie die Säulenhalle, Kerker 0,7 wie die Gruft; Kerker auch in den Katakomben höchstens 2; Skelett-König als Warrior 1,3-fach mit goldener Krone
