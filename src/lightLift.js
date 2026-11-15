// Mindesthelligkeit für Figuren und Requisiten (docs/GDD.md, Licht): Eigenleuchten aus der eigenen Textur, damit sie im
// Schatten nie schwarz wirken. Rein logisch: welche Stufe ein Modell bekommt, Standardwerte und Datenprüfung.
// Boden, Wände, Sockel, Türrahmen (assets/tiles/) und die flache Bodendeko bleiben ohne; ebenso die Treppen, die zum Loch
// hin in die Schattenfarbe verlaufen.

export const DEFAULT_LIFT = { figureLift: 0.45, propLift: 0.22 };
// Bodendeko laut GDD flach und dunkel (Sack, Moos, Pfütze, Geröll) und Treppen (Verlauf zur Schattenfarbe)
export const NO_LIFT = ["moos", "pfuetze", "geroell", "treppe_hoch", "treppe_runter"];

/** Stufen im Thema: globale Werte (data/models.json, lift) überschrieben durch figureLift/propLift des Themas. */
export function liftLevels(global, theme) {
  const g = Object.assign({}, DEFAULT_LIFT, global || {});
  const t = theme || {};
  return { figure: t.figureLift !== undefined ? t.figureLift : g.figureLift, prop: t.propLift !== undefined ? t.propLift : g.propLift };
}

/** Stufe für ein Teil: id des Requisits oder der Figur, Datei des Modells (oder "assets/props/" für Grundformen). */
export function liftFor(id, file, levels) {
  if (NO_LIFT.includes(id)) return 0;
  if (!file) return 0;
  if (file.startsWith("assets/figures/") || file.startsWith("assets/weapons/")) return levels.figure;
  if (file.startsWith("assets/props/")) return levels.prop;
  return 0; // assets/tiles/, assets/ui/ und alles andere
}

/** Datenprüfung: figureLift und propLift zwischen 0 und 1 (global und pro Thema). */
export function checkLift(global, themes, err) {
  const ok = (v) => v === undefined || (typeof v === "number" && v >= 0 && v <= 1);
  ["figureLift", "propLift"].forEach(k => {
    if (!global || !ok(global[k]) || global[k] === undefined) err("models", "lift." + k + " muss eine Zahl zwischen 0 und 1 sein");
    (themes || []).forEach(t => { if (!ok(t[k])) err("themes", t.id + ": " + k + " muss eine Zahl zwischen 0 und 1 sein"); });
  });
}
