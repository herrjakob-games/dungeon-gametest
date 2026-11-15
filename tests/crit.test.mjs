// Tests für kritischen Schaden (docs/GDD.md, Kampf: Kritischer Schaden; Würfelanzeige: Kritische Treffer in der Anzeige).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { indexData } from "../src/eventLogic.js";
import { newCharacter } from "../src/character.js";
import { startCombat, attackRoll, hitMonster, monsterTurn, damageRoll, critText, useInCombat, isCrit } from "../src/combat.js";

const read = (f) => JSON.parse(readFileSync(new URL("../data/" + f, import.meta.url), "utf8"));
const DATA = indexData({
  roomTypes: read("room-types.json"), events: read("events.json"), monsters: read("monsters.json"),
  items: read("items.json"), characters: read("characters.json"), texts: read("texts.json"), themes: read("themes.json")
});
const seq = (...vals) => { let i = 0; return () => vals[i++ % vals.length]; };
const face = (w, sides) => (w - 0.5) / sides;
const make = (volk) => newCharacter(DATA.characters[volk]);

test("Eine 20 trifft immer, auch gegen Rüstung über 20 + Bonus; eine 19 nicht", () => {
  const z = make("zwerg"); // Kraft +2
  const c = startCombat(DATA.monsters.skeleton, 0);
  c.monster.armor = 30; // höher als 20 + 2
  const r = attackRoll(z, DATA.items, c, () => face(20, 20));
  assert.deepEqual([r.d, r.total, r.ok, r.crit], [20, 22, true, true]);
  const r2 = attackRoll(z, DATA.items, c, () => face(19, 20));
  assert.deepEqual([r2.ok, !!r2.crit], [false, false]);
  assert.equal(isCrit(1), false, "eine 1 hat keine eigene Wirkung");
});

test("Verdopplung nur der Schadenswürfel, nicht der Boni: W10+2 mit 7 → 7 × 2 + 2 = 16", () => {
  const z = make("zwerg");
  z.weapon = "kriegshammer"; // W10+2
  const c = startCombat(DATA.monsters.steingolem, 0);
  c.monster.hp = 50;
  const out = {};
  assert.equal(hitMonster(z, DATA.items, c, () => face(7, 10), out, true), 16);
  assert.deepEqual([out.values, out.crit, out.total, out.text], [[7], true, 16, "W10: 7 × 2 + 2 = 16"]);
  assert.equal(c.monster.hp, 34);
  // ohne kritischen Treffer wie bisher
  assert.equal(hitMonster(z, DATA.items, c, () => face(7, 10)), 9);
  // gedeckelt auf die verbleibenden LP: die Zahl über der Figur nennt den abgezogenen Wert
  c.monster.hp = 5;
  assert.equal(hitMonster(z, DATA.items, c, () => face(7, 10), {}, true), 5);
});

test("2W6: beide Würfel zählen doppelt", () => {
  const r = damageRoll("2W6", seq(face(3, 6), face(5, 6)), true);
  assert.deepEqual([r.values, r.total, r.crit], [[3, 5], 16, true]);
  assert.equal(critText("2W6", r), "2W6: (3 + 5) × 2 = 16");
  const n = damageRoll("2W6", seq(face(3, 6), face(5, 6)), false);
  assert.equal(n.total, 8);
});

test("Ohne Waffe bleibt es bei 1 Schaden; Verbrauchsgegenstände treffen nie kritisch", () => {
  const e = make("elf");
  e.weapon = null;
  const c = startCombat(DATA.monsters.rat, 0);
  const out = {};
  assert.equal(hitMonster(e, DATA.items, c, () => 0.999, out, true), 1);
  assert.equal(out.crit, false);
  assert.equal(useInCombat.length, 4, "useInCombat kennt keinen kritischen Treffer");
  const m = make("mensch");
  const c2 = startCombat(DATA.monsters.mimic, 0);
  assert.equal(useInCombat(m, DATA.items.feuerballrolle, c2, () => 0.999).amount, 10, "Feuerball wie bisher");
});

test("Gegnerangriff: 20 trifft immer und verdoppelt die Würfel, auch gegen hohe Rüstung", () => {
  const z = make("zwerg");
  const c = startCombat(DATA.monsters.skeleton, 0); // Angriff +1, Schaden W6
  c.shield = 40; // Rüstung weit über 20 + 1
  z.hp = 30; z.maxHp = 30;
  const t = monsterTurn(z, DATA.items, c, seq(face(20, 20), face(4, 6)));
  assert.deepEqual([t.hit, t.crit, t.dmg, z.hp, t.critText], [true, true, 8, 22, "W6: 4 × 2 = 8"]);
  const t2 = monsterTurn(z, DATA.items, c, seq(face(19, 20), face(4, 6)));
  assert.deepEqual([t2.hit, t2.crit], [false, false]);
});
