// Tests für die Schmiede der Zwergenminen (docs/GDD.md, Requisitenliste, Platzierungen wall-mid, area:, torch, within:,
// Felder rubble, clear und fill mit dem Zonenraster). Alle 16 Türkombinationen, mehrere Seeds.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { FakeThree } from "./fakeThree.mjs";

globalThis.window = { THREE: FakeThree };
const { planDecor, decorFor, doorTiles, zones, checkDecor, PROPS, VARIANTS, WALL_MID } = await import("../src/decor.js");
const { planFigures } = await import("../src/figurePlan.js");
const { eventFigures } = await import("../src/staging.js");
const { indexData } = await import("../src/eventLogic.js");
const { N, MID, DIR, key, inBounds, tileName } = await import("../src/config.js");

const read = (f) => JSON.parse(readFileSync(new URL("../" + f, import.meta.url), "utf8"));
const ROOM_TYPES = read("data/room-types.json"), THEMES = read("data/themes.json"), MODELS = read("data/models.json");
const STAGING = read("data/staging.json");
const SCHMIEDE = ROOM_TYPES.find(t => t.id === "schmiede");
const SPEC = decorFor(SCHMIEDE, "zwergenminen");
const SEEDS = 20;
const cheb = (a, b) => Math.min(...a.map(([x, z]) => Math.min(...b.map(([u, v]) => Math.max(Math.abs(x - u), Math.abs(z - v))))));
const name = (tiles) => tiles.map(t => tileName(...t)).join(", ");

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

// Alle Pläne: 16 Türkombinationen × SEEDS
const PLANS = [];
for (let doors = 0; doors < 16; doors++) for (let s = 1; s <= SEEDS; s++) {
  PLANS.push({ doors, seed: s * 7919 + doors, plan: planDecor(SPEC, { seed: s * 7919 + doors, doors }) });
}
const one = (plan, prop) => plan.placements.filter(p => p.prop === prop);

test("Schmiede der Zwergenminen: Daten gültig, eine Variante, torchCount 2, kein Geröll, Füllerliste, Kohle-Varianten", () => {
  const errs = [];
  checkDecor(SPEC, "schmiede/zwergenminen", (w, m) => errs.push(w + ": " + m));
  assert.deepEqual(errs, []);
  assert.equal(SPEC.layouts.length, 1);
  assert.equal(SPEC.torchCount, 2);
  assert.equal(SPEC.rubble, false);
  assert.deepEqual(SPEC.fill, { rule: "zones", wall: ["fass", "kiste"], floor: ["eisenbarren", "wassereimer"] });
  assert.deepEqual(VARIANTS.kohle, ["gross", "klein"]);
  assert.equal(THEMES.find(t => t.id === "zwergenminen").roomPalettes.schmiede.brightness, 1.4);
  // keine Fahnen, keine Wanddeko
  assert.ok(SPEC.layouts[0].props.every(p => !["fahne", "fahne_dreifach", "waffenstaender", "regal_gross", "schluesselbund"].includes(p.prop)));
  // In anderen Themen bleibt die Schmiede beim bisherigen Muster
  assert.equal(SCHMIEDE.decor, undefined);
  assert.equal(SCHMIEDE.layout, "wache");
  ["keller", "katakomben", "goblinhoehlen", "orklager"].forEach(th => assert.equal(decorFor(SCHMIEDE, th), null, th));
  // Datenprüfung kennt die neuen Felder
  const bad = [];
  checkDecor({ rubble: true, fill: { rule: "x", wall: ["fahne"], floor: [] }, layouts: [{ id: "A", props: [{ prop: "fass", place: "area:0|0-12|3" }, { prop: "kiste", place: "within:esse:2" }] }] },
    "test", (w, m) => bad.push(m));
  ["rubble", "fill braucht", "fill.wall", "fill.floor", "Rechteck", "esse muss vorher"].forEach(s => assert.ok(bad.some(m => m.includes(s)), s + " fehlt in " + bad.join(" / ")));
});

test("Pflichtstücke: Esse, Amboss, Schleifstein und Eisenlager in jeder Türkombination", () => {
  for (const { doors, seed, plan } of PLANS) {
    const w = "Türen " + doors + ", Seed " + seed;
    assert.deepEqual(plan.missingRequired, [], w);
    ["esse", "amboss", "schleifstein", "eisenlager"].forEach(p => assert.equal(one(plan, p).length, 1, w + ": " + p));
  }
});

