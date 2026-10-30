// Inszenierung der Event-Figuren (docs/GDD.md, „Inszenierung der Figuren“): welche Figuren ein Event zeigt, an
// welchem Anker sie stehen, wohin sie blicken und welche Animation sie zeigen. Daten in data/staging.json, getrennt von
// den Events; Spielregeln, Texte und Ergebnisse bleiben in data/events.json. Rein logisch, testbar.
import { isFigure } from "./figurePlan.js";

// Gegner, wenn das Event keine Anzahl nennt: 1 bis 3 nach Raum-Seed (alle laufen zum Spieler, der Kampf geht gegen einen)
export const UNKNOWN_COUNT = [1, 3];
// Animationen, die ein Anker verlangen darf (Namen im Spiel, data/models.json ordnet sie pro Modell zu)
export const POSES = ["idle", "sit", "sit_floor", "lie", "awaken"];
// Requisiten, die der Code selbst setzt (nicht in der Einrichtung als Daten)
export const CODE_PROPS = ["treppe_runter", "truhe", "lagerfeuer", "haendlerfigur"];

// Erster Gegner, den ein Event im Kampf zeigt (Effekt combat irgendwo in den Optionen), sonst null
export function combatMonsterOf(ev) {
  let found = null;
  (function walk(o) {
    if (found || !o || typeof o !== "object") return;
    if (Array.isArray(o)) { o.forEach(walk); return; }
    if (typeof o.combat === "string") { found = o.combat; return; }
    Object.values(o).forEach(walk);
  })(ev && ev.options);
  return found;
}

// Kleiner Hash, damit Anzahl und Variante zum Raum passen und beim Wiederbetreten gleich bleiben
function hash(seed, text) {
  let h = seed >>> 0;
  for (const c of String(text)) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return h;
}

/**
 * Figurenliste eines Events für planFigures.
 * Reihenfolge: eigene Inszenierung in staging.events, sonst das Feld figures des Events, sonst der Gegner aus dem
 * Kampf (Anzahl 1 bis 3 nach Seed). Jede Figur bekommt Modell-Variante (variant) und stays aus staging.figures.
 * Ergebnis: [{ figure, count, place, anchor, variant, stay }]
 */
export function eventFigures(ev, staging, seed) {
  const st = staging || {};
  const own = (st.events || {})[ev.id];
  let list;
  if (own) list = own.figures.map(f => Object.assign({}, f));
  else if (ev.figures) list = ev.figures.map(f => ({ figure: f.figure, count: f.count, place: f.place, stay: f.stay }));
  else {
    const m = combatMonsterOf(ev);
    if (!m) return [];
    const [lo, hi] = (st.defaults && st.defaults.countUnknown) || UNKNOWN_COUNT;
    list = [{ figure: m, count: lo + hash(seed, ev.id) % (hi - lo + 1) }];
  }
  // Mehrere gleiche Figuren ohne feste Variante bekommen je eine eigene Variante, außer die Figur hat eine Standard-Variante
  // (Skelett: immer Minion)
  const out = [];
  list.forEach((f, i) => {
    const d = (st.figures || {})[f.figure] || {};
    if (!f.variant && !d.default && d.variants && d.variants.length && (f.count || 1) > 1) {
      for (let k = 0; k < f.count; k++) out.push(withFigureDefaults(Object.assign({}, f, { count: 1 }), st, hash(seed, ev.id + i + ":" + k)));
    } else out.push(withFigureDefaults(f, st, hash(seed, ev.id + i)));
  });
  return out;
}

// Figuren ohne Event (Testmodus ?fight=, Bossraum ohne Event-Tabelle): der Gegner allein
export function fightFigures(monsterId, staging, seed) {
  return [withFigureDefaults({ figure: monsterId, count: 1 }, staging || {}, hash(seed, monsterId))];
}

function withFigureDefaults(f, st, h) {
  const d = (st.figures || {})[f.figure] || {};
  const out = Object.assign({}, f);
  if (!out.variant && d.default) out.variant = d.default;
  else if (!out.variant && d.variants && d.variants.length) out.variant = d.variants[h % d.variants.length];
  if (out.stay === undefined) out.stay = !!d.stays;
  return out;
}

/**
 * Datenprüfung von data/staging.json.
 * data: Spieldaten (events, monsters), props: alle Requisiten-ids, err(where, text)
 */
export function checkStaging(staging, data, props, err) {
  const w = "staging";
  const anchors = staging.anchors || {};
  for (const [id, a] of Object.entries(anchors)) {
    if (!Array.isArray(a.props) || !a.props.length) err(w, "Anker " + id + ": props fehlt");
    else a.props.forEach(p => { if (!props.includes(p)) err(w, "Anker " + id + ": unbekannte Requisite " + p); });
    if (a.animation !== undefined && !POSES.includes(a.animation)) err(w, "Anker " + id + ": unbekannte Animation " + a.animation);
    if (a.offset !== undefined && !(Array.isArray(a.offset) && a.offset.length === 3 && a.offset.every(Number.isFinite))) err(w, "Anker " + id + ": offset muss [x, y, z] sein");
    if (a.flat !== undefined && typeof a.flat !== "boolean") err(w, "Anker " + id + ": flat muss true oder false sein");
    if (a.face !== undefined && !["player", "target", "prop", "random", "forward"].includes(a.face)) err(w, "Anker " + id + ": unbekannte Blickrichtung " + a.face);
  }
  for (const [id, f] of Object.entries(staging.figures || {})) {
    if (!isFigure(id, data.monsters) && !props.includes(id)) err(w, "unbekannte Figur " + id);
    if (f.variants !== undefined && !Array.isArray(f.variants)) err(w, id + ": variants muss eine Liste sein");
    if (f.default !== undefined && !(f.variants || []).includes(f.default)) err(w, id + ": Standard-Variante " + f.default + " fehlt in variants");
    if (f.steps !== undefined && typeof f.steps !== "string") err(w, id + ": steps muss ein Name sein (Sound schritt_<steps>)");
  }
  for (const [id, e] of Object.entries(staging.events || {})) {
    if (e.procession !== undefined && typeof e.procession !== "boolean") err(w, id + ": procession muss true oder false sein");
  }
  for (const [id, e] of Object.entries(staging.events || {})) {
    if (!data.events[id]) { err(w, "unbekanntes Event " + id); continue; }
    if (!Array.isArray(e.figures) || !e.figures.length) { err(w, id + ": figures muss eine Liste sein"); continue; }
    e.figures.forEach(f => {
      if (!isFigure(f.figure, data.monsters)) err(w, id + ": unbekannte Figur " + f.figure);
      if (f.anchor !== undefined && !anchors[f.anchor]) err(w, id + ": unbekannter Anker " + f.anchor);
      if (f.count !== undefined && !(Number.isInteger(f.count) && f.count > 0)) err(w, id + ": count muss eine positive Zahl sein");
      if (f.stay !== undefined && typeof f.stay !== "boolean") err(w, id + ": stay muss true oder false sein");
      const vs = ((staging.figures || {})[f.figure] || {}).variants;
      if (f.variant !== undefined && !(vs || []).includes(f.variant)) err(w, id + ": unbekannte Variante " + f.variant);
    });
  }
}

