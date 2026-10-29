// Ausführen mit: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { generate, doorCount } from "../src/generator.js";
import { DIR, DIRKEYS, GRID, key } from "../src/config.js";
import { themeFor, hostileShare, monsterHpBonus } from "../src/world.js";

const read = (f) => JSON.parse(readFileSync(new URL("../data/" + f, import.meta.url), "utf8"));
const themes = read("themes.json");
const roomTypes = Object.fromEntries(read("room-types.json").map(t => [t.id, t]));
const WORLD = { themes, roomTypes };
const SPECIAL = ["start", "exit", "boss", "schatz", "rast", "haendler"];

const SEEDS = 400;
const DEPTHS = [1, 2, 3, 4, 6, 8, 9, 11, 12, 14, 15, 18, 25];
// Alle Kombinationen aus Seed und Ebene
function* levels() {
  for (const depth of DEPTHS) for (let s = 1; s <= SEEDS; s++) yield [s, depth, generate(s, depth, WORLD)];
}
const neighborsOf = (d, r) => DIRKEYS.filter(dk => r.doors & DIR[dk].bit).map(dk => d.rooms[key(r.x + DIR[dk].dx, r.z + DIR[dk].dz)]);
const count = (d, t) => Object.values(d.rooms).filter(r => r.type === t).length;
// Regeln eines Raumtyps mit den Ausnahmen des Themas
const ruleOf = (theme, t) => Object.assign({}, roomTypes[t], (theme.overrides || {})[t]);

test("Ebenengröße: 8–12 Räume, +2 je Ebene, ab Ebene 9 24–28", () => {
  for (const [s, depth, d] of levels()) {
    const min = 8 + 2 * (Math.min(depth, 9) - 1);
    assert.ok(d.count >= min && d.count <= min + 4, `Seed ${s}, Ebene ${depth}: ${d.count} Räume`);
  }
});

test("Türen passen beidseitig zusammen, alle Räume erreichbar und im 8×8-Gitter", () => {
  for (const [s, depth, d] of levels()) {
    for (const r of Object.values(d.rooms)) {
      assert.ok(r.x >= 0 && r.z >= 0 && r.x < GRID && r.z < GRID);
      assert.notEqual(r.dist, undefined, `Seed ${s}/${depth}: Raum ${r.x},${r.z} unerreichbar`);
      for (const dk of DIRKEYS) {
        const D = DIR[dk];
        if (!(r.doors & D.bit)) continue;
        const n = d.rooms[key(r.x + D.dx, r.z + D.dz)];
        assert.ok(n && (n.doors & DIR[D.opp].bit), `Seed ${s}/${depth}: Tür bei ${r.x},${r.z} passt nicht`);
      }
    }
  }
});

test("Start, Abstieg und Bossraum", () => {
  for (const [s, depth, d] of levels()) {
    const maxDist = Math.max(...Object.values(d.rooms).map(r => r.dist));
    assert.equal(d.rooms[d.exit].dist, maxDist);
    assert.equal(d.rooms[d.start].type, "start");
    if (depth % 3 === 0) {
      assert.equal(d.rooms[d.exit].type, "boss", `Seed ${s}/${depth}`);
      assert.equal(count(d, "exit"), 0);
      if (depth <= 15) assert.equal(d.boss, themeFor(themes, depth).boss);
      else assert.ok(themes[4].endlessBosses.includes(d.boss));
    } else {
      assert.equal(d.rooms[d.exit].type, "exit");
      assert.equal(d.boss, null);
    }
  }
});

test("Händler genau einmal, Rastplatz auf geraden Ebenen, Schatzkammer höchstens einmal in einer Sackgasse", () => {
  for (const [s, depth, d] of levels()) {
    assert.equal(count(d, "haendler"), 1, `Seed ${s}/${depth}`);
    assert.equal(count(d, "rast"), depth % 2 === 0 ? 1 : 0, `Seed ${s}/${depth}`);
    assert.ok(count(d, "schatz") <= 1);
    if ((depth - 1) % 3 !== 1) assert.equal(count(d, "schatz"), 0, `Schatzkammer nur auf der mittleren Ebene des Themas, Seed ${s}/${depth}`);
    for (const r of Object.values(d.rooms)) if (r.type === "schatz") assert.equal(doorCount(r.doors), 1);
  }
});

