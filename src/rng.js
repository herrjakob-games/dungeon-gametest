// Zufallszahlen. Alles, was reproduzierbar sein muss (Dungeon, Raumeinrichtung),
// läuft über einen Seed. Math.random() nur für Würfelwürfe im Spiel.

// Für den Dungeon-Generator
export function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Für die Einrichtung eines Raums: vor dem Aufbau mit setRoomSeed(room.seed) setzen
let seed = 7;
export function setRoomSeed(s) { seed = s; }
export function rnd() { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }
export const pickOne = (arr) => arr[Math.floor(rnd() * arr.length)];
export function shuffled(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Würfel für Proben (W20 usw.)
export const roll = (sides) => 1 + Math.floor(Math.random() * sides);
