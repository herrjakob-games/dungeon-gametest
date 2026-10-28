# Art Direction Keller – Übergabe

Oct 28, 2026 · @Christian

## Überblick

Der Keller bekommt den Look „Knetkeller“: KayKit-Formen im Maßstab 0,5, eine eigene warme Palette und dominantes Fackellicht. Gut die Hälfte der Teile kommt aus drei CC0-Paketen von KayKit, rund 20 Teile laufen über den KI-Generator, bis dahin bleiben dort Platzhalter.

**Entschieden am 28.10.2026**

- Richtung A „Knetkeller“, Palette mit 11 Farben, Abwandlung pro Thema
- Schattierung wie KayKit, keine Normal Maps; Spielfigur mit eigenem Lichtschein
- Maßstab: 1 Kachel = kleine KayKit-Bodenplatte (Faktor 0,5), Wände 2 Kacheln hoch
- Abweichungen der Pakete korrigiert `data/models.json`, nicht die Datei
- Zusammengesetzte Teile und abgespeckte Figuren baut ein Skript im Repo
- Völker: Mensch = KayKit `Mage`, Elf = `Rogue_Hooded`, Zwerg = `Knight`, Händler = `Rogue` umgefärbt
- Goblin und Mimik gehören in die Keller-Liste (Wachstube und Schatzkammer brauchen sie): Goblin aus Goblin Lowpoly Assets (standout7, itch.io), Mimik aus der Truhe des KayKit Dungeon Pack (itch.io); entschieden am 28.10.2026

**Reihenfolge**

1. GDD-Text unten in `docs/GDD.md` übernehmen (Version 2.7).
2. Auftrag für Meilenstein 6a an Claude Code geben; Claude Code holt die KayKit-Pakete selbst von GitHub.
3. Im Browser testen und die erste Fassung der Paletten-Textur in Photoshop feinjustieren.
4. KI-Teile nach Priorität erzeugen und hochladen; jedes ersetzt beim nächsten Laden seinen Platzhalter.
5. Meilenstein 6b (Figuren) in einer eigenen Sitzung vorbereiten.

## GDD-Text zum Einfügen

Der Block ersetzt im Abschnitt „Grafik und Animation“ die Zeile „Stilguide: kommt aus dem Art-Direction-Projekt …“ und kommt als zwei neue Unterabschnitte vor „Einrichtung pro Raumtyp“. Dazu drei kleine Änderungen an bestehenden Stellen und eine Versionszeile.

**Änderungen an bestehenden Stellen**

- Technische Eckdaten, Zeile Modelle: „Low-Poly im Format glTF/GLB, Pakete KayKit Dungeon Remastered, Adventurers und Skeletons (CC0) im Maßstab 0,5, dazu KI-Modelle; fehlende Modelle bleiben Platzhalter aus Grundformen.“
- Grafik und Animation, Zeile Stil: „Low-Poly, weich und blockig wie KayKit, ohne Normal Maps, begrenzte Palette. Details im Stilguide.“
- Getroffene Entscheidungen, neue Zeilen: „Stilguide Knetkeller mit Palette, Themen-Abwandlung, Licht und Lesbarkeit“ und „Asset-Spezifikation mit Zuordnung über data/models.json, Maßstab KayKit 0,5, Wände 2 Kacheln hoch“.

**Versionszeile**

```markdown
| 2.7 | 28.10.2026 | Stilguide „Knetkeller“ und Asset-Spezifikation aus dem Art-Direction-Projekt; Maßstab KayKit 0,5, Wände 2 Kacheln hoch; Zuordnung der Modelle über data/models.json |
```

**Neue Unterabschnitte**

