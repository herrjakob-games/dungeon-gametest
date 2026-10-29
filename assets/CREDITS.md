# Credits

Quelle und Lizenz jeder fremden Datei (docs/GDD.md, Asset-Spezifikation).

## KayKit Dungeon Remastered 1.0

- Autor: Kay Lousberg (www.kaylousberg.com)
- Lizenz: CC0 1.0 (Creative Commons Zero), siehe `source/kaykit-dungeon-remastered/LICENSE.txt`
- Quelle: https://github.com/KayKit-Game-Assets/KayKit-Dungeon-Remastered-1.0, Commit `b0ca9bd96a8072ab36a3a5464f00ed1e06a16d07`
- Übernommene Dateien (in `source/kaykit-dungeon-remastered/`): `texture/dungeon_texture.png` und aus `gltf/`:
  barrel_large, barrel_small_stack, bottle_A_brown, bottle_B_green, box_large, candle_triple, chair, chest,
  coin_stack_large, floor_tile_small, floor_tile_small_broken_A, floor_tile_small_broken_B, floor_tile_small_decorated,
  pillar, plate_food_A, plate_food_B, plate_stack, rubble_half, shelves, stool, sword_shield, table_long,
  table_long_tablecloth, torch_mounted, trunk_large_A, wall_corner, wall_doorway, wall_endcap, wall_half
- Daraus gebaut (`npm run build:assets`): alle Dateien in `tiles/` und `props/`.
- `textures/keller/dungeon_texture.png` ist eine umgefärbte Fassung der Paletten-Textur (`tools/palette-texture.py`).

## KayKit Character Pack: Adventurers 1.0

- Autor: Kay Lousberg (www.kaylousberg.com)
- Lizenz: CC0 1.0 (Creative Commons Zero), siehe `source/kaykit-adventurers/LICENSE.txt`
- Quelle: https://github.com/KayKit-Game-Assets/KayKit-Character-Pack-Adventures-1.0, Commit `672074b73ba276876a19e8816ecdc5241817ab47`
- Übernommene Dateien (in `source/kaykit-adventurers/`, aus `Characters/gltf/`): Knight, Mage, Rogue_Hooded
- Daraus gebaut (`npm run build:assets`): `figures/zwerg.glb`, `figures/elf.glb`, `figures/mensch.glb`

## KayKit Character Pack: Skeletons 1.0 (und 1.1 FREE)

- Autor: Kay Lousberg (www.kaylousberg.com)
- Lizenz: CC0 1.0 (Creative Commons Zero), siehe `source/kaykit-skeletons/LICENSE.txt` (1.0) und `LICENSE-1.1.txt` (1.1)
- Quelle: https://github.com/KayKit-Game-Assets/KayKit-Character-Pack-Skeletons-1.0, Commit `15b62b9bad122f72926c10fb14d622c73819fa54`;
  Fassung 1.1 FREE von der itch.io-Seite von Kay Lousberg (hochgeladen von Christian; Textur Pixel für Pixel gleich)
- Übernommene Dateien (in `source/kaykit-skeletons/`): Skeleton_Minion.glb, Skeleton_Warrior.glb, Skeleton_Rogue.glb, Skeleton_Mage.glb (1.0, mit Animationen), skeleton_texture.png (1.1)
- Daraus gebaut (`npm run build:assets`): `figures/skeleton_minion.glb`, `figures/skeleton_warrior.glb`, `figures/skeleton_rogue.glb`, `figures/skeleton_mage.glb`
- `textures/figures/skeleton/skeleton_keller.png` ist eine umgefärbte Fassung der Textur (`tools/skeleton-texture.py`)

## Easy Animated Enemy Pack (Jan 2019)

