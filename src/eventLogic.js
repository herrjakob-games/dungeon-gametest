// Regeln des Event-Systems (docs/GDD.md, Abschnitte Regelwerk und Event-System).
// Reine Logik ohne Grafik und Textfenster, damit sie in tests/ geprüft werden kann.
// Zufall kommt immer als Funktion rand() herein: im Spiel Math.random, in Tests fest.
import { DIR, DIRKEYS } from "./config.js";
import { ATTRS, hasItem, ATTR_MIN, ATTR_MAX, START_ATTR_MAX, VOLK_NAMES } from "./character.js";

export const DCS = [8, 12, 16]; // leicht, mittel, schwer
export const EVENT_TYPES = ["combat", "choice", "trap", "treasure", "npc"];
export const EFFECTS = ["damage", "heal", "loot", "gold", "item", "loseGold", "combat", "gainXp", "lockDoor", "unlockDoor", "setFlag"];

// Neun Proben-Kategorien, je drei pro Attribut
export const CATEGORIES = {
  nahkampf: "kraft", kraftakt: "kraft", widerstand: "kraft",
  ausweichen: "geschick", fingerfertigkeit: "geschick", flucht: "geschick",
  diplomatie: "verstand", wahrnehmung: "verstand", wissen: "verstand"
};
export const CATEGORY_NAMES = {
  nahkampf: "Nahkampf", kraftakt: "Kraftakt", widerstand: "Widerstand",
  ausweichen: "Ausweichen", fingerfertigkeit: "Fingerfertigkeit", flucht: "Flucht",
  diplomatie: "Diplomatie", wahrnehmung: "Wahrnehmung", wissen: "Wissen"
};

// Beute: Gold, dazu ein Gegenstand (tier1 mit 1/3 Chance, tier2 immer). Die Stufe des Gegenstands ist
// die Stufe des Themas (tier1) oder eine höher (tier2); das Gold wird mit der Stufe des Themas malgenommen.
export const LOOT = { tier1: { gold: "2W6", itemChance: 1 / 3, step: 0 }, tier2: { gold: "4W6", itemChance: 1, step: 1 } };
export const MAX_ITEM_STAGE = 6;
export const RATINGS = ["hostile", "mixed", "neutral"];
export const MIXED_HOSTILE_CHANCE = 0.3; // gemischte Raumtypen: so oft ein feindliches Event

// Zustand, der pro Dungeon gilt
export const newRun = () => ({ flags: new Set(), usedOnce: new Set() });

