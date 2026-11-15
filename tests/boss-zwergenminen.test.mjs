// Tests für Schmiedemeister, Bossraum der Zwergenminen und Schlacke (docs/GDD.md, Figurenliste, Einrichtung pro Raumtyp,
// Inszenierung der Figuren).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, statSync } from "node:fs";
import { FakeThree } from "./fakeThree.mjs";

globalThis.window = { THREE: FakeThree };
const { planDecor, decorFor, centerFeature, doorTiles, PROPS, STAIRS_TILES } = await import("../src/decor.js");
const { planFigures, placeEventProps } = await import("../src/figurePlan.js");
const { eventFigures, eventProps } = await import("../src/staging.js");
const { N, MID, DIR, key, inBounds, tileName } = await import("../src/config.js");

const read = (f) => JSON.parse(readFileSync(new URL("../" + f, import.meta.url), "utf8"));
const MODELS = read("data/models.json"), THEMES = read("data/themes.json"), ROOM_TYPES = read("data/room-types.json");
const STAGING = read("data/staging.json"), RECIPES = read("tools/asset-recipes.json");
const BOSS = ROOM_TYPES.find(r => r.id === "boss");
const SPEC = decorFor(BOSS, "zwergenminen");
const cheb = (a, b) => Math.min(...a.map(([x, z]) => Math.min(...b.map(([u, v]) => Math.max(Math.abs(x - u), Math.abs(z - v))))));
function glb(file) {
  const b = readFileSync(new URL("../" + file, import.meta.url));
  return JSON.parse(b.toString("utf8", 20, 20 + b.readUInt32LE(12)));
}
function reach(blocked, start) {
  const seen = new Set([key(...start)]), q = [start];
  while (q.length) {
    const [x, z] = q.shift();
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, nz = z + dz;
      if (inBounds(nx, nz) && !blocked.has(key(nx, nz)) && !seen.has(key(nx, nz))) { seen.add(key(nx, nz)); q.push([nx, nz]); }
    }
  }
  return seen;
}

test("Schmiedemeister: Datei mit sechs Animationen, höchstens 3.000 Dreiecken, unter 1 MB; Helm des Skelett-Kriegers am Kopf", () => {
  const m = MODELS.schmiedemeister;
  assert.ok(m, "schmiedemeister fehlt in data/models.json");
  const j = glb(m.file);
  ["Idle", "Walking_A", "1H_Melee_Attack_Chop", "Hit_A", "Death_A", "Interact"].forEach(a => assert.ok(j.animations.some(x => x.name === a), a + " fehlt"));
  assert.deepEqual(Object.keys(m.animations).sort(), ["attack", "death", "hit", "idle", "interact", "walk"]);
  const tris = j.nodes.filter(n => n.mesh !== undefined).reduce((s, n) => s + j.meshes[n.mesh].primitives.reduce((t, p) => t + j.accessors[p.indices].count / 3, 0), 0);
  assert.ok(tris <= 3000, tris + " Dreiecke");
  assert.ok(statSync(new URL("../" + m.file, import.meta.url)).size < 1024 * 1024);
  const head = j.nodes.findIndex(n => n.name === "head");
  const helm = j.nodes.findIndex(n => n.name === "Skeleton_Warrior_Helmet");
  assert.ok(helm >= 0 && (j.nodes[head].children || []).includes(helm), "Helm nicht am Kopfknochen");
  assert.ok(!j.nodes.some(n => n.name === "Barbarian_Hat"), "Hut noch da");
  assert.ok(!j.nodes[helm].scale || j.nodes[helm].scale.every(v => v === 1), "Helm in Paketgröße");
  // 1,3-fach so groß wie der Schmied, Kriegshammer einhändig, kein Hammer aus Grundformen
  const s = MODELS.zwergenschmied.scale;
  m.scale.forEach((v, i) => assert.ok(Math.abs(v / s[i] - 1.3) < 0.001, "Maßstab " + m.scale));
  assert.ok(m.accessories.some(a => a.model === "deko_kriegshammer" && a.bone === "handslot.r" && a.size === 0.45));
  assert.ok(!m.accessories.some(a => a.shape === "hammer"));
  assert.equal(m.weaponWhen, "always");
  assert.equal(m.armedAnimations, undefined);
  assert.equal(RECIPES.figures.schmiedemeister.attachNodes[0].node, "Skeleton_Warrior_Helmet");
  assert.equal(THEMES.find(t => t.id === "zwergenminen").boss, "schmiedemeister");
});

