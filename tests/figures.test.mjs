// Tests für Figuren im Raum (docs/GDD.md: „Gegner im Raum“, „Figuren in Events“, Figurenliste).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { FakeThree, countMeshes } from "./fakeThree.mjs";

globalThis.window = { THREE: FakeThree };
const { buildMonsterFigure } = await import("../src/monsterFigures.js");
const { FIGURE_INFO, planFigures, combatSpot, checkFigures, isFigure } = await import("../src/figurePlan.js");
const { planDecor, decorFor, centerFeature, doorTiles, STAIRS_TILES } = await import("../src/decor.js");
const { indexData, validateData } = await import("../src/eventLogic.js");
const { key, MID, N } = await import("../src/config.js");

const read = (f) => JSON.parse(readFileSync(new URL("../data/" + f, import.meta.url), "utf8"));
const DATA = indexData({
  roomTypes: read("room-types.json"), events: read("events.json"), monsters: read("monsters.json"),
  items: read("items.json"), characters: read("characters.json"), texts: read("texts.json"), themes: read("themes.json")
});

test("Jede Figur lässt sich erzeugen (Figurenliste und alle Monster)", () => {
  const ids = new Set(Object.keys(FIGURE_INFO).concat(Object.keys(DATA.monsters)));
  for (const id of ids) {
    const variants = [null].concat((FIGURE_INFO[id] || {}).variants || []);
    for (const v of variants) {
      const g = buildMonsterFigure(id, v);
      assert.ok(countMeshes(g) >= 3, id + (v ? " (" + v + ")" : "") + ": Figur hat zu wenige Teile");
    }
  }
  // Die Figurenliste aus dem GDD hat eigene Figuren, nicht die Ersatzfigur
  const fallbackParts = countMeshes(buildMonsterFigure("gibt_es_nicht"));
  ["rat", "skeleton", "goblin", "mimic", "kuechenratte", "monsterratte", "kroete"].forEach(id =>
    assert.notEqual(countMeshes(buildMonsterFigure(id)), fallbackParts, id + " nutzt nur die Ersatzfigur"));
  assert.equal(FIGURE_INFO.monsterratte.size, 2, "Monsterratte belegt 2×2 Kacheln");
  assert.deepEqual(FIGURE_INFO.skeleton.variants, ["sitzend"]);
});

// Räume, in denen ein Event vorkommen kann: [Raumtyp, Thema]
function roomsFor(id) {
  const out = [];
  for (const rt of Object.values(DATA.roomTypes)) {
    if (rt.events.some(e => e.id === id)) {
      DATA.themes.filter(t => t.roomTypes.includes(rt.id) || t.startNeighbor === rt.id || ["start", "exit", "schatz", "rast", "haendler"].includes(rt.id))
        .forEach(t => out.push([rt, t.id]));
    }
    Object.entries(rt.themeEvents || {}).forEach(([th, table]) => { if (table.some(e => e.id === id)) out.push([rt, th]); });
  }
  return out;
}

test("Jedes Event mit figures stellt beim Start Figuren in den Raum", () => {
  const withFigures = Object.values(DATA.events).filter(e => e.figures);
  ["kueche_chef", "speisesaal_gastgeber", "speisesaal_gaeste", "brunnen_kroete", "gruft_ruecken", "wache_wuerfel",
    "boss_monsterratte", "boss_monsterratte_zurueck"].forEach(id => assert.ok(DATA.events[id].figures, id + " ohne figures"));
  for (const ev of withFigures) {
    const rooms = roomsFor(ev.id);
    assert.ok(rooms.length, ev.id + ": in keiner Event-Tabelle");
    const want = ev.figures.reduce((s, f) => s + (f.count || 1), 0);
    for (const [rt, theme] of rooms) {
      const spec = decorFor(rt, theme);
      for (let doors = 1; doors < 16; doors++) for (let seed = 1; seed <= 10; seed++) {
        const plan = spec ? planDecor(spec, { seed: seed * 101, doors, feature: centerFeature(rt.id, false) }) : { placements: [], blocked: new Set() };
        const blocked = new Set(plan.blocked);
        if (rt.id === "boss") STAIRS_TILES.forEach(t => blocked.delete(key(...t))); // im Bossraum ist die Mitte vor dem Sieg begehbar
        const player = doorTiles(doors)[0];
        const figs = planFigures(ev.figures, { placements: plan.placements, blocked, doors, player, rand: () => (seed * 0.137) % 1 });
        const where = ev.id + " in " + rt.id + "/" + theme + " Türen " + doors + " Seed " + seed;
        assert.equal(figs.length, want, where + ": " + figs.length + " von " + want + " Figuren");
        figs.forEach(f => f.tiles.forEach(t => {
          assert.ok(!blocked.has(key(...t)), where + ": " + f.figure + " steht auf einem Requisit");
          assert.notDeepEqual(t, player, where + ": " + f.figure + " steht auf der Spielfigur");
        }));
        // near:<prop> steht direkt neben dem Requisit, above:<prop> darauf
        ev.figures.forEach(spec2 => {
          const m = /^(near|above):(\w+)$/.exec(spec2.place || "");
          const target = m && plan.placements.find(p => p.prop === m[2]);
          if (!target) return;
          figs.filter(f => f.figure === spec2.figure).forEach(f => {
            if (m[1] === "above") assert.deepEqual([f.cx, f.cz, f.onProp], [target.cx, target.cz, true], where);
            else assert.ok(f.tiles.some(([x, z]) => target.tiles.some(([tx, tz]) => Math.abs(tx - x) <= 1 && Math.abs(tz - z) <= 1)), where + ": nicht neben " + m[2]);
          });
        });
      }
    }
  }
});