test("Raumtypen passen zum Thema, feste Lageregeln werden eingehalten", () => {
  for (const [s, depth, d] of levels()) {
    const theme = themeFor(themes, depth);
    const start = d.rooms[d.start];
    const startNeighbors = neighborsOf(d, start);
    if (startNeighbors.some(n => n.type !== "exit" && n.type !== "boss")) {
      assert.ok(startNeighbors.some(n => n.type === theme.startNeighbor), `Seed ${s}/${depth}: kein ${theme.startNeighbor} neben dem Start`);
    }
    for (const r of Object.values(d.rooms)) {
      const def = ruleOf(theme, r.type);
      assert.ok(SPECIAL.includes(r.type) || theme.roomTypes.includes(r.type), `Seed ${s}/${depth}: ${r.type} gehört nicht zu ${theme.id}`);
      if (def.deadEnd === "never") assert.notEqual(doorCount(r.doors), 1, `Seed ${s}/${depth}: ${r.type} in Sackgasse`);
      if (def.nextToStart === "never") assert.ok(!startNeighbors.includes(r), `Seed ${s}/${depth}: ${r.type} neben dem Start`);
    }
  }
});

test("Höchstzahlen pro Ebene werden eingehalten", () => {
  for (const [s, depth, d] of levels()) {
    const theme = themeFor(themes, depth);
    for (const t of Object.keys(roomTypes)) {
      const max = ruleOf(theme, t).max;
      if (max) assert.ok(count(d, t) <= max, `Seed ${s}/${depth}: ${t} ${count(d, t)}× statt höchstens ${max}`);
    }
  }
});

test("Katakomben: Kerker ohne Höchstzahl, Gruft darf neben den Start", () => {
  let gruftNextToStart = false, manyKerker = false;
  for (let s = 1; s <= SEEDS; s++) for (const depth of [4, 5, 6]) {
    const d = generate(s, depth, WORLD);
    if (neighborsOf(d, d.rooms[d.start]).some(n => n.type === "gruft")) gruftNextToStart = true;
    if (count(d, "kerker") > 2) manyKerker = true;
  }
  assert.ok(gruftNextToStart && manyKerker);
  // Im Keller gilt weiter: Gruft nie neben dem Start
  for (let s = 1; s <= SEEDS; s++) {
    const d = generate(s, 2, WORLD);
    assert.ok(!neighborsOf(d, d.rooms[d.start]).some(n => n.type === "gruft"));
  }
});

test("Anteil feindlicher Räume steigt mit der Tiefe", () => {
  for (const depth of [1, 7, 13, 20]) {
    let hostile = 0, total = 0;
    for (let s = 1; s <= SEEDS; s++) {
      const d = generate(s, depth, WORLD);
      for (const r of Object.values(d.rooms)) { total++; if (roomTypes[r.type].rating === "hostile") hostile++; }
    }
    const share = hostile / total;
    assert.ok(Math.abs(share - hostileShare(depth)) < 0.08, `Ebene ${depth}: ${share.toFixed(2)} statt ${hostileShare(depth)}`);
  }
  assert.equal(hostileShare(1), 0.4);
  assert.equal(hostileShare(13), 0.7);
  assert.equal(hostileShare(30), 0.7);
});

test("Monster-Wachstum: +1 LP pro Ebene im Thema, im Ork-Lager endlos", () => {
  assert.deepEqual([1, 2, 3, 4, 5, 6].map(d => monsterHpBonus(themes, d)), [0, 1, 2, 0, 1, 2]);
  assert.deepEqual([13, 14, 15, 16, 20].map(d => monsterHpBonus(themes, d)), [0, 1, 2, 3, 7]);
});

test("Gleicher Seed ergibt die gleiche Ebene", () => {
  assert.deepEqual(generate(4242, 5, WORLD), generate(4242, 5, WORLD));
});
