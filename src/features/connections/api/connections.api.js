// Real Elevate Mentoring API — see PEER_CONNECT_FULL_INTEGRATION_GUIDE.md
// (Section 6) for the source cURLs this is built against. Response shapes
// were confirmed live during integration (login + each read endpoint) except
// where noted below.
import { apiRequest } from "@/api/client.js";
import { getCurrentSessionUser } from "@/storage/tokenStorage.js";

// ============================================================================
// DEMO SCOPING (TEMPORARY) — NOT a permanent architectural decision.
// Restricts which real Elevate accounts surface in Community Connect (Search,
// Map, My Connections) for the client demo — the org also has org-admin/
// session-manager/earlier-test accounts that shouldn't appear. Every account
// below is real, with real saved profile data; this only curates which ones
// are shown. Delete DEMO_VISIBLE_USER_IDS and its two applyDemoScope() call
// sites once the real, unfiltered org membership should show again.
//
// Bidirectional on purpose: '1490' (Thandi) was added alongside her 5
// connections so that when one of THEM is logged in (e.g. Maria, for the My
// Learning "Recommend Learning" flow), Thandi shows up in their own My
// Connections/Search too — confirmed live that Maria's real connections/list
// already includes Thandi with a working room_id, it was only this allowlist
// (built assuming Thandi was always the one logged in) blocking it. Thandi
// never sees herself regardless, via excludeSelf().
// ============================================================================
const DEMO_VISIBLE_USER_IDS = new Set([
  "1490", // banad@yopmail.com (Thandi)
  "1509", // mentorbanapele1@yopmail.com (Maria)
  "1689", // jo-banapele@yopmail.com (Jo)
  "1690", // nomsa-banapele@yopmail.com (Marizanne — real name changed via Profile, login/email unchanged)
  "1691", // lindiwe-banapele@yopmail.com (Lindiwe)
  "1692", // karabo-banapele@yopmail.com (Karabo)
]);

function applyDemoScope(people) {
  return people.filter((person) =>
    DEMO_VISIBLE_USER_IDS.has(String(person.id)),
  );
}

// ============================================================================
// DEMO SCOPING (TEMPORARY) — NOT a permanent architectural decision.
// Elevate's real `image` field is unused/empty for every account (confirmed
// live) — these are real photos for the demo's 6 curated accounts, stored as
// local static assets, matched by user id. Applied once here in the shared
// mapping layer so every screen that already renders `connection.image`
// (ConnectionCard everywhere: Search results, My Connections, Profile/About)
// picks them up automatically. Map markers are unaffected — SearchMapView
// uses its own icon-based markers by design, not this field. Never
// overrides a real Elevate photo, if one is ever set. Delete
// DEMO_PHOTO_BY_USER_ID and withDemoPhoto() once real Elevate `image` values
// exist for the accounts that need them.
// ============================================================================
// import.meta.env.BASE_URL (not a hardcoded leading "/") so these resolve
// correctly under GitHub Pages' /Bana-Pele/ subpath in production, not just
// at the domain root the way local dev (base "/") made this look correct.
const DEMO_PHOTO_BY_USER_ID = {
  1490: `${import.meta.env.BASE_URL}images/thandi.jpg`, // Thandi
  1509: `${import.meta.env.BASE_URL}images/maria.jpg`, // Maria
  1689: `${import.meta.env.BASE_URL}images/jo.jpg`, // Jo
  1690: `${import.meta.env.BASE_URL}images/marizanne.jpg`, // Marizanne (formerly "Nomsa")
  1691: `${import.meta.env.BASE_URL}images/lindiwe.jpg`, // Lindiwe
  1692: `${import.meta.env.BASE_URL}images/karabo.jpg`, // Karabo
};

function withDemoPhoto(mapped) {
  if (!mapped || mapped.image) return mapped;
  const demoPhoto = DEMO_PHOTO_BY_USER_ID[String(mapped.id)];
  return demoPhoto ? { ...mapped, image: demoPhoto } : mapped;
}

// ============================================================================
// DEMO SCOPING (TEMPORARY) — NOT a permanent architectural decision.
// Display-only tagline shown under each connection's name in the card/list
// view (ConnectionCard), separate from `tier` — `tier` stays the real
// Elevate designation (still used as-is anywhere that needs the real field,
// e.g. mentorCategory.js's categoryForTier fallback), while `tagline` is
// purely cosmetic curated copy for these 6 demo accounts. Thandi (1490) is
// deliberately NOT listed here — her card already reads "Aspiring ELP
// Practitioner" via her real Elevate designation today, and that's meant to
// stay exactly as-is. Delete DEMO_TAGLINE_BY_USER_ID and withDemoTagline()
// once demo scoping as a whole is retired.
// ============================================================================
const DEMO_TAGLINE_BY_USER_ID = {
  1509: "Gold Tier ELP Practitioner", // Maria
  1689: "Primary School Teacher", // Jo
  1690: "Gold Tier ELP Practitioner", // Marizanne
  1691: "Child Care Specialist", // Lindiwe
  1692: "Paediatrician", // Karabo
};