```markdown
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

Gruft und Brunnen sind im Keller die düsteren Räume: kälteres Grundlicht, Kerzen statt Fackeln. Im Ork-Lager wird das Gefahr-Rot vor den rötlichen Wänden geprüft und bei Bedarf nachgeschärft.

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

**Lesbarkeit**

- Spielfigur mit hellem Bodenring, Gegner mit rotem Akzent und im Kampf rotem Ring.
- Türrahmen eine Stufe heller als die Wand, neben jeder Tür eine Fackel. Verschlossene Tür: rotes Schloss.
- Anklickbare Objekte (Truhe, Lagerfeuer, Händler, Treppe nach unten): goldene Umrisslinie beim Überfahren mit der Maus, leichtes Aufhellen.
- Bodendeko (Sack, Moos, Pfütze, Geröll) flach und dunkel, damit sie nie wie ein Hindernis wirkt.

### Asset-Spezifikation

Gilt für alle Modelle. Bei Paketteilen gilt sie für das Ergebnis im Spiel; Abweichungen der Rohdatei korrigiert `data/models.json`.

- **Format:** GLB, Modell, Material und Animationen in einer Datei, möglichst unter 1 MB.
- **Maßstab:** 1 Einheit = 1 Kachel. Kachelteile 1×1 oder ein Vielfaches laut Requisitenliste. KayKit-Teile mit Faktor 0,5 (kleine KayKit-Bodenplatte = 1 Kachel).
- **Ausrichtung:** Ursprung am Boden, mittig auf der Grundfläche; Figuren blicken nach +Z, oben ist +Y. Wandteile: Ursprung mittig auf der Kachelkante, Vorderseite zeigt in den Raum.
- **Höhen:** Mensch und Elf 1,0 bis 1,2 Kacheln, Zwerg etwa 0,8, Boss nach Größe in der Figurenliste. Hohe Wand 2 Kacheln, Sockel 0,25.
- **Dreiecke:** höchstens etwa 3.000 pro Figur (KayKit-Figuren nach dem Abspecken bis 4.000), 1.500 pro Requisit.
- **Material:** stilisiert, Schattierung wie KayKit, keine Normal Maps. Paketteile nutzen die gemeinsame Paletten-Textur des Themas (`assets/textures/keller/dungeon_texture.png`), KI-Modelle eine eigene Textur bis 512 px in den Palettenfarben.
- **Animationen:** Idle, Walk, Attack, Hit, Death, Interact. Heißen sie im Paket anders, ordnet `data/models.json` sie zu.
- **Dateinamen:** id aus dem GDD; Varianten als `id_variante.glb`, etwa `fass_gruppe.glb`. Fehlt die Variante, gilt die Grunddatei. Eine Variante kann auch nur eine andere Animation sein (Skelett sitzend).
- **Ordner:** `assets/tiles/` (Boden, Wand, Sockel, Ecken, Türrahmen), `assets/props/`, `assets/figures/`, `assets/textures/`. Rohdateien der Pakete in `assets/source/`.
- **Bauteile:** `boden`, `wand`, `wand_ecke`, `sockel`, `sockel_ecke`, `tuerrahmen`, `fackel`, `schloss`.
- **Zuordnung:** `data/models.json` hält pro id Datei, Maßstab (Zahl oder [x, y, z]), Drehung, Versatz, Animationszuordnung und Lichtpunkte (Position relativ zum Ursprung, Farbe, Stärke, Reichweite).
- **Build-Skript:** `tools/build-assets.mjs` setzt Teile aus Paketen zu einer GLB zusammen (Tafel, Regal, Türrahmen) und speckt Paketfiguren ab (nur benötigte Animationen und Zubehörteile, komprimiert).
- **Platzhalter:** Fehlt eine Datei oder lädt sie nicht, baut der Code das Teil wie bisher aus Grundformen.
- **Lizenzen:** Quelle und Lizenz jeder fremden Datei in `assets/CREDITS.md`.
```

## Asset-Liste Keller

53 Teile: 30 aus KayKit-Paketen, 20 über den KI-Generator, 3 bleiben Platzhalter. Abkürzungen: DR = KayKit Dungeon Remastered (`addons/kaykit_dungeon_remastered/Assets/gltf/`), AD = KayKit Adventurers, SK = KayKit Skeletons (jeweils `…/Characters/gltf/`). Alle drei Pakete stehen unter CC0, geprüft an der LICENSE.txt im Paket. KayKit-Teile mit Faktor 0,5, Paletten-Textur des Kellers.

### Meilenstein 6a: Umgebung und Requisiten

