// Einstiegspunkt: Spielablauf, Raumwechsel, Eingabe und Spielschleife.
import { N, MID, DIR, key, inBounds, reduceMotion } from "./config.js";
import { generate } from "./generator.js";
import { state, walkable } from "./state.js";
import { renderer, scene, camera, zoomBy } from "./scene.js";
import { buildRoom, douseCampfire } from "./roomBuilder.js";
import { placePlayer, setFigure } from "./player.js";
import { hoverMesh, showHoverTile } from "./markers.js";
import { moveTo, stopMoving, approachTile, updateMovement } from "./movement.js";
import { closeDialog, isDialogOpen, isDialogModal, showDialog } from "./dialog.js";
import { initEvents, startRoomEvent, chestEvent, exitEvent, lockedDoorNote, startBoss, restEvent } from "./events.js";
import { openShop } from "./shopUI.js";
import { themeFor } from "./world.js";
import { loadData, DATA } from "./data.js";
import { newRun } from "./eventLogic.js";
import { newCharacter } from "./character.js";
import { renderInventory } from "./inventory.js";
import { showCharacterSelect, showEndScreen, isScreenOpen } from "./screens.js";
import { TYPES } from "./roomTypes.js";
import { ui, minimap, updateHud, drawMinimap, mapRoomAt, setHover } from "./hud.js";
const THREE = window.THREE;

const fade = document.getElementById("fade");

// ---------- Übergänge ----------
function withFade(fn) {
  state.transitioning = true;
  closeDialog();
  stopMoving();
  const wait = reduceMotion ? 0 : 300;
  fade.style.opacity = "1";
  setTimeout(() => {
    fn();
    hoverMesh.visible = false;
    updateHud();
    fade.style.opacity = "0";
    setTimeout(() => { state.transitioning = false; }, wait);
  }, wait);
}

// Neuer Dungeon auf der aktuellen Ebene. quiet: ohne Begrüßungs-Event (Hintergrund der Volkswahl)
function startDungeon(dSeed, quiet) {
  state.dungeon = generate(dSeed, state.depth, { themes: DATA.themes, roomTypes: DATA.roomTypes });
  state.theme = themeFor(DATA.themes, state.depth);
  state.current = state.dungeon.start;
  state.visited = new Set([state.current]);
  state.roomState = {};
  state.run = newRun();
  state.backDoor = null;
  state.eventActive = false;
  state.combat = null;
  if (state.player) state.player.abilityUsed = false; // Fähigkeit gilt einmal pro Dungeon
  buildRoom(state.current);
  placePlayer([MID, MID], 0);
  ui.seedInput.value = dSeed;
  if (!quiet) { state.stats.rooms += 1; startRoomEvent(); } // Begrüßungs-Event im Startraum
}

// Neuer Durchlauf: Volk wählen, dann Ebene 1
function chooseCharacter() {
  showCharacterSelect((def) => {
    state.player = newCharacter(def);
    state.depth = 1;
    state.stats = { rooms: 0 };
    setFigure(def.model);
    renderInventory();
    withFade(() => startDungeon(randomSeed()));
  });
}

// Abstieg: eine Ebene tiefer, Werte und Ausrüstung bleiben
function descend() {
  state.depth += 1;
  withFade(() => startDungeon(randomSeed()));
}

initEvents({
  // Tod: Endbildschirm mit Ebene und Todesursache, danach Volkswahl (Permadeath)
  onDeath: (cause) => {
    const p = state.player;
    showEndScreen({ depth: state.depth, cause, volk: p.name, level: p.level, gold: p.gold, rooms: state.stats.rooms }, chooseCharacter);
  },
  // Flucht: zurück durch die Tür, durch die der Raum betreten wurde
  onRetreat: () => { if (state.backDoor) changeRoom(state.backDoor, true); },
  // Boss besiegt: Raum neu aufbauen, damit der Torbogen erscheint
  onBossDefeated: () => { buildRoom(state.current); updateHud(); },
  onRested: () => douseCampfire()
});

const randomSeed = () => 1 + Math.floor(Math.random() * 999998);