function withDemoTagline(mapped) {
  if (!mapped) return mapped;
  const tagline = DEMO_TAGLINE_BY_USER_ID[String(mapped.id)];
  return tagline ? { ...mapped, tagline } : mapped;
}

function designationLabel(designation) {
  return designation?.[0]?.label;
}

function labels(entries) {
  return (entries ?? []).map((entry) => entry.label).filter(Boolean);
}

/**
 * Real free-text Location, confirmed live — but its shape differs per
 * endpoint: top-level `place.label` on connections/getInfo and
 * connections/list, nested under `custom_entity_text.place.label` on
 * mentors/list (where top-level `place` is just the bare entity code, e.g.
 * "other", not the label). Try both; safe no-op if neither is present.
 */
function locationLabel(person) {
  return person.place?.label || person.custom_entity_text?.place?.label || "";
}

/** Shared shape for anything that carries a mentor/user profile — used by both
 * the directory/search results and connection records, so a card from either
 * list has everything the profile screen needs without a second fetch. */
function mapProfileFields(person) {
  return {
    about: person.about || "",
    experience: person.experience || "",
    designations: labels(person.designation),
    areasOfExpertise: labels(person.area_of_expertise),
    educationQualification: person.education_qualification || "",
    organization: person.organization?.name || "",
    image: person.image || "",
    rating: person.rating ?? null,
    location: locationLabel(person),
  };
}

function mapMentorSummary(mentor) {
  return withDemoTagline(
    withDemoPhoto({
      id: String(mentor.id),
      name: mentor.name,
      tier:
        designationLabel(mentor.designation) || mentor.organization?.name || "",
      ...mapProfileFields(mentor),
    }),
  );
}

function mapConnectionRecord(record) {
  if (!record || Array.isArray(record) || !record.user_details) return null;
  const details = record.user_details;
  return withDemoTagline(
    withDemoPhoto({
      id: String(details.user_id ?? record.friend_id ?? record.user_id),
      name: details.name,
      tier: designationLabel(details.designation) || "",
      connectedOn: record.created_at,
      connectionStatus: record.status,
      ...mapProfileFields(details),
    }),
  );
}

/**
 * connections/list (6.8, accepted) returns each connection FLAT — unlike
 * pending/getInfo (mapConnectionRecord above), there is no `user_details`
 * wrapper, and `about`/`communications_user_id` live under `user_meta`
 * rather than at the top level. Confirmed live. `connection_meta.room_id`
 * isn't shown anywhere yet but is kept on the mapped object for the
 * upcoming Chat feature.
 */
function mapAcceptedConnection(record) {
  if (!record) return null;
  return withDemoTagline(
    withDemoPhoto({
      id: String(record.user_id),
      name: record.name,
      tier: designationLabel(record.designation) || "",
      about: record.user_meta?.about || "",
      experience: record.experience || "",
      designations: labels(record.designation),
      areasOfExpertise: labels(record.area_of_expertise),
      educationQualification: record.education_qualification || "",
      image: record.image || "",
      location: locationLabel(record),
      communicationsUserId: record.user_meta?.communications_user_id || "",
      roomId: record.connection_meta?.room_id || "",
    }),
  );
}

function toBase64(value) {
  return typeof window !== "undefined"
    ? window.btoa(value)
    : Buffer.from(value).toString("base64");
}

/** My Connections tab — accepted connections only (6.8). */
export async function getMyConnections() {
  const result = await apiRequest(
    "/mentoring/v1/connections/list?page=1&limit=100&search=&search_on=",
  );
  return applyDemoScope(
    (result.data ?? []).map(mapAcceptedConnection).filter(Boolean),
  );
}

/**
 * Neither mentors/list variant (6.1, 6.2) excludes the caller's own account
 * from results — confirmed live, no query param for it — so both search
 * paths below filter it out client-side, by the same session user id
 * tokenStore already tracks for auth headers.
 */
function excludeSelf(people) {
  const myId = String(getCurrentSessionUser()?.id ?? "");
  return myId ? people.filter((person) => person.id !== myId) : people;
}

/** mentors/list groups directory browse results by alphabet key ({key, values}); mentees/list returns a flat array either way. Handles both shapes. */
function flattenDirectory(data) {
  return (data ?? []).flatMap((item) => item.values ?? [item]);
}

/**
 * mentors/list (6.1/6.2) only ever returns accounts with is_mentor:true —
 * confirmed live it silently excludes mentee-only accounts even from name
 * search (a real account returns a clean, valid `count: 0`, not an error).
 * mentees/list, despite its name, returns the FULL org roster including
 * mentors — but never resolves the free-text Location label (bare "other"
 * code only, no custom_entity_text) even for accounts that have a real one
 * set, confirmed live comparing the same account's shape across both
 * endpoints. So: merge both for completeness, preferring the mentors/list
 * copy of any account present in both (it has the resolved location).
 */