test("Bossraum der Zwergenminen: Esse und Amboss immer da, Amboss nah an der Esse, keine Säulen, Ecke und Mitte frei", () => {
  let dropped = 0;
  for (let doors = 0; doors < 16; doors++) for (const won of [false, true]) for (let s = 1; s <= 20; s++) {
    const feature = centerFeature("boss", won);
    const plan = planDecor(SPEC, { seed: s * 7919 + doors, doors, feature, bannerColor: "blau" });
    const w = "Türen " + doors + (won ? " nach dem Sieg" : "") + ", Seed " + s;
    assert.deepEqual(plan.missingRequired, [], w);
    const [e] = plan.placements.filter(p => p.prop === "esse"), [a] = plan.placements.filter(p => p.prop === "amboss");
    assert.ok(e && a, w);
    assert.ok(cheb(a.tiles, e.tiles) <= 2, w + ": Amboss zu weit von der Esse");
    assert.ok(!plan.placements.some(p => p.prop === "saeule" || p.prop === "pfeiler"), w + ": Säule");
    const floor = plan.placements.filter(p => PROPS[p.prop].floor !== false).flatMap(p => p.tiles.map(t => key(...t)));
    STAIRS_TILES.forEach(t => assert.ok(!floor.includes(key(...t)), w + ": Treppe belegt"));
    for (let x = MID - 1; x <= MID + 1; x++) for (let z = MID - 1; z <= MID + 1; z++) assert.ok(!floor.includes(key(x, z)), w + ": Raummitte " + tileName(x, z) + " belegt");
    // Esse berührt das Gitter über der Treppe nicht (eine Kachel Abstand)
    assert.ok(cheb(e.tiles, STAIRS_TILES) >= 1, w + ": Esse an der Treppe");
    const dts = doorTiles(doors);
    dts.forEach(t => assert.ok(!floor.includes(key(...t)), w + ": Türkachel belegt"));
    if (dts.length) { const seen = reach(plan.blocked, dts[0]); dts.forEach(t => assert.ok(seen.has(key(...t)), w + ": Tür nicht erreichbar")); }
    // Türen an Nord und West: Esse rechts neben der Tür, die Türfackel dieser Wand fällt weg
    if ((doors & 9) === 9) {
      const wall = e.wall, along = e.tiles.map(([x, z]) => (wall === "N" ? x : z));
      assert.ok(!plan.torches.some(f => f.wall === wall && along.includes(f.t)), w + ": Fackel über der Esse");
      dropped++;
    }
  }
  assert.ok(dropped > 0);
  // Keller und Katakomben unverändert: Käseberg bzw. Knochenthron
  assert.ok(decorFor(BOSS, "keller").layouts.every(l => l.props.some(p => p.prop === "kaeseberg")));
  assert.ok(decorFor(BOSS, "katakomben").layouts.every(l => l.props.some(p => p.prop === "knochenthron")));
  assert.equal(SPEC.rubble, false);
  assert.equal(THEMES.find(t => t.id === "zwergenminen").roomPalettes.boss, undefined, "kein eigenes Grundlicht");
});

test("Boss am Amboss: Standard-Inszenierung des Themas (staging.bosses)", () => {
  assert.deepEqual(STAGING.bosses.zwergenminen.figures, [{ figure: "schmiedemeister", anchor: "am_amboss" }]);
  const ev = { id: "boss_zwergenminen", bossTheme: "zwergenminen", options: [{ effects: [{ combat: "schmiedemeister" }] }] };
  let at = 0;
  for (let s = 1; s <= 30; s++) {
    const doors = DIR.S.bit;
    const plan = planDecor(SPEC, { seed: s, doors, feature: "arena" });
    const figs = planFigures(eventFigures(ev, STAGING, s), { placements: plan.placements, blocked: plan.blocked, doors, player: [MID, N - 1],
      rand: () => (s * 0.137) % 1, anchors: STAGING.anchors, canPose: () => true });
    assert.equal(figs.length, 1);
    assert.equal(figs[0].figure, "schmiedemeister");
    if (cheb(figs[0].tiles, plan.placements.find(p => p.prop === "amboss").tiles) === 1) at++;
  }
  assert.ok(at >= 28, "nur " + at + " von 30 Mal am Amboss");
  // Themen mit Boss-Events nutzen weiter ihre Events
  assert.equal(STAGING.bosses.keller, undefined);
});

test("Schlacke: einfarbig #5E5048, größer als der Kohlebrocken, nur im Event schmiede_schlacke an der Esse", () => {
  const m = MODELS.schlacke;
  assert.equal(m.color, "#5E5048");
  assert.ok(m.scale > MODELS.kohle_gross.scale && m.scale <= 1.6 + 1e-9);
  assert.equal(PROPS.schlacke.blocks, false);
  // Breite unter einer Kachel
  const b = readFileSync(new URL("../" + m.file, import.meta.url)), j = JSON.parse(b.toString("utf8", 20, 20 + b.readUInt32LE(12)));
  const acc = j.accessors[j.meshes[0].primitives[0].attributes.POSITION];
  assert.ok((acc.max[0] - acc.min[0]) * m.scale < 1 && (acc.max[2] - acc.min[2]) * m.scale < 1);
  // nur dort
  const uses = [];
  Object.entries(STAGING.events).forEach(([id, e]) => (e.props || []).forEach(p => { if (p.prop === "schlacke") uses.push(id); }));
  assert.deepEqual(uses, ["schmiede_schlacke"]);
  ROOM_TYPES.forEach(rt => [rt.decor, ...Object.values(rt.themeDecor || {})].filter(Boolean).forEach(sp =>
    (sp.layouts || []).forEach(l => assert.ok(!l.props.some(p => p.prop === "schlacke"), rt.id + ": Schlacke in der Einrichtung"))));
  assert.deepEqual(eventProps(STAGING, "schmiede_schlacke"), [{ prop: "schlacke", place: "around:esse" }]);
  // Kachel neben der Esse, auch ohne Figur
  const sp = decorFor(ROOM_TYPES.find(r => r.id === "schmiede"), "zwergenminen");
  for (let s = 1; s <= 20; s++) {
    const doors = DIR.S.bit | DIR.E.bit;
    const plan = planDecor(sp, { seed: s, doors });
    const occupied = plan.placements.filter(p => PROPS[p.prop].floor !== false).flatMap(p => p.tiles.map(t => key(...t)));
    const out = placeEventProps(eventProps(STAGING, "schmiede_schlacke"), null, { placements: plan.placements, blocked: plan.blocked, occupied, doors, player: [MID, N - 1], blocks: () => false });
    if (!out.length) continue;
    const e = plan.placements.find(p => p.prop === "esse");
    assert.equal(cheb([out[0].tile], e.tiles), 1, "Schlacke nicht an der Esse");
    assert.ok(!occupied.includes(key(...out[0].tile)));
  }
});