// Durch eine Tür in den Nachbarraum; Ankunft an der gegenüberliegenden Tür.
// force: auch durch eine verschlossene Tür (Flucht aus dem Kampf)
function changeRoom(d, force) {
  if (state.transitioning) return;
  const r = state.dungeon.rooms[state.current];
  const target = key(r.x + DIR[d].dx, r.z + DIR[d].dz);
  if (!state.dungeon.rooms[target]) return;
  const locked = state.roomState[state.current].locked;
  if (!force && locked && locked.has(d)) { lockedDoorNote(d); return; }
  withFade(() => {
    const first = !state.visited.has(target);
    if (first) state.stats.rooms += 1;
    state.current = target;
    state.backDoor = DIR[d].opp;
    state.visited.add(target);
    buildRoom(target);
    placePlayer(DIR[DIR[d].opp].approach, Math.atan2(DIR[d].dx, DIR[d].dz));
    enterRoom(first);
  });
}

// ---------- Schnellreise über die Minimap (Regeln siehe docs/GDD.md, Abschnitt Bewegung) ----------
function nearestFreeToCenter() {
  let best = null, bd = Infinity;
  for (let z = 0; z < N; z++) for (let x = 0; x < N; x++) {
    if (!walkable(x, z)) continue;
    const d = Math.hypot(x - MID, z - MID);
    if (d < bd) { bd = d; best = [x, z]; }
  }
  return best;
}

// Nach dem Betreten: Der Boss wartet bei jedem Betreten, bis er besiegt ist; sonst Events nur beim ersten Betreten
function enterRoom(first) {
  if (state.dungeon.rooms[state.current].type === "boss") startBoss();
  else if (first) startRoomEvent();
}

function travelTo(k) {
  if (state.transitioning || k === state.current || !state.visited.has(k) || isDialogOpen() || isScreenOpen()) return;
  withFade(() => {
    state.current = k;
    state.backDoor = null;
    buildRoom(k);
    placePlayer(nearestFreeToCenter(), 0);
    enterRoom(false);
  });
}

minimap.addEventListener("mousemove", (ev) => {
  const k = mapRoomAt(ev);
  const target = k && k !== state.current && state.visited.has(k);
  minimap.style.cursor = target ? (isDialogOpen() ? "not-allowed" : "pointer") : "default";
  minimap.title = target
    ? (isDialogOpen() ? "Während eines Events gesperrt" : "Reisen nach: " + TYPES[state.dungeon.rooms[k].type].name)
    : "";
});
minimap.addEventListener("click", (ev) => { const k = mapRoomAt(ev); if (k) travelTo(k); });

// ---------- Seed ----------
document.getElementById("seedForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const v = parseInt(ui.seedInput.value, 10);
  if (!(v > 0)) { ui.seedInput.value = state.dungeon.seed; return; }
  withFade(() => startDungeon(v));
});
document.getElementById("newSeed").addEventListener("click", () => withFade(() => startDungeon(randomSeed())));

// ---------- Maus im Spielfeld ----------
const ray = new THREE.Raycaster();
const mouse = new THREE.Vector2();
const ground = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

function pick(ev) {
  const r = renderer.domElement.getBoundingClientRect();
  mouse.x = ((ev.clientX - r.left) / r.width) * 2 - 1;
  mouse.y = -((ev.clientY - r.top) / r.height) * 2 + 1;
  ray.setFromCamera(mouse, camera);
  const hits = ray.intersectObjects(state.interactables, true);
  if (hits.length) {
    let o = hits[0].object;
    while (o && !o.userData.kind) o = o.parent;
    if (o) return { obj: o };
  }
  const p = new THREE.Vector3();
  if (ray.ray.intersectPlane(ground, p)) {
    const x = Math.round(p.x + MID), z = Math.round(p.z + MID);
    if (inBounds(x, z)) return { tile: [x, z] };
  }
  return null;
}

function setHoverObj(o) {
  if (state.hovered === o) return;
  const prev = state.hovered;
  if (prev) prev.userData.hoverMats.forEach(m => { m.emissiveIntensity = m === prev.userData.baseGlow ? 0.25 : 0; });
  state.hovered = o;
  if (o) o.userData.hoverMats.forEach(m => { m.emissiveIntensity = 0.45; });
}

const labelFor = (o) => {
  if (o.userData.kind === "door") {
    const locked = state.roomState[state.current].locked;
    return "Tür nach " + o.userData.name + (locked && locked.has(o.userData.dir) ? " (verschlossen)" : "");
  }
  if (o.userData.kind === "chest") return "Truhe";
  if (o.userData.kind === "campfire") return "Lagerfeuer";
  if (o.userData.kind === "merchant") return "Händler";
  if (o.userData.kind === "boss") return DATA.monsters[state.dungeon.boss].name;
  return "Torbogen";
};

