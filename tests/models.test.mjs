// Tests für die Modelle (docs/GDD.md, Asset-Spezifikation): Zuordnung in data/models.json, Dateien, Grenzen.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync, statSync } from "node:fs";
import { FakeThree } from "./fakeThree.mjs";

globalThis.window = { THREE: FakeThree };
const P = await import("../src/props.js");
const { PROPS } = await import("../src/decor.js");
const { FIGURE_INFO } = await import("../src/figurePlan.js");
const { ACCESSORIES } = await import("../src/monsterFigures.js");

const root = new URL("../", import.meta.url);
const read = (f) => JSON.parse(readFileSync(new URL(f, root), "utf8"));
const MODELS = read("data/models.json");
delete MODELS._info;
delete MODELS.weapons; // Waffen der Spielfiguren: tests/weapons.test.mjs
delete MODELS.scrolls;
const ROOM_TYPES = read("data/room-types.json");
const RECIPES = read("tools/asset-recipes.json");
const MAX_PROP_TRIS = 1500, MAX_BYTES = 1024 * 1024;
const FIGURE_ANIMS = ["idle", "walk", "attack", "hit", "death", "interact", "sit", "sit_floor", "lie", "awaken"];
const BASIC_ANIMS = ["idle", "walk", "attack", "hit", "death", "interact"];

// Dreiecke einer GLB-Datei aus dem JSON-Teil zählen (ohne Abhängigkeiten); mehrfach benutzte Meshes zählen mehrfach
function glbTriangles(path) {
  const b = readFileSync(path);
  assert.equal(b.toString("ascii", 0, 4), "glTF", path + " ist keine GLB-Datei");
  const len = b.readUInt32LE(12);
  const j = JSON.parse(b.toString("utf8", 20, 20 + len));
  const per = j.meshes.map(m => m.primitives.reduce((s, p) =>
    s + (p.indices !== undefined ? j.accessors[p.indices].count : j.accessors[p.attributes.POSITION].count) / 3, 0));
  const hasUV = j.meshes.every(m => m.primitives.every(p => p.attributes.TEXCOORD_0 !== undefined));
  return { tris: j.nodes.reduce((s, n) => s + (n.mesh !== undefined ? per[n.mesh] : 0), 0), hasUV, images: (j.images || []).length,
    animations: (j.animations || []).map(a => a.name), nodes: j.nodes.map(n => n.name) };
}

