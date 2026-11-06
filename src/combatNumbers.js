// Lebenspunkte und Zahlen im Kampf (docs/GDD.md, „Inszenierung der Figuren“: Lebenspunkte im Kampf, Schadens- und
// Heilzahlen). Rein logisch, testbar; die Anzeige baut combatHud.js.

export const RISE = 0.5;   // so viele Kacheln steigt eine Zahl auf
export const LIFE = 1.0;   // nach so vielen Sekunden ist sie ausgeblendet
export const HOLD = 0.3;   // so lange bleibt sie voll sichtbar, dann blendet sie aus
export const SLOT = 0.32;  // Abstand zweier Zahlen übereinander (Kacheln), damit sie sich nicht überdecken

// Lebenspunkte als Text „aktuell/maximal“, nie unter 0
export const hpText = (hp, max) => Math.max(0, hp) + "/" + max;

/**
 * Tatsächliche Änderung der Lebenspunkte: before und after wie im Spielzustand, auf 0 bis max begrenzt
 * (Schaden unter 0 und Heilung über das Maximum zählen nicht mit). Ergebnis: Zahl (negativ = Schaden).
 */
export function hpDelta(before, after, max) {
  const clamp = (v) => Math.min(max, Math.max(0, v));
  return clamp(after) - clamp(before);
}

// Zahl über der Figur: Schaden rot mit Minus, Heilung grün mit Plus; 0 zeigt nichts (Fehlschlag, Schild, Einfrieren)
export function deltaLabel(d) {
  if (!d) return null;
  return d < 0 ? { text: "−" + (-d), kind: "bad" } : { text: "+" + d, kind: "good" };
}

// Lage einer Zahl nach age Sekunden: Anstieg in Kacheln und Deckkraft; null, wenn sie ausgeblendet ist
export function floatPose(age) {
  if (age >= LIFE) return null;
  const t = Math.max(0, age) / LIFE;
  const rise = RISE * (1 - (1 - t) * (1 - t)); // steigt schnell an und wird langsamer
  const opacity = age <= HOLD ? 1 : Math.max(0, 1 - (age - HOLD) / (LIFE - HOLD));
  return { rise, opacity };
}

/**
 * Platz einer neuen Zahl über derselben Figur: der kleinste Platz (0, 1, 2 …), den keine noch sichtbare Zahl belegt.
 * active: [{ slot, born }] der Zahlen über dieser Figur, now: Zeit in Sekunden.
 */
export function freeSlot(active, now) {
  const used = new Set(active.filter(n => now - n.born < LIFE).map(n => n.slot));
  let s = 0;
  while (used.has(s)) s++;
  return s;
}
