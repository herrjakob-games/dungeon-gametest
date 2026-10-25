// Raumtypen mit Anzeigename, Bodenfarbe (HSL) und Fackelfarbe.
// Ab Meilenstein 4 kommen Event-Chance und Event-Tabellen aus data/room-types.json dazu.
export const TYPES = {
  start:  { name: "Die Vorkammer",     floor: { h: 0.07, s: 0.12 }, torch: 0xff9a3c },
  halle:  { name: "Die Säulenhalle",   floor: { h: 0.08, s: 0.06 }, torch: 0xff9a3c },
  gruft:  { name: "Die Gruft",         floor: { h: 0.32, s: 0.06 }, torch: 0x7fdc9a },
  wache:  { name: "Die Wachstube",     floor: { h: 0.05, s: 0.20 }, torch: 0xffb060 },
  vorrat: { name: "Die Vorratskammer", floor: { h: 0.09, s: 0.16 }, torch: 0xff9a3c },
  schatz: { name: "Die Schatzkammer",  floor: { h: 0.11, s: 0.26 }, torch: 0xffc85a },
  exit:   { name: "Der Abstieg",       floor: { h: 0.58, s: 0.08 }, torch: 0x9fd0ff }
};
