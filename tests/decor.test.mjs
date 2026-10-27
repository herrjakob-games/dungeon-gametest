// Tests für die Einrichtung als Daten (docs/GDD.md, Einrichtung pro Raumtyp) und die Wendeltreppen.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  PROPS, planDecor, decorFor, centerFeature, doorTiles, checkDecor, STAIRS_TILES, STAIRS_FOOT
} from "../src/decor.js";
import { N, DIR, DIRKEYS, key, inBounds } from "../src/config.js";

const ROOM_TYPES = JSON.parse(readFileSync(new URL("../data/room-types.json", import.meta.url), "utf8"));
const SEEDS = 25;

// Alle Einrichtungen: [Name, Raumtyp, decor-Eintrag]
const SPECS = [];
for (const rt of ROOM_TYPES) {
  if (rt.decor) SPECS.push([rt.id, rt, rt.decor]);
  Object.entries(rt.themeDecor || {}).forEach(([th, d]) => SPECS.push([rt.id + "/" + th, rt, d]));
}

// Eigene Prüfung der Erreichbarkeit (unabhängig von decor.js): Breitensuche über freie Kacheln
function reach(blocked, start) {
  const free = (x, z) => inBounds(x, z) && !blocked.has(key(x, z));
  const seen = new Set([key(...start)]);
  const q = [start];
  while (q.length) {
    const [x, z] = q.shift();
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, nz = z + dz;
      if (free(nx, nz) && !seen.has(key(nx, nz))) { seen.add(key(nx, nz)); q.push([nx, nz]); }
    }
  }
  return seen;
}
const touches = (seen, tiles) => tiles.some(([x, z]) => {
  for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) if (seen.has(key(x + dx, z + dz))) return true;
  return false;
});

// Prüft eine geplante Einrichtung gegen die festen Regeln aus dem GDD
function checkPlan(plan, doors, feature, where) {
  const door = new Set(doorTiles(doors).map(t => key(...t)));
  const floor = new Set(), blocked = new Set();
  const clickables = [];
  if (feature) STAIRS_TILES.forEach(t => blocked.add(key(...t)));
  if (feature === "down" || feature === "arena") clickables.push(STAIRS_TILES);
  for (const pl of plan.placements) {
    const def = PROPS[pl.prop];
    assert.ok(def, where + ": unbekanntes Requisit " + pl.prop);
    for (const t of pl.tiles) {
      const k = key(...t);
      assert.ok(inBounds(...t), where + ": " + pl.prop + " außerhalb des Raums");
      assert.ok(!door.has(k), where + ": " + pl.prop + " steht auf einer Türkachel oder davor");
      if (def.floor === false) continue;
      assert.ok(!floor.has(k), where + ": zwei Requisiten auf Kachel " + k);
      floor.add(k);
      if (feature) assert.ok(!STAIRS_TILES.some(s => key(...s) === k), where + ": " + pl.prop + " steht in der Raummitte");
      if (def.blocks) blocked.add(k);
    }
    if (def.click) clickables.push(pl.tiles);
    if (pl.wall === "N") assert.ok(pl.tiles.some(t => t[1] === 0), where + ": " + pl.prop + " steht nicht an der Nordwand");
    if (pl.wall === "W") assert.ok(pl.tiles.some(t => t[0] === 0), where + ": " + pl.prop + " steht nicht an der Westwand");
  }
  const targets = DIRKEYS.filter(d => doors & DIR[d].bit).map(d => DIR[d].approach);
  if (feature === "up") targets.push(STAIRS_FOOT);
  const seen = reach(blocked, targets[0]);
  targets.forEach(t => assert.ok(seen.has(key(...t)), where + ": Tür oder Startkachel " + t + " nicht erreichbar"));
  clickables.forEach(c => assert.ok(touches(seen, c), where + ": anklickbares Objekt bei " + c[0] + " nicht erreichbar"));
}

test("Wendeltreppen: Vorkammer nach oben, Abstieg nach unten, Bossraum erst nach dem Sieg", () => {
  assert.equal(centerFeature("start"), "up");
  assert.equal(centerFeature("exit"), "down");
  assert.equal(centerFeature("boss", false), "arena");
  assert.equal(centerFeature("boss", true), "down");
  assert.equal(centerFeature("kueche"), null);
  // 5×5 Kacheln in der Mitte, gezählt ab 0 die Kacheln 3 bis 7
  assert.equal(STAIRS_TILES.length, 25);
  assert.deepEqual([Math.min(...STAIRS_TILES.map(t => t[0])), Math.max(...STAIRS_TILES.map(t => t[0]))], [3, 7]);
  assert.deepEqual(STAIRS_FOOT, [5, 8], "Fuß der Treppe direkt vor der untersten Stufe");
});

test("Einrichtung: alle Varianten und Türkombinationen halten Türen frei und alles erreichbar", () => {
  assert.ok(SPECS.length >= 10, "Einrichtungen als Daten vorhanden");
  for (const [name, rt, spec] of SPECS) {
    for (let li = 0; li < spec.layouts.length; li++) {
      for (let doors = 1; doors < 16; doors++) {
        for (const bossDefeated of rt.id === "boss" ? [false, true] : [false]) {
          const feature = centerFeature(rt.id, bossDefeated);
          for (let s = 1; s <= SEEDS; s++) {
            const plan = planDecor(spec, { seed: s * 7919, doors, feature, layoutIndex: li });
            checkPlan(plan, doors, feature, name + " " + spec.layouts[li].id + " Türen " + doors + " Seed " + s);
          }
        }
      }
    }
  }
});

