// Themen und Ebenen (docs/GDD.md, Abschnitt Raumtypen und Ebenen). Reine Logik, testbar.
// Ein Thema gilt drei Ebenen lang; das letzte Thema (Ork-Lager) bleibt endlos.

export const LEVELS_PER_THEME = 3;

// Thema einer Ebene aus der Liste in data/themes.json (in der Reihenfolge der Ebenen)
export function themeFor(themes, depth) {
  const i = Math.min(themes.length - 1, Math.floor((depth - 1) / LEVELS_PER_THEME));
  return themes[i];
}

// Ebenengröße: Ebene 1 hat 8 bis 12 Räume, jede weitere 2 mehr, ab Ebene 9 bleibt es bei 24 bis 28
export function levelSize(depth, R) {
  const min = 8 + 2 * (Math.min(depth, 9) - 1);
  return min + Math.floor(R() * 5);
}

// Anteil feindlicher Räume: von 40 % auf Ebene 1 gleichmäßig steigend auf 70 % ab Ebene 13
export const hostileShare = (depth) => 0.4 + 0.3 * (Math.min(depth, 13) - 1) / 12;

// Bossraum am Ende jeder Themenwelt (Ebene 3, 6, 9 …), im endlosen Ork-Lager weiter alle drei Ebenen
export const isBossLevel = (depth) => depth % LEVELS_PER_THEME === 0;

// Rastplatz auf jeder geraden Ebene
export const isRestLevel = (depth) => depth % 2 === 0;

// Boss einer Boss-Ebene: fester Boss des Themas, im endlosen Teil zufällig aus der Liste
export function bossFor(themes, depth, R) {
  const t = themeFor(themes, depth);
  const endless = depth > themes.length * LEVELS_PER_THEME;
  return endless ? t.endlessBosses[Math.floor(R() * t.endlessBosses.length)] : t.boss;
}

// Monster-Wachstum: +1 Lebenspunkt pro Ebene innerhalb des Themas (erste Ebene +0);
// im endlosen letzten Thema wächst es weiter
export function monsterHpBonus(themes, depth) {
  const last = (themes.length - 1) * LEVELS_PER_THEME + 1; // erste Ebene des letzten Themas
  if (depth >= last) return depth - last;
  return (depth - 1) % LEVELS_PER_THEME;
}