| id | Teil | Quelle | Lizenz | Anpassung | Status |
| --- | --- | --- | --- | --- | --- |
| dungeon\_texture | Paletten-Textur | DR `../texture/dungeon_texture.png` | CC0 | auf Knetkeller-Palette umfärben | im Repo |
| boden | Bodenkachel | DR `floor_tile_small.gltf.glb`, zur Abwechslung `floor_tile_small_broken_A`, `_broken_B`, `_decorated` | CC0 | – | im Repo |
| wand | Hohe Wand | DR `wall_half.gltf.glb` | CC0 | – | im Repo |
| wand\_ecke | Wandecke | DR `wall_endcap.gltf.glb` (statt `wall_corner`, passt ins Raster) | CC0 | Endstück auf dem Eckfeld | im Repo |
| sockel | Vordere Wand | DR `wall_half.gltf.glb` | CC0 | Höhe auf 0,25 Kacheln | im Repo |
| sockel\_ecke | Sockelecke | DR `wall_endcap.gltf.glb` (statt `wall_corner`) | CC0 | Höhe auf 0,25 Kacheln | im Repo |
| tuerrahmen | Türrahmen | DR `wall_doorway.glb` + 2× `wall_endcap.gltf.glb` | CC0 | zusammensetzen, Öffnung mittig auf der Türkachel | im Repo |
| fackel | Wandfackel | DR `torch_mounted.gltf.glb` | CC0 | Lichtpunkt | im Repo |
| schloss | Schloss | Platzhalter bleibt | – | rot nach Palette | Platzhalter |
| saeule | Säule | DR `pillar.gltf.glb` | CC0 | – | im Repo |
| saeule\_liegend | Umgestürzte Säule | DR `pillar.gltf.glb` | CC0 | liegend, 2 Kacheln lang | im Repo |
| fass | Fass | DR `barrel_large.gltf.glb` | CC0 | – | im Repo |
| fass\_gruppe | Fassgruppe | drei Mal `fass` (DR `barrel_large`) auf den drei Kacheln der L-Form | CC0 | `barrel_small_stack` wirkt nicht wie 3 Fässer | im Repo |
| kiste | Kiste | DR `box_large.gltf.glb` | CC0 | – | im Repo |
| sack | Sack | KI-Generator | – | – | offen |
| regal | Regal mit Krügen | DR `shelves.gltf.glb` + `bottle_A_brown`, `bottle_B_green` | CC0 | zusammensetzen, Faktor 1,0 (2 Kacheln breit) | im Repo |
| herd | Herd | KI-Generator | – | Lichtpunkt | offen |
| tisch | Tisch | DR `table_long.gltf.glb` | CC0 | auf 3 Kacheln strecken; Würfel fehlen | im Repo |
| tisch\_kueche | Küchentisch | DR `table_long.gltf.glb` + `plate_stack`, `bottle_A_brown` | CC0 | zusammensetzen, strecken | im Repo |
| hocker | Hocker | DR `stool.gltf.glb` | CC0 | – | im Repo |
| tafel | Tafel | DR `table_long_tablecloth.gltf.glb` + `plate_food_A`, `plate_food_B`, `candle_triple` | CC0 | auf 5 Kacheln strecken, Deko aufsetzen | im Repo |
| stuhl | Stuhl | DR `chair.gltf.glb` | CC0 | – | im Repo |
| kronleuchter | Kronleuchter | KI-Generator | – | Lichtpunkt | offen |
| anrichte | Anrichte | KI-Generator | – | – | offen |
| waffenstaender | Waffenständer | DR `sword_shield.gltf.glb` | CC0 | Wandhalterung | im Repo |
| brunnen | Brunnen | KI-Generator | – | – | offen |
| moos | Moos | Platzhalter bleibt | – | flach, Moos-Farbe | Platzhalter |
| pfuetze | Pfütze | Platzhalter bleibt | – | flach, Kühl-Farbe | Platzhalter |
| sarkophag | Sarkophag | KI-Generator | – | – | offen |
| kerzen | Kerzengruppe | DR `candle_triple.gltf.glb` | CC0 | Lichtpunkt | im Repo |
| knochen | Knochen | KI-Generator | – | – | offen |
| geroell | Geröll | DR `rubble_half.gltf.glb` | CC0 | auf 1 Kachel verkleinern | im Repo |
| goldhaufen | Goldhaufen | DR `coin_stack_large.gltf.glb` | CC0 | – | im Repo |
| truhe | Truhe | DR `chest.glb` | CC0 | Deckel ist eigenes Teil, Öffnen per Code | im Repo |
| lagerfeuer | Lagerfeuer | KI-Generator | – | Lichtpunkt | offen |
| pult | Pult mit Gästebuch | KI-Generator | – | – | offen |
| wegweiser | Wegweiser | KI-Generator | – | – | offen |
| zettelbrett | Zettelbrett | KI-Generator | – | – | offen |
| bank | Bank | KI-Generator | – | – | offen |
| souvenirkiste | Souvenirkiste | DR `trunk_large_A.gltf.glb` | CC0 | Schild später per KI oder weglassen | im Repo |
| kaeseberg | Käseberg mit Thron | KI-Generator | – | 2×2, Lichtpunkt | offen |
| wendeltreppe\_hoch | Wendeltreppe nach oben | KI-Generator | – | 3×3 in der Nordwest-Ecke, Lichtpunkt | offen |
| wendeltreppe\_runter | Wendeltreppe nach unten | KI-Generator | – | 3×3 in der Nordwest-Ecke, anklickbar, Lichtpunkt | offen |

