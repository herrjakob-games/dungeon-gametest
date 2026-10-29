// Regeln für Sounds (docs/GDD.md, Abschnitt Sound): welche Sound-id wann spielt und Datenprüfung. Rein logisch, testbar.

export const ATTACK_SOUNDS = ["holz", "schwert", "axt", "hammer", "faust", "biss", "kralle"];
export const MOODS = ["cozy", "wet", "spooky", "empty", "kitchen"];
export const FLOORS = ["wood", "hall", "mud", "gravel", "stone"];
export const GAME_SOUNDS = ["tuer", "tuer_verschlossen", "tuer_riegel", "truhe", "gold", "gold_zahlen", "stufe", "treppe", "treffer", "tod"];

// Angriff: angriff_<klang>_treffer oder _fehl; ohne Waffe (oder Waffe ohne Klang) faust
export const attackSound = (klang, hit) => "angriff_" + (klang || "faust") + "_" + (hit ? "treffer" : "fehl");
// Monster ohne Klang bleiben still
export const monsterAttackSound = (monster, hit) => (monster && monster.sound ? attackSound(monster.sound, hit) : null);
// Treffer und Tod einer Figur: eigene Sound-id, sonst die allgemeine
export const hitSounds = (figureId) => ["treffer_" + figureId, "treffer"];
export const deathSounds = (figureId) => ["tod_" + figureId, "tod"];

// Raum-Sound: themeSound des Themas vor sound; ohne beides null (still, auch ohne Schritte)
export function roomSound(roomType, themeId) {
  const t = roomType && roomType.themeSound && roomType.themeSound[themeId];
  const s = t || (roomType && roomType.sound);
  return s && s.mood && s.floor ? s : null;
}

// Schritte einer Figur: eigener Schritt aus data/staging.json (steps), sonst der Boden des Raums
export const stepKind = (figureId, staging, floor) => (floor ? (((staging || {}).figures || {})[figureId] || {}).steps || floor : null);

// Alle Sound-ids, die die Daten nennen, mit Fundstelle
export function referencedSounds(data) {
  const out = [];
  const add = (id, where) => out.push({ id, where });
  Object.values(data.items).forEach(i => {
    if (!i.sound) return;
    if (i.type === "weapon") { add(attackSound(i.sound, true), "items " + i.id); add(attackSound(i.sound, false), "items " + i.id); }
    else add(i.sound, "items " + i.id);
  });
  Object.values(data.monsters).forEach(m => {
    if (m.sound) { add(attackSound(m.sound, true), "monsters " + m.id); add(attackSound(m.sound, false), "monsters " + m.id); }
  });
  Object.values(data.events).forEach(e => { if (e.sound) add(e.sound, "events " + e.id); });
  Object.values(data.roomTypes).forEach(rt => {
    [rt.sound].concat(Object.values(rt.themeSound || {})).filter(Boolean).forEach(s => {
      add("raum_" + s.mood + "_loop", "room-types " + rt.id);
      add("raum_" + s.mood + "_zufall", "room-types " + rt.id);
      add("schritt_" + s.floor, "room-types " + rt.id);
    });
  });
  Object.entries((data.staging || {}).figures || {}).forEach(([id, f]) => { if (f.steps) add("schritt_" + f.steps, "staging " + id); });
  add(attackSound(null, true), "ohne Waffe");
  add(attackSound(null, false), "ohne Waffe");
  GAME_SOUNDS.forEach(id => add(id, "Spielgeräusch"));
  return out;
}

/**
 * Datenprüfung: jede genannte Sound-id existiert in data/sounds.json, Felder haben gültige Werte.
 * err(where, text)
 */
export function checkSounds(data, sounds, err) {
  const w = "sounds";
  for (const [id, d] of Object.entries(sounds)) {
    if (id === "_info") continue;
    if (!Array.isArray(d.files) || !d.files.length || !d.files.every(f => typeof f === "string" && f.endsWith(".mp3"))) err(w, id + ": files muss eine Liste von MP3-Dateien sein");
    if (d.volume !== undefined && !(d.volume >= 0 && d.volume <= 1)) err(w, id + ": volume muss zwischen 0 und 1 liegen");
    ["loopStart", "loopEnd"].forEach(k => { if (d[k] !== undefined && !(d[k] >= 0)) err(w, id + ": " + k + " muss eine Zahl ab 0 sein"); });
  }
  referencedSounds(data).forEach(r => { if (!sounds[r.id]) err(w, r.where + ": Sound-id " + r.id + " fehlt in data/sounds.json"); });
  Object.values(data.roomTypes).forEach(rt => {
    [rt.sound].concat(Object.values(rt.themeSound || {})).filter(Boolean).forEach(s => {
      if (!MOODS.includes(s.mood)) err(w, rt.id + ": unbekannte mood " + s.mood);
      if (!FLOORS.includes(s.floor)) err(w, rt.id + ": unbekannter floor " + s.floor);
    });
  });
}
