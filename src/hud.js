// Infotafel und Minimap.
import { DIR, DIRKEYS, key, tileName } from "./config.js";
import { TYPES, mapIconFor } from "./roomTypes.js";
import { state } from "./state.js";
import { ATTRS, ATTR_NAMES, xpForLevel } from "./character.js";

export const ui = {
  room: document.getElementById("roomName"),
  pos: document.getElementById("pos"),
  hover: document.getElementById("hover"),
  steps: document.getElementById("steps"),
  visited: document.getElementById("visited"),
  gold: document.getElementById("gold"),
  hp: document.getElementById("hp"),
  hero: document.getElementById("hero"),
  depth: document.getElementById("depth"),
  ability: document.getElementById("ability"),
  xp: document.getElementById("xp"),
  attrs: document.getElementById("attrs"),
  seedInput: document.getElementById("seedInput"),
  reveal: document.getElementById("reveal")
};

export const minimap = document.getElementById("minimap");
const mctx = minimap.getContext("2d");
const css = (v) => getComputedStyle(document.documentElement).getPropertyValue(v).trim();
let layout = null; // Lage der Räume auf der Minimap, für Klicks

// Icons der Minimap (docs/GDD.md, „Icons auf der Minimap“): weiße Outlines aus assets/ui/karte_<id>.svg (viewBox -10 -10 20 20).
// Die Pfade werden als Path2D nachgezeichnet, damit die Linie auf dem Bildschirm etwa 1,5 px breit bleibt.
const ICON_SIZE = 0.6;  // Anteil der Raumkachel
const ICON_LINE = 1.5;  // Strichstärke in Bildschirm-Pixeln
const icons = {};       // id → [Path2D] oder null (lädt noch oder fehlt)
function icon(id) {
  if (id in icons) return icons[id];
  icons[id] = null;
  fetch("assets/ui/karte_" + id + ".svg")
    .then(r => { if (!r.ok) throw new Error(r.status); return r.text(); })
    .then(text => {
      const svg = new DOMParser().parseFromString(text, "image/svg+xml");
      const paths = [];
      svg.querySelectorAll("path").forEach(p => paths.push(new Path2D(p.getAttribute("d"))));
      svg.querySelectorAll("rect").forEach(r => {
        const p = new Path2D();
        p.rect(+r.getAttribute("x"), +r.getAttribute("y"), +r.getAttribute("width"), +r.getAttribute("height"));
        paths.push(p);
      });
      icons[id] = paths;
      if (state.dungeon) drawMinimap();
    })
    .catch(() => console.info("Icon fehlt: assets/ui/karte_" + id + ".svg"));
  return null;
}

function drawIcon(paths, cx, cz, size) {
  const px = size * ICON_SIZE;
  const s = px / 20;
  const ratio = minimap.width / (minimap.clientWidth || minimap.width); // Canvas-Pixel pro Bildschirm-Pixel
  mctx.save();
  mctx.translate(cx, cz);
  mctx.scale(s, s);
  mctx.strokeStyle = "#FFFFFF";
  mctx.lineWidth = ICON_LINE * ratio / s;
  mctx.lineCap = "round";
  mctx.lineJoin = "round";
  paths.forEach(p => mctx.stroke(p));
  mctx.restore();
}

export function setSteps(n) { ui.steps.textContent = n ? n + " Kacheln" : "–"; }
export function setHover(text) { ui.hover.textContent = text || "–"; }
export function updatePos() { ui.pos.textContent = "Kachel " + tileName(state.pTile[0], state.pTile[1]); }
const signed = (n) => (n < 0 ? "−" + Math.abs(n) : "+" + n);

// Werte der Figur: Volk, Stufe, Ebene, Lebenspunkte, Erfahrung, Gold, Attribute, Fähigkeit
export function updateStats() {
  const p = state.player;
  if (!p) return;
  ui.hero.textContent = p.name + " · Stufe " + p.level;
  ui.depth.textContent = state.depth + (state.theme ? " · " + state.theme.name : "");
  ui.hp.textContent = p.hp + " / " + p.maxHp;
  ui.hp.classList.toggle("low", p.hp <= 4);
  ui.xp.textContent = p.xp + " / " + xpForLevel(p.level);
  ui.gold.textContent = p.gold;
  ui.attrs.textContent = ATTRS.map(a => ATTR_NAMES[a] + " " + signed(p.attrs[a])).join(" · ");
  ui.ability.textContent = p.ability.name + ": " + (p.abilityUsed ? "in diesem Dungeon verbraucht" : "bereit");
  ui.ability.classList.toggle("used", p.abilityUsed);
}

export function updateHud() {
  ui.room.textContent = TYPES[state.dungeon.rooms[state.current].type].name;
  ui.visited.textContent = state.visited.size + " / " + state.dungeon.count;
  updatePos();
  updateStats();
  drawMinimap();
}

