// Textfenster für Events: Titel, Text, optionaler Würfelwurf, Effektzeilen, Antwortoptionen.
// Optionen lassen sich auch mit den Zahlentasten 1–9 wählen.

const el = document.getElementById("dialog");
const titleEl = document.getElementById("dlgTitle");
const textEl = document.getElementById("dlgText");
const rollEl = document.getElementById("dlgRoll");
const fxEl = document.getElementById("dlgFx");
const optsEl = document.getElementById("dlgOpts");
let modal = false;
let hooks = {}; // Würfelanzeige (diceView.js): pick() bei jeder Auswahl, close() beim Schließen

// Rückrufe der Würfelanzeige anmelden (ohne Import-Kreis)
export function setDialogHooks(h) { hooks = h || {}; }

/**
 * @param {string} title
 * @param {string} text
 * @param {Array<{label:string, pick:()=>void, keepDice?:boolean}>} options (keepDice: die Würfel bleiben liegen)
 * @param {object} [more]
 * @param {string} [more.roll] Ergebnis eines Würfelwurfs, z. B. "W20: 9 + 1 = 10 gegen 12 · Misslungen"
 * @param {string[]} [more.fx] Effektzeilen als HTML, z. B. "−3 LP"
 * @param {boolean} [more.modal] Fenster lässt sich nur über die Optionen schließen
 */
export function showDialog(title, text, options, more = {}) {
  titleEl.textContent = title;
  textEl.textContent = text || "";
  textEl.hidden = !text;
  rollEl.hidden = !more.roll;
  rollEl.innerHTML = more.roll || "";
  const fx = more.fx || [];
  fxEl.hidden = !fx.length;
  fxEl.innerHTML = fx.map(f => "<li>" + f + "</li>").join("");
  modal = !!more.modal;
  optsEl.innerHTML = "";
  options.forEach((o, idx) => {
    const b = document.createElement("button");
    b.type = "button";
    b.id = "opt" + idx;
    b.innerHTML = '<span class="key">' + (idx + 1) + "</span>";
    b.appendChild(document.createTextNode(o.label));
    b.addEventListener("click", () => { if (!o.keepDice && hooks.pick) hooks.pick(); o.pick(); });
    optsEl.appendChild(b);
  });
  el.hidden = false;
  const first = optsEl.querySelector("button");
  if (first) first.focus({ preventScroll: true });
}

export function closeDialog() { el.hidden = true; modal = false; if (hooks.close) hooks.close(); }

// Während eines Würfelwurfs: Das Textfenster bleibt mit Titel, Text und Zeilen stehen, aber ohne Optionen, und lässt
// sich nicht schließen (docs/GDD.md, Würfelanzeige, Ablauf)
export function holdDialog() {
  optsEl.innerHTML = "";
  modal = true;
  el.hidden = false;
}

// Solange das Textfenster offen ist, läuft ein Event (Schnellreise ist dann gesperrt)
export const isDialogOpen = () => !el.hidden;
export const isDialogModal = () => !el.hidden && modal;

window.addEventListener("keydown", (e) => {
  if (el.hidden) return;
  const n = parseInt(e.key, 10);
  if (n >= 1) {
    const b = optsEl.querySelectorAll("button")[n - 1];
    if (b) b.click();
  }
  if (e.key === "Escape" && !modal) closeDialog();
});