### Meilenstein 6b: Figuren

| id | Teil | Quelle | Lizenz | Anpassung | Status |
| --- | --- | --- | --- | --- | --- |
| mensch | Spielfigur Mensch | AD `Mage.glb` | CC0 | abspecken, Zubehör ausblenden, umfärben | offen |
| elf | Spielfigur Elf | AD `Rogue_Hooded.glb` | CC0 | abspecken, umfärben | offen |
| zwerg | Spielfigur Zwerg | AD `Knight.glb` | CC0 | abspecken, umfärben, auf Höhe 0,8 | offen |
| haendlerfigur | Händler | AD `Rogue.glb` | CC0 | abspecken, umfärben; Idle und Interact genügen | offen |
| skeleton | Skelett | SK `Skeleton_Minion.glb` | CC0 | abspecken | offen |
| goblin | Goblin-Wache | Goblin Lowpoly Assets (standout7, itch.io) | Lizenz prüfen | abspecken, Animationen zuordnen | offen |
| mimic | Mimik | Truhe aus KayKit Dungeon Pack (itch.io) | CC0, prüfen | Deckel mit Zähnen, Öffnen per Code | offen |
| skeleton\_sitzend | Skelett, sitzend | SK `Skeleton_Minion.glb` | CC0 | nur Animation `Sit_Floor_Idle`, keine eigene Datei | offen |
| rat | Riesenratte | KI-Generator | – | aufrecht, riggen, animieren | offen |
| kuechenratte | Küchenchef | KI-Generator, Basis rat | – | Kochmütze, Schürze, Rig von rat | offen |
| monsterratte | Monsterratte | KI-Generator | – | 2×2, riggen, animieren | offen |
| kroete | Kröte mit Krone | KI-Generator | – | statisch, Wippen per Code | offen |

Animationszuordnung für KayKit-Figuren: Idle → `Idle`, Walk → `Walking_A`, Attack → `1H_Melee_Attack_Chop`, Hit → `Hit_A`, Death → `Death_A`, Interact → `Interact`. Die Ids `mensch`, `elf` und `zwerg` gleicht Claude Code mit dem Feld Modell in `data/characters.json` ab.

## Anleitung für Christian

Für Meilenstein 6a musst du nichts herunterladen: Claude Code holt KayKit Dungeon Remastered selbst von Kays GitHub. Deine Arbeit sind der GDD-Text, die Paletten-Textur und später die KI-Modelle.

1. **GDD aktualisieren.** In GitHub `docs/GDD.md` öffnen, auf den Stift klicken und die Blöcke aus „GDD-Text zum Einfügen“ an die genannten Stellen setzen, Kopfzeile auf Version 2.7. Alternativ den Abschnitt in Claude Code einfügen mit dem Satz „Übernimm diesen Text ins GDD als Version 2.7“.
2. **Auftrag geben.** Den Block aus „Auftrag für Claude Code“ in Claude Code einfügen.
3. **Testen.** Im Browser einen neuen Dungeon starten und durch die Kellerräume gehen. Auf Licht, Lesbarkeit von Türen und Truhen und auf die Wandhöhe achten.
4. **Palette feinjustieren.** `assets/textures/keller/dungeon_texture.png` aus dem Repo laden, in Photoshop nachfärben, Größe 1024×1024 und Lage der Farbflächen nicht verändern. Hochladen in GitHub: Ordner `assets/textures/keller/` öffnen, „Add file“ → „Upload files“, gleicher Dateiname, Commit.
5. **KI-Modelle einbinden.** Jedes fertige Modell als GLB exportieren, Dateiname = id, etwa `herd.glb`. Requisiten nach `assets/props/`, Figuren nach `assets/figures/` hochladen. Dann Claude Code: „Binde assets/props/herd.glb ein, prüfe es gegen die Asset-Spezifikation und trage Lichtpunkt und Credits ein.“ Im Status der Asset-Liste auf „im Repo“ setzen.

