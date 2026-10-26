// Rundenkampf (docs/GDD.md, Abschnitt Proben, Kampf und Fortschritt).
// Reine Logik ohne Grafik und Textfenster. Ablauf einer Runde: Der Spieler handelt, danach der Gegner.
import { doCheck, rollDice } from "./eventLogic.js";
import { weaponOf, armorBonusOf } from "./character.js";

export const BASE_ARMOR = 10;   // Rüstung der Spielfigur ohne Rüstungsteil
export const DEFEND_BONUS = 2;  // Verteidigen: Rüstung +2 bis zur nächsten Runde
export const FLEE_DC = 12;      // Fliehen: Probe Flucht gegen SG 12, plus Zuschlag des Themas

// Gegner wachsen mit der Tiefe: hpBonus aus world.monsterHpBonus (+1 LP pro Ebene innerhalb des Themas)
export function scaleMonster(def, hpBonus = 0) {
  return { id: def.id, name: def.name, hp: def.hp + hpBonus, maxHp: def.hp + hpBonus, armor: def.armor, attack: def.attack, damage: def.damage, deathText: def.deathText, boss: !!def.boss };
}

export function startCombat(def, hpBonus = 0) {
  return { monster: scaleMonster(def, hpBonus), defending: false, shield: 0, frozen: 0, round: 1 };
}

// Aktuelle Rüstung der Spielfigur im Kampf
export const playerArmor = (player, items, c) =>
  BASE_ARMOR + armorBonusOf(player, items) + (c.defending ? DEFEND_BONUS : 0) + c.shield;

// Angreifen: W20 + Trefferattribut der Waffe gegen die Rüstung des Gegners (Kategorie Nahkampf)
export function attackRoll(player, items, c, rand) {
  const w = weaponOf(player, items);
  return doCheck(player, { attr: w.hit, category: "nahkampf", dc: c.monster.armor }, rand);
}

// Treffer: Schaden der Waffe abziehen. Ergebnis: Schaden.
export function hitMonster(player, items, c, rand) {
  const n = Math.min(c.monster.hp, rollDice(weaponOf(player, items).damage, rand));
  c.monster.hp -= n;
  return n;
}

export const fleeRoll = (player, rand, dcBonus = 0) => doCheck(player, { category: "flucht", dc: FLEE_DC + dcBonus }, rand);

export function defend(c) { c.defending = true; }

/**
 * Verbrauchsgegenstand im Kampf nutzen (Heiltrank, Schriftrollen).
 * Ergebnis: { type, amount } für die Anzeige.
 */
export function useInCombat(player, item, c, rand) {
  const [type, value] = Object.entries(item.use)[0];
  if (type === "heal") {
    const n = Math.min(player.maxHp - player.hp, rollDice(value, rand));
    player.hp += n;
    return { type, amount: n };
  }
  if (type === "damage") {
    const n = Math.min(c.monster.hp, rollDice(value, rand));
    c.monster.hp -= n;
    return { type, amount: n };
  }
  if (type === "freeze") {
    c.frozen = value; // Gegner setzt so viele Runden aus; ein neuer freeze setzt die Runden neu
    return { type, amount: value };
  }
  c.shield += value; // shield: Rüstung bis Kampfende
  return { type, amount: value };
}

// Zug des Gegners: W20 + Angriffsbonus gegen die Rüstung der Spielfigur
export function monsterTurn(player, items, c, rand) {
  if (c.frozen > 0) {
    // Eingefroren: Der Gegner greift diese Runde nicht an
    c.frozen -= 1;
    c.defending = false;
    c.round += 1;
    return { frozen: true, left: c.frozen, hit: false, dmg: 0 };
  }
  const d = 1 + Math.floor(rand() * 20);
  const total = d + c.monster.attack;
  const dc = playerArmor(player, items, c);
  const hit = total >= dc;
  const dmg = hit ? Math.min(player.hp, rollDice(c.monster.damage, rand)) : 0;
  player.hp -= dmg;
  c.defending = false;
  c.round += 1;
  return { d, bonus: c.monster.attack, total, dc, hit, dmg };
}
