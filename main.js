// main.js — Mirage starter
// One three.js scene, two ways in:
//   1) WebXR immersive-ar  → glasses, headsets, Android Chrome phones
//   2) Camera fallback     → iPhones and everything else
// Anchors come from world.json and are placed at real GPS offsets.

import * as THREE from "three";
import { watchPosition, enuOffset, formatDistance } from "./geo.js";
import { loadWorld, nearbyAnchors } from "./registry.js";
import { buildAsset } from "./assets.js";
import { startCameraFeed, requestMotionPermission, OrientationCamera } from "./mode-camera.js";

const VISIBLE_RADIUS_M = 500;  // how far away anchors appear
const DRAW_CAP_M = 120;        // anchors beyond this are pulled closer so they stay visible

const el = (id) => document.getElementById(id);
const landing = el("landing"), hud = el("hud"), toast = el("toast");

// ---------- Scene ----------
const renderer = new THREE.WebGLRenderer({
  canvas: el("gl"), alpha: true, antialias: true,
});
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(70, innerWidth / innerHeight, 0.05, 2000);
scene.add(new THREE.AmbientLight(0xffffff, 1.2));
const sun = new THREE.DirectionalLight(0xffffff, 1.5);
sun.position.set(1, 3, 1);
scene.add(sun);

addEventListener("resize", () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

// ---------- State ----------
let anchors = [];                 // full registry
let placed = new Map();           // anchor.id -> THREE.Group
let here = null;                  // latest GPS fix
let orientationCam = null;

function showToast(msg, ms = 3500) {
  toast.textContent = msg;
  toast.style.display = "block";
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => (toast.style.display = "none"), ms);
}

// ---------- Anchor placement ----------
function refreshPlacement() {
  if (!here) return;
  const near = nearbyAnchors(anchors, here, VISIBLE_RADIUS_M);

  // Demo fallback: if nothing is nearby, spawn a portal ~20 m north of you
  // so first-time testing always shows something.
  if (near.length === 0 && !placed.has("__demo__")) {
    const demo = {
      id: "__demo__", name: "Welcome portal", type: "portal",
      lat: here.lat + 20 / 111320, lng: here.lng, color: "#3ec6a8",
      note: "Auto-placed 20 m north of you — walk toward it",
      distance: 20,
    };
    near.push(demo);
    anchors.push(demo);
  }

  for (const a of near) {
    let obj = placed.get(a.id);
    if (!obj) {
      obj = buildAsset(a);
      placed.set(a.id, obj);
      scene.add(obj);
    }
    const { east, north } = enuOffset(here, a);
    // Perspective trick: very distant anchors are drawn closer (direction is
    // exact, distance is capped) so they remain visible at readable size.
    const d = Math.hypot(east, north);
    const k = d > DRAW_CAP_M ? DRAW_CAP_M / d : 1;
    obj.position.set(east * k, 0, -north * k);
    const scale = d > DRAW_CAP_M ? 1 + (d / DRAW_CAP_M) * 0.15 : 1;
    obj.scale.setScalar(scale);
  }

  // Remove anchors that moved out of range
  const keep = new Set(near.map((a) => a.id));
  for (const [id, obj] of placed) {
    if (!keep.has(id)) { scene.remove(obj); placed.delete(id); }
  }

  renderHUD(near);
}

function renderHUD(near) {
  const list = el("nearby");
  list.innerHTML = "";
  for (const a of near.slice(0, 4)) {
    const card = document.createElement("div");
    card.className = "anchor-card";
    card.innerHTML =
      `<div>${a.name}${a.note ? `<small>${a.note}</small>` : ""}</div>` +
      `<div class="dist">${formatDistance(a.distance)}</div>`;
    list.appendChild(card);
  }
}

// ---------- GPS ----------
function startGPS() {
  watchPosition(
    (fix) => {
      here = fix;
      el("gps-acc").textContent = `±${Math.round(fix.accuracy)} m`;
      refreshPlacement();
    },
    (err) => showToast(`GPS error: ${err.message}`)
  );
}

// ---------- Render loop ----------
const clock = new THREE.Clock();
function frame() {
  const dt = clock.getDelta(), t = clock.elapsedTime;
  for (const obj of placed.values()) obj.update?.(dt, t);
  if (orientationCam?.headingDeg != null) {
    el("heading").textContent = `${orientationCam.headingDeg}°`;
  }
  renderer.render(scene, camera);
}
renderer.setAnimationLoop(frame);

// ---------- Entry: phone camera mode ----------
el("btn-phone").addEventListener("click", async () => {
  try {
    await requestMotionPermission();
    await startCameraFeed(el("camera-feed"));
    orientationCam = new OrientationCamera(camera);
    camera.position.set(0, 1.6, 0);
    landing.style.display = "none";
    hud.style.display = "block";
    startGPS();
    anchors = await loadWorld();
    showToast("Walking mode: hold your phone up and look around");
  } catch (err) {
    showToast(err.message);
  }
});

// ---------- Entry: WebXR mode ----------
async function detectXR() {
  const note = el("xr-note"), btn = el("btn-xr");
  try {
    const ok = await navigator.xr?.isSessionSupported("immersive-ar");
    if (ok) {
      btn.disabled = false;
      note.textContent = "WebXR device detected — passthrough AR available";
    } else {
      note.textContent = "No WebXR AR on this browser — phone camera mode works everywhere";
    }
  } catch {
    note.textContent = "No WebXR AR on this browser — phone camera mode works everywhere";
  }
}
detectXR();

el("btn-xr").addEventListener("click", async () => {
  try {
    renderer.xr.enabled = true;
    const session = await navigator.xr.requestSession("immersive-ar", {
      optionalFeatures: ["local-floor", "hand-tracking"],
    });
    await renderer.xr.setSession(session);
    landing.style.display = "none";

    // Headsets generally have no GPS, so XR mode is a "showroom": all
    // registry assets are arranged in a circle around the user. When
    // phone-tethered glasses expose location, startGPS() works here too.
    anchors = await loadWorld();
    anchors.slice(0, 8).forEach((a, i, arr) => {
      const obj = buildAsset(a);
      const angle = (i / arr.length) * Math.PI * 2;
      obj.position.set(Math.sin(angle) * 3, 0, -Math.cos(angle) * 3);
      obj.scale.setScalar(0.5);
      placed.set(a.id, obj);
      scene.add(obj);
    });

    session.addEventListener("end", () => location.reload());
  } catch (err) {
    showToast(`Could not start XR session: ${err.message}`);
  }
});
