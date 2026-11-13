// Kellerhandbuch (docs/GDD.md, Interface, Tutorial): nach der Volkswahl und per Klick auf das Lesepult der Vorkammer.
// Das aufgeschlagene Buch ist assets/ui/handbuch.glb (KayKit Adventurers, Spellbook_open, Einband braun, Seiten
// Pergament) in einem eigenen Renderer, von oben gesehen; der Text liegt als HTML auf den beiden Seiten.
// Fehlt das Modell, zeichnet CSS ein schlichtes Buch (Klasse no-model). Tasten: → oder Enter weiter, ← zurück, Esc schließt.
import { DATA } from "./data.js";
import { ATTR_NAMES } from "./character.js";
import { fillText, tutorialVars, spreads } from "./tutorialText.js";
const THREE = window.THREE;

const MODEL = "assets/ui/handbuch.glb";
const el = document.getElementById("book");
const stageEl = document.getElementById("bookStage");
const canvas = document.getElementById("bookCanvas");
const left = document.getElementById("pageLeft");
const right = document.getElementById("pageRight");
const btnSkip = document.getElementById("bookSkip");
const btnBack = document.getElementById("bookBack");
const btnNext = document.getElementById("bookNext");
const nextLabel = document.getElementById("bookNextLabel");
const dots = document.getElementById("bookDots");

let view = null;        // { renderer, scene, cam, box } nach dem Laden des Modells
let loading = null;     // Promise des Ladens (einmal)
let pages = [], index = 0, vars = {}, onClose = null;

export const isBookOpen = () => !el.hidden;

function loadModel() {
  if (loading) return loading;
  loading = new Promise((resolve) => {
    if (!THREE.GLTFLoader) { resolve(null); return; }
    new THREE.GLTFLoader().load(MODEL, (g) => {
      const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.outputEncoding = THREE.sRGBEncoding;
      const scene = new THREE.Scene();
      // Ohne Licht (Grundfarbe der Textur, leicht warm), damit die Seiten gleichmäßig lesbar bleiben
      g.scene.traverse(n => {
        if (n.isMesh) n.material = new THREE.MeshBasicMaterial({ map: n.material.map, color: 0xf2e6d8 });
      });
      scene.add(g.scene);
      const box = new THREE.Box3().setFromObject(g.scene);
      view = { renderer, scene, cam: new THREE.PerspectiveCamera(22, 1, 0.01, 100), box };
      resolve(view);
    }, undefined, () => { console.info("Modell fehlt: " + MODEL + " (Buch aus CSS)"); resolve(null); });
  });
  return loading;
}

