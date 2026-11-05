// Raumtypen mit Anzeigename, Bodenfarbe (HSL), Fackelfarbe, Event-Chance und Event-Tabelle.
// Wird beim Start von src/data.js aus data/room-types.json befüllt.
export const TYPES = {};

// Icons auf der Minimap (docs/GDD.md, Bewegung und Erkundung): mapIcon nennt die Datei assets/ui/karte_<mapIcon>.svg,
// mapIconWhen eine Bedingung. Rein logisch; ob der Raum besucht wurde, prüft die Minimap.
export const MAP_ICON_WHEN = ["bossDefeated"];

// Icon eines Raums oder null. type: Raumtyp, rs: Raumzustand (state.roomState[k])
export function mapIconFor(type, rs) {
  if (!type || !type.mapIcon) return null;
  if (type.mapIconWhen === "bossDefeated" && !(rs && rs.bossDefeated)) return null;
  return type.mapIcon;
}
