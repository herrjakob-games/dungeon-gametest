// Kamera-Zoom (docs/GDD.md, Bewegung und Erkundung, Kamera): Start ganz herausgezoomt, im Kampf 30 % näher. Rein logisch.
export const ZOOM_MIN = 0.7;     // ganz herausgezoomt, Standard
export const ZOOM_MAX = 2.2;
export const COMBAT_ZOOM = 1.3;  // im Kampf 30 % näher als die gewählte Stufe

export const clampZoom = (z) => Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, z));

// Ziel des Zooms: gewählte Stufe (Mausrad), im Kampf 30 % näher
export const zoomTarget = (base, inCombat) => clampZoom(inCombat ? base * COMBAT_ZOOM : base);

// Weicher Übergang: pro Bild ein Stück näher ans Ziel (etwa 0,3 Sekunden)
export function easeZoom(current, target, dt) {
  const k = 1 - Math.exp(-dt * 10);
  const next = current + (target - current) * k;
  return Math.abs(next - target) < 0.001 ? target : next;
}
