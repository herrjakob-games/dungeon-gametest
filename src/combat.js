// Rundenkampf (docs/GDD.md, Abschnitt Proben, Kampf und Fortschritt).
// Reine Logik ohne Grafik und Textfenster. Ablauf einer Runde: Der Spieler handelt, danach der Gegner.
import { doCheck, rollDiceDetail } from "./eventLogic.js";
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

// Kritischer Schaden (docs/GDD.md, Kampf): Eine gewürfelte 20 beim Angriff trifft immer, egal wie hoch die Rüstung ist
export const CRIT = 20;
export const isCrit = (d) => d === CRIT;

// Schaden würfeln; bei einem kritischen Treffer zählt der Wert der Schadenswürfel doppelt, feste Boni nicht.
// Ohne Würfel (fester Schaden, etwa 1 ohne Waffe) bleibt es beim festen Wert. Ergebnis wie rollDiceDetail plus crit.
export function damageRoll(spec, rand, crit) {
  const r = rollDiceDetail(spec, rand);
  if (!crit || !r.values.length) return Object.assign(r, { crit: false });
  const sum = r.values.reduce((s, v) => s + v, 0);
  return Object.assign(r, { crit: true, total: Math.max(0, sum * 2 + r.mod) });
}

// Rechnung für die Würfelzeile, etwa „W10: 7 × 2 + 2 = 16“ oder „2W6: (3 + 5) × 2 = 16“
export function critText(spec, r) {
  const dice = String(spec).replace(/[+-]\d+$/, "");
  const sum = r.values.length > 1 ? "(" + r.values.join(" + ") + ")" : String(r.values[0]);
  const mod = r.mod > 0 ? " + " + r.mod : r.mod < 0 ? " − " + -r.mod : "";
  return dice + ": " + sum + " × 2" + mod + " = " + r.total;
}

// Angreifen: W20 + Trefferattribut der Waffe gegen die Rüstung des Gegners (Kategorie Nahkampf); eine 20 trifft immer
export function attackRoll(player, items, c, rand) {
  const w = weaponOf(player, items);
  const r = doCheck(player, { attr: w.hit, category: "nahkampf", dc: c.monster.armor }, rand);
  if (isCrit(r.d)) Object.assign(r, { ok: true, crit: true });
  return r;
}

// Treffer: Schaden der Waffe abziehen. Ergebnis: abgezogener Schaden. out (optional) bekommt die Würfel für die
// Würfelanzeige: { spec, values, crit, total, text } (values leer bei festem Schaden ohne Würfel). crit: kritischer Treffer
export function hitMonster(player, items, c, rand, out, crit) {
  const spec = weaponOf(player, items).damage;
  const r = damageRoll(spec, rand, crit);
  if (out) Object.assign(out, { spec, values: r.values, crit: r.crit, total: r.total, text: r.crit ? critText(spec, r) : null });
  const n = Math.min(c.monster.hp, r.total);
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
    const r = rollDiceDetail(value, rand);
    const n = Math.min(player.maxHp - player.hp, r.total);
    player.hp += n;
    return { type, amount: n, spec: value, values: r.values };
  }
  if (type === "damage") {
    const r = rollDiceDetail(value, rand);
    const n = Math.min(c.monster.hp, r.total);
    c.monster.hp -= n;
    return { type, amount: n, spec: value, values: r.values };
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
  const crit = isCrit(d); // eine 20 trifft immer und verdoppelt die Schadenswürfel
  const hit = crit || total >= dc;
  const r = hit ? damageRoll(c.monster.damage, rand, crit) : null;
  const dmg = hit ? Math.min(player.hp, r.total) : 0;
  player.hp -= dmg;
  c.defending = false;
  c.round += 1;
  return { d, bonus: c.monster.attack, total, dc, hit, dmg, crit: !!(r && r.crit), critText: r && r.crit ? critText(c.monster.damage, r) : null };
}
