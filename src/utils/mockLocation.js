// MOCK: Elevate has no location field anywhere in its API (mentors, users,
// or connections). Everything in this file is fabricated purely for demo
// purposes — never fetched, inferred, or derived from any real backend
// response. Assignment is deterministic (hashed from the person's id) so a
// given mentor always shows the same mock spot across renders/reloads,
// rather than randomly reshuffling.
//
// `x`/`y` are percentage positions (0-100) used to place a pin on the
// stylized map view — not real coordinates, just fixed layout points for a
// handful of plausible town names.

// x/y kept within a 30-70 band so pins cluster around the "you" pin at the
// center of the (now more compact) canvas instead of scattering to its edges.
const MOCK_LOCATIONS = [
  { name: 'Sasolburg', x: 50, y: 42 },
  { name: 'Parys', x: 33, y: 60 },
  { name: 'Vereeniging', x: 67, y: 58 },
  { name: 'Vanderbijlpark', x: 62, y: 35 },
  { name: 'Heilbron', x: 38, y: 32 },
];

function hashString(value) {
  return [...String(value)].reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
}

/** MOCK: deterministic fake location + "distance from you" for one person. */
export function mockLocationForId(id) {
  const hash = hashString(id);
  const location = MOCK_LOCATIONS[hash % MOCK_LOCATIONS.length];
  const distanceKm = 2 + (hash % 45); // MOCK: fabricated, not a real distance calculation
  return { name: location.name, distanceKm, x: location.x, y: location.y };
}

/** MOCK: adds `.mockLocation` / `.mockDistanceKm` / `.mockX` / `.mockY` to a real connection/mentor object. */
export function attachMockLocation(person) {
  const { name, distanceKm, x, y } = mockLocationForId(person.id);
  return { ...person, mockLocation: name, mockDistanceKm: distanceKm, mockX: x, mockY: y };
}

/** Parses FilterBar's "10 km radius" style strings into a plain number. */
export function parseRadiusKm(distanceFilter) {
  const match = distanceFilter?.match(/(\d+(\.\d+)?)/);
  return match ? Number(match[1]) : null;
}
