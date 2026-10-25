// Regeln des Event-Systems (docs/GDD.md, Abschnitte Regelwerk und Event-System).
// Reine Logik ohne Grafik und Textfenster, damit sie in tests/ geprüft werden kann.
// Zufall kommt immer als Funktion rand() herein: im Spiel Math.random, in Tests fest.
import { DIR, DIRKEYS } from "./config.js";

export const ATTRS = ["kraft", "geschick", "verstand"];
export const ATTR_NAMES = { kraft: "Kraft", geschick: "Geschick", verstand: "Verstand" };
export const DCS = [8, 12, 16]; // leicht, mittel, schwer
export const EVENT_TYPES = ["combat", "choice", "trap", "treasure", "npc"];
export const EFFECTS = ["damage", "heal", "loot", "combat", "gainXp", "lockDoor", "unlockDoor", "setFlag"];
export const LOOT = { tier1: "2W6", tier2: "4W6" }; // bis Meilenstein 5 nur Gold

// Zwergenkrieger zu Beginn eines Durchlaufs
export function newPlayer() {
  return { hp: 12, maxHp: 12, xp: 0, gold: 0, attrs: { kraft: 2, geschick: 1, verstand: -1 } };
}

// Zustand, der pro Dungeon gilt
export const newRun = () => ({ flags: new Set(), usedOnce: new Set() });

// Rohdaten (Listen aus data/*.json) in Nachschlage-Tabellen nach id umwandeln
export function indexData(raw) {
  const byId = (list) => Object.fromEntries(list.map(o => [o.id, o]));
  return { roomTypes: byId(raw.roomTypes), events: byId(raw.events), monsters: byId(raw.monsters) };
}

// ---------- Würfel ----------
const DICE = /^(\d*)W(\d+)([+-]\d+)?$/;
export const isDice = (spec) => (typeof spec === "number" && spec >= 0) || (typeof spec === "string" && DICE.test(spec));

// "2W6", "W4", "W6+1" oder eine feste Zahl
export function rollDice(spec, rand) {
  if (typeof spec === "number") return spec;
  const m = DICE.exec(spec);
  const count = m[1] ? parseInt(m[1], 10) : 1, sides = parseInt(m[2], 10);
  let sum = m[3] ? parseInt(m[3], 10) : 0;
  for (let i = 0; i < count; i++) sum += 1 + Math.floor(rand() * sides);
  return Math.max(0, sum);
}

// Probe: W20 + Attribut gegen Schwierigkeit
export function doCheck(player, check, rand) {
  const d = 1 + Math.floor(rand() * 20);
  const bonus = player.attrs[check.attr];
  const total = d + bonus;
  return { d, bonus, total, dc: check.dc, attr: check.attr, ok: total >= check.dc };
}

// ---------- Bedingungen ----------
const CONDITION = /^(flag|notFlag):([\w-]+)$/;

export function checkCondition(cond, run) {
  if (!cond) return true;
  const m = CONDITION.exec(cond);
  if (!m) return false;
  return m[1] === "flag" ? run.flags.has(m[2]) : !run.flags.has(m[2]);
}

// ---------- Event-Auswahl ----------
// Würfelt gegen die Event-Chance und wählt dann gewichtet aus den erlaubten Events. Ergebnis: id oder null.
export function pickEvent(roomType, run, rand) {
  if (!(rand() < roomType.eventChance)) return null;
  const allowed = roomType.events.filter(e => !(e.once && run.usedOnce.has(e.id)) && checkCondition(e.condition, run));
  const total = allowed.reduce((s, e) => s + e.weight, 0);
  if (!total) return null;
  let r = rand() * total;
  for (const e of allowed) { if ((r -= e.weight) < 0) return e.id; }
  return allowed[allowed.length - 1].id;
}

// Erlaubte Richtungen für Türeffekte: N, E, S, W oder "back" (die Tür, durch die man kam)
export const resolveDoor = (dir, back) => (dir === "back" ? back : dir);

// ---------- Effekte ----------
/**
 * Wendet Effekte der Reihe nach an und liefert lesbare Zeilen für das Textfenster.
 * ctx: { player, run, monsters, room: { doors (Bitmaske), locked (Set), back } }
 * Ergebnis: { lines: [{ type, ... }], died }
 * Nach einem verlorenen Kampf oder bei 0 LP entfallen die restlichen Effekte.
 */
export function applyEffects(effects, ctx, rand) {
  const { player, run, room } = ctx;
  const lines = [];
  for (const fx of effects || []) {
    const [type, value] = Object.entries(fx)[0];
    if (type === "damage") {
      const n = Math.min(player.hp, rollDice(value, rand));
      player.hp -= n;
      lines.push({ type, amount: n });
    } else if (type === "heal") {
      const n = Math.min(player.maxHp - player.hp, rollDice(value, rand));
      player.hp += n;
      lines.push({ type, amount: n });
    } else if (type === "loot") {
      const n = rollDice(LOOT[value], rand);
      player.gold += n;
      lines.push({ type, amount: n });
    } else if (type === "combat") {
      // Ersatz-Kampf bis Meilenstein 5: eine Kraft-Probe gegen die Rüstung des Monsters
      const m = ctx.monsters[value];
      const roll = doCheck(player, { attr: "kraft", dc: m.armor }, rand);
      const line = { type, monster: m.name, roll, amount: 0 };
      if (!roll.ok) {
        line.amount = Math.min(player.hp, rollDice(m.damage, rand));
        player.hp -= line.amount;
      }
      lines.push(line);
      if (!roll.ok) break;
    } else if (type === "gainXp") {
      player.xp += value;
      lines.push({ type, amount: value });
    } else if (type === "lockDoor" || type === "unlockDoor") {
      const d = resolveDoor(value, room.back);
      if (!d || !(room.doors & DIR[d].bit)) continue;
      if (type === "lockDoor") room.locked.add(d); else room.locked.delete(d);
      lines.push({ type, dir: d });
    } else if (type === "setFlag") {
      run.flags.add(value);
    }
    if (player.hp <= 0) break;
  }
  return { lines, died: player.hp <= 0 };
}

