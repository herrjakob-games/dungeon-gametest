// Tests für die Einrichtung als Daten (docs/GDD.md, Einrichtung pro Raumtyp) und die Wendeltreppen.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  PROPS, planDecor, decorFor, centerFeature, doorTiles, checkDecor, STAIRS_TILES, STAIRS_FOOT, torchSlots
} from "../src/decor.js";
import { N, DIR, DIRKEYS, key, inBounds, tileName } from "../src/config.js";

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
      if (feature) assert.ok(!STAIRS_TILES.some(s => key(...s) === k), where + ": " + pl.prop + " steht auf dem Platz der Wendeltreppe");
      if (def.blocks) blocked.add(k);
    }
    if (def.click) clickables.push(pl.tiles);
    if (pl.wall === "N") assert.ok(pl.tiles.some(t => t[1] === 0), where + ": " + pl.prop + " steht nicht an der Nordwand");
    if (pl.wall === "W") assert.ok(pl.tiles.some(t => t[0] === 0), where + ": " + pl.prop + " steht nicht an der Westwand");
  }
  const targets = DIRKEYS.filter(d => doors & DIR[d].bit).map(d => DIR[d].approach);
  if (feature === "up") targets.push(STAIRS_FOOT);
  if (!targets.length) {
    // Raum ohne Tür (nur im Test): die anklickbaren Objekte müssen untereinander erreichbar sein
    if (!clickables.length) return;
    const start = clickables[0].flatMap(([x, z]) => [[x + 1, z], [x - 1, z], [x, z + 1], [x, z - 1]])
      .find(([x, z]) => inBounds(x, z) && !blocked.has(key(x, z)));
    assert.ok(start, where + ": anklickbares Objekt ist eingemauert");
    targets.push(start);
  }
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
  // 3×3 Kacheln in der Nordwest-Ecke: 1|1 bis 3|3 (gezählt ab 0: 0 bis 2), Start auf 4|4
  assert.equal(STAIRS_TILES.length, 9);
  assert.deepEqual([Math.min(...STAIRS_TILES.map(t => t[0])), Math.max(...STAIRS_TILES.map(t => t[0]))], [0, 2]);
  assert.deepEqual([Math.min(...STAIRS_TILES.map(t => t[1])), Math.max(...STAIRS_TILES.map(t => t[1]))], [0, 2]);
  assert.equal(tileName(...STAIRS_FOOT), "4|4", "Fuß der Treppe");
  // Türen Nord 5|1 und West 1|5 und die Kacheln davor bleiben frei
  const stairs = new Set(STAIRS_TILES.map(t => key(...t)));
  doorTiles(15).forEach(t => assert.ok(!stairs.has(key(...t)), tileName(...t) + " liegt auf der Treppe"));
  assert.deepEqual(DIRKEYS.map(d => tileName(...DIR[d].approach)), ["5|1", "9|5", "5|9", "1|5"]);
});

test("Einrichtung: alle Varianten mit allen 16 Türkombinationen; Liste der Korrekturen", (t) => {
  assert.ok(SPECS.length >= 10, "Einrichtungen als Daten vorhanden");
  const stats = {}; // "Raumtyp Variante Requisit" → { wanted, corrected, dropped }
  const row = (name, l, p) => {
    const k = name + " " + l.id + " " + p.prop + (p.variant ? ":" + p.variant : "");
    return stats[k] || (stats[k] = { wanted: 0, corrected: 0, dropped: 0, how: {} });
  };
  for (const [name, rt, spec] of SPECS) {
    for (let li = 0; li < spec.layouts.length; li++) {
      const l = spec.layouts[li];
      for (let doors = 0; doors < 16; doors++) {
        for (const bossDefeated of rt.id === "boss" ? [false, true] : [false]) {
          const feature = centerFeature(rt.id, bossDefeated);
          for (let s = 1; s <= SEEDS; s++) {
            const where = name + " " + l.id + " Türen " + doors + " Seed " + s;
            const plan = planDecor(spec, { seed: s * 7919, doors, feature, layoutIndex: li });
            checkPlan(plan, doors, feature, where);
            // Pflichtstücke: immer da, in voller Anzahl
            assert.deepEqual(plan.missingRequired, [], where + ": Pflichtstück fehlt");
            l.props.filter(p => p.required).forEach(p => {
              const n = plan.placements.filter(x => x.prop === p.prop && x.variant === (p.variant || null)).length;
              assert.ok(n >= (p.count || 1), where + ": " + p.prop + " nur " + n + "×");
            });
            l.props.forEach(p => { row(name, l, p).wanted += p.prop === "saeule" && p.variant === "reihen" ? (p.count || 8) : (p.count || 1); });
            plan.corrected.forEach(c => {
              const st = row(name, l, c); st.corrected++;
              st.how[c.from + " → " + c.to] = (st.how[c.from + " → " + c.to] || 0) + 1;
            });
            plan.dropped.forEach(d => { row(name, l, d).dropped++; });
          }
        }
      }
    }
  }
  // Liste für Christian: welche Requisiten wie oft korrigiert oder weggelassen wurden
  const lines = Object.entries(stats).filter(([, v]) => v.corrected || v.dropped)
    .sort((a, b) => (b[1].corrected + b[1].dropped) / b[1].wanted - (a[1].corrected + a[1].dropped) / a[1].wanted)
    .map(([k, v]) => k + ": korrigiert " + v.corrected + ", weggelassen " + v.dropped + " von " + v.wanted +
      (v.corrected ? " (" + Object.entries(v.how).map(([h, n]) => h + " " + n + "×").join(", ") + ")" : ""));
  t.diagnostic("Korrekturen der Einrichtung (alle Varianten, 16 Türkombinationen, " + SEEDS + " Seeds):");
  (lines.length ? lines : ["keine"]).forEach(x => t.diagnostic("  " + x));
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
  corners.forEach(c => assert.ok(["0,0", (N - 1) + ",0", "0," + (N - 1), (N - 1) + "," + (N - 1)].includes(c)));
  assert.equal(by("fass")[0].tiles.length, 3, "Fass-Gruppe aus drei Fässern");
  assert.deepEqual(plan.dropped, []);
});

