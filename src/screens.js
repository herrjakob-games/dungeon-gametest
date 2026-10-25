// Bildschirme über dem Spiel: Volkswahl vor jedem Durchlauf, Endbildschirm nach dem Tod.
import { DATA } from "./data.js";
import { ATTRS, ATTR_NAMES } from "./character.js";
import { signShort } from "./checkUI.js";

const selectEl = document.getElementById("select");
const cardsEl = document.getElementById("selectCards");
const endEl = document.getElementById("endscreen");

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;");

// Volkswahl: eine Karte pro Eintrag in data/characters.json
export function showCharacterSelect(onPick) {
  cardsEl.innerHTML = "";
  Object.values(DATA.characters).forEach((c, idx) => {
    const start = [c.start.weapon, c.start.armor].concat(c.start.pack).filter(Boolean).map(id => DATA.items[id].name);
    const card = document.createElement("article");
    card.className = "card";
    card.innerHTML =
      "<h3>" + esc(c.name) + "</h3>" +
      '<p class="card-text">' + esc(c.text) + "</p>" +
      '<dl class="stats">' +
      ATTRS.map(a => "<dt>" + ATTR_NAMES[a] + "</dt><dd>" + signShort(c.attrs[a]) + "</dd>").join("") +
      "<dt>Lebenspunkte</dt><dd>" + c.hp + "</dd></dl>" +
      '<p><strong>' + esc(c.ability.name) + ":</strong> " + esc(c.ability.text) + "</p>" +
      '<p class="card-start"><strong>Start:</strong> ' + esc(start.join(", ")) + "</p>";
    const b = document.createElement("button");
    b.type = "button";
    b.innerHTML = '<span class="key">' + (idx + 1) + "</span>" + esc(c.name) + " wählen";
    b.addEventListener("click", () => { hide(); onPick(c); });
    card.appendChild(b);
    cardsEl.appendChild(card);
  });
  selectEl.hidden = false;
  const first = cardsEl.querySelector("button");
  if (first) first.focus({ preventScroll: true });
}

function hide() { selectEl.hidden = true; }

export const isScreenOpen = () => !selectEl.hidden || !endEl.hidden;

/**
 * Endbildschirm nach dem Tod: erreichte Ebene, witziger Satz zur Todesursache, Werte.
 * info: { depth, cause, volk, level, gold, rooms }
 */
export function showEndScreen(info, onRestart) {
  document.getElementById("endDepth").textContent = "Ebene " + info.depth;
  document.getElementById("endCause").textContent = info.cause;
  document.getElementById("endStats").innerHTML =
    "<dt>Volk</dt><dd>" + esc(info.volk) + "</dd>" +
    "<dt>Stufe</dt><dd>" + info.level + "</dd>" +
    "<dt>Gold</dt><dd>" + info.gold + "</dd>" +
    "<dt>Räume erkundet</dt><dd>" + info.rooms + "</dd>";
  const b = document.getElementById("endRestart");
  b.onclick = () => { endEl.hidden = true; onRestart(); };
  endEl.hidden = false;
  b.focus({ preventScroll: true });
}

window.addEventListener("keydown", (e) => {
  if (selectEl.hidden) return;
  const b = cardsEl.querySelectorAll("button")[parseInt(e.key, 10) - 1];
  if (b) b.click();
});
