// Tests für den eckigen Pfeiler der Zwergenminen (docs/GDD.md, Stilguide und Requisitenliste: propModels, pfeiler).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { FakeThree } from "./fakeThree.mjs";

globalThis.window = { THREE: FakeThree };
const { modelIdFor } = await import("../src/world.js");
const { planDecor, decorFor } = await import("../src/decor.js");
const { planFigures } = await import("../src/figurePlan.js");
const { eventFigures } = await import("../src/staging.js");
const { indexData } = await import("../src/eventLogic.js");
const { DIR, key } = await import("../src/config.js");

const read = (f) => JSON.parse(readFileSync(new URL("../" + f, import.meta.url), "utf8"));
const THEMES = read("data/themes.json"), MODELS = read("data/models.json"), ROOM_TYPES = read("data/room-types.json");
const STAGING = read("data/staging.json");
const TORCH_Y = 1.25; // Höhe der Fackeln (roomBuilder.js, makeTorch)

// Ecken einer GLB-Datei (Paket-Einheiten)
function points(file) {
  const b = readFileSync(new URL("../" + file, import.meta.url));
  const len = b.readUInt32LE(12), j = JSON.parse(b.toString("utf8", 20, 20 + len)), bin = 20 + len + 8;
  const out = [];
  j.meshes.forEach(m => m.primitives.forEach(p => {
    const a = j.accessors[p.attributes.POSITION], bv = j.bufferViews[a.bufferView];
    const off = bin + (bv.byteOffset || 0) + (a.byteOffset || 0), st = bv.byteStride || 12;
    for (let i = 0; i < a.count; i++) out.push([0, 1, 2].map(k => b.readFloatLE(off + st * i + 4 * k)));
  }));
  const tris = j.meshes.reduce((s, m) => s + m.primitives.reduce((t, p) => t + j.accessors[p.indices].count / 3, 0), 0);
  return { pts: out, tris };
}

test("Zwergenminen: jede Säule nimmt das Modell pfeiler, alle anderen Themen bleiben bei saeule", () => {
  THEMES.forEach(th => {
    assert.equal(modelIdFor(th, "saeule"), th.id === "zwergenminen" ? "pfeiler" : "saeule", th.id);
    assert.equal(modelIdFor(th, "saeule_liegend"), "saeule_liegend", th.id + ": liegende Säule bleibt");
    assert.equal(modelIdFor(th, "fass"), "fass", th.id + ": andere Requisiten bleiben");
    Object.values(th.propModels || {}).forEach(id => assert.ok(MODELS[id], th.id + ": Modell " + id + " fehlt in data/models.json"));
  });
});

test("Pfeiler: 2 Kacheln hoch, Grundfläche wie die Säule, Ursprung mittig am Boden, höchstens 1.500 Dreiecke, matt auf der Palette", () => {
  const m = MODELS.pfeiler;
  assert.equal(m.palette, true);
  const s = Array.isArray(m.scale) ? m.scale : [m.scale, m.scale, m.scale];
  const { pts, tris } = points(m.file);
  const ext = (k) => [Math.min(...pts.map(p => p[k])) * s[k], Math.max(...pts.map(p => p[k])) * s[k]];
  const [y0, y1] = ext(1), [x0, x1] = ext(0), [z0, z1] = ext(2);
  assert.ok(Math.abs(y0) < 1e-6, "Unterkante am Boden");
  assert.ok(Math.abs(y1 - 2) <= 0.02, "Höhe " + (y1 - y0).toFixed(3) + " statt 2 Kacheln");
  assert.ok(Math.abs(x0 + x1) < 1e-6 && Math.abs(z0 + z1) < 1e-6, "Ursprung mittig");
  // Breite der bisherigen Säule
  const sm = MODELS.saeule, sp = points(sm.file).pts, sw = (Math.max(...sp.map(p => p[0])) - Math.min(...sp.map(p => p[0]))) * sm.scale;
  assert.ok(Math.abs((x1 - x0) - sw) <= 0.02 && x1 - x0 <= 1 && z1 - z0 <= 1, "Breite " + (x1 - x0).toFixed(3) + " statt " + sw.toFixed(3));
  assert.ok(tris <= 1500, tris + " Dreiecke");
});

test("Fackel am Pfeiler: Halterung auf der Fläche des Schafts (halbe Breite in Fackelhöhe)", () => {
  const m = MODELS.pfeiler, s = m.scale;
  const { pts } = points(m.file);
  // Schaft: Ecken unter und über der Fackelhöhe mit derselben (schmalsten) halben Breite
  const half = (y) => Math.max(...pts.filter(p => Math.abs(p[1] - y) < 1e-4).map(p => Math.abs(p[0])));
  const ys = [...new Set(pts.map(p => +p[1].toFixed(4)))].sort((a, b) => a - b);
  const below = ys.filter(y => y * s <= TORCH_Y).pop(), above = ys.find(y => y * s >= TORCH_Y);
  assert.equal(half(below), half(above), "Fackelhöhe liegt nicht auf dem Schaft");
  assert.ok(Math.abs(m.pillarTorch - half(below) * s) < 0.002, "pillarTorch " + m.pillarTorch + " statt " + (half(below) * s).toFixed(3));
  assert.equal(MODELS.saeule.pillarTorch, 0.3, "Säule unverändert");
});

test("Säulenhalle der Zwergenminen: Säulen mit Fackeln und Anker an der Säule wie bisher (nur das Modell wechselt)", () => {
  const halle = ROOM_TYPES.find(t => t.id === "halle");
  const spec = decorFor(halle, "zwergenminen");
  const DATA = indexData({ roomTypes: ROOM_TYPES, events: read("data/events.json"), monsters: read("data/monsters.json"), items: read("data/items.json"),
    characters: read("data/characters.json"), themes: THEMES, texts: read("data/texts.json") });
  let anchored = 0;
  for (let seed = 1; seed <= 20; seed++) {
    const doors = DIR.N.bit | DIR.S.bit;
    const plan = planDecor(spec, { seed, doors, bannerColor: "blau" });
    const pillars = plan.placements.filter(p => p.prop === "saeule");
    assert.equal(pillars.length, 8);
    assert.ok(plan.torchSpots.length >= 3, "Fackeln an den Säulen");
    plan.torchSpots.forEach(t => assert.ok(pillars.some(p => p.cx === t.cx && p.cz === t.cz), "Fackel ohne Säule"));
    const figs = planFigures(eventFigures(DATA.events.halle_schlafwache, STAGING, seed), { placements: plan.placements, blocked: plan.blocked, doors,
      player: [4, 0], rand: () => (seed * 0.137) % 1, anchors: STAGING.anchors, canPose: () => true });
    // Die schlafende Wache sitzt neben einer Säule (Anker an_saeule_schlafend, offset eine Kachel)
    figs.forEach(f => f.tiles.forEach(([x, z]) => { if (pillars.some(p => Math.max(Math.abs(p.cx - x), Math.abs(p.cz - z)) === 1)) anchored++; }));
  }
  assert.ok(anchored > 0, "keine Figur an einer Säule");
});

test("Durchblick: Säulen (saeule) werden durchsichtig, egal welches Modell das Thema nimmt", () => {
  const src = readFileSync(new URL("../src/roomBuilder.js", import.meta.url), "utf8");
  assert.match(src, /SEE_THROUGH = \[[^\]]*"saeule"/);
  assert.match(src, /addOccluder\(at\(propMesh\("saeule"\)/, "Säulen im alten Muster (Schrein, Bibliothek, Bossraum) über propMesh");
  assert.equal(key(1, 2), "1,2");
});