test("Jede Datei in data/models.json existiert und ist eine gültige GLB", () => {
  for (const [id, m] of Object.entries(MODELS)) {
    assert.ok(m.file, id + ": file fehlt");
    assert.ok(existsSync(new URL(m.file, root)), id + ": Datei " + m.file + " fehlt");
    const g = glbTriangles(new URL(m.file, root));
    if (m.texture) assert.ok(existsSync(new URL(m.texture, root)), id + ": Textur " + m.texture + " fehlt");
    if (m.palette !== false) {
      assert.ok(g.hasUV, id + ": Texturkoordinaten fehlen, die Paletten-Textur würde nicht passen");
      assert.equal(g.images, 0, id + ": eingebettete Textur (der Lader setzt die Paletten-Textur)");
    }
    if (m.scale !== undefined) assert.ok(typeof m.scale === "number" || (Array.isArray(m.scale) && m.scale.length === 3), id + ": scale");
    (m.lights || []).forEach(l => assert.ok(Array.isArray(l.offset) && /^#[0-9a-fA-F]{6}$/.test(l.color) && l.intensity > 0 && l.distance > 0, id + ": Lichtpunkt"));
  }
  assert.ok(existsSync(new URL("assets/textures/keller/dungeon_texture.png", root)), "Paletten-Textur des Kellers fehlt");
});

// Hervorhebung (docs/GDD.md, Asset-Spezifikation): highlight nennt einen Knoten, der in der Datei steht
test("highlight nennt einen Knoten der Datei", () => {
  const withHighlight = Object.entries(MODELS).filter(([, m]) => m.highlight !== undefined);
  assert.ok(withHighlight.some(([id]) => id === "tuerrahmen"), "tuerrahmen braucht highlight (Türblatt)");
  for (const [id, m] of withHighlight) {
    assert.ok(typeof m.highlight === "string", id + ": highlight muss ein Knotenname sein");
    assert.ok(glbTriangles(new URL(m.file, root)).nodes.includes(m.highlight), id + ": Knoten " + m.highlight + " fehlt in " + m.file);
  }
});

test("Bauteile der Räume haben ein Modell", () => {
  ["boden", "wand", "wand_ecke", "sockel", "sockel_ecke", "tuerrahmen", "fackel"].forEach(id => assert.ok(MODELS[id], id + " fehlt in data/models.json"));
});

test("Jede Requisiten-id hat ein Modell oder einen Platzhalter", () => {
  const ids = new Set(Object.keys(PROPS));
  ROOM_TYPES.forEach(rt => [rt.decor].concat(Object.values(rt.themeDecor || {})).filter(Boolean)
    .forEach(d => (d.layouts || []).forEach(l => l.props.forEach(p => ids.add(p.prop)))));
  ["treppe_hoch", "treppe_runter", "zellgitter", "zellgitter_ecke", "zelltor", "zellecke", "wand_riss"].forEach(id => ids.add(id));
  for (const id of ids) {
    const special = ["truhe", "lagerfeuer", "haendlerfigur"].includes(id); // baut roomBuilder selbst
    assert.ok(MODELS[id] || typeof P[id] === "function" || special, id + ": weder Modell noch Platzhalter");
  }
  // Jedes Modell aus dem Build-Skript ist zugeordnet
  Object.keys(RECIPES.parts).forEach(id => assert.ok(MODELS[id], id + ": gebaut, aber nicht in data/models.json"));
  Object.keys(RECIPES.extracts || {}).forEach(id => assert.ok(MODELS[id], id + ": gebaut, aber nicht in data/models.json"));
});

test("Jedes Volk hat eine Figur mit allen Animationen", () => {
  const CHARS = read("data/characters.json");
  CHARS.forEach(c => {
    const m = MODELS[c.model];
    assert.ok(m, c.id + ": Modell " + c.model + " fehlt in data/models.json");
    assert.ok(m.file.startsWith("assets/figures/"), c.id + ": Figur gehört nach assets/figures/");
    assert.equal(m.palette, false, c.id + ": Figuren behalten ihre eigene Textur");
    const g = glbTriangles(new URL(m.file, root));
    BASIC_ANIMS.forEach(a => {
      assert.ok(m.animations && m.animations[a], c.id + ": Zuordnung der Animation " + a + " fehlt");
      assert.ok(g.animations.includes(m.animations[a]), c.id + ": Animation " + m.animations[a] + " fehlt in " + m.file);
    });
  });
  Object.keys(RECIPES.figures || {}).forEach(id => assert.ok(MODELS[id], id + ": gebaut, aber nicht in data/models.json"));
});

// Figuren ohne Modell (bleiben vorerst Grundformen): Mimik aus dem KayKit Dungeon Pack
const FIGURES_PENDING = ["mimic", "steingolem", "eisengolem"]; // noch ohne Modell, aus Grundformen

test("Jede Figuren-id hat ein Modell, das lädt", (t) => {
  for (const id of Object.keys(FIGURE_INFO)) {
    if (FIGURES_PENDING.includes(id)) continue;
    const m = MODELS[id];
    assert.ok(m, id + ": fehlt in data/models.json");
    assert.ok(m.file.startsWith("assets/figures/"), id + ": Figur gehört nach assets/figures/");
    const g = glbTriangles(new URL(m.file, root)); // liest die GLB, wirft bei kaputter Datei
    assert.ok(g.tris > 0, id + ": Datei ohne Dreiecke");
    Object.entries(m.animations || {}).forEach(([name, clip]) => {
      assert.ok(FIGURE_ANIMS.includes(name), id + ": unbekannte Animation " + name);
      assert.ok(g.animations.includes(clip), id + ": Animation " + clip + " fehlt in " + m.file);
    });
    Object.entries(m.armedAnimations || {}).forEach(([name, clip]) => {
      assert.ok(FIGURE_ANIMS.includes(name), id + ": unbekannte Animation " + name);
      assert.ok(g.animations.includes(clip), id + ": Animation " + clip + " fehlt in " + m.file);
    });
    (m.accessories || []).forEach(a => {
      if (a.model) assert.ok(MODELS[a.model], id + ": Modell " + a.model + " fehlt in data/models.json");
      else assert.ok(ACCESSORIES[a.shape], id + ": unbekanntes Zubehör " + a.shape);
      const size = Array.isArray(a.size) ? a.size : [a.size];
      assert.ok(typeof a.bone === "string" && (size.length === 1 || size.length === 3) && size.every(v => v > 0), id + ": Zubehör braucht bone und size (Zahl oder [x, y, z])");
      if (a.shape === "bart") assert.ok(["kinn", "keil"].includes(a.part), id + ": Bart braucht part kinn oder keil");
      // Knochen muss in der Datei stehen (Namen wie im Paket, etwa head, chest)
      assert.ok(g.nodes.includes(a.bone), id + ": Knochen " + a.bone + " fehlt in " + m.file);
    });
  }
  t.diagnostic("Noch ohne Modell: " + FIGURES_PENDING.join(", "));
});

test("Grenzen der Asset-Spezifikation (Warnungen)", (t) => {
  const warn = [];
  for (const [id, m] of Object.entries(MODELS)) {
    const path = new URL(m.file, root);
    const bytes = statSync(path).size, { tris } = glbTriangles(path);
    if (bytes > MAX_BYTES) warn.push(id + ": " + Math.round(bytes / 1024) + " KB (über 1 MB)");
    if (m.file.includes("/props/") && tris > MAX_PROP_TRIS) warn.push(id + ": " + tris + " Dreiecke (über " + MAX_PROP_TRIS + ")");
    const figureMax = (RECIPES.figures[m.file.replace(/^.*\//, "").replace(".glb", "")] || {}).maxTris || 3000;
    if (m.file.includes("/figures/") && tris > figureMax) warn.push(id + ": " + tris + " Dreiecke (über " + figureMax + ")");
  }
  t.diagnostic("Modelle über den Grenzen der Asset-Spezifikation: " + (warn.length ? "" : "keine"));
  warn.forEach(w => t.diagnostic("  " + w));
});

test("Jede Bodenvariante in floorTiles steht in data/models.json", async () => {
  const { DEFAULT_FLOOR } = await import("../src/decor.js");
  const THEMES = read("data/themes.json");
  const lists = [["Standard", DEFAULT_FLOOR]];
  ROOM_TYPES.forEach(rt => [["decor", rt.decor]].concat(Object.entries(rt.themeDecor || {})).forEach(([k, d]) => {
    if (d && d.floorTiles) lists.push([rt.id + " " + k, d.floorTiles]);
  }));
  THEMES.forEach(t => { if (t.floorTiles) lists.push(["Thema " + t.id, t.floorTiles]); });
  lists.forEach(([where, l]) => l.forEach(t => assert.ok(MODELS[t.tile], where + ": " + t.tile + " fehlt in data/models.json")));
  // Alle Bodenvarianten decken genau eine Kachel (Maßstab 0,5 auf Paketplatten von 2 Einheiten)
  Object.keys(MODELS).filter(k => k === "boden" || k.startsWith("boden_")).forEach(k => assert.equal(MODELS[k].scale, 0.5, k));
});

test("Dunkelzwerge: Waffe und Haltung", async () => {
  const { weaponArmed } = await import("../src/figurePlan.js");
  // Wache: Axt auch im Stehen, nicht im Sitzen; beim Aufstehen zum Kampf wieder in der Hand
  assert.equal(weaponArmed("standing", {}), true);
  assert.equal(weaponArmed("standing", { pose: "sit" }), false);
  assert.equal(weaponArmed("standing", { pose: "sit_floor" }), false);
  assert.equal(weaponArmed("standing", { pose: "sit", fighting: true }), true);
  // Koch: Axt nur im Kampf und als Besiegter
  assert.equal(weaponArmed("combat", {}), false);
  assert.equal(weaponArmed("combat", { fighting: true }), true);
  assert.equal(weaponArmed("combat", { dead: true }), true);
  // Abtrünniger Dunkelzwerg: immer
  assert.equal(weaponArmed("always", {}), true);
  assert.equal(weaponArmed(null, {}), true);
  // Helm für alle außer dem Koch (eigene Datei ohne Helm), der Schmied kommt vom Barbarian und behält den Hammer
  for (const id of ["zwergenwache", "dunkelzwerg", "zwergenvermesser"]) assert.equal(MODELS[id].file, "assets/figures/dunkelzwerg.glb", id);
  assert.equal(MODELS.zwergenkoch.file, "assets/figures/zwergenkoch.glb");
  assert.equal(RECIPES.figures.zwergenschmied.file, "Barbarian.glb");
  assert.ok(!MODELS.zwergenschmied.accessories.some(a => a.model === "grossaxt"));
  assert.ok(MODELS.zwergenschmied.accessories.some(a => a.shape === "hammer"));
  for (const id of ["zwergenwache", "dunkelzwerg", "zwergenkoch"]) assert.ok(MODELS[id].accessories.some(a => a.model === "grossaxt"), id);
});
