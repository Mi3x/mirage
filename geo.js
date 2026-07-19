// geo.js — GPS tracking + coordinate math
// Converts world coordinates (lat/lng) into local scene meters.
// Scene convention (matches three.js): +x = east, -z = north, +y = up.

const EARTH_M_PER_DEG = 111320; // meters per degree of latitude

export function watchPosition(onFix, onError) {
  if (!("geolocation" in navigator)) {
    onError(new Error("Geolocation is not supported on this device."));
    return () => {};
  }
  const id = navigator.geolocation.watchPosition(
    (pos) => onFix({
      lat: pos.coords.latitude,
      lng: pos.coords.longitude,
      alt: pos.coords.altitude ?? 0,
      accuracy: pos.coords.accuracy,
    }),
    (err) => onError(err),
    { enableHighAccuracy: true, maximumAge: 1000, timeout: 15000 }
  );
  return () => navigator.geolocation.clearWatch(id);
}

// Offset of `target` relative to `origin`, in meters (ENU approximation).
// Good to well under 1% error at the distances AR cares about (< a few km).
export function enuOffset(origin, target) {
  const east =
    (target.lng - origin.lng) * EARTH_M_PER_DEG * Math.cos((origin.lat * Math.PI) / 180);
  const north = (target.lat - origin.lat) * EARTH_M_PER_DEG;
  return { east, north };
}

export function distanceMeters(a, b) {
  const { east, north } = enuOffset(a, b);
  return Math.hypot(east, north);
}

export function formatDistance(m) {
  if (m < 1000) return `${Math.round(m)} m`;
  return `${(m / 1000).toFixed(1)} km`;
}
