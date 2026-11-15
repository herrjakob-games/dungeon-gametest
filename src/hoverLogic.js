// Markierung unter dem Mauszeiger (docs/GDD.md, Stilguide, Lesbarkeit): blassgelber Kreis auf begehbaren Kacheln, sonst
// nichts. Rein logisch: Standardwerte, Pulsieren, wann der Kreis erscheint, Datenprüfung (hoverMarker in data/themes.json).

export const DEFAULT_MARKER = { color: "#F7E08A", opacity: 0.8, size: 0.3, pulseMin: 0.85, pulseSeconds: 1.2 };

export const markerStyle = (theme) => Object.assign({}, DEFAULT_MARKER, (theme && theme.hoverMarker) || {});

/** Größe als Faktor: Sinus zwischen pulseMin und 1,0, eine Runde in pulseSeconds; bei reduzierter Bewegung fest 1,0. */
export function pulseScale(t, style, reduce) {
  if (reduce) return 1;
  const s = (Math.sin((t / style.pulseSeconds) * Math.PI * 2) + 1) / 2;
  return style.pulseMin + (1 - style.pulseMin) * s;
}

/**
 * Erscheint der Kreis? Nur auf einer begehbaren Kachel mit Weg von der Figur (reachable), nicht auf der Kachel der Figur,
 * nicht über anklickbaren Objekten, nicht bei Events, im Kampf oder während der Abblende.
 */
export function showMarker({ tile, player, walkable, reachable, overObject, eventActive, combat, transitioning }) {
  if (!tile || overObject || eventActive || combat || transitioning) return false;
  if (player && tile[0] === player[0] && tile[1] === player[1]) return false;
  return !!walkable && !!reachable;
}

/** Datenprüfung für hoverMarker eines Themas. */
export function checkHoverMarker(themes, err) {
  (themes || []).forEach(t => {
    const m = t.hoverMarker;
    if (m === undefined) return;
    const w = "themes: " + t.id + ".hoverMarker";
    if (!/^#[0-9a-fA-F]{6}$/.test(m.color || "")) err(w, "color muss eine Farbe wie #F7E08A sein");
    const num = (k, lo, hi) => { if (!(typeof m[k] === "number" && m[k] > lo && m[k] <= hi)) err(w, k + " muss zwischen " + lo + " und " + hi + " liegen"); };
    num("opacity", 0, 1); num("size", 0, 1); num("pulseMin", 0, 1); num("pulseSeconds", 0, 10);
  });
}