async function fetchDirectory(query) {
  const [mentorsResult, menteesResult] = await Promise.all([
    apiRequest(`/mentoring/v1/mentors/list?page=1&limit=50&${query}`),
    apiRequest(`/mentoring/v1/mentees/list?page=1&limit=50&${query}`),
  ]);
  const byId = new Map();
  for (const person of flattenDirectory(menteesResult.data))
    byId.set(String(person.id), person);
  for (const person of flattenDirectory(mentorsResult.data))
    byId.set(String(person.id), person);
  return applyDemoScope([...byId.values()]);
}

/**
 * mentees/list-sourced entries never carry a resolved Location label (see
 * fetchDirectory above) even when the account genuinely has one set —
 * confirmed live (e.g. Lindiwe has a real saved place, but it doesn't
 * surface here). connections/getInfo resolves it correctly for any user,
 * connected or not (the same call the About view already uses to view a
 * stranger's profile) — so enrich just the entries missing it, rather than
 * adding a lookup for every single result.
 */
async function enrichMissingLocations(people) {
  const missing = people.filter((p) => !p.location);
  if (missing.length === 0) return people;
  const infos = await Promise.all(
    missing.map((p) => getConnectionInfo(p.id).catch(() => null)),
  );
  const locationById = new Map();
  infos.forEach((info, i) => {
    if (info?.location) locationById.set(missing[i].id, info.location);
  });
  if (locationById.size === 0) return people;
  return people.map((p) =>
    locationById.has(p.id) ? { ...p, location: locationById.get(p.id) } : p,
  );
}

/** Search tab — browses the full org directory (6.1 + mentees/list, merged — see fetchDirectory). */
export async function searchConnections() {
  const people = await fetchDirectory("search=&directory=true&search_on=");
  return enrichMissingLocations(excludeSelf(people.map(mapMentorSummary)));
}

/** Directory search by name (6.2 + mentees/list, merged), used by the Search tab's free-text box once a query is typed. */
export async function searchMentorsByName(term) {
  const encoded = encodeURIComponent(toBase64(term));
  const people = await fetchDirectory(
    `search=${encoded}&directory=false&search_on=`,
  );
  return enrichMissingLocations(excludeSelf(people.map(mapMentorSummary)));
}

/** Profile / connection status for a given mentor (6.3). Returns null when no relationship exists yet. */
export async function getConnectionInfo(userId) {
  const result = await apiRequest("/mentoring/v1/connections/getInfo", {
    method: "POST",
    body: { user_id: String(userId) },
  });
  return mapConnectionRecord(result);
}

/**
 * Send a connect/message request (6.4).
 *
 * Success looks like `{ status: "REQUESTED" }`. A duplicate/already-connected
 * attempt is *not* a thrown error from this endpoint — it replies with
 * `responseCode: "OK"`, an empty result, and an explanatory `message` (e.g.
 * "You are already connected with this user."), confirmed live. Callers
 * should treat any non-"REQUESTED" status as "show `message` to the user",
 * not as a failure.
 */
export async function initiateConnection(userId, message) {
  const { message: responseMessage, result } = await apiRequest(
    "/mentoring/v1/connections/initiate",
    {
      method: "POST",
      body: { user_id: String(userId), message },
      returnFull: true,
    },
  );
  return { status: result?.status, message: responseMessage };
}

/**
 * Request a mentoring session (6.5). `startDate`/`endDate` are Unix seconds.
 * Not wired to any component yet — no session-request form exists in this
 * frontend today.
 */
export async function requestSession({
  title,
  agenda,
  startDate,
  endDate,
  requesteeId,
  timeZone = "Asia/Calcutta",
}) {
  return apiRequest("/mentoring/v1/requestSessions/create", {
    method: "POST",
    body: {
      title,
      agenda,
      start_date: startDate,
      end_date: endDate,
      requestee_id: String(requesteeId),
      time_zone: timeZone,
    },
  });
}

/** Sessions the current user has requested (6.6). Not wired to any component yet — no Requests screen exists in this frontend today. */
export async function getSessionRequests() {
  const result = await apiRequest(
    "/mentoring/v1/requestSessions/list?pageNo=1&pageSize=100&status=REQUESTED,EXPIRED",
  );
  return result.data ?? [];
}

/** Pending (not yet accepted) connect requests (6.7). Not wired to any component yet — no Requests screen exists in this frontend today. */
export async function getPendingConnections() {
  const result = await apiRequest(
    "/mentoring/v1/connections/pending?pageNo=1&pageSize=100",
  );
  return (result.data ?? []).map(mapConnectionRecord).filter(Boolean);
}
