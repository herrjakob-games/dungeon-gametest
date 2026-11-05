// Lebenspunkte und Zahlen im Kampf (docs/GDD.md, „Inszenierung der Figuren“): über dem Kopf von Spielfigur und Gegner
// die Lebenspunkte (aktuell/maximal), dazu Schaden als rote Minuszahl und Heilung als grüne Pluszahl. Die Anzeige ist
// HTML über der 3D-Szene und unter dem Textfenster (#combatHud in index.html); Farben und Schrift kommen aus denselben
// CSS-Variablen wie im Textfenster (--bad, --good, --body). Die Regeln stehen in combatNumbers.js.
import { state } from "./state.js";
import { camera } from "./scene.js";
import { player } from "./player.js";
import { combatFigureObject } from "./roomFigures.js";
import { hpText, deltaLabel, floatPose, freeSlot, SLOT } from "./combatNumbers.js";
const THREE = window.THREE;

const root = document.getElementById("combatHud");
const label = (cls) => { const e = document.createElement("div"); e.className = "hp-label " + cls; e.hidden = true; root.appendChild(e); return e; };
const playerLabel = label("player");
const enemyLabel = label("enemy");
let numbers = [];      // { el, target: "player" | "enemy", obj, slot, born }
let lastEnemy = null;  // Figur des Gegners, über der zuletzt etwas stand (Zahl beim Sieg, wenn der Kampf schon vorbei ist)
const heights = new WeakMap();
const box = new THREE.Box3(), v = new THREE.Vector3();
const now = () => performance.now() / 1000;
const HEAD = 0.2;  // Abstand über dem Kopf (Kacheln)

// Höhe des Modells über seinem Fußpunkt (einmal pro Figur gemessen, auch für große Figuren wie die Monsterratte)
function heightOf(obj) {
  let h = heights.get(obj);
  if (h) return h;
  obj.updateWorldMatrix(true, true);
  box.setFromObject(obj);
  obj.getWorldPosition(v);
  h = box.isEmpty() ? 1 : Math.max(0.3, box.max.y - v.y);
  heights.set(obj, h);
  return h;
}

// Bildschirmlage (CSS-Pixel) eines Punkts lift Kacheln über dem Kopf der Figur; null hinter der Kamera
function screenAt(obj, lift) {
  obj.getWorldPosition(v);
  v.y += heightOf(obj) + HEAD + lift;
  v.project(camera);
  if (v.z > 1) return null;
  return [(v.x + 1) / 2 * innerWidth, (1 - v.y) / 2 * innerHeight];
}

function place(el, obj, lift) {
  const p = obj && screenAt(obj, lift);
  if (!p) { el.hidden = true; return; }
  el.hidden = false;
  el.style.transform = "translate(" + Math.round(p[0]) + "px," + Math.round(p[1]) + "px) translate(-50%, -100%)";
}

const targetObj = (target) => (target === "player" ? player : combatFigureObject() || lastEnemy);

/**
 * Zahl über einer Figur: target "player" oder "enemy" (der Gegner, der den Treffer zeigt), d = tatsächliche Änderung
 * der Lebenspunkte (negativ = Schaden). 0 zeigt nichts.
 */
export function showDelta(target, d) {
  const lab = deltaLabel(d);
  const obj = targetObj(target);
  if (!lab || !obj) return;
  if (target === "enemy") lastEnemy = obj;
  const t = now();
  const el = document.createElement("div");
  el.className = "hp-number " + lab.kind;
  el.textContent = lab.text;
  root.appendChild(el);
  numbers.push({ el, obj, slot: freeSlot(numbers.filter(n => n.obj === obj), t), born: t });
}

// Pro Frame: Lebenspunkte nur im Kampf; Zahlen laufen auch nach dem Kampfende aus (Sieg, Tod)
export function updateCombatHud() {
  const c = state.combat, p = state.player;
  if (c && p && p.hp > 0) {
    playerLabel.textContent = hpText(p.hp, p.maxHp);
    place(playerLabel, player, 0);
  } else playerLabel.hidden = true;
  const enemy = c && c.monster.hp > 0 ? combatFigureObject() : null;
  if (enemy) {
    lastEnemy = enemy;
    enemyLabel.textContent = hpText(c.monster.hp, c.monster.maxHp);
    place(enemyLabel, enemy, 0);
  } else enemyLabel.hidden = true;
  const t = now();
  numbers = numbers.filter(n => {
    const pose = floatPose(t - n.born);
    if (!pose) { n.el.remove(); return false; }
    // über der Lebenspunkte-Anzeige, weitere Zahlen darüber
    place(n.el, n.obj, 0.28 + n.slot * SLOT + pose.rise);
    n.el.style.opacity = pose.opacity;
    return true;
  });
}
