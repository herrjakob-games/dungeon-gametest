// Tests für die Bibliothek der Zwergenminen (docs/GDD.md, Requisitenliste: buecherregal, lesetisch; Platzierung span:).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { planDecor, decorFor, doorTiles, checkDecor, PROPS, VARIANTS, BIG_WALL } from "../src/decor.js";
import { findPath } from "../src/pathfinding.js";
import { N, MID, DIR, key, inBounds, tileName } from "../src/config.js";

const read = (f) => JSON.parse(readFileSync(new URL("../" + f, import.meta.url), "utf8"));
const MODELS = read("data/models.json"), THEMES = read("data/themes.json"), ROOM_TYPES = read("data/room-types.json");
const BIB = ROOM_TYPES.find(r => r.id === "bibliothek");
const SPEC = decorFor(BIB, "zwergenminen");
const names = (tiles) => tiles.map(t => tileName(...t)).sort().join(",");

test("Bibliothek der Zwergenminen: vier Regale auf ihren Kacheln zur Raummitte, 2 bis 3 Lesetische in 3|3 bis 7|7, keine Säulen", () => {
  const errs = [];
  checkDecor(SPEC, "bibliothek/zwergenminen", (w, m) => errs.push(m));
  assert.deepEqual(errs, []);
  const want = [["1|2,1|3", Math.PI / 2], ["1|7,1|8", Math.PI / 2], ["2|1,3|1", 0], ["7|1,8|1", 0]];
  for (let doors = 0; doors < 16; doors++) for (let s = 1; s <= 20; s++) {
    const plan = planDecor(SPEC, { seed: s * 7919 + doors, doors });
    const w = "Türen " + doors + ", Seed " + s;
    assert.deepEqual(plan.missingRequired, [], w);
    const regale = plan.placements.filter(p => p.prop === "buecherregal");
    assert.deepEqual(regale.map(r => [names(r.tiles), r.rot]).sort(), want.slice().sort(), w);
    // Nachbarn an derselben Wand mit verschiedener Füllung
    const wallOf = (r) => (r.tiles[0][0] === 0 ? "W" : "N");
    ["N", "W"].forEach(wl => { const v = regale.filter(r => wallOf(r) === wl).map(r => r.variant); assert.notEqual(v[0], v[1], w + ": gleiche Füllung an " + wl); });
    const tische = plan.placements.filter(p => p.prop === "lesetisch");
    assert.ok(tische.length >= 2 && tische.length <= 3, w + ": " + tische.length + " Lesetische");
    tische.forEach(t => t.tiles.forEach(([x, z]) => assert.ok(x >= 2 && x <= 6 && z >= 2 && z <= 6, w + ": Lesetisch auf " + tileName(x, z))));
    assert.ok(!plan.placements.some(p => p.prop === "saeule" || /^fahne/.test(p.prop)), w + ": Säule oder Fahne");
    // Türen erreichbar, Türkachel und Kachel davor frei; Tische und Hocker blockieren keinen Weg zwischen den Türen
    const floor = new Set(plan.placements.flatMap(p => p.tiles.map(t => key(...t))));
    const dts = doorTiles(doors);
    dts.forEach(t => assert.ok(!floor.has(key(...t)), w + ": Türkachel belegt"));
    const free = (x, z) => inBounds(x, z) && !plan.blocked.has(key(x, z));
    for (const a of dts) for (const b of dts) if (a !== b) assert.ok(findPath(a[0], a[1], b[0], b[1], free, plan.edges), w + ": kein Weg " + tileName(...a) + " → " + tileName(...b));
  }
  assert.equal(SPEC.rubble, false);
  assert.equal(THEMES.find(t => t.id === "zwergenminen").roomPalettes.bibliothek.brightness, 1.5);
  // andere Themen: bisheriges Muster
  assert.equal(BIB.decor, undefined);
  assert.equal(BIB.layout, "halle");
});

test("Bücherregal und Lesetisch: drei Füllungen als eigene Dateien unter 1.500 Dreiecken, Wandrequisit, Leselicht", () => {
  assert.deepEqual(VARIANTS.buecherregal, ["b", "c"]);
  assert.ok(BIG_WALL.includes("buecherregal"));
  assert.deepEqual([PROPS.buecherregal.w, PROPS.buecherregal.d, PROPS.buecherregal.blocks, PROPS.buecherregal.wall], [2, 1, true, true]);
  ["buecherregal", "buecherregal_b", "buecherregal_c"].forEach(id => {
    const m = MODELS[id];
    assert.ok(m && existsSync(new URL("../" + m.file, import.meta.url)), id + " fehlt");
    const b = readFileSync(new URL("../" + m.file, import.meta.url)), j = JSON.parse(b.toString("utf8", 20, 20 + b.readUInt32LE(12)));
    const tris = j.meshes.reduce((s, me) => s + me.primitives.reduce((t, p) => t + j.accessors[p.indices].count / 3, 0), 0);
    assert.ok(tris <= 1500, id + ": " + tris + " Dreiecke");
    // Maße: 1,9 breit, 1,12 hoch, Rückseite an der Wand
    const acc = j.meshes[0].primitives.map(p => j.accessors[p.attributes.POSITION]);
    const max = [0, 1, 2].map(k => Math.max(...acc.map(a => a.max[k]))), min = [0, 1, 2].map(k => Math.min(...acc.map(a => a.min[k])));
    assert.ok(Math.abs(max[1] - 1.12) < 0.01 && max[0] - min[0] <= 1.95 && Math.abs(min[2] + 0.5) < 0.01, id + ": Maße");
  });
  assert.deepEqual([PROPS.lesetisch.w, PROPS.lesetisch.blocks, PROPS.lesetisch.light], [1, true, true]);
  const src = readFileSync(new URL("../src/props.js", import.meta.url), "utf8");
  assert.match(src, /export function lesetisch\(/);
  assert.match(src, /addLight\(g, ctx, 0xffb060, 1\.5, 5,/);
  assert.match(src, /makeModel\("kerze_duenn", "an"\)/);
  // span: nur an Nord- oder Westwand, Länge wie die Breite
  const bad = [];
  checkDecor({ layouts: [{ id: "A", props: [{ prop: "buecherregal", place: "span:3|3-4|3" }, { prop: "buecherregal", place: "span:1|2-1|4" }] }] }, "t", (w, m) => bad.push(m));
  assert.ok(bad.some(m => m.includes("nicht an der Nord- oder Westwand")) && bad.some(m => m.includes("passt nicht zur Breite")), bad.join(" / "));
});
