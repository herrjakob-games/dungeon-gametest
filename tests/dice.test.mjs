// Tests für die Würfelanzeige (docs/GDD.md, „Würfelanzeige“): Aufnahmen, Drehung auf den Zielwert, Würfelangaben.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  SIDES, SETS, SLOTS, MAX_SECONDS, dieShape, symmetries, targetRotation, topFace, qMul, qRot, rollKey, sidesOf, checkDiceRolls
} from "../src/diceLogic.js";
import { rollDice, rollDiceDetail } from "../src/eventLogic.js";

const read = (f) => JSON.parse(readFileSync(new URL("../data/" + f, import.meta.url), "utf8"));
const ROLLS = read("dice-rolls.json");
const ITEMS = Object.fromEntries((Array.isArray(read("items.json")) ? read("items.json") : Object.values(read("items.json"))).map(i => [i.id, i]));

test("Würfelkörper: jede Seite hat einen Wert, alle Werte von 1 bis n, gegenüber zusammen n+1", () => {
  for (const n of SIDES) {
    const S = dieShape(n);
    assert.equal(S.faces.length, n, "W" + n);
    assert.deepEqual(S.faces.map(f => f.value).sort((a, b) => a - b), Array.from({ length: n }, (_, i) => i + 1), "W" + n);
    if (n !== 4) S.faces.forEach(f => {
      const opp = S.faces.find(g => f.normal.reduce((s, x, k) => s + x * g.normal[k], 0) < -0.999);
      assert.equal(f.value + opp.value, n + 1, "W" + n);
    });
    // Die Ziffer-Richtung liegt in der Seite
    S.faces.forEach(f => assert.ok(Math.abs(f.up.reduce((s, x, k) => s + x * f.normal[k], 0)) < 1e-9));
  }
  assert.deepEqual(SIDES.map(n => symmetries(n).length), [12, 24, 24, 10, 60, 60]);
});

test("Jede Aufnahme landet nach der Drehung auf jedem gewünschten Wert (beim W4 die Zahl an der oberen Spitze)", () => {
  let checked = 0;
  for (const key of SETS) {
    const n = sidesOf(key);
    for (const roll of ROLLS.sets[key]) {
      const last = roll.frames[roll.frames.length - 1];
      last.forEach((d, i) => {
        const q = d.slice(3);
        assert.equal(topFace(n, q).face, roll.faces[i], key + ": Seite in der Endlage");
        for (let value = 1; value <= n; value++) {
          const S = targetRotation(n, q, roll.faces[i], value);
          assert.ok(S, key + ": keine Drehung für " + value);
          const end = qMul(q, S);
          const t = topFace(n, end);
          assert.equal(dieShape(n).faces[t.face].value, value, key + " Wert " + value);
          assert.ok(t.angle < 3, key + ": liegt flach");
          checked++;
        }
      });
    }
  }
  assert.ok(checked >= 8 * (20 + 4 + 6 + 8 + 10 + 12 + 2 * 4 + 4 * 4 + 4 * 6));
});

test("Aufnahmen: 8 pro Satz, höchstens 1,8 Sekunden, Endlage auf den Plätzen, Start rechts, kein Würfel zu nah am anderen", () => {
  assert.equal(ROLLS.fps, 30);
  for (const key of SETS) {
    const n = sidesOf(key), c = parseInt(key.split("x")[1], 10), rad = dieShape(n).radius;
    assert.equal(ROLLS.sets[key].length, 8, key);
    for (const roll of ROLLS.sets[key]) {
      assert.equal(roll.faces.length, c, key);
      assert.ok(roll.frames.length / ROLLS.fps <= MAX_SECONDS + 1e-9, key + ": zu lang");
      const last = roll.frames[roll.frames.length - 1], first = roll.frames[0];
      last.forEach((d, i) => {
        assert.ok(Math.abs(d[0] - SLOTS[c][i][0]) < 1e-3 && Math.abs(d[2] - SLOTS[c][i][1]) < 1e-3, key + ": Endlage auf dem Platz");
        assert.ok(first[i][0] - SLOTS[c][i][0] >= 4, key + ": Start rechts");
      });
      for (const f of roll.frames) for (let a = 0; a < c; a++) for (let b = a + 1; b < c; b++) {
        assert.ok(Math.hypot(f[a][0] - f[b][0], f[a][1] - f[b][1], f[a][2] - f[b][2]) >= rad * 2.1 - 1e-3, key + ": Würfel zu nah");
      }
    }
  }
});

test("rollDiceDetail passt zu rollDice und verbraucht gleich viele Zufallszahlen", () => {
  for (const spec of ["W20", "W4", "2W4+2", "4W4+4", "4W6", "W10+2", "W12+4", "W8-1", 3]) {
    for (let s = 1; s <= 20; s++) {
      let a = 0, b = 0;
      const seq = (k) => () => { k.n++; return ((s * 7919 + k.n * 104729) % 1000) / 1000; };
      const ka = { n: 0 }, kb = { n: 0 };
      const total = rollDice(spec, seq(ka));
      const d = rollDiceDetail(spec, seq(kb));
      assert.equal(d.total, total, String(spec));
      assert.equal(ka.n, kb.n, String(spec) + ": gleicher Verbrauch");
      a = d.values.reduce((x, y) => x + y, d.mod);
      assert.equal(Math.max(0, a), total);
      b = typeof spec === "number" ? 0 : (parseInt(spec, 10) || 1);
      assert.equal(d.values.length, b, String(spec));
    }
  }
  assert.equal(rollKey("2W4+2"), "W4x2");
  assert.equal(rollKey("W20"), "W20x1");
  assert.equal(rollKey(4), null);
});

test("Jede Würfelangabe aus damage und use in data/items.json hat eine Aufnahme", () => {
  const errs = [];
  checkDiceRolls(ROLLS, ITEMS, (w, t) => errs.push(t));
  assert.deepEqual(errs, []);
  const broken = [];
  checkDiceRolls({ sets: { W20x1: ROLLS.sets.W20x1 } }, ITEMS, (w, t) => broken.push(t));
  assert.ok(broken.some(t => t.includes("W6x4")), broken.join(" / "));
});