renderer.domElement.addEventListener("pointermove", (ev) => {
  if (state.transitioning) return;
  const h = pick(ev);
  if (h && h.obj) {
    setHoverObj(h.obj);
    hoverMesh.visible = false;
    setHover(labelFor(h.obj));
  } else if (h && h.tile) {
    setHoverObj(null);
    const [x, z] = h.tile;
    showHoverTile(x, z, walkable(x, z));
    setHover("Kachel " + (x + 1) + " / " + (z + 1));
  } else {
    setHoverObj(null);
    hoverMesh.visible = false;
    setHover(null);
  }
});
renderer.domElement.addEventListener("pointerleave", () => { setHoverObj(null); hoverMesh.visible = false; setHover(null); });

let downAt = null;
renderer.domElement.addEventListener("pointerdown", (ev) => { downAt = [ev.clientX, ev.clientY]; });
renderer.domElement.addEventListener("pointerup", (ev) => {
  if (state.transitioning) return;
  if (!downAt || Math.hypot(ev.clientX - downAt[0], ev.clientY - downAt[1]) > 6) return;
  downAt = null;
  if (isDialogModal()) return; // laufendes Event: erst eine Option wählen
  if (isDialogOpen()) closeDialog();
  const h = pick(ev);
  if (!h) return;
  const kind = h.obj && h.obj.userData.kind;
  if (kind === "door") {
    const [ax, az] = h.obj.userData.approach;
    const d = h.obj.userData.dir;
    moveTo(ax, az, () => changeRoom(d));
  } else if (kind === "campfire") {
    approachTile(h.obj.userData.tile, restEvent);
  } else if (kind === "merchant") {
    approachTile(h.obj.userData.tile, () => openShop());
  } else if (kind === "boss") {
    approachTile(h.obj.userData.tile, startBoss);
  } else if (kind === "chest") {
    approachTile(h.obj.userData.tile, chestEvent);
  } else if (kind === "exit") {
    approachTile(h.obj.userData.tile, () => exitEvent(descend));
  } else if (h.tile && walkable(h.tile[0], h.tile[1])) {
    moveTo(h.tile[0], h.tile[1]);
  }
});

renderer.domElement.addEventListener("wheel", (ev) => { ev.preventDefault(); zoomBy(ev.deltaY); }, { passive: false });

// ---------- Start ----------
// Spieldaten aus data/ laden, dann den ersten Dungeon bauen
try {
  await loadData();
} catch (e) {
  console.error(e);
  showDialog("Daten fehlen", "Die Spieldaten aus dem Ordner data/ konnten nicht geladen werden. Läuft das Spiel über einen Server (npm start)?", [], { modal: true });
  throw e;
}
// Im Hintergrund steht schon ein Dungeon, davor die Volkswahl
state.player = newCharacter(Object.values(DATA.characters)[0]);
startDungeon(randomSeed(), true);
updateHud();
renderInventory();
chooseCharacter();
if (document.fonts && document.fonts.ready) document.fonts.ready.then(drawMinimap);

// ---------- Spielschleife ----------
const clock = new THREE.Clock();
function loop() {
  const dt = Math.min(clock.getDelta(), 0.05);
  const t = clock.elapsedTime;

  updateMovement(dt, t);

  if (state.openLid && state.lidPivot) {
    if (state.lidPivot.rotation.x > -1.9) state.lidPivot.rotation.x -= dt * 4;
    else state.openLid = false;
  }

  if (!reduceMotion) {
    state.torches.forEach(tc => {
      const f = Math.sin(t * 9 + tc.phase) * 0.12 + Math.sin(t * 23 + tc.phase * 2) * 0.08;
      tc.light.intensity = 1.2 + f;
      tc.flame.scale.setScalar(1 + f * 0.8);
      tc.flame.rotation.y = t * 2 + tc.phase;
    });
    state.interactables.forEach(o => {
      if (o.userData.portal) o.userData.portal.material.opacity = 0.45 + Math.sin(t * 2.2) * 0.12;
    });
  }

  renderer.render(scene, camera);
  requestAnimationFrame(loop);
}
loop();
