// OpenStreetMap Nominatim — free, no API key, used to turn Elevate's
// free-text Location field (e.g. "Badami Karnataka") into coordinates for
// the map and Distance filter, since Elevate only stores text, not
// lat/lon. Geocoded client-side, on the fly, since this data lives in
// Elevate now (not something we store ourselves).
//
// Nominatim's usage policy caps requests at 1/sec and expects results to be
// cached rather than re-requested — both handled here: an in-memory cache
// keyed by normalized location text, and a request queue that serializes
// every call with a minimum gap between actual network dispatches,
// regardless of how many callers ask concurrently.
const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";
const MIN_REQUEST_INTERVAL_MS = 1100; // just over 1/sec to stay safely under the limit

const cache = new Map(); // normalized location text -> {lat, lon} | null
let queue = Promise.resolve();
let lastRequestAt = 0;

function normalizeKey(text) {
  return (text || "").trim().toLowerCase();
}

// ============================================================================
// DEMO SCOPING (TEMPORARY) — NOT a permanent architectural decision.
// Pre-fetched real coordinates for the 6 curated demo accounts (Thandi + her
// 5 connections — see connectionsService.js's DEMO_VISIBLE_USER_IDS), so the
// Search/Map loading screen isn't dominated by Nominatim's 1/sec rate limit
// across 6 sequential live lookups (~7s for 6 calls). Every value below was
// itself fetched live from Nominatim for this exact location text and
// confirmed correct against real OpenStreetMap results (display_name showed
// the right South African town for each) — not guessed or approximated.
// Checked first, ahead of the live cache/queue below; anything not listed
// here (any non-demo account, or a demo account with a changed location)
// still falls through to a real live Nominatim lookup as normal. Delete
// DEMO_LOCATION_CACHE once demo scoping as a whole is retired.
//
// The place-text swap in the most recent persona round reassigned these
// same 5 real towns across different accounts and added a province suffix
// to each — since this cache is keyed by the exact normalized text, every
// account's entry had to be re-keyed to its new text (bare town names below
// are kept too, in case anything still uses the shorter form; they're
// harmless if unused).
// ============================================================================
const DEMO_LOCATION_CACHE = {
  sasolburg: { lat: -26.810278, lon: 27.821389 }, // Thandi
  // Thandi's and Maria's `place` text is this fictional community name (not
  // a real geocodable place), but their map position must stay the same
  // real Sasolburg coordinate. Same values as 'sasolburg' above, just keyed
  // to the new text so it still hits this cache instead of falling through
  // to a live Nominatim lookup that would find nothing.
  "holly county sasolburg": { lat: -26.810278, lon: 27.821389 }, // Thandi, Maria
  vereeniging: { lat: -26.6747222, lon: 27.9261111 },
  "vereeniging gauteng": { lat: -26.6747222, lon: 27.9261111 }, // Jo
  "parys free state": { lat: -26.904354, lon: 27.456125 },
  vanderbijlpark: { lat: -26.706891, lon: 27.836271 },
  "vanderbijlpark gauteng": { lat: -26.706891, lon: 27.836271 }, // Karabo
  deneysville: { lat: -26.89, lon: 28.096389 },
  "deneysville free state": { lat: -26.89, lon: 28.096389 }, // Marizanne (formerly "Nomsa")
  heilbron: { lat: -27.286389, lon: 27.969444 },
  "heilbron free state": { lat: -27.286389, lon: 27.969444 }, // Lindiwe
};

function enqueue(task) {
  const run = queue.then(async () => {
    const wait = Math.max(
      0,
      lastRequestAt + MIN_REQUEST_INTERVAL_MS - Date.now(),
    );
    if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));
    lastRequestAt = Date.now();
    return task();
  });
  // Keep the queue alive even if this task fails, so later callers aren't stuck.
  queue = run.catch(() => {});
  return run;
}

/** Geocodes free-text location to {lat, lon}, or null if empty/not found/failed. Cached and rate-limited. */
export async function geocodeLocation(text) {
  const key = normalizeKey(text);
  if (!key) return null;
  if (DEMO_LOCATION_CACHE[key]) return DEMO_LOCATION_CACHE[key];
  if (cache.has(key)) return cache.get(key);

  const result = await enqueue(async () => {
    try {
      const url = `${NOMINATIM_URL}?format=json&limit=1&q=${encodeURIComponent(text)}`;
      const response = await fetch(url);
      if (!response.ok) return null;
      const data = await response.json();
      if (!Array.isArray(data) || data.length === 0) return null;
      const lat = parseFloat(data[0].lat);
      const lon = parseFloat(data[0].lon);
      return Number.isFinite(lat) && Number.isFinite(lon) ? { lat, lon } : null;
    } catch {
      return null;
    }
  });

  cache.set(key, result);
  return result;
}

/** Great-circle distance between two coordinates, in kilometers. */
export function haversineDistanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
