// Spielfigur: Volk, Werte, Inventar, Ausrüstung und Stufenaufstieg (docs/GDD.md, Abschnitt Regelwerk).
// Reine Logik ohne Grafik, damit sie in tests/ geprüft werden kann.

export const ATTRS = ["kraft", "geschick", "verstand"];
export const ATTR_NAMES = { kraft: "Kraft", geschick: "Geschick", verstand: "Verstand" };
export const ATTR_MIN = -1;
export const ATTR_MAX = 10;  // Obergrenze, auch beim Stufenaufstieg
export const START_ATTR_MAX = 2; // Startwerte der Völker liegen zwischen −1 und +2
export const VOLK_NAMES = { zwerg: "Zwerg", elf: "Elf", mensch: "Mensch" };
export const PACK_SIZE = 6;        // Rucksackplätze; angelegte Waffe und Rüstung zählen extra

// Erfahrung für Stufe 2 bis 5, danach alle 30 Erfahrung eine weitere Stufe
const THRESHOLDS = [10, 25, 45, 70];
const LATER_STEP = 30;

// Erfahrung, die für die nächste Stufe nach "level" nötig ist
export function xpForLevel(level) {
  if (level - 1 < THRESHOLDS.length) return THRESHOLDS[level - 1];
  return THRESHOLDS[THRESHOLDS.length - 1] + (level - THRESHOLDS.length) * LATER_STEP;
}

// Stufe, die zu einer Erfahrungsmenge gehört
export function levelForXp(xp) {
  let level = 1;
  while (xp >= xpForLevel(level)) level++;
  return level;
}

// Neue Figur aus einem Eintrag von data/characters.json
export function newCharacter(def) {
  return {
    volk: def.id,
    name: def.name,
    hp: def.hp,
    maxHp: def.hp,
    levelHp: def.levelHp,
    xp: 0,
    level: 1,
    gold: 0,
    attrs: Object.assign({}, def.attrs),
    ability: Object.assign({}, def.ability),
    abilityUsed: false,
    weapon: def.start.weapon || null,
    armor: def.start.armor || null,
    pack: def.start.pack.slice()
  };
}

// Erfüllt die Figur das Mindestattribut eines Gegenstands?
// req: Mindestattribute und optional "volk" (zwerg, elf, mensch)
export const meetsReq = (player, item) =>
  Object.entries(item.req || {}).every(([a, v]) => (a === "volk" ? player.volk === v : player.attrs[a] >= v));

export const reqText = (item) =>
  Object.entries(item.req || {}).map(([a, v]) => (a === "volk" ? "Volk " + VOLK_NAMES[v]
    : ATTR_NAMES[a] + " " + (v < 0 ? "−" + Math.abs(v) : "+" + v).replace("+0", "0"))).join(", ");

// Angelegte Waffe; ohne Waffe kämpft die Figur mit den Fäusten (1 Schaden, trifft mit Kraft)
export const FISTS = { id: null, name: "Fäuste", type: "weapon", damage: 1, hit: "kraft" };
export const weaponOf = (player, items) => (player.weapon ? items[player.weapon] : FISTS);
export const armorBonusOf = (player, items) => (player.armor ? items[player.armor].armor : 0);

export const hasItem = (player, id) => player.weapon === id || player.armor === id || player.pack.includes(id);

// Gegenstand in den Rucksack legen. Ergebnis: false, wenn der Rucksack voll ist.
export function addItem(player, id) {
  if (player.pack.length >= PACK_SIZE) return false;
  player.pack.push(id);
  return true;
}

export function removeFromPack(player, index) {
  return player.pack.splice(index, 1)[0];
}

/**
 * Waffe oder Rüstung aus dem Rucksack anlegen. Das bisher angelegte Stück wandert in den Rucksack.
 * Ergebnis: null bei Erfolg, sonst ein Grund als Text.
 */
export function equip(player, items, index) {
  const id = player.pack[index];
  const item = items[id];
  if (!item || (item.type !== "weapon" && item.type !== "armor")) return "Das kann man nicht anlegen.";
  if (!meetsReq(player, item)) return "Dafür brauchst du " + reqText(item) + ".";
  const slot = item.type;
  const old = player[slot];
  player[slot] = id;
  if (old) player.pack[index] = old; else player.pack.splice(index, 1);
  return null;
}

// Angelegtes Stück ablegen (in den Rucksack). Ergebnis: false, wenn kein Platz ist.
export function unequip(player, slot) {
  if (!player[slot] || player.pack.length >= PACK_SIZE) return false;
  player.pack.push(player[slot]);
  player[slot] = null;
  return true;
}

// Stufenaufstieg: +1 auf das gewählte Attribut (höchstens +10) und Lebenspunkte je nach Volk.
// Die neuen Lebenspunkte erhöhen das Maximum und heilen um denselben Wert.
export function levelUp(player, attr) {
  player.level += 1;
  player.maxHp += player.levelHp;
  player.hp = Math.min(player.maxHp, player.hp + player.levelHp);
  if (attr && player.attrs[attr] < ATTR_MAX) player.attrs[attr] += 1;
}

// Attribute, die beim Aufstieg noch steigen können
export const raisableAttrs = (player) => ATTRS.filter(a => player.attrs[a] < ATTR_MAX);

// Steht noch ein Stufenaufstieg aus?
export const pendingLevelUps = (player) => levelForXp(player.xp) - player.level;

// Fähigkeit des Volks: einmal pro Dungeon eine misslungene Probe des Hauptattributs als bestanden werten
export const canUseAbility = (player, attr) => !player.abilityUsed && player.ability.attr === attr;