test("Korrektur: andere Kachel, nächste Platzierung, kleinere Anzahl, weglassen; Pflichtstücke zuerst", () => {
  // In der Vorkammer ist die Nordwest-Ecke für die Treppe reserviert: nur drei Ecken
  const spec = { layouts: [{ id: "T", props: [
    { prop: "kiste", place: "corner", count: 5 },
    { prop: "goldhaufen", place: "around:truhe", count: 2 },
    { prop: "pult", place: "center", required: true }
  ] }] };
  const plan = planDecor(spec, { seed: 1, doors: 15, feature: "up" });
  assert.equal(plan.placements[0].prop, "pult", "Pflichtstück zuerst");
  const kisten = plan.placements.filter(p => p.prop === "kiste");
  assert.equal(kisten.length, 5);
  assert.equal(kisten.filter(p => STAIRS_TILES.some(s => key(...s) === key(...p.tiles[0]))).length, 0);
  assert.deepEqual(plan.corrected.map(c => [c.prop, c.from, c.to]), [["kiste", "corner", "wall-back"], ["kiste", "corner", "wall-back"]],
    "drei Ecken frei, zwei Kisten an die Wand");
  assert.deepEqual(plan.dropped.map(d => d.prop), ["goldhaufen", "goldhaufen"], "ohne Truhe fallen around:truhe weg");
  // Gleicher Seed, gleiche Korrektur
  assert.deepEqual(planDecor(spec, { seed: 1, doors: 15, feature: "up" }).corrected, plan.corrected);
  // Ein Raum voller Säulen: was einen Weg versperren würde, fällt weg (kleinere Anzahl)
  const full = planDecor({ layouts: [{ id: "F", props: [{ prop: "saeule", place: "free", count: N * N }] }] }, { seed: 3, doors: 15 });
  checkPlan(full, 15, null, "voller Raum");
  assert.ok(full.dropped.length > 0);
  // Ein Pflichtstück, das nicht passt, ist ein Datenfehler
  const tooMany = planDecor({ layouts: [{ id: "X", props: [{ prop: "tafel", place: "center", count: 20, required: true }] }] }, { seed: 1, doors: 15 });
  assert.ok(tooMany.missingRequired.length > 0);
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
    { prop: "kiste", place: "free", count: 0 },
    { prop: "kiste", place: "free", required: "ja" },
    { prop: "stuhl", place: "around:kiste", required: true }
  ] }] }, "Test", err);
  assert.equal(errs.length, 9, errs.join("\n"));
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
  assert.equal(N, 9);
});

test("Wandrequisiten (Regale, Fahnen, Herd …) verdecken oder überlagern keine Fackel", () => {
  for (const rt of ROOM_TYPES) {
    const specs = [rt.decor].concat(Object.values(rt.themeDecor || {})).filter(Boolean);
    for (const spec of specs) spec.layouts.forEach((layout, li) => {
      for (let doors = 0; doors < 16; doors++) for (let s = 1; s <= 10; s++) {
        const plan = planDecor(spec, { seed: s * 7919, doors, feature: centerFeature(rt.id, false), layoutIndex: li });
        const torches = new Set(torchSlots(doors, spec).map(f => f.wall + (f.wall === "N" ? key(f.t, 0) : key(0, f.t))));
        plan.placements.filter(p => PROPS[p.prop].wall && p.wall).forEach(p => p.tiles.forEach(t =>
          assert.ok(!torches.has(p.wall + key(...t)), rt.id + " " + layout.id + ": " + p.prop + " auf " + tileName(...t) + " verdeckt eine Fackel (Türen " + doors + ")")));
      }
    });
  }
});

test("Schatzkammer: Säulen immer auf 2|2, 8|2, 2|8 und 8|8, keine Fackeln an den Wänden", () => {
  const spec = decorFor(ROOM_TYPES.find(t => t.id === "schatz"), "keller");
  assert.equal(spec.torches, "saeulen");
  assert.deepEqual(torchSlots(0, spec), []);
  spec.layouts.forEach((layout, li) => {
    for (let doors = 0; doors < 16; doors++) for (let s = 1; s <= 10; s++) {
      const plan = planDecor(spec, { seed: s * 7919, doors, layoutIndex: li });
      const pillars = plan.placements.filter(p => p.prop === "saeule").map(p => tileName(...p.tiles[0])).sort();
      assert.deepEqual(pillars, ["2|2", "2|8", "8|2", "8|8"], "Variante " + layout.id + ", Türen " + doors);
      assert.ok(plan.placements.some(p => p.prop === "fahne" || p.prop === "fahne_dreifach"), "Banner fehlen");
    }
  });
});
