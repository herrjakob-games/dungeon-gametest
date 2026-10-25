// Ausführen mit: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { generate, doorCount } from "../src/generator.js";
import { DIR, DIRKEYS, GRID, key } from "../src/config.js";

const SEEDS = 3000;

test("Raumanzahl liegt zwischen 12 und 20", () => {
  for (let s = 1; s <= SEEDS; s++) {
    const d = generate(s);
    assert.ok(d.count >= 12 && d.count <= 20, `Seed ${s}: ${d.count} Räume`);
  }
});

test("Türen passen beidseitig zusammen und führen nie ins Leere", () => {
  for (let s = 1; s <= SEEDS; s++) {
    const d = generate(s);
    for (const r of Object.values(d.rooms)) {
      for (const dk of DIRKEYS) {
        const D = DIR[dk];
        if (!(r.doors & D.bit)) continue;
        const n = d.rooms[key(r.x + D.dx, r.z + D.dz)];
        assert.ok(n, `Seed ${s}: Tür nach ${D.name} in ${r.x},${r.z} führt ins Leere`);
        assert.ok(n.doors & DIR[D.opp].bit, `Seed ${s}: Gegentür fehlt bei ${n.x},${n.z}`);
      }
    }
  }
});

test("Alle Räume sind erreichbar und liegen im 8×8-Gitter", () => {
  for (let s = 1; s <= SEEDS; s++) {
    const d = generate(s);
    for (const r of Object.values(d.rooms)) {
      assert.notEqual(r.dist, undefined, `Seed ${s}: Raum ${r.x},${r.z} unerreichbar`);
      assert.ok(r.x >= 0 && r.z >= 0 && r.x < GRID && r.z < GRID);
    }
  }
});

test("Start und Ausgang: verschiedene Räume, Ausgang am weitesten entfernt", () => {
  for (let s = 1; s <= SEEDS; s++) {
    const d = generate(s);
    assert.notEqual(d.start, d.exit, `Seed ${s}`);
    const maxDist = Math.max(...Object.values(d.rooms).map(r => r.dist));
    assert.equal(d.rooms[d.exit].dist, maxDist, `Seed ${s}`);
    assert.equal(d.rooms[d.start].type, "start");
    assert.equal(d.rooms[d.exit].type, "exit");
  }
});

test("Sackgassen sind Schatz- oder Vorratskammern (außer Start und Ausgang)", () => {
  for (let s = 1; s <= SEEDS; s++) {
    const d = generate(s);
    for (const [k, r] of Object.entries(d.rooms)) {
      if (k === d.start || k === d.exit || doorCount(r.doors) !== 1) continue;
      assert.ok(["schatz", "vorrat"].includes(r.type), `Seed ${s}: Sackgasse ${k} ist ${r.type}`);
    }
  }
});

test("Gleicher Seed ergibt den gleichen Dungeon", () => {
  assert.deepEqual(generate(4242), generate(4242));
});
