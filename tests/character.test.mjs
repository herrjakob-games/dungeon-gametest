// Ausführen mit: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { indexData } from "../src/eventLogic.js";
import {
  newCharacter, xpForLevel, levelForXp, pendingLevelUps, levelUp, raisableAttrs,
  addItem, equip, unequip, meetsReq, weaponOf, armorBonusOf, canUseAbility, PACK_SIZE
} from "../src/character.js";
import {
  startCombat, scaleMonster, playerArmor, attackRoll, hitMonster, monsterTurn, defend, useInCombat, fleeRoll
} from "../src/combat.js";

const read = (f) => JSON.parse(readFileSync(new URL("../data/" + f, import.meta.url), "utf8"));
const DATA = indexData({
  roomTypes: read("room-types.json"), events: read("events.json"), monsters: read("monsters.json"),
  items: read("items.json"), characters: read("characters.json"), texts: read("texts.json")
});
const seq = (...vals) => { let i = 0; return () => vals[i++ % vals.length]; };
const face = (w, sides) => (w - 0.5) / sides;
const make = (volk) => newCharacter(DATA.characters[volk]);

test("Völker laut GDD", () => {
  const z = make("zwerg"), e = make("elf"), m = make("mensch");
  assert.deepEqual([z.attrs, z.maxHp, z.ability.attr], [{ kraft: 2, geschick: 1, verstand: -1 }, 14, "kraft"]);
  assert.deepEqual([e.attrs, e.maxHp, e.ability.attr], [{ kraft: -1, geschick: 2, verstand: 1 }, 10, "geschick"]);
  assert.deepEqual([m.attrs, m.maxHp, m.ability.attr], [{ kraft: 0, geschick: 0, verstand: 2 }, 12, "verstand"]);
  assert.deepEqual([z.weapon, z.armor, z.pack], ["streitaxt", "kettenhemd", ["heiltrank"]]);
  assert.deepEqual([m.weapon, m.armor, m.pack], ["kurzschwert", "lederwams", ["feuerball", "heiltrank"]]);
});

test("Erfahrungsschwellen 10 / 25 / 45 / 70, danach alle 30", () => {
  assert.deepEqual([1, 2, 3, 4, 5, 6, 7].map(xpForLevel), [10, 25, 45, 70, 100, 130, 160]);
  assert.equal(levelForXp(0), 1);
  assert.equal(levelForXp(9), 1);
  assert.equal(levelForXp(10), 2);
  assert.equal(levelForXp(44), 3);
  assert.equal(levelForXp(70), 5);
  assert.equal(levelForXp(130), 7);
});

test("Stufenaufstieg: +1 Attribut bis +3, +3 Lebenspunkte", () => {
  const p = make("zwerg");
  p.xp = 26;
  assert.equal(pendingLevelUps(p), 2);
  p.hp = 10;
  levelUp(p, "kraft");
  assert.deepEqual([p.level, p.attrs.kraft, p.maxHp, p.hp], [2, 3, 17, 13]);
  levelUp(p, "kraft"); // schon auf +3: nur Lebenspunkte
  assert.deepEqual([p.level, p.attrs.kraft, p.maxHp], [3, 3, 20]);
  assert.equal(pendingLevelUps(p), 0);
  assert.deepEqual(raisableAttrs(p), ["geschick", "verstand"]);
});

test("Inventar: sechs Plätze, Anlegen mit Mindestattribut", () => {
  const e = make("elf");
  for (let i = 0; i < 5; i++) assert.equal(addItem(e, "heiltrank"), true);
  assert.equal(e.pack.length, PACK_SIZE);
  assert.equal(addItem(e, "dolch"), false, "Rucksack voll");
  e.pack[5] = "streitaxt";
  assert.match(equip(e, DATA.items, 5), /Kraft \+2/);
  assert.equal(e.weapon, "rapier");
  e.pack[5] = "dolch";
  assert.equal(equip(e, DATA.items, 5), null);
  assert.equal(e.weapon, "dolch");
  assert.equal(e.pack[5], "rapier", "alte Waffe wandert in den Rucksack");
  assert.equal(equip(e, DATA.items, 0), "Das kann man nicht anlegen.");
  assert.equal(unequip(e, "armor"), false, "kein Platz zum Ablegen");
  assert.equal(meetsReq(make("mensch"), DATA.items.schildrolle), true);
  assert.equal(meetsReq(make("zwerg"), DATA.items.feuerball), false);
});