// Buch so groß wie möglich zwischen Überschrift und Knöpfen; Seitenflächen aus der Hülle des Modells
function layout() {
  const W = stageEl.clientWidth, H = stageEl.clientHeight;
  const TOP = 120, BOTTOM = 70; // Platz für Überschrift und Knöpfe
  let x0, y0, x1, y1;
  if (view) {
    const { renderer, scene, cam, box } = view;
    renderer.setSize(W, H, false);
    cam.aspect = W / H;
    const size = box.getSize(new THREE.Vector3()), ce = box.getCenter(new THREE.Vector3());
    const t = Math.tan(cam.fov * Math.PI / 360);
    const availH = H - TOP - BOTTOM, availW = W * 0.98;
    // Abstand, bei dem das Buch die verfügbare Höhe bzw. Breite füllt
    const dist = Math.max((size.z * H / availH) / 2 / t, (size.x * W / availW) / 2 / t / cam.aspect) + size.y;
    cam.position.set(ce.x, ce.y + dist, ce.z);
    cam.up.set(0, 0, -1);
    cam.lookAt(ce);
    cam.setViewOffset(W, H, 0, (BOTTOM - TOP) / 2, W, H); // Buch zwischen Überschrift und Knöpfen mittig
    cam.updateProjectionMatrix();
    renderer.render(scene, cam);
    const proj = (x, z) => { const v = new THREE.Vector3(x, box.max.y - 0.02, z).project(cam); return [(v.x + 1) / 2 * W, (1 - v.y) / 2 * H]; };
    [x0, y0] = proj(box.min.x, box.min.z);
    [x1, y1] = proj(box.max.x, box.max.z);
  } else {
    const h = H - TOP - BOTTOM, w = Math.min(W * 0.96, h * 1.45);
    x0 = (W - w) / 2; x1 = x0 + w; y0 = TOP; y1 = TOP + h;
  }
  const bw = x1 - x0, bh = y1 - y0, mid = (x0 + x1) / 2;
  const padX = bw * 0.075, padY = bh * 0.09, gutter = bw * 0.055;
  // Schrift wächst mit dem Buch (bei 800 px Buchbreite 19 px)
  stageEl.style.setProperty("--page-font", Math.max(13, Math.min(20, bw / 42)) + "px");
  stageEl.style.setProperty("--book-x", x0 + "px");
  stageEl.style.setProperty("--book-y", y0 + "px");
  stageEl.style.setProperty("--book-w", bw + "px");
  stageEl.style.setProperty("--book-h", bh + "px");
  Object.assign(left.style, { left: x0 + padX + "px", width: mid - gutter - x0 - padX + "px", top: y0 + padY + "px", height: bh - 2 * padY + "px" });
  Object.assign(right.style, { left: mid + gutter + "px", width: x1 - padX - mid - gutter + "px", top: y0 + padY + "px", height: bh - 2 * padY + "px" });
}

function pageHtml(p, no) {
  if (!p) return "";
  return "<h3>" + fillText(p.title, vars) + '</h3><div class="ornament"></div>' +
    p.text.map(s => "<p>" + fillText(s, vars) + "</p>").join("") +
    (p.sign ? '<p class="sign">' + fillText(p.sign, vars) + "</p>" : "") +
    '<span class="num">' + no + "</span>";
}

function show() {
  const [a, b] = pages[index];
  left.innerHTML = pageHtml(a, index * 2 + 1);
  right.innerHTML = pageHtml(b, index * 2 + 2);
  const last = index === pages.length - 1;
  btnBack.hidden = index === 0;
  nextLabel.textContent = last ? "Ab in den Keller" : "Umblättern";
  dots.textContent = pages.map((_, i) => (i === index ? "◆" : "◇")).join(" ");
}

function close() {
  el.hidden = true;
  const cb = onClose;
  onClose = null;
  if (cb) cb();
}

function next() { if (index < pages.length - 1) { index++; show(); } else close(); }
function back() { if (index > 0) { index--; show(); } }

/**
 * Handbuch für die Figur öffnen; done() läuft beim Schließen (auch beim Überspringen)
 */
export async function openBook(player, done) {
  const t = DATA.texts.tutorial;
  if (!t) { if (done) done(); return; }
  pages = spreads(t.pages);
  index = 0;
  vars = tutorialVars(player, ATTR_NAMES);
  onClose = done || null;
  document.getElementById("bookTitle").textContent = t.title;
  document.getElementById("bookSub").textContent = t.subtitle || "";
  show();
  el.hidden = false;
  await loadModel();
  stageEl.classList.toggle("no-model", !view);
  layout();
  btnNext.focus({ preventScroll: true });
}

btnSkip.addEventListener("click", close);
btnBack.addEventListener("click", back);
btnNext.addEventListener("click", next);
window.addEventListener("resize", () => { if (isBookOpen()) layout(); });
// Eigene Tasten; keine Taste geht weiter an Textfenster und Infokästen (Enter und Leertaste drücken den Knopf im Fokus)
const KEYS = { Escape: close, ArrowRight: next, ArrowLeft: back };
window.addEventListener("keydown", (e) => {
  if (!isBookOpen()) return;
  const fn = KEYS[e.key];
  if (fn) { e.preventDefault(); fn(); }
  e.stopImmediatePropagation();
}, true);
