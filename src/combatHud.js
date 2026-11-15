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
const v = new THREE.Vector3();
const now = () => performance.now() / 1000;
const HEAD = 0.2;  // Abstand über dem Kopf (Kacheln)
let frozen = null;     // angehaltene Werte, solange ein Würfel rollt: { p, m }

/**
 * Während ein Schadens- oder Heilwurf rollt, zeigt die Anzeige die Lebenspunkte von vorher; mit holdHp(false) springt
 * sie auf die neuen Werte, gleichzeitig mit der Zahl über der Figur (docs/GDD.md, Würfelanzeige, Ablauf).
 */
export function holdHp(on) {
  const c = state.combat, p = state.player;
  frozen = on && c && p ? { p: p.hp, m: c.monster.hp } : null;
}

// Höhe des Modells über seinem Fußpunkt (auch für große Figuren wie die Monsterratte): der höchste sichtbare Punkt in der
// aktuellen Haltung. Bei Figuren mit Skelett zählen die verformten Punkte, nicht der Rahmen der Ausgangsform (der liegt bei
// Goblin, Ork und Golems deutlich daneben). Festgeschrieben wird die Höhe erst, wenn die Figur fertig aufgeploppt ist und
// in der Standhaltung steht (nicht beim Aufstehen, Anlaufen oder Angreifen); bis dahin wird jedes Bild neu gemessen.
function measureTop(obj) {
  obj.updateWorldMatrix(true, true);
  obj.getWorldPosition(v);
  const baseY = v.y;
  let top = -Infinity;
  obj.traverse(n => {
    if (!n.isMesh || !n.geometry || !n.geometry.attributes.position) return;
    for (let p = n; p && p !== obj; p = p.parent) if (!p.visible) return;
    const pos = n.geometry.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i);
      if (n.isSkinnedMesh) n.boneTransform(i, v);
      v.applyMatrix4(n.matrixWorld);
      if (v.y > top) top = v.y;
    }
  });
  return top === -Infinity ? null : top - baseY;
}

const SETTLE = 0.5;  // so lange muss die Figur in der Standhaltung stehen (Überblendung aus dem Anlaufen ist dann vorbei)
function heightOf(obj) {
  let h = heights.get(obj);
  if (!h) { h = { value: 1, since: null, fixed: false }; heights.set(obj, h); }
  if (h.fixed || obj.scale.y < 0.99) return h.value;  // ploppt die Figur gerade auf, gilt vorläufig der alte Wert
  const top = measureTop(obj);
  if (top === null) return h.value;
  h.value = Math.max(0.3, top);
  let model = null;
  obj.traverse(n => { if (!model && n.userData.standing) model = n; });
  // Figuren ohne Animation (Platzhalter) stehen immer
  if (model && !model.userData.standing()) h.since = null;
  else if (h.since === null) h.since = now();
  else if (now() - h.since >= SETTLE) h.fixed = true;
  return h.value;
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
  if (!c) frozen = null;
  const php = frozen ? frozen.p : p && p.hp, mhp = frozen ? frozen.m : c && c.monster.hp;
  if (c && p && php > 0) {
    playerLabel.textContent = hpText(php, p.maxHp);
    place(playerLabel, player, 0);
  } else playerLabel.hidden = true;
  const enemy = c && mhp > 0 ? combatFigureObject() : null;
  if (enemy) {
    lastEnemy = enemy;
    enemyLabel.textContent = hpText(mhp, c.monster.maxHp);
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