export function drawMinimap() {
  const { dungeon, visited, current } = state;
  const rooms = dungeon.rooms;
  const all = Object.values(rooms);
  const minX = Math.min(...all.map(r => r.x)), maxX = Math.max(...all.map(r => r.x));
  const minZ = Math.min(...all.map(r => r.z)), maxZ = Math.max(...all.map(r => r.z));
  const cols = maxX - minX + 1, rows = maxZ - minZ + 1;
  const W = minimap.width, H = minimap.height;
  const cell = Math.min(Math.floor((W - 8) / cols), Math.floor((H - 8) / rows), 40);
  const size = Math.round(cell * 0.68);
  const ox = (W - cols * cell) / 2, oz = (H - rows * cell) / 2;
  const center = (x, z) => [ox + (x - minX) * cell + cell / 2, oz + (z - minZ) * cell + cell / 2];
  const reveal = ui.reveal.checked;
  layout = { center, size };
  mctx.clearRect(0, 0, W, H);

  // Bekannt: besucht, hinter einer Tür eines besuchten Raums, oder alles im Testmodus
  const known = new Set(visited);
  if (reveal) Object.keys(rooms).forEach(k => known.add(k));
  visited.forEach(k => {
    const r = rooms[k];
    DIRKEYS.forEach(dk => { const d = DIR[dk]; if (r.doors & d.bit) known.add(key(r.x + d.dx, r.z + d.dz)); });
  });

  // Verbindungen
  mctx.lineWidth = Math.max(2, Math.round(cell * 0.1));
  mctx.strokeStyle = css("--line");
  (reveal ? Object.keys(rooms) : Array.from(visited)).forEach(k => {
    const r = rooms[k];
    DIRKEYS.forEach(dk => {
      const d = DIR[dk];
      if (!(r.doors & d.bit)) return;
      const [ax, az] = center(r.x, r.z), [bx, bz] = center(r.x + d.dx, r.z + d.dz);
      mctx.beginPath(); mctx.moveTo(ax, az); mctx.lineTo(bx, bz); mctx.stroke();
    });
  });

  // Räume
  mctx.textAlign = "center";
  mctx.textBaseline = "middle";
  known.forEach(k => {
    const r = rooms[k];
    if (!r) return;
    const [cx, cz] = center(r.x, r.z);
    const rx = cx - size / 2, rz = cz - size / 2;
    const seen = visited.has(k) || reveal;
    if (k === current) {
      mctx.fillStyle = css("--accent");
      mctx.fillRect(rx, rz, size, size);
    } else if (seen) {
      mctx.fillStyle = visited.has(k) ? css("--room") : css("--bg");
      mctx.fillRect(rx, rz, size, size);
      if (!visited.has(k)) {
        mctx.strokeStyle = css("--room");
        mctx.lineWidth = 1.5;
        mctx.strokeRect(rx + 0.75, rz + 0.75, size - 1.5, size - 1.5);
      }
    } else {
      mctx.fillStyle = css("--bg");
      mctx.fillRect(rx, rz, size, size);
      mctx.setLineDash([3, 3]);
      mctx.strokeStyle = css("--muted");
      mctx.lineWidth = 1.5;
      mctx.strokeRect(rx + 0.75, rz + 0.75, size - 1.5, size - 1.5);
      mctx.setLineDash([]);
      mctx.fillStyle = css("--muted");
      mctx.font = "600 " + Math.round(size * 0.5) + "px " + css("--body");
      mctx.fillText("?", cx, cz + 1);
    }
    // Icon nur bei besuchten Räumen; über der Markierung des aktuellen Raums, ohne eigene Klickfläche
    const id = visited.has(k) ? mapIconFor(TYPES[r.type], state.roomState[k]) : null;
    const paths = id && icon(id);
    if (paths) drawIcon(paths, cx, cz, size); // der Bossraum hat vor dem Sieg keine eigene Markierung
  });
}

// Welcher Raum liegt unter dem Mauszeiger auf der Minimap?
export function mapRoomAt(ev) {
  if (!layout) return null;
  const r = minimap.getBoundingClientRect();
  const px = (ev.clientX - r.left) * (minimap.width / r.width);
  const pz = (ev.clientY - r.top) * (minimap.height / r.height);
  for (const k of Object.keys(state.dungeon.rooms)) {
    const room = state.dungeon.rooms[k];
    const [cx, cz] = layout.center(room.x, room.z);
    if (Math.abs(px - cx) <= layout.size / 2 + 2 && Math.abs(pz - cz) <= layout.size / 2 + 2) return k;
  }
  return null;
}

ui.reveal.addEventListener("change", drawMinimap);