test("Esse (wall-mid): mittig auf 4 bis 6 einer Nord- oder Westwand ohne Tür, sonst neben dem Türrahmen; Fackeln dort auf 2 und 8", () => {
  for (const { doors, seed, plan } of PLANS) {
    const w = "Türen " + doors + ", Seed " + seed;
    const [e] = one(plan, "esse");
    assert.ok(e.wall === "N" || e.wall === "W", w);
    const along = e.tiles.map(([x, z]) => (e.wall === "N" ? x : z)).sort((a, b) => a - b);
    assert.ok(e.tiles.every(([x, z]) => (e.wall === "N" ? z : x) === 0), w + ": Esse nicht an der Wand");
    const free = ["N", "W"].filter(d => !(doors & DIR[d].bit));
    if (free.length) {
      assert.ok(free.includes(e.wall), w + ": Esse an einer Wand mit Tür");
      assert.deepEqual(along, [MID - 1, MID, MID + 1], w + ": Esse nicht auf 4 bis 6");
    } else {
      assert.ok(along.every(t => Math.abs(t - MID) >= 2), w + ": Esse im Türrahmen");
      assert.ok(along.includes(MID - 2) || along.includes(MID + 2), w + ": Esse nicht direkt neben dem Türrahmen");
    }
    plan.torches.forEach(f => { if (!(doors & DIR[f.wall].bit)) assert.ok(f.t === 1 || f.t === N - 2, w + ": Fackel an Wand ohne Tür auf " + (f.t + 1)); });
    assert.ok(!plan.torches.some(f => f.wall === e.wall && along.includes(f.t)), w + ": Esse verdeckt eine Fackel");
    assert.equal(plan.torches.length, 2, w);
  }
  assert.equal(WALL_MID, "wall-mid");
});

test("Amboss und Schleifstein in 3|3 bis 7|7; Eisenlager unter einer Wandfackel, Rückseite zur Wand", () => {
  for (const { doors, seed, plan } of PLANS) {
    const w = "Türen " + doors + ", Seed " + seed;
    ["amboss", "schleifstein"].forEach(p => one(plan, p)[0].tiles.forEach(([x, z]) => assert.ok(x >= 2 && x <= 6 && z >= 2 && z <= 6, w + ": " + p + " auf " + tileName(x, z))));
    const [l] = one(plan, "eisenlager");
    const torchTiles = plan.torches.map(f => (f.wall === "N" ? [f.t, 0] : [0, f.t]));
    assert.ok(torchTiles.some(([x, z]) => l.tiles.some(t => t[0] === x && t[1] === z)), w + ": Eisenlager " + name(l.tiles) + " nicht unter einer Fackel");
    assert.equal(l.tiles.length, 2);
    const onN = l.tiles.every(t => t[1] === 0), onW = l.tiles.every(t => t[0] === 0);
    assert.ok(onN || onW, w + ": Eisenlager nicht an der Wand");
    assert.equal(l.rot, onN ? 0 : Math.PI / 2, w + ": Rückseite nicht zur Wand");
    assert.ok(!PROPS.eisenlager.wall, "Eisenlager ist kein Wandrequisit");
  }
});

test("Kohle an der Esse, Kohlekiste und Zangentisch höchstens 2 Kacheln von der Esse, eine Kachel frei um den Waffentisch", () => {
  let tables = 0;
  for (const { doors, seed, plan } of PLANS) {
    const w = "Türen " + doors + ", Seed " + seed;
    const [e] = one(plan, "esse");
    const kiste = one(plan, "kohlekiste");
    plan.placements.filter(p => p.prop === "kohle" && p.place === "around:esse").forEach(k =>
      assert.ok(cheb(k.tiles, e.tiles) === 1 && e.tiles.some(([x, z]) => Math.abs(x - k.tiles[0][0]) + Math.abs(z - k.tiles[0][1]) === 1), w + ": Kohle " + name(k.tiles) + " nicht neben der Esse"));
    plan.placements.filter(p => p.prop === "kohle" && p.place === "around:kohlekiste").forEach(k => assert.equal(cheb(k.tiles, kiste[0].tiles), 1, w));
    assert.ok(plan.placements.filter(p => p.prop === "kohle").every(k => k.place === "around:esse" || k.place === "around:kohlekiste"), w + ": Kohle woanders");
    ["kohlekiste", "zangentisch"].forEach(p => one(plan, p).forEach(k => assert.ok(cheb(k.tiles, e.tiles) <= 2, w + ": " + p + " zu weit von der Esse")));
    one(plan, "waffentisch").forEach(t => {
      tables++;
      plan.placements.filter(p => p !== t && PROPS[p.prop].floor !== false).forEach(p =>
        assert.ok(cheb(p.tiles, t.tiles) >= 2, w + ": " + p.prop + " auf " + name(p.tiles) + " direkt am Waffentisch"));
    });
  }
  assert.ok(tables > PLANS.length / 2, "Waffentisch fehlt zu oft (" + tables + " von " + PLANS.length + ")");
});