test("Einrichtung: gleicher Seed, gleiche Einrichtung; der Seed wählt die Variante", () => {
  const spec = ROOM_TYPES.find(r => r.id === "kueche").decor;
  const a = planDecor(spec, { seed: 123, doors: 15 }), b = planDecor(spec, { seed: 123, doors: 15 });
  assert.deepEqual(a.placements, b.placements);
  const ids = new Set();
  for (let s = 1; s < 60; s++) ids.add(planDecor(spec, { seed: s, doors: 15 }).layout);
  assert.deepEqual([...ids].sort(), spec.layouts.map(l => l.id).sort());
  assert.equal(a.torchColor, "#ff8a30");
});

test("Einrichtung: Platzierungen center, wall-back, corner, around und above", () => {
  const spec = { layouts: [{ id: "T", props: [
    { prop: "tafel", place: "center" },
    { prop: "stuhl", place: "around:tafel", count: 4 },
    { prop: "kronleuchter", place: "above:tafel" },
    { prop: "regal", place: "wall-back" },
    { prop: "sack", place: "corner", count: 3 },
    { prop: "fass", place: "free", variant: "gruppe" }
  ] }] };
  const plan = planDecor(spec, { seed: 5, doors: 5 });
  const by = (p) => plan.placements.filter(x => x.prop === p);
  const tafel = by("tafel")[0];
  assert.equal(tafel.tiles.length, 5);
  assert.ok(Math.abs(tafel.cx - 5) <= 1.6 && Math.abs(tafel.cz - 5) <= 1.6, "Tafel in der Raummitte");
  const own = new Set(tafel.tiles.map(t => key(...t)));
  by("stuhl").forEach(s => assert.ok(s.tiles.every(([x, z]) => [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dz]) => own.has(key(x + dx, z + dz)))), "Stuhl neben der Tafel"));
  assert.equal(by("stuhl").length, 4);
  assert.deepEqual([by("kronleuchter")[0].cx, by("kronleuchter")[0].cz], [tafel.cx, tafel.cz], "Kronleuchter über der Tafel");
  assert.ok(by("regal")[0].wall, "Regal an der Wand");
  const corners = by("sack").map(s => key(...s.tiles[0]));
  assert.equal(new Set(corners).size, 3, "drei verschiedene Ecken");
  corners.forEach(c => assert.ok(["0,0", "10,0", "0,10", "10,10"].includes(c)));
  assert.equal(by("fass")[0].tiles.length, 3, "Fass-Gruppe aus drei Fässern");
  assert.deepEqual(plan.dropped, []);
});

test("Ein Requisit, das nicht passt, wird weggelassen", () => {
  // In der Vorkammer ist die Mitte für die Treppe reserviert: die Tafel passt nicht
  const spec = { layouts: [{ id: "T", props: [
    { prop: "tafel", place: "center" },
    { prop: "kronleuchter", place: "above:tafel" },
    { prop: "sack", place: "corner", count: 5 }
  ] }] };
  const plan = planDecor(spec, { seed: 1, doors: 15, feature: "up" });
  assert.deepEqual(plan.dropped.map(d => d.prop), ["tafel", "kronleuchter", "sack"], "keine Tafel, kein Leuchter, nur 4 Ecken");
  // Ein Raum voller Säulen: Säulen, die einen Weg versperren würden, fallen weg
  const full = planDecor({ layouts: [{ id: "F", props: [{ prop: "saeule", place: "free", count: 121 }] }] }, { seed: 3, doors: 15 });
  checkPlan(full, 15, null, "voller Raum");
  assert.ok(full.dropped.length > 0);
});

test("Datenprüfung der Einrichtung", () => {
  const errs = [];
  const err = (w, m) => errs.push(w + ": " + m);
  checkDecor({ torchColor: "rot", layouts: [{ id: "A", props: [
    { prop: "drache", place: "center" },
    { prop: "stuhl", place: "around:tafel" },
    { prop: "tisch", place: "irgendwo" },
    { prop: "fass", place: "free", variant: "lila" },
    { prop: "zettelbrett", place: "free" },
    { prop: "kiste", place: "free", count: 0 }
  ] }] }, "Test", err);
  assert.equal(errs.length, 7, errs.join("\n"));
  const ok = [];
  for (const [name, , spec] of SPECS) checkDecor(spec, name, (w, m) => ok.push(w + ": " + m));
  assert.deepEqual(ok, []);
});

test("Raumtypen ohne Einrichtung behalten das bisherige Muster", () => {
  const kerker = ROOM_TYPES.find(r => r.id === "kerker");
  assert.equal(decorFor(kerker, "keller"), null);
  const boss = ROOM_TYPES.find(r => r.id === "boss");
  assert.ok(decorFor(boss, "keller"), "Bossraum im Keller mit Käseberg");
  assert.equal(decorFor(boss, "katakomben"), null);
  assert.ok(decorFor(boss, "keller").layouts.every(l => l.props.some(p => p.prop === "kaeseberg")));
  assert.equal(N, 11);
});