- Autor: Quaternius
- Lizenz: CC0 1.0 (laut Download-Seite: „FBX, OBJ and Blend formats and CC0 license.“; das Paket enthält keine Lizenzdatei), siehe `source/quaternius-easy-enemies/LICENSE.txt`
- Quelle: https://quaternius.itch.io/animated-easy-enemies
- Übernommene Dateien (in `source/quaternius-easy-enemies/`, aus `FBX/`): Rat.fbx, Frog.fbx
- Daraus gebaut (`npm run build:assets`): `figures/rat.glb` (Riesenratte, Küchenchef, Monsterratte), `figures/kroete.glb`

## Goblin Lowpoly Assets (GoblinPack_Free)

- Autor: standout7
- Lizenz: CC0 1.0 (laut Download-Seite: „Goblin Pack Asset license: Creative Commons Zero v1.0 Universal“; das Paket enthält keine Lizenzdatei), siehe `source/goblin-lowpoly/LICENSE.txt`
- Quelle: https://standout7.itch.io/goblin-lowpoly-assets
- Übernommene Dateien (in `source/goblin-lowpoly/`, aus `GLB/`): Basic_Goblin.glb, Goblin_Rusty_Shiv.glb
- Daraus gebaut (`npm run build:assets`): `figures/goblin.glb`

## three.js GLTFLoader und SkeletonUtils (r128)

- Dateien: `vendor/three/GLTFLoader.js` und `vendor/three/SkeletonUtils.js` aus dem npm-Paket three@0.128.0
- Lizenz: MIT, siehe `vendor/three/LICENSE`

## Sounds

Quelle und Lizenz jeder Sound-Datei unter `sounds/` (docs/GDD.md, Abschnitt Sound).
Alle bisherigen Sounds hat Christian mit dem KI-Sound-Generator von Freepik („Pikaso AI“) mit einem bezahlten Konto erzeugt.
Rohdateien in `source/sounds-freepik/`; geschnitten (Stille, einzelne Schritte) mit `tools/sound-prepare.py`.