test("Türen und alle anklickbaren Objekte erreichbar, Türkachel und Kachel davor frei", () => {
  for (const { doors, seed, plan } of PLANS) {
    const w = "Türen " + doors + ", Seed " + seed;
    const occ = new Set(plan.placements.filter(p => PROPS[p.prop].floor !== false).flatMap(p => p.tiles.map(t => key(...t))));
    const dts = doorTiles(doors);
    dts.forEach(t => assert.ok(!occ.has(key(...t)), w + ": Türkachel " + tileName(...t) + " belegt"));
    if (!dts.length) continue;
    const seen = reach(plan.blocked, dts[0]);
    dts.forEach(t => assert.ok(seen.has(key(...t)), w + ": Tür bei " + tileName(...t) + " nicht erreichbar"));
  }
});

// Größtes leeres Quadrat (ohne Bodenrequisit) im Raum
function biggestEmpty(plan) {
  const occ = new Set(plan.placements.filter(p => PROPS[p.prop].floor !== false).flatMap(p => p.tiles.map(t => key(...t))));
  let best = 0;
  for (let s = 1; s <= N; s++) for (let z0 = 0; z0 + s <= N; z0++) for (let x0 = 0; x0 + s <= N; x0++) {
    let empty = true;
    for (let z = z0; z < z0 + s && empty; z++) for (let x = x0; x < x0 + s; x++) if (occ.has(key(x, z))) { empty = false; break; }
    if (empty) best = Math.max(best, s);
  }
  return best;
}

test("Zonenraster: jede der 9 Zonen hat ein Bodenrequisit, kein leeres Quadrat größer als 4×4 (Ausnahmen werden gemeldet)", (t) => {
  // Alle Raumtypen mit fill; ohne fill bleibt alles, wie es ist (keine Füller)
  const specs = [];
  ROOM_TYPES.forEach(rt => {
    if (rt.decor) specs.push([rt.id, rt.decor]);
    Object.entries(rt.themeDecor || {}).forEach(([th, s]) => specs.push([rt.id + "/" + th, s]));
  });
  assert.deepEqual(specs.filter(([, s]) => s.fill).map(([w]) => w), ["schmiede/zwergenminen"], "heute hat nur die Schmiede der Zwergenminen eine Füllerliste");
  assert.equal(zones().length, 9);
  assert.ok(zones().every(z => z.length === 9));
  const report = [];
  for (const [where, spec] of specs) for (let doors = 0; doors < 16; doors++) for (let s = 1; s <= SEEDS; s++) {
    const plan = planDecor(spec, { seed: s * 7919 + doors, doors });
    if (!spec.fill) { assert.ok(!plan.placements.some(p => p.place === "fill"), where + ": Füller ohne fill"); continue; }
    const occ = new Set(plan.placements.filter(p => PROPS[p.prop].floor !== false).flatMap(p => p.tiles.map(x => key(...x))));
    const empty = zones().map((z, i) => (z.some(x => occ.has(key(...x))) ? -1 : i)).filter(i => i >= 0);
    assert.deepEqual(empty, plan.unfilled, where + ": unfilled stimmt nicht");
    plan.placements.filter(p => p.place === "fill").forEach(p => {
      const [x, z] = p.tiles[0], edge = x === 0 || z === 0 || x === N - 1 || z === N - 1;
      assert.ok((edge ? spec.fill.wall : spec.fill.floor).includes(p.prop), where + ": " + p.prop + " auf " + tileName(x, z));
    });
    const big = biggestEmpty(plan);
    if (empty.length || big > 4) report.push(where + ", Türen " + doors + ", Seed " + s + ": leere Zonen " + JSON.stringify(empty.map(i => i + 1)) + ", größtes leeres Quadrat " + big + "×" + big);
  }
  t.diagnostic("Korrekturliste Zonenraster: " + (report.length ? report.length + " Räume" : "keine Ausnahmen"));
  report.forEach(r => t.diagnostic("  " + r));
});