// Sicherung gegen Einsperren: Sind am Ende eines Events alle Türen zu, öffnet sich die Rück-Tür.
// Ergebnis: die geöffnete Richtung oder null.
export function releaseIfTrapped(room) {
  const existing = DIRKEYS.filter(d => room.doors & DIR[d].bit);
  if (!existing.length || existing.some(d => !room.locked.has(d))) return null;
  const d = room.back && existing.includes(room.back) ? room.back : existing[0];
  room.locked.delete(d);
  return d;
}

// ---------- Datenprüfung ----------
// Liefert eine Liste lesbarer Fehler. Leer heißt: Daten passen zum Regelwerk.
export function validateData(data) {
  const errors = [];
  const err = (where, msg) => errors.push(where + ": " + msg);

  for (const rt of Object.values(data.roomTypes)) {
    const w = "Raumtyp " + rt.id;
    if (!rt.name) err(w, "Name fehlt");
    if (!(rt.eventChance >= 0 && rt.eventChance <= 1)) err(w, "eventChance muss zwischen 0 und 1 liegen");
    if (!Array.isArray(rt.events)) { err(w, "events fehlt"); continue; }
    for (const e of rt.events) {
      if (!data.events[e.id]) err(w, "unbekanntes Event " + e.id);
      if (!(e.weight > 0)) err(w, "Gewicht von " + e.id + " muss größer als 0 sein");
      if (e.condition !== undefined && !CONDITION.test(e.condition)) err(w, "unbekannte Bedingung " + e.condition);
    }
  }

  for (const m of Object.values(data.monsters)) {
    const w = "Monster " + m.id;
    if (!m.name) err(w, "Name fehlt");
    ["hp", "armor", "attack"].forEach(k => { if (typeof m[k] !== "number") err(w, k + " fehlt"); });
    if (!isDice(m.damage)) err(w, "Schaden ist kein Würfel");
  }

  const checkOutcome = (w, o) => {
    if (!o || typeof o !== "object") { err(w, "Ergebnis fehlt"); return; }
    if (o.next !== undefined && !data.events[o.next]) err(w, "unbekanntes Folge-Event " + o.next);
    for (const fx of o.effects || []) {
      const entries = Object.entries(fx);
      if (entries.length !== 1) { err(w, "jeder Effekt braucht genau einen Typ"); continue; }
      const [type, v] = entries[0];
      if (!EFFECTS.includes(type)) err(w, "unbekannter Effekt " + type);
      else if ((type === "damage" || type === "heal") && !isDice(v)) err(w, type + " braucht Zahl oder Würfel");
      else if (type === "loot" && !LOOT[v]) err(w, "unbekannte Beutestufe " + v);
      else if (type === "combat" && !data.monsters[v]) err(w, "unbekanntes Monster " + v);
      else if (type === "gainXp" && !(Number.isInteger(v) && v > 0)) err(w, "gainXp braucht eine positive Zahl");
      else if ((type === "lockDoor" || type === "unlockDoor") && !(v === "back" || DIRKEYS.includes(v))) err(w, type + " braucht N, E, S, W oder back");
      else if (type === "setFlag" && !/^[\w-]+$/.test(v)) err(w, "ungültiger Flag-Name " + v);
    }
  };

  for (const ev of Object.values(data.events)) {
    const w = "Event " + ev.id;
    if (!EVENT_TYPES.includes(ev.type)) err(w, "unbekannter Typ " + ev.type);
    if (!ev.title) err(w, "Titel fehlt");
    if (!ev.text) err(w, "Text fehlt");
    if (!Array.isArray(ev.options) || !ev.options.length) { err(w, "keine Optionen"); continue; }
    if (ev.options.length > 9) err(w, "mehr als 9 Optionen");
    ev.options.forEach((o, i) => {
      const wo = w + ", Option " + (i + 1);
      if (!o.label) err(wo, "Beschriftung fehlt");
      if (o.check) {
        if (!ATTRS.includes(o.check.attr)) err(wo, "unbekanntes Attribut " + o.check.attr);
        if (!DCS.includes(o.check.dc)) err(wo, "Schwierigkeit muss 8, 12 oder 16 sein");
        checkOutcome(wo + " (Erfolg)", o.success);
        checkOutcome(wo + " (Fehlschlag)", o.failure);
      } else {
        checkOutcome(wo, o);
      }
    });
  }
  return errors;
}