**Falls Claude Code GitHub nicht erreicht:** KayKit Dungeon Remastered auf [itch.io](https://kaylousberg.itch.io/kaykit-dungeon-remastered) laden (Preis selbst wählen, 0 geht), entpacken und aus `Assets/gltf/` die Dateien der Asset-Liste plus `Assets/texture/dungeon_texture.png` und `LICENSE.txt` nach `assets/source/kaykit-dungeon-remastered/` hochladen. GitHub nimmt im Browser bis 100 Dateien pro Upload.

## Auftrag für Claude Code, Meilenstein 6a

Den Block unten komplett in Claude Code einfügen, nachdem der GDD-Text im Repository steht.

```markdown
Baue Meilenstein 6a laut docs/GDD.md, Abschnitte „Grafik und Animation“, „Stilguide Knetkeller“, „Asset-Spezifikation“ und „Einrichtung pro Raumtyp“. Spielregeln und Spieldaten (Events, Monster, Gegenstände) bleiben unverändert.

1. Pakete holen
   - Klone https://github.com/KayKit-Game-Assets/KayKit-Dungeon-Remastered-1.0 (CC0) in ein temporäres Verzeichnis, nicht ins Repo.
   - Kopiere nach assets/source/kaykit-dungeon-remastered/ nur die Dateien, die die Asset-Liste unten nennt, dazu LICENSE.txt und texture/dungeon_texture.png. Notiere den Commit-Hash.
   - Adventurers und Skeletons gehören zu 6b und bleiben jetzt draußen.

2. Build-Skript tools/build-assets.mjs (Node, @gltf-transform/core und /functions)
   - Liest Rezepte aus tools/asset-recipes.json und schreibt assets/tiles/<id>.glb und assets/props/<id>.glb.
   - Einfache Teile: Paketdatei kopieren und unter der id ablegen.
   - Zusammengesetzte Teile: tuerrahmen (wall_doorway + 2× wall_endcap, Öffnung mittig), regal (shelves + Flaschen), tisch_kueche (table_long + plate_stack + Flasche), tafel (table_long_tablecloth + plate_food_A/B + candle_triple). Positionen der Teile in KayKit-Einheiten im Rezept.
   - Eingebettete Texturen entfernen; der Lader setzt die gemeinsame Paletten-Textur.
   - Am Ende pro Datei Dreiecke und Größe ausgeben; Warnung über 1.500 Dreiecken oder 1 MB.
   - npm-Skript: npm run build:assets.

3. Paletten-Textur
   - assets/textures/keller/dungeon_texture.png als erste Fassung aus dem Original erzeugen: Farbflächen des Atlas auf die Knetkeller-Palette im GDD abbilden (Holz → #8A5A34, Stein → #7A6552 und #5B4A3C, Metall → #5E6168, Gold → #F2C14E, Grün → #6B7048), insgesamt wärmer und gedeckter. Gleiche Größe und Lage wie das Original, damit die UVs passen.
   - Original unverändert in assets/source/ lassen. Christian justiert die Textur danach selbst nach.

4. data/models.json und Modell-Lader
   - Pro id: file, scale (Zahl oder [x, y, z]), rotation, offset, palette (true = Paletten-Textur des Themas), lights (offset, color, intensity, distance), animations (Zuordnung, erst ab 6b genutzt).
   - Lader mit GLTFLoader, Cache pro Datei, Klone pro Instanz. Fehlt die Datei oder schlägt das Laden fehl, baut der Code das Teil wie bisher aus Grundformen und meldet die id einmal in der Konsole.
   - Varianten: zuerst <id>_<variant>, sonst die Grunddatei.

5. Räume mit Modellen bauen
   - KayKit-Teile mit Faktor 0,5: kleine Bodenplatte = 1 Kachel.
   - Boden: boden pro Kachel, Abwechslung aus den Bruch- und Dekorvarianten über den Raum-Seed.
   - Hohe Wände (Nord, West): wand pro Kachel, 2 Kacheln hoch; Ecken mit wand_ecke. Vorne (Süd, Ost): sockel und sockel_ecke, 0,25 Kacheln hoch.
   - Türen: tuerrahmen mittig auf der fünften Kachel (GDD 2.7: Raum 9×9). Verschlossen: schloss (Platzhalter, rot).
   - Requisiten aus decor und themeDecor über models.json, Größen und Platzierung wie bisher. Gestreckte Teile (tisch 3 Kacheln, tafel 5 Kacheln) über scale [x, y, z].
   - Truhe: Deckel chest_lid beim Öffnen per Code aufklappen.

6. Licht nach Stilguide
   - Halbkugellicht niedrig: oben warmes Grau, unten #3A3048 im Keller; Gruft und Brunnenraum kühler (#2C3448), Kerzenlicht #FFC27A.
   - Neben jeder Tür eine fackel; Fackeln als Punktlichter #FF9A3C (oder torchColor des Raumtyps), Reichweite 5 bis 6 Kacheln, leichtes Flackern. Höchstens zwei schattenwerfende Lichter pro Raum.
   - Lichtpunkte der Requisiten aus models.json, ohne Schatten.
   - Spielfigur: kleiner, schwacher Lichtschein und heller Bodenring.
   - Anklickbare Objekte: goldene Umrisslinie (#F2C14E) beim Überfahren mit der Maus.
   - Ecken dürfen auf 15 bis 20 % Helligkeit sinken, nie auf Schwarz.

7. Credits und Tests
   - assets/CREDITS.md: Paket, Autor Kay Lousberg, Lizenz CC0 1.0, Quelle mit Commit-Hash, Liste der übernommenen Dateien.
   - npm test ergänzen: jede Datei in models.json existiert; jede Requisiten-id aus room-types.json hat einen Eintrag in models.json oder einen Platzhalter; Warnung bei Dateien über 1 MB oder über den Dreiecksgrenzen der Spezifikation. Bestehende Tests bleiben grün.
   - Ziel: 60 Bilder pro Sekunde auf einem normalen Desktop; Bodenkacheln bei Bedarf zusammenführen oder instanzieren.

8. Abschluss
   - Kurze Liste für Christian: was jetzt echtes Modell ist, was Platzhalter bleibt, und wie ein neues Modell eingebunden wird (Datei nach assets/props/<id>.glb, Eintrag in models.json).
   - GDD nur anpassen, wenn sich bei der Umsetzung etwas an Maßstab oder Spezifikation ändern muss, dann mit neuer Versionszeile.

Asset-Liste 6a aus KayKit Dungeon Remastered (Ordner addons/kaykit_dungeon_remastered/Assets/gltf/):
boden: floor_tile_small, floor_tile_small_broken_A, floor_tile_small_broken_B, floor_tile_small_decorated · wand und sockel: wall_half · wand_ecke und sockel_ecke: wall_corner · tuerrahmen: wall_doorway + wall_endcap · fackel: torch_mounted · saeule und saeule_liegend: pillar · fass: barrel_large · fass_gruppe: barrel_small_stack · kiste: box_large · regal: shelves + bottle_A_brown + bottle_B_green · tisch: table_long · tisch_kueche: table_long + plate_stack + bottle_A_brown · hocker: stool · tafel: table_long_tablecloth + plate_food_A + plate_food_B + candle_triple · stuhl: chair · waffenstaender: sword_shield · kerzen: candle_triple · geroell: rubble_half · goldhaufen: coin_stack_large · truhe: chest · souvenirkiste: trunk_large_A.
Alle übrigen Requisiten bleiben vorerst Platzhalter.

Test für Christian: Ein neuer Dungeon zeigt im Keller echte Böden, Wände, Türen, Fackeln und die Requisiten oben; Licht nach Stilguide; fehlende Teile erscheinen weiter als Platzhalter; npm test läuft durch.
```

## KI-Generator: Prompts

Jedes KI-Teil entsteht in drei Schritten: Referenzbild von vorne, Referenzbild von der Seite, dann Bild-zu-3D (etwa Meshy). Prompts auf Englisch, weil die Generatoren sie zuverlässiger umsetzen. `{SUBJECT}` durch das Motiv aus der Tabelle ersetzen.

**1. Referenzbild von vorne**

```text
{SUBJECT}. Stylized low-poly 3D game asset, soft rounded chunky shapes with gently bevelled edges, handmade clay stop-motion charm, slightly wonky and humorous, muted earthy colors (warm clay brown, umber, grey-brown stone, dull iron) with at most one small warm accent, large flat color areas, no fine surface detail, no text or letters. Front view, orthographic, centered, whole object visible, plain light grey background, soft even studio light.
```

**2. Referenzbild von der Seite:** derselbe Prompt, „Front view“ ersetzt durch „Side view of the same object, same scale and colors“. Bei Figuren zusätzlich:

```text
Chibi proportions, head about one third of total height, big hands and feet, simple dot eyes, standing in A-pose with arms angled down and away from the body, legs slightly apart, empty hands.
```

**3. Bild-zu-3D**

```text
Low poly, triangle topology, target {TRIS} triangles, base color texture only, no PBR maps, texture 512 px, symmetry on if the object is symmetric, export GLB.
```

**Nacharbeit, bevor ein Modell ins Repo geht**

- Farben auf die Palette im Stilguide bringen; die Kanten dürfen weich bleiben.
- Maßstab, Drehung und Ursprung muss die Datei nicht exakt treffen: Das korrigiert `data/models.json`. Die Grundfläche laut Tabelle muss aber stimmen.
- Figuren müssen gerigged und animiert werden: automatisches Rigging des Generators oder Mixamo (nur zweibeinige Figuren). Darum stehen alle Ratten aufrecht. Mixamo liefert pro Animation eine FBX-Datei; Claude Code führt sie zu einer GLB mit Idle, Walk, Attack, Hit, Death und Interact zusammen.
- Lizenz des Generators prüfen: Manche Gratis-Tarife schränken die Nutzung ein oder verlangen eine Namensnennung. Tarif und Bedingung in `assets/CREDITS.md` eintragen.

**Motive**

Priorität 1 ist für den ersten vollständigen Testlauf sichtbar, Priorität 3 ist Feinschliff.

| id | Priorität | Motiv ({SUBJECT}) | Grundfläche | Dreiecke |
| --- | --- | --- | --- | --- |
| wendeltreppe\_hoch | 1 | a chunky stone spiral staircase winding upward around a thick central pillar, wooden handrail, ends in a dark opening above | 3×3 | 1.500 |
| wendeltreppe\_runter | 1 | a round opening in a stone floor with a spiral staircase descending into darkness, low stone rim, wooden railing posts, flat at floor level | 3×3 | 1.500 |
| rat | 1 | a giant dungeon rat standing upright on its hind legs, chubby, big head, buck teeth, beady eyes, long pink tail, mischievous grin | 1 | 2.500 |
| lagerfeuer | 1 | a campfire ring of rounded stones with stacked logs and a small cooking pot on a stick tripod, flames as simple chunky shapes | 1 | 1.000 |
| kaeseberg | 1 | a comically large heap of cheese wheels and wedges forming a throne for a giant rat, a big fork stuck in the top like a sceptre | 2×2 | 1.500 |
| herd | 2 | a rustic stone kitchen hearth set against a wall, iron cauldron on top, glowing embers in the firebox | 2×1 | 1.200 |
| brunnen | 2 | a small round stone well with a wooden crank, rope and a dented wooden bucket | 1 | 1.000 |
| sarkophag | 2 | a stone sarcophagus with its lid slightly shifted, simple carved crossed hands on the lid | 1×2 | 1.000 |
| kronleuchter | 2 | a rustic iron ring chandelier with thick dripping candles, hanging on short chains | über Tafel | 1.000 |
| kuechenratte | 2 | the same upright giant rat as a proud chef, tall white chef's hat, stained apron, wooden ladle | 1 | 2.500 |
| monsterratte | 2 | a pony-sized upright rat king, hunched, crown made of bent forks, cape made of a checkered kitchen towel | 2×2 | 3.000 |
| sack | 3 | a plump burlap grain sack tied at the top, slightly slumped | Deko | 500 |
| knochen | 3 | a small flat pile of cartoon bones and a skull | Deko | 600 |
| pult | 3 | a wooden lectern with an open thick guest book and a quill in an ink pot | 1 | 800 |
| wegweiser | 3 | a wooden signpost with three crooked blank arrow boards | 1 | 600 |
| zettelbrett | 3 | a wooden wall notice board with pinned blank paper notes | Wand | 600 |
| bank | 3 | a sturdy wooden bench with a slightly sagging seat | 2×1 | 600 |
| anrichte | 3 | a low wooden sideboard against a wall with plates and a jug on top | 2×1 | 1.200 |
| kroete | 3 | a fat toad sitting on its haunches, tiny golden crown, sleepy smug face | Deko | 1.000 |

Ratten und Kröte gehören zu Meilenstein 6b. Der Zwerg kommt aus KayKit `Knight` und braucht kein KI-Motiv mehr.
