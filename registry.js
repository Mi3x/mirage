// registry.js — the "world database" client.
// For the starter this reads a static world.json. When you outgrow it,
// swap loadWorld() for a fetch to your API: /api/anchors?lat=..&lng=..&radius=..
// Nothing else in the app needs to change.

import { distanceMeters } from "./geo.js";

const LOCAL_KEY = "mirage-local-anchors";

// Anchors the user created on this device (via the map's Add mode).
export function loadLocalAnchors() {
  try { return JSON.parse(localStorage.getItem(LOCAL_KEY)) ?? []; }
  catch { return []; }
}

export function saveLocalAnchors(list) {
  localStorage.setItem(LOCAL_KEY, JSON.stringify(list));
}

// Multi-world support: each venue can have its own world file.
// mirage-jet.vercel.app                    -> world.json (the public world)
// mirage-jet.vercel.app/?world=centralworld -> centralworld.json (venue world)
export function worldFile() {
  const param = new URLSearchParams(location.search).get("world");
  return param && /^[a-z0-9-]{1,40}$/.test(param) ? `${param}.json` : "world.json";
}

export async function loadWorld() {
  const res = await fetch(worldFile(), { cache: "no-cache" });
  if (!res.ok) throw new Error(`Could not load ${worldFile()}`);
  const data = await res.json();
  // Published world + this device's own creations, together.
  return [...(data.anchors ?? []), ...loadLocalAnchors()];
}

// Returns anchors within radiusMeters of `here`, sorted nearest first,
// each annotated with a live .distance field.
export function nearbyAnchors(anchors, here, radiusMeters = 500) {
  return anchors
    .map((a) => ({ ...a, distance: distanceMeters(here, a) }))
    .filter((a) => a.distance <= radiusMeters)
    .sort((a, b) => a.distance - b.distance);
}