test("Kein verstreutes Geröll in der Schmiede der Zwergenminen, in anderen Räumen weiter", () => {
  const src = readFileSync(new URL("../src/roomBuilder.js", import.meta.url), "utf8");
  assert.match(src, /if \(!spec \|\| spec\.rubble !== false\) scatterRubble\(/);
  const others = ROOM_TYPES.flatMap(rt => [rt.decor, ...Object.values(rt.themeDecor || {})]).filter(Boolean).filter(s => s !== SPEC);
  assert.ok(others.every(s => s.rubble === undefined), "nur die Schmiede der Zwergenminen schaltet das Geröll ab");
});

test("Der Schmied steht am Amboss (Anker am_amboss); ohne Amboss gilt der Standard", () => {
  const DATA = indexData({ roomTypes: ROOM_TYPES, events: read("data/events.json"), monsters: read("data/monsters.json"), items: read("data/items.json"),
    characters: read("data/characters.json"), themes: THEMES, texts: read("data/texts.json") });
  assert.deepEqual(STAGING.anchors.am_amboss.props, ["amboss"]);
  ["schmiede_meisterprobe", "schmiede_schaerfen"].forEach(id => {
    let at = 0;
    for (const { doors, seed, plan } of PLANS.filter(x => x.doors & DIR.S.bit).slice(0, 60)) { // Spieler an der Südtür
      const figs = planFigures(eventFigures(DATA.events[id], STAGING, seed), { placements: plan.placements, blocked: plan.blocked, doors,
        player: [MID, N - 1], rand: () => (seed * 0.137) % 1, anchors: STAGING.anchors, canPose: () => true });
      assert.equal(figs.length, 1, id);
      if (cheb(figs[0].tiles, one(plan, "amboss")[0].tiles) === 1) at++;
    }
    assert.ok(at >= 55, id + ": Schmied nur " + at + " von 60 Mal am Amboss");
    // ohne Amboss (andere Themen): Figur steht trotzdem im Raum
    const figs = planFigures(eventFigures(DATA.events[id], STAGING, 1), { placements: [], blocked: new Set(), doors: DIR.S.bit,
      player: [MID, N - 1], rand: () => 0.3, anchors: STAGING.anchors, canPose: () => true });
    assert.equal(figs.length, 1, id + " ohne Amboss");
  });
});

// Dreiecke einer GLB-Datei (alle Meshes, mehrfach benutzte mehrfach)
function tris(file) {
  const b = readFileSync(new URL("../" + file, import.meta.url));
  const len = b.readUInt32LE(12), j = JSON.parse(b.toString("utf8", 20, 20 + len));
  const uses = new Map();
  (j.nodes || []).forEach(n => { if (n.mesh !== undefined) uses.set(n.mesh, (uses.get(n.mesh) || 0) + 1); });
  let t = 0;
  uses.forEach((c, m) => j.meshes[m].primitives.forEach(p => { t += c * j.accessors[p.indices].count / 3; }));
  return t;
}

test("Neue Modelle: Datei vorhanden, unter 1.500 Dreiecken, Kit-Modelle mit eigener Textur, Kohle einfarbig #24201F, Tisch mit Palette", () => {
  const kit = { amboss: 0.6, schleifstein: 0.44, wassereimer: 0.5, eisenlager: 0.5, eisenbarren: 0.5, kohle: 0.75, kohle_gross: 1, kohle_klein: 1, zange: 0.4 };
  Object.entries(kit).forEach(([id, s]) => {
    const m = MODELS[id];
    assert.ok(m, id + " fehlt in data/models.json");
    assert.equal(m.palette, false, id);
    assert.equal(m.scale, s, id + ": Maßstab");
    const n = tris(m.file);
    assert.ok(n <= 1500, id + ": " + n + " Dreiecke");
  });
  ["kohle", "kohle_gross", "kohle_klein"].forEach(id => assert.equal(MODELS[id].color, "#24201F"));
  assert.deepEqual(MODELS.tisch_mittel.scale, [0.8, 0.5, 0.5]);
  assert.equal(MODELS.tisch_mittel.palette, true);
  ["streitaxt", "kriegshammer", "kurzschwert", "kriegsaxt"].forEach(w => {
    assert.equal(MODELS["deko_" + w].file, "assets/weapons/" + w + ".glb");
    assert.equal(MODELS["deko_" + w].palette, false);
  });
  // Esse, Kohlekiste, Zangentisch und Waffentisch sind zusammengesetzt (props.js), ohne eigenes Modell
  const props = readFileSync(new URL("../src/props.js", import.meta.url), "utf8");
  ["esse", "kohlekiste", "zangentisch", "waffentisch"].forEach(id => {
    assert.equal(MODELS[id], undefined, id);
    assert.match(props, new RegExp("export function " + id + "\\("), id + " fehlt in props.js");
  });
  // Esse: 3×1 an der Wand, blockiert, mit Licht (#FF7A30, Stärke 5, Reichweite 13; #FF9A40, 1,5, 4)
  assert.deepEqual([PROPS.esse.w, PROPS.esse.d, PROPS.esse.blocks, PROPS.esse.wall, PROPS.esse.light], [3, 1, true, true, true]);
  assert.match(props, /addLight\(g, ctx, 0xff7a30, 5, 13, 0, 0\.9,/);
  assert.match(props, /addLight\(g, ctx, 0xff9a40, 1\.5, 4,/);
  assert.equal(PROPS.waffentisch.w, 2);
  assert.equal(PROPS.eisenlager.w, 2);
  ["wassereimer", "eisenbarren", "kohle"].forEach(id => assert.equal(PROPS[id].blocks, false, id + " ist Deko"));
});
