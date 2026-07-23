// Real Elevate Mentoring API — see PEER_CONNECT_FULL_INTEGRATION_GUIDE.md
// (Section 6) for the source cURLs this is built against. Response shapes
// were confirmed live during integration (login + each read endpoint) except
// where noted below.
import { apiRequest } from './apiClient.js';

function designationLabel(designation) {
  return designation?.[0]?.label;
}

function labels(entries) {
  return (entries ?? []).map((entry) => entry.label).filter(Boolean);
}

/** Shared shape for anything that carries a mentor/user profile — used by both
 * the directory/search results and connection records, so a card from either
 * list has everything the profile screen needs without a second fetch. */
function mapProfileFields(person) {
  return {
    about: person.about || '',
    experience: person.experience || '',
    designations: labels(person.designation),
    areasOfExpertise: labels(person.area_of_expertise),
    educationQualification: person.education_qualification || '',
    organization: person.organization?.name || '',
    image: person.image || '',
    rating: person.rating ?? null,
  };
}

function mapMentorSummary(mentor) {
  return {
    id: String(mentor.id),
    name: mentor.name,
    tier: designationLabel(mentor.designation) || mentor.organization?.name || '',
    ...mapProfileFields(mentor),
  };
}

function mapConnectionRecord(record) {
  if (!record || Array.isArray(record) || !record.user_details) return null;
  const details = record.user_details;
  return {
    id: String(details.user_id ?? record.friend_id ?? record.user_id),
    name: details.name,
    tier: designationLabel(details.designation) || '',
    connectedOn: record.created_at,
    connectionStatus: record.status,
    ...mapProfileFields(details),
  };
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
  return {
    id: String(record.user_id),
    name: record.name,
    tier: designationLabel(record.designation) || '',
    about: record.user_meta?.about || '',
    experience: record.experience || '',
    designations: labels(record.designation),
    areasOfExpertise: labels(record.area_of_expertise),
    educationQualification: record.education_qualification || '',
    image: record.image || '',
    communicationsUserId: record.user_meta?.communications_user_id || '',
    roomId: record.connection_meta?.room_id || '',
  };
}

function toBase64(value) {
  return typeof window !== 'undefined' ? window.btoa(value) : Buffer.from(value).toString('base64');
}

/** My Connections tab — accepted connections only (6.8). */
export async function getMyConnections() {
  const result = await apiRequest('/mentoring/v1/connections/list?page=1&limit=100&search=&search_on=');
  return (result.data ?? []).map(mapAcceptedConnection).filter(Boolean);
}

/**
 * Search tab — browses the mentor directory (6.1).
 *
 * NOTE: the real API has no distance or tier/badge concept (mentors carry
 * `designation`/`area_of_expertise`/`experience` instead), so `filters.distance`
 * and a non-"All" `filters.type` currently have no server-side equivalent to
 * filter by. Kept as accepted parameters purely so the existing FilterBar UI
 * needs no changes — see the integration summary for what this means in
 * practice and what a real fix would require (relabeling the filter itself).
 */
export async function searchConnections(filters) {
  const result = await apiRequest(
    '/mentoring/v1/mentors/list?page=1&limit=50&search=&directory=true&search_on='
  );
  const flat = (result.data ?? []).flatMap((group) => group.values ?? []);
  return flat.map(mapMentorSummary);
}

/** Directory search by name (6.2) — not wired to any component yet (no free-text search box exists on the Search tab today). */
export async function searchMentorsByName(term) {
  const encoded = encodeURIComponent(toBase64(term));
  const result = await apiRequest(
    `/mentoring/v1/mentors/list?page=1&limit=20&search=${encoded}&directory=false&search_on=`
  );
  return (result.data ?? []).map(mapMentorSummary);
}

/** Profile / connection status for a given mentor (6.3). Returns null when no relationship exists yet. */
export async function getConnectionInfo(userId) {
  const result = await apiRequest('/mentoring/v1/connections/getInfo', {
    method: 'POST',
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
  const { message: responseMessage, result } = await apiRequest('/mentoring/v1/connections/initiate', {
    method: 'POST',
    body: { user_id: String(userId), message },
    returnFull: true,
  });
  return { status: result?.status, message: responseMessage };
}

/**
 * Request a mentoring session (6.5). `startDate`/`endDate` are Unix seconds.
 * Not wired to any component yet — no session-request form exists in this
 * frontend today.
 */
export async function requestSession({ title, agenda, startDate, endDate, requesteeId, timeZone = 'Asia/Calcutta' }) {
  return apiRequest('/mentoring/v1/requestSessions/create', {
    method: 'POST',
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
    '/mentoring/v1/requestSessions/list?pageNo=1&pageSize=100&status=REQUESTED,EXPIRED'
  );
  return result.data ?? [];
}

/** Pending (not yet accepted) connect requests (6.7). Not wired to any component yet — no Requests screen exists in this frontend today. */
export async function getPendingConnections() {
  const result = await apiRequest('/mentoring/v1/connections/pending?pageNo=1&pageSize=100');
  return (result.data ?? []).map(mapConnectionRecord).filter(Boolean);
}