// Rohdaten (Listen aus data/*.json) in Nachschlage-Tabellen nach id umwandeln
export function indexData(raw) {
  const byId = (list) => Object.fromEntries((list || []).map(o => [o.id, o]));
  return {
    roomTypes: byId(raw.roomTypes), events: byId(raw.events), monsters: byId(raw.monsters),
    items: byId(raw.items), characters: byId(raw.characters), texts: raw.texts || {},
    themes: raw.themes || [] // Liste in der Reihenfolge der Ebenen
  };
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

// Probe: W20 + Attribut gegen Schwierigkeit. Das Attribut ergibt sich aus der Kategorie,
// außer es ist ausdrücklich angegeben (Angriff mit leichter Waffe trifft mit Geschick).
export function doCheck(player, check, rand) {
  const d = 1 + Math.floor(rand() * 20);
  const attr = check.attr || CATEGORIES[check.category];
  const bonus = player.attrs[attr];
  const total = d + bonus;
  return { d, bonus, total, dc: check.dc, attr, category: check.category, ok: total >= check.dc };
}

// ---------- Bedingungen ----------
const CONDITION = /^(flag|notFlag|volk|hasItem):([\w-]+)$/;

export function checkCondition(cond, run, player) {
  if (!cond) return true;
  const m = CONDITION.exec(cond);
  if (!m) return false;
  if (m[1] === "flag") return run.flags.has(m[2]);
  if (m[1] === "notFlag") return !run.flags.has(m[2]);
  if (m[1] === "volk") return !!player && player.volk === m[2];
  return !!player && hasItem(player, m[2]);
}

// ---------- Event-Auswahl ----------
// Würfelt gegen die Event-Chance und wählt dann gewichtet aus den erlaubten Events. Ergebnis: id oder null.
export function pickEvent(roomType, run, rand, player) {
  if (!(rand() < roomType.eventChance)) return null;
  let allowed = roomType.events.filter(e => !(e.once && run.usedOnce.has(e.id)) && checkCondition(e.condition, run, player));
  // Gemischte Raumtypen: in etwa 30 % der Fälle ein feindliches Event, sonst ein harmloses
  if (roomType.rating === "mixed") {
    const want = rand() < MIXED_HOSTILE_CHANCE ? "hostile" : "neutral";
    const pool = allowed.filter(e => e.rating === want);
    if (pool.length) allowed = pool;
  }
  const total = allowed.reduce((s, e) => s + e.weight, 0);
  if (!total) return null;
  let r = rand() * total;
  for (const e of allowed) { if ((r -= e.weight) < 0) return e.id; }
  return allowed[allowed.length - 1].id;
}

// Event-Tabelle des Bossraums für ein Thema (Feld themeEvents); ohne Tabelle gibt es kein Boss-Event
export const bossEventTable = (bossType, themeId) => {
  const events = (bossType.themeEvents || {})[themeId];
  return events ? Object.assign({}, bossType, { events }) : Object.assign({}, bossType, { eventChance: 0, events: [] });
};

// Optionen eines Events, die die Figur sehen darf (Volks-Bedingungen einzelner Optionen)
export const visibleOptions = (ev, run, player) => ev.options.filter(o => checkCondition(o.condition, run, player));

// ---------- Beute ----------
// Beutepool: alle Gegenstände vom Rang der Beutestufe, Verbrauchsgegenstände eingeschlossen (GDD 2.0)
export const lootPool = (items, rang) => Object.values(items)
  .filter(i => i.rang === availableRang(items, rang))
  .map(i => ({ id: i.id, weight: 1 }));

// Ist ein Rang noch leer (etwa Rang 6 vor dem Content-Projekt), gilt der höchste Rang darunter, der Gegenstände hat
export function availableRang(items, rang) {
  const list = Object.values(items);
  for (let r = rang; r >= 1; r--) if (list.some(i => i.rang === r)) return r;
  return rang;
}

// stage: Stufe des Themas (Keller 1 bis Ork-Lager 5)
export function rollLoot(tier, items, rand, stage = 1) {
  const t = LOOT[tier];
  const gold = rollDice(t.gold, rand) * stage;
  const item = rand() < t.itemChance ? rollItem(tier, items, rand, stage) : null;
  return { gold, item };
}

// Ein Gegenstand der Beutestufe: tier1 = Stufe des Themas, tier2 = eine höher
export function rollItem(tier, items, rand, stage = 1) {
  const pool = lootPool(items, Math.min(MAX_ITEM_STAGE, stage + LOOT[tier].step));
  let r = rand() * pool.reduce((s, i) => s + i.weight, 0);
  for (const i of pool) { if ((r -= i.weight) < 0) return i.id; }
  return pool.length ? pool[pool.length - 1].id : null;
}

// Erlaubte Richtungen für Türeffekte: N, E, S, W oder "back" (die Tür, durch die man kam)
export const resolveDoor = (dir, back) => (dir === "back" ? back : dir);

// ---------- Effekte ----------
/**
 * Wendet Effekte der Reihe nach an und liefert lesbare Zeilen für das Textfenster.
 * ctx: { player, run, items, stage (Stufe des Themas), room: { doors (Bitmaske), locked (Set), back } }
 * Ergebnis: { lines, died, items, combat }
 *  - items: gefundene Gegenstände; der Ablauf legt sie in den Rucksack (oder fragt, was liegen bleibt)
 *  - combat: { monster, rest } bei einem Kampf; die Effekte danach (rest) gelten erst nach einem Sieg
 * Bei 0 LP entfallen die restlichen Effekte.
 */
export function applyEffects(effects, ctx, rand) {
  const { player, run, room } = ctx;
  const list = effects || [];
  const lines = [], found = [];
  for (let i = 0; i < list.length; i++) {
    const [type, value] = Object.entries(list[i])[0];
    if (type === "damage") {
      const n = Math.min(player.hp, rollDice(value, rand));
      player.hp -= n;
      lines.push({ type, amount: n });
    } else if (type === "heal") {
      const n = Math.min(player.maxHp - player.hp, rollDice(value, rand));
      player.hp += n;
      lines.push({ type, amount: n });
    } else if (type === "loot") {
      const l = rollLoot(value, ctx.items, rand, ctx.stage || 1);
      player.gold += l.gold;
      lines.push({ type, amount: l.gold });
      if (l.item) found.push(l.item);
    } else if (type === "gold") {
      // Nur Gold, mal Stufe des Themas wie bei der Beute
      const n = rollDice(value, rand) * (ctx.stage || 1);
      player.gold += n;
      lines.push({ type: "loot", amount: n });
    } else if (type === "item") {
      // Sicher ein Gegenstand, ohne Gold
      const id = rollItem(value, ctx.items, rand, ctx.stage || 1);
      if (id) found.push(id);
    } else if (type === "loseGold") {
      // Fester Betrag, Gold fällt nie unter 0
      const n = Math.min(player.gold, value);
      player.gold -= n;
      lines.push({ type, amount: n });
    } else if (type === "combat") {
      return { lines, died: false, items: found, combat: { monster: value, rest: list.slice(i + 1) } };
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
  return { lines, died: player.hp <= 0, items: found, combat: null };
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
  const checkCond = (w, cond) => {
    if (cond === undefined) return;
    const m = CONDITION.exec(cond);
    if (!m) err(w, "unbekannte Bedingung " + cond);
    else if (m[1] === "volk" && !data.characters[m[2]]) err(w, "unbekanntes Volk " + m[2]);
    else if (m[1] === "hasItem" && !data.items[m[2]]) err(w, "unbekannter Gegenstand " + m[2]);
  };
  const checkReq = (w, req) => Object.entries(req || {}).forEach(([a, v]) => {
    if (a === "volk") { if (!VOLK_NAMES[v]) err(w, "unbekanntes Volk " + v); return; }
    if (!ATTRS.includes(a)) err(w, "unbekanntes Attribut " + a);
    if (!(Number.isInteger(v) && v >= ATTR_MIN && v <= ATTR_MAX)) err(w, "Mindestwert muss zwischen −1 und +10 liegen");
  });

  for (const rt of Object.values(data.roomTypes)) {
    const w = "Raumtyp " + rt.id;
    if (!rt.name) err(w, "Name fehlt");
    if (!(rt.eventChance >= 0 && rt.eventChance <= 1)) err(w, "eventChance muss zwischen 0 und 1 liegen");
    if (!RATINGS.includes(rt.rating)) err(w, "Bewertung muss hostile, mixed oder neutral sein");
    if (!rt.layout) err(w, "layout fehlt");
    if (rt.deadEnd !== undefined && !["only", "never", "prefer"].includes(rt.deadEnd)) err(w, "deadEnd muss only, never oder prefer sein");
    (rt.near || []).forEach(n => { if (!data.roomTypes[n]) err(w, "unbekannter Nachbar-Raumtyp " + n); });
    if (!Array.isArray(rt.events)) { err(w, "events fehlt"); continue; }
    const tables = Object.entries(rt.themeEvents || {});
    tables.forEach(([th]) => { if (!(data.themes || []).some(t => t.id === th)) err(w, "themeEvents für unbekanntes Thema " + th); });
    if (rt.eventChance > 0 && !rt.events.length && !tables.length) err(w, "Event-Chance ohne Events");
    for (const e of rt.events.concat(...tables.map(([, l]) => l))) {
      if (!data.events[e.id]) err(w, "unbekanntes Event " + e.id);
      if (!(e.weight > 0)) err(w, "Gewicht von " + e.id + " muss größer als 0 sein");
      checkCond(w, e.condition);
      if (rt.rating === "mixed" && !["hostile", "neutral"].includes(e.rating)) err(w, e.id + " braucht die Markierung hostile oder neutral");
      if (e.hostile !== undefined && typeof e.hostile !== "boolean") err(w, e.id + ": hostile muss true oder false sein");
      if (typeof e.hostile === "boolean" && e.rating && (e.rating === "hostile") !== e.hostile) err(w, e.id + ": hostile und rating widersprechen sich");
    }
    if (rt.rating === "mixed" && !["hostile", "neutral"].every(r => rt.events.some(e => e.rating === r))) {
      err(w, "gemischter Raumtyp braucht feindliche und harmlose Events");
    }
  }

  for (const th of data.themes || []) {
    const w = "Thema " + th.id;
    if (!th.name) err(w, "Name fehlt");
    if (!(Number.isInteger(th.stage) && th.stage >= 1 && th.stage < MAX_ITEM_STAGE)) err(w, "Stufe muss zwischen 1 und 5 liegen");
    if (!Number.isInteger(th.dcBonus)) err(w, "dcBonus fehlt");
    [th.startNeighbor].concat(th.roomTypes || []).forEach(t => { if (!data.roomTypes[t]) err(w, "unbekannter Raumtyp " + t); });
    [th.boss].concat(th.endlessBosses || []).concat(th.monsters || []).forEach(m => { if (!data.monsters[m]) err(w, "unbekanntes Monster " + m); });
    Object.entries(th.overrides || {}).forEach(([t, o]) => {
      if (!(th.roomTypes || []).includes(t)) err(w, "Ausnahme für " + t + ", das nicht zum Thema gehört");
      Object.keys(o).forEach(k => { if (!["max", "deadEnd", "nextToStart", "near", "crossroads"].includes(k)) err(w, "unbekannte Regel " + k + " bei " + t); });
    });
  }

  // Eigene Todessätze pro Event (texts.json: death.events)
  Object.entries(((data.texts || {}).death || {}).events || {}).forEach(([id, t]) => {
    if (!data.events[id]) err("Todessatz " + id, "unbekanntes Event");
    if (typeof t !== "string" || !t) err("Todessatz " + id, "Text fehlt");
  });

  for (const m of Object.values(data.monsters)) {
    const w = "Monster " + m.id;
    if (!m.name) err(w, "Name fehlt");
    ["hp", "armor", "attack"].forEach(k => { if (typeof m[k] !== "number") err(w, k + " fehlt"); });
    if (!isDice(m.damage)) err(w, "Schaden ist kein Würfel");
    if (!m.deathText) err(w, "deathText fehlt");
    // Ohne Boss-Events im Thema zeigt das Spiel vor dem Kampf den intro-Text
    const hasEvents = (data.themes || []).some(t => t.boss === m.id && ((data.roomTypes.boss || {}).themeEvents || {})[t.id]);
    if (m.boss && !m.intro && !hasEvents) err(w, "Boss braucht einen intro-Text oder Boss-Events im Thema");
  }

  for (const it of Object.values(data.items)) {
    const w = "Gegenstand " + it.id;
    if (!it.name) err(w, "Name fehlt");
    checkReq(w, it.req);
    if (!(Number.isInteger(it.rang) && it.rang >= 1 && it.rang <= MAX_ITEM_STAGE)) err(w, "Rang muss zwischen 1 und 6 liegen");
    if (!(Number.isInteger(it.preis) && it.preis > 0)) err(w, "preis (Kaufpreis) fehlt");
    if (it.type === "weapon") {
      if (!isDice(it.damage)) err(w, "Schaden ist kein Würfel");
      if (!ATTRS.includes(it.hit)) err(w, "hit muss kraft, geschick oder verstand sein");
    } else if (it.type === "armor") {
      if (!(Number.isInteger(it.armor) && it.armor >= 0)) err(w, "armor braucht eine Zahl ab 0");
    } else if (it.type === "consumable") {
      const u = Object.entries(it.use || {});
      if (u.length !== 1 || !["heal", "damage", "shield", "freeze"].includes(u[0][0])) err(w, "use braucht genau heal, damage, shield oder freeze");
      else if (u[0][0] === "freeze" && !(Number.isInteger(u[0][1]) && u[0][1] > 0)) err(w, "freeze braucht eine positive Rundenzahl");
      else if (!isDice(u[0][1])) err(w, "use braucht Zahl oder Würfel");
      if (u.length && u[0][0] !== "heal" && !it.combatOnly) err(w, "damage, shield und freeze gehen nur im Kampf (combatOnly)");
    } else err(w, "unbekannter Typ " + it.type);
  }
  // Rang 1 bis 5 braucht Ausrüstung; Rang 6 füllt das Content-Projekt (GDD 2.0)
  for (let r = 1; r < MAX_ITEM_STAGE; r++) {
    if (!Object.values(data.items).some(i => i.rang === r && i.type !== "consumable")) err("Rang " + r, "keine Ausrüstung mit diesem Rang");
  }

  for (const c of Object.values(data.characters)) {
    const w = "Volk " + c.id;
    if (!c.name) err(w, "Name fehlt");
    ATTRS.forEach(a => { if (!(Number.isInteger(c.attrs && c.attrs[a]) && c.attrs[a] >= ATTR_MIN && c.attrs[a] <= START_ATTR_MAX)) err(w, "Startwert " + a + " fehlt oder liegt außerhalb −1 bis +2"); });
    if (!(c.hp > 0)) err(w, "Lebenspunkte fehlen");
    if (!(Number.isInteger(c.levelHp) && c.levelHp > 0)) err(w, "levelHp (Lebenspunkte je Stufe) fehlt");
    if (!c.ability || !ATTRS.includes(c.ability.attr) || !c.ability.name) err(w, "Fähigkeit unvollständig");
    const s = c.start || {};
    [["weapon", "weapon"], ["armor", "armor"]].forEach(([slot, type]) => {
      if (!s[slot]) return;
      const it = data.items[s[slot]];
      if (!it || it.type !== type) err(w, "Start-" + slot + " " + s[slot] + " passt nicht");
      else if (!Object.entries(it.req || {}).every(([a, v]) => (a === "volk" ? c.id === v : c.attrs[a] >= v))) err(w, "erfüllt die Anforderung von " + it.id + " nicht");
    });
    if (!Array.isArray(s.pack) || s.pack.length > 6) err(w, "Start-Rucksack fehlt oder hat mehr als 6 Plätze");
    else s.pack.forEach(id => { if (!data.items[id]) err(w, "unbekannter Gegenstand " + id); });
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
      else if ((type === "loot" || type === "item") && !LOOT[v]) err(w, "unbekannte Beutestufe " + v);
      else if (type === "gold" && !isDice(v)) err(w, "gold braucht Zahl oder Würfel");
      else if (type === "loseGold" && !(Number.isInteger(v) && v > 0)) err(w, "loseGold braucht eine positive Zahl");
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
    if (!ev.options.some(o => !o.condition)) err(w, "braucht mindestens eine Option ohne Bedingung");
    ev.options.forEach((o, i) => {
      const wo = w + ", Option " + (i + 1);
      if (!o.label) err(wo, "Beschriftung fehlt");
      checkCond(wo, o.condition);
      if (o.check) {
        if (!CATEGORIES[o.check.category]) err(wo, "unbekannte Kategorie " + o.check.category);
        if (o.check.attr !== undefined) err(wo, "Proben nennen die Kategorie, nicht das Attribut");
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
