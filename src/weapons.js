// Waffen an den Spielfiguren und Schriftrollen beim Benutzen (docs/GDD.md, Asset-Spezifikation): welche Datei die Figur
// gerade in der Hand hält. Rein logisch, ohne Three.js; die Daten stehen in data/models.json (weapons, scrolls).

/**
 * Schlüssel des Modells in der Hand: null ohne Waffe (leere Hand, Klang faust), sonst die Gegenstands-id; mit dem Zusatz
 * ":kampf", wenn die Waffe im Kampf eine andere Datei zeigt (Buch des Feuers offen). Ändert sich der Schlüssel, tauscht
 * die Figur das Modell.
 */
export function weaponKey(weapons, id, inCombat) {
  if (!id) return null;
  return inCombat && weapons[id] && weapons[id].combatFile ? id + ":kampf" : id;
}

// Datei zum Schlüssel; null ohne Waffe oder ohne Eintrag (dann Grundform als Rückfall)
export function weaponFile(weapons, key) {
  if (!key) return null;
  const [id, mode] = key.split(":");
  const w = weapons[id];
  if (!w) return null;
  return mode === "kampf" && w.combatFile ? w.combatFile : w.file;
}

// Farbe des Siegelbands einer Schriftrolle; null bei Gegenständen ohne Rolle (etwa Heiltränke)
export const scrollSeal = (scrolls, id) => (scrolls && scrolls.seals && scrolls.seals[id]) || null;

/**
 * Prüfung der Daten: jede Waffe aus data/items.json hat einen Eintrag mit Datei und Größe, jede Schriftrolle mit
 * use-Effekt im Kampf (combatOnly) eine Siegelfarbe. Liefert eine Liste mit Fehlern.
 */
export function checkWeapons(weapons, scrolls, items) {
  const errors = [];
  const hex = (c) => typeof c === "string" && /^#[0-9a-fA-F]{6}$/.test(c);
  items.filter(i => i.type === "weapon").forEach(i => {
    const w = weapons[i.id];
    if (!w) { errors.push(i.id + ": fehlt in weapons (data/models.json)"); return; }
    if (typeof w.file !== "string" || !w.file.startsWith("assets/weapons/")) errors.push(i.id + ": file muss unter assets/weapons/ liegen");
    if (!(w.size > 0)) errors.push(i.id + ": size fehlt");
    if (w.combatFile !== undefined && !String(w.combatFile).startsWith("assets/weapons/")) errors.push(i.id + ": combatFile muss unter assets/weapons/ liegen");
  });
  Object.keys(weapons).forEach(id => { if (!items.some(i => i.id === id && i.type === "weapon")) errors.push(id + ": keine Waffe in data/items.json"); });
  if (!scrolls || !hex(scrolls.paper) || !hex(scrolls.rods)) errors.push("scrolls: paper und rods brauchen eine Farbe #rrggbb");
  Object.entries((scrolls && scrolls.seals) || {}).forEach(([id, c]) => {
    const item = items.find(i => i.id === id);
    if (!item || item.type !== "consumable") errors.push("scrolls: " + id + " ist kein Verbrauchsgegenstand");
    if (!hex(c)) errors.push("scrolls: " + id + " braucht eine Farbe #rrggbb");
  });
  return errors;
}