test("count, variant und stay werden übernommen; fehlendes Requisit: freie Kachel", () => {
  const figs = planFigures([
    { figure: "rat", place: "near:tafel", count: 3 },
    { figure: "skeleton", place: "free", variant: "sitzend", stay: true }
  ], { placements: [], blocked: new Set(), doors: 15, player: [MID, N - 1], rand: Math.random });
  assert.equal(figs.filter(f => f.figure === "rat").length, 3);
  const sk = figs.find(f => f.figure === "skeleton");
  assert.deepEqual([sk.variant, sk.stay], ["sitzend", true]);
  assert.equal(new Set(figs.flatMap(f => f.tiles.map(t => key(...t)))).size, 4, "keine zwei Figuren auf einer Kachel");
  assert.ok(figs.every(f => !f.stay || f.figure === "skeleton"));
});

test("Kampf: Gegner neben der Spielfigur, im Bossraum in der Raummitte", () => {
  const p = [3, 3];
  const s = combatSpot("rat", { blocked: new Set(), doors: 15, player: p });
  assert.equal(s.tiles.length, 1);
  assert.ok(Math.abs(s.tiles[0][0] - p[0]) + Math.abs(s.tiles[0][1] - p[1]) === 1, "direkt neben der Spielfigur");
  // alles direkt daneben belegt: nächste freie Kachel
  const blocked = new Set();
  for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) if (dx || dz) blocked.add(key(p[0] + dx, p[1] + dz));
  const s2 = combatSpot("rat", { blocked, doors: 15, player: p });
  assert.ok(!blocked.has(key(...s2.tiles[0])));
  const boss = combatSpot("monsterratte", { blocked: new Set(), doors: 15, player: [MID, N - 1], boss: true });
  assert.equal(boss.tiles.length, 4, "2×2 Kacheln");
  assert.ok(Math.abs(boss.cx - MID) <= 0.5 && Math.abs(boss.cz - MID) <= 0.5, "in der Raummitte");
  assert.deepEqual(boss.meet, [MID, MID + 1], "die Spielfigur kommt in die Mitte");
  const big = combatSpot("monsterratte", { blocked: new Set(), doors: 15, player: [MID, N - 1] });
  assert.ok(big.tiles.every(t => !(t[0] === MID && t[1] === N - 1)), "nicht auf der Spielfigur");
});

test("Datenprüfung des Felds figures", () => {
  assert.deepEqual(validateData(DATA), []);
  const errs = [];
  checkFigures({ id: "t", figures: [
    { figure: "drache" }, { figure: "rat", place: "irgendwo" }, { figure: "rat", count: 0 },
    { figure: "rat", variant: "sitzend" }, { figure: "kroete", stay: "ja" }
  ] }, DATA, (w, m) => errs.push(m));
  assert.equal(errs.length, 5, errs.join("\n"));
  assert.ok(isFigure("kroete", DATA.monsters) && isFigure("wolf", DATA.monsters) && !isFigure("drache", DATA.monsters));
});

test("Begegnung: Figuren stehen mindestens drei Kacheln von der Eingangstür entfernt", () => {
  for (let s = 1; s <= 30; s++) {
    let r = s;
    const rand = () => ((r = (r * 16807) % 2147483647) / 2147483647);
    const door = [0, 4];
    const plan = planFigures([{ figure: "skeleton", count: 3 }], { blocked: new Set(), doors: 8, player: door, rand, awayFrom: door, awayDist: 3 });
    assert.equal(plan.length, 3);
    plan.forEach(p => p.tiles.forEach(([x, z]) => assert.ok(Math.max(Math.abs(x - door[0]), Math.abs(z - door[1])) >= 3, "zu nah an der Tür: " + x + "," + z)));
  }
});