| Datei | Quelle | Lizenz |
| --- | --- | --- |
| `sounds/angriff/axt_fehl_1.mp3` | Freepik, KI-Sound-Generator (freepik.com), erzeugt von Christian | Freepik-Lizenz für bezahlte Konten |
| `sounds/angriff/axt_treffer_1.mp3` | Freepik, KI-Sound-Generator (freepik.com), erzeugt von Christian | Freepik-Lizenz für bezahlte Konten |
| `sounds/angriff/faust_fehl_1.mp3` | Freepik, KI-Sound-Generator (freepik.com), erzeugt von Christian | Freepik-Lizenz für bezahlte Konten |
| `sounds/angriff/hammer_fehl_1.mp3` | Freepik, KI-Sound-Generator (freepik.com), erzeugt von Christian | Freepik-Lizenz für bezahlte Konten |
| `sounds/angriff/hammer_treffer_1.mp3` | Freepik, KI-Sound-Generator (freepik.com), erzeugt von Christian | Freepik-Lizenz für bezahlte Konten |
| `sounds/angriff/schwert_fehl_1.mp3` | Freepik, KI-Sound-Generator (freepik.com), erzeugt von Christian | Freepik-Lizenz für bezahlte Konten |
| `sounds/angriff/schwert_fehl_2.mp3` | Freepik, KI-Sound-Generator (freepik.com), erzeugt von Christian | Freepik-Lizenz für bezahlte Konten |
| `sounds/angriff/schwert_treffer_1.mp3` | Freepik, KI-Sound-Generator (freepik.com), erzeugt von Christian | Freepik-Lizenz für bezahlte Konten |
| `sounds/angriff/schwert_treffer_2.mp3` | Freepik, KI-Sound-Generator (freepik.com), erzeugt von Christian | Freepik-Lizenz für bezahlte Konten |
| `sounds/events/klopfen_stein.mp3` | Freepik, KI-Sound-Generator (freepik.com), erzeugt von Christian | Freepik-Lizenz für bezahlte Konten |
| `sounds/raum/cozy_loop.mp3` | Freepik, KI-Sound-Generator (freepik.com), erzeugt von Christian | Freepik-Lizenz für bezahlte Konten |
| `sounds/raum/cozy_zufall_1.mp3` | Freepik, KI-Sound-Generator (freepik.com), erzeugt von Christian | Freepik-Lizenz für bezahlte Konten |
| `sounds/raum/cozy_zufall_2.mp3` | Freepik, KI-Sound-Generator (freepik.com), erzeugt von Christian | Freepik-Lizenz für bezahlte Konten |
| `sounds/raum/kitchen_loop.mp3` | Freepik, KI-Sound-Generator (freepik.com), erzeugt von Christian | Freepik-Lizenz für bezahlte Konten |
| `sounds/raum/spooky_loop.mp3` | Freepik, KI-Sound-Generator (freepik.com), erzeugt von Christian | Freepik-Lizenz für bezahlte Konten |
| `sounds/raum/wet_loop.mp3` | Freepik, KI-Sound-Generator (freepik.com), erzeugt von Christian | Freepik-Lizenz für bezahlte Konten |
| `sounds/schritte/gravel_1–3.mp3` | Freepik, KI-Sound-Generator (freepik.com), erzeugt von Christian | Freepik-Lizenz für bezahlte Konten |
| `sounds/schritte/hall_1–3.mp3` | Freepik, KI-Sound-Generator (freepik.com), erzeugt von Christian | Freepik-Lizenz für bezahlte Konten |
| `sounds/schritte/mud_1–3.mp3` | Freepik, KI-Sound-Generator (freepik.com), erzeugt von Christian | Freepik-Lizenz für bezahlte Konten |
| `sounds/schritte/stone_1–3.mp3` | Freepik, KI-Sound-Generator (freepik.com), erzeugt von Christian | Freepik-Lizenz für bezahlte Konten |
| `sounds/schritte/wood_1–3.mp3` | Freepik, KI-Sound-Generator (freepik.com), erzeugt von Christian | Freepik-Lizenz für bezahlte Konten |
| `sounds/spiel/gold.mp3` | Freepik, KI-Sound-Generator (freepik.com), erzeugt von Christian | Freepik-Lizenz für bezahlte Konten |
| `sounds/spiel/gold_zahlen.mp3` | Freepik, KI-Sound-Generator (freepik.com), erzeugt von Christian | Freepik-Lizenz für bezahlte Konten |
| `sounds/spiel/tod.mp3` | Freepik, KI-Sound-Generator (freepik.com), erzeugt von Christian | Freepik-Lizenz für bezahlte Konten |
| `sounds/spiel/truhe.mp3` | Freepik, KI-Sound-Generator (freepik.com), erzeugt von Christian | Freepik-Lizenz für bezahlte Konten |
| `sounds/spiel/tuer.mp3` | Freepik, KI-Sound-Generator (freepik.com), erzeugt von Christian | Freepik-Lizenz für bezahlte Konten |
| `sounds/spiel/tuer_riegel.mp3` | Freepik, KI-Sound-Generator (freepik.com), erzeugt von Christian | Freepik-Lizenz für bezahlte Konten |
| `sounds/zauber/eis.mp3` | Freepik, KI-Sound-Generator (freepik.com), erzeugt von Christian | Freepik-Lizenz für bezahlte Konten |
| `sounds/zauber/feuerball.mp3` | Freepik, KI-Sound-Generator (freepik.com), erzeugt von Christian | Freepik-Lizenz für bezahlte Konten |
| `sounds/zauber/feuerpfeil.mp3` | Freepik, KI-Sound-Generator (freepik.com), erzeugt von Christian | Freepik-Lizenz für bezahlte Konten |
| `sounds/zauber/schild.mp3` | Freepik, KI-Sound-Generator (freepik.com), erzeugt von Christian | Freepik-Lizenz für bezahlte Konten |