test("Fähigkeit nur für das Hauptattribut und einmal", () => {
  const z = make("zwerg");
  assert.equal(canUseAbility(z, "kraft"), true);
  assert.equal(canUseAbility(z, "geschick"), false);
  z.abilityUsed = true;
  assert.equal(canUseAbility(z, "kraft"), false);
});

test("Gegner wachsen mit der Tiefe, höchstens 5 Ebenen", () => {
  const sk = DATA.monsters.skeleton;
  assert.deepEqual([scaleMonster(sk, 1).hp, scaleMonster(sk, 1).attack], [sk.hp, sk.attack]);
  assert.deepEqual([scaleMonster(sk, 3).hp, scaleMonster(sk, 3).attack], [sk.hp + 4, sk.attack + 2]);
  assert.deepEqual([scaleMonster(sk, 20).hp, scaleMonster(sk, 20).attack], [sk.hp + 10, sk.attack + 5]);
});

test("Kampfrunde: Angriff, Schaden, Gegnerzug, Verteidigen", () => {
  const z = make("zwerg"); // Streitaxt W8 (Kraft), Kettenhemd +2
  const c = startCombat(DATA.monsters.skeleton, 1); // Rüstung 11, Angriff +1, W6
  assert.equal(playerArmor(z, DATA.items, c), 12);
  const r = attackRoll(z, DATA.items, c, () => face(9, 20));
  assert.deepEqual([r.attr, r.total, r.ok], ["kraft", 11, true]);
  assert.equal(hitMonster(z, DATA.items, c, () => face(5, 8)), 5);
  assert.equal(c.monster.hp, 1);
  defend(c);
  assert.equal(playerArmor(z, DATA.items, c), 14);
  // Gegner würfelt 13 + 1 = 14 gegen 14 → Treffer, W6 = 3
  const m = monsterTurn(z, DATA.items, c, seq(face(13, 20), face(3, 6)));
  assert.deepEqual([m.hit, m.dmg, z.hp], [true, 3, 11]);
  assert.equal(c.defending, false, "Verteidigen gilt nur bis zur nächsten Runde");
});

test("Leichte Waffen treffen mit Geschick", () => {
  const e = make("elf"); // Rapier
  const c = startCombat(DATA.monsters.rat, 1);
  assert.equal(attackRoll(e, DATA.items, c, () => face(5, 20)).attr, "geschick");
  e.weapon = null;
  assert.equal(weaponOf(e, DATA.items).damage, 1, "ohne Waffe 1 Schaden");
  assert.equal(attackRoll(e, DATA.items, c, () => face(5, 20)).attr, "kraft");
});

test("Gegenstände im Kampf und Flucht", () => {
  const m = make("mensch");
  const c = startCombat(DATA.monsters.mimic, 1);
  assert.equal(useInCombat(m, DATA.items.feuerball, c, () => 0.999).amount, 10);
  assert.equal(c.monster.hp, 0);
  const c2 = startCombat(DATA.monsters.mimic, 1);
  useInCombat(m, DATA.items.schildrolle, c2, Math.random);
  assert.equal(playerArmor(m, DATA.items, c2), 10 + armorBonusOf(m, DATA.items) + 3);
  m.hp = 5;
  useInCombat(m, DATA.items.heiltrank, c2, () => 0.999);
  assert.equal(m.hp, 12, "2W4+2 = 10, gedeckelt auf das Maximum");
  const f = fleeRoll(m, () => face(12, 20));
  assert.deepEqual([f.category, f.attr, f.dc, f.ok], ["flucht", "geschick", 12, true]);
});
