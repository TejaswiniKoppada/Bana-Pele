# Peer Connect — Complete Frontend Integration Guide
### Bana Pele PoC · Existing React PWA + Elevate Mentoring Backend

**Goal of this document:** integrate the already-built Peer Connect frontend with the live Elevate backend, without changing existing UI, layout, or component structure. Every endpoint and payload below was captured live from the Bana Pele portal — nothing here is inferred from documentation.

---

## 1. Scope & Ground Rules

- **In scope:** Peer Connect — mentor directory/search, profile view, connect/message request, session request, sent requests, accepted connections.
- **Out of scope:** Community Voices (no confirmed backend yet — blocked, separate item).
- **Constraint:** No UI rewrite. Integration happens by adding a data layer underneath existing components, not by changing what they render.

---

## 2. Environment

| Field | Value |
|---|---|
| API host | `https://elevate-apis.shikshalokam.org` |
| Frontend/portal host | `https://elevate-bana-pele.shikshalokam.org` |
| Tenant code | `banapele` |
| Org code | `banapeleorg` |
| Org ID (required header) | `72` |

---

## 3. High-Level Integration Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     EXISTING REACT PWA                        │
│                                                                 │
│   Pages/Screens (unchanged)                                    │
│   ┌───────────┐ ┌───────────┐ ┌──────────┐ ┌────────────────┐│
│   │ Mentors   │ │ Search    │ │ Requests │ │ My Connections ││
│   │ Directory │ │           │ │          │ │                ││
│   └─────┬─────┘ └─────┬─────┘ └────┬─────┘ └───────┬────────┘│
│         │             │             │               │          │
│         └─────────────┴──────┬──────┴───────────────┘          │
│                                │  (new — this is the only        │
│                                │   addition to the app)           │
│                          ┌─────▼──────┐                          │
│                          │  services/  │  ← thin API layer        │
│                          │  peerConnect │                          │
│                          └─────┬──────┘                          │
│                                │  attaches auth headers            │
│                          ┌─────▼──────┐                          │
│                          │  apiClient  │  ← axios/fetch wrapper    │
│                          └─────┬──────┘                          │
└────────────────────────────────┼──────────────────────────────────┘
                                  │  HTTPS + x-auth-token, org-id
                                  ▼
                 ┌─────────────────────────────────┐
                 │  elevate-apis.shikshalokam.org   │
                 │  /user/v1/...   /mentoring/v1/... │
                 └─────────────────────────────────┘
```

The only new code is the `services/` + `apiClient` layer. Existing components stay as-is; they just receive real data through props/state instead of static/dummy data.

---

## 4. End-to-End Functional Flow

1. User opens the app → **Login screen** → submits credentials.
2. On success, app stores `access_token` + `org_id`, navigates to Home.
3. User opens **Mentors** → directory loads automatically (all mentors/mentees in the org).
4. User types in **Search** → results update against the same list, filtered server-side.
5. User taps a mentor card → profile/chat panel opens → profile detail loads.
6. User sends a message ("Chat") **or** requests a session (separate action, separate form: title/agenda/date).
7. Either action creates a pending request — UI should reflect "pending" state on that mentor's card afterward.
8. User opens **Requests** → **Session requests** tab shows sessions they've requested; **Message requests** tab shows pending connect requests.
9. Once a request is accepted (by the other party), it disappears from pending and appears in **My Connections**.
10. User can chat freely only after connection is accepted (native chat, single-message limit before acceptance was observed in testing).

---

## 5. Authentication Flow

```
User submits login form
        │
        ▼
POST /user/v1/account/login
        │
        ▼
Response: { access_token, refresh_token, user }
        │
        ▼
Store access_token, refresh_token, org_id (from user.organizations[0].id)
        │
        ▼
Attach to every subsequent request:
  x-auth-token: <access_token>
  org-id: <org_id>
  timezone: Asia/Calcutta
```

**cURL — Login**
```bash
curl 'https://elevate-apis.shikshalokam.org/user/v1/account/login' \
  -H 'accept: application/json, text/plain, */*' \
  -H 'content-type: application/json' \
  -H 'origin: https://elevate-bana-pele.shikshalokam.org' \
  --data-raw '{"identifier":"mentorbanapele1@yopmail.com","password":"Password@123"}'
```

Response includes `result.access_token`, `result.refresh_token`, `result.user.organizations[0].id` (this is your `org-id` header value going forward — `72` in this environment).

> **Security note:** don't hardcode a token like the ones captured during testing into the app. Tokens expire (`exp` claim in the JWT) and are per-session — the app must always obtain its own via this login call, not reuse a captured one.

---

## 6. API Sequence & Interactions (with cURLs)

All calls below require the headers from Section 5 unless noted otherwise.

### 6.1 Mentors Directory
```bash
curl 'https://elevate-apis.shikshalokam.org/mentoring/v1/mentors/list?page=1&limit=100&search=&directory=true&search_on=' \
  -H 'org-id: 72' \
  -H 'timezone: Asia/Calcutta' \
  -H 'x-auth-token: <ACCESS_TOKEN>'
```
Response: mentors grouped alphabetically (`key`/`values`).

### 6.2 Mentors Search
```bash
curl 'https://elevate-apis.shikshalokam.org/mentoring/v1/mentors/list?page=1&limit=5&search=YmFuYQ==&directory=false&search_on=' \
  -H 'org-id: 72' \
  -H 'timezone: Asia/Calcutta' \
  -H 'x-auth-token: <ACCESS_TOKEN>'
```
`search` is the **base64-encoded** search term (`"bana"` → `YmFuYQ==`). Response is a flat array (not grouped), unlike 6.1.

### 6.3 View Profile / Connection Status
```bash
curl 'https://elevate-apis.shikshalokam.org/mentoring/v1/connections/getInfo' \
  -H 'org-id: 72' \
  -H 'content-type: application/json' \
  -H 'x-auth-token: <ACCESS_TOKEN>' \
  --data-raw '{"user_id":"1490"}'
```
Returns `"message": "Connection not found."` when no relationship exists yet — this is a normal state, not an error, when rendering a fresh profile.

### 6.4 Send Connect / Message Request
```bash
curl 'https://elevate-apis.shikshalokam.org/mentoring/v1/connections/initiate' \
  -H 'org-id: 72' \
  -H 'content-type: application/json' \
  -H 'x-auth-token: <ACCESS_TOKEN>' \
  --data-raw '{"user_id":"1490","message":"Hi, I would like to connect with you."}'
```
Success: `"status": "REQUESTED"`.

### 6.5 Request a Session
```bash
curl 'https://elevate-apis.shikshalokam.org/mentoring/v1/requestSessions/create' \
  -H 'org-id: 72' \
  -H 'content-type: application/json' \
  -H 'x-auth-token: <ACCESS_TOKEN>' \
  --data-raw '{"title":"Bana Pele","start_date":1784781017,"end_date":1784791817,"agenda":"Bana Pele","requestee_id":"1490","time_zone":"Asia/Calcutta"}'
```
`start_date`/`end_date` are **Unix timestamps in seconds**.

**Rejected-request error shape** (confirmed live — one pending request per pair allowed):
```json
{
  "responseCode": "SERVER_ERROR",
  "error": [],
  "meta": { "correlation": "..." },
  "message": "Wait for the mentor's response to your previous request."
}
```

### 6.6 Sent Session Requests
```bash
curl 'https://elevate-apis.shikshalokam.org/mentoring/v1/requestSessions/list?pageNo=1&pageSize=100&status=REQUESTED,EXPIRED' \
  -H 'org-id: 72' \
  -H 'timezone: Asia/Calcutta' \
  -H 'x-auth-token: <ACCESS_TOKEN>'
```

### 6.7 Pending Message Requests
```bash
curl 'https://elevate-apis.shikshalokam.org/mentoring/v1/connections/pending?pageNo=1&pageSize=100' \
  -H 'org-id: 72' \
  -H 'timezone: Asia/Calcutta' \
  -H 'x-auth-token: <ACCESS_TOKEN>'
```

### 6.8 My Connections (Accepted)
```bash
curl 'https://elevate-apis.shikshalokam.org/mentoring/v1/connections/list?page=1&limit=5&search=&search_on=' \
  -H 'org-id: 72' \
  -H 'timezone: Asia/Calcutta' \
  -H 'x-auth-token: <ACCESS_TOKEN>'
```
Confirmed empty while a request is pending; populates once accepted.

---

## 7. Data Flow Between Frontend and Backend

```
Component mounts
      │
      ▼
Calls service function  ───────►  service attaches headers, calls apiClient
      │                                             │
      │                                             ▼
      │                                   HTTPS request to Elevate API
      │                                             │
      │                                             ▼
      │                                   JSON response returned
      ◄─────────────────────────────────────────────┘
      │
      ▼
Component's local/state updated with real data
      │
      ▼
Existing render logic displays it (unchanged JSX/markup)
```

State that needs to exist somewhere in the app (React Context, Redux, or local state — whatever the existing frontend already uses):
- `accessToken`, `orgId` (from login, needed by every call)
- `currentUser` (from login response)
- Per-screen data: mentors list, search results, selected profile, pending requests, accepted connections

---

## 8. Component Interaction Map

```
<LoginPage>
    → services/auth.login()

<MentorsDirectoryPage>
    → services/peerConnect.getMentorsList()
    → renders existing <MentorCard> per result

<MentorsSearchBar> (inside directory or search tab)
    → services/peerConnect.searchMentors(term)
    → base64-encodes term before calling

<MentorCard> → onClick
    → services/peerConnect.getConnectionInfo(userId)
    → opens existing <ProfilePanel> / <ChatRequestModal>

<ChatRequestModal> → onSend
    → services/peerConnect.initiateConnection(userId, message)

<RequestSessionForm> → onSubmit
    → services/peerConnect.requestSession(payload)

<RequestsPage>
    ├── <SessionRequestsTab> → services/peerConnect.getSessionRequests()
    └── <MessageRequestsTab> → services/peerConnect.getPendingConnections()

<MyConnectionsPage>
    → services/peerConnect.getConnections()
```

Every arrow above is the *only* change needed per component: replace whatever currently supplies static/dummy data with the matching service call, keep the render logic untouched.

---

## 9. Folder Structure for API Integration (additive, non-invasive)

```
src/
├── (existing component/page folders — unchanged)
│
├── services/                     ← NEW
│   ├── apiClient.js                shared fetch/axios wrapper, attaches headers, handles errors
│   ├── auth.js                     login, token storage/retrieval
│   └── peerConnect.js              all 8 endpoint functions from Section 6
│
├── context/  (or store/, if Redux)   ← NEW (if not already present)
│   └── AuthContext.js              holds accessToken, orgId, currentUser
│
└── config/                        ← NEW
    └── env.js                     API_BASE_URL, org defaults, etc.
```

`apiClient.js` responsibilities:
- Read `accessToken`/`orgId` from auth context/store
- Attach `x-auth-token`, `org-id`, `timezone`, `content-type` to every call
- Centralize error handling (surface `message` field from error responses per Section 6.5)

`peerConnect.js` responsibilities: one exported function per Section 6 endpoint (e.g. `getMentorsList()`, `searchMentors(term)`, `getConnectionInfo(userId)`, `initiateConnection(userId, message)`, `requestSession(payload)`, `getSessionRequests()`, `getPendingConnections()`, `getConnections()`). Each does exactly one job: call `apiClient`, return parsed data.

---

## 10. Step-by-Step Implementation Plan

1. **Add the `services/` + `config/` folders** (Section 9) without touching any existing component yet.
2. **Build `apiClient.js`** — generic request function with header injection and error handling. Test it standalone (e.g. a scratch script or console call) against 6.1 before wiring anything else.
3. **Build `auth.js` + login integration** — wire the existing login screen to call it. Confirm token/org-id get stored and a follow-up call (6.1) succeeds using them.
4. **Wire Mentors Directory (6.1)** — replace static data source feeding `<MentorCard>` list with `services/peerConnect.getMentorsList()`. Verify UI renders identically with real data.
5. **Wire Search (6.2)** — add base64 encoding in the service function, not the component.
6. **Wire profile/connection info (6.3)** — hook into whatever opens the profile/chat panel.
7. **Wire connect/message request (6.4)** — hook into the send action; handle the pending-request error (6.5's error shape) with a user-facing message instead of a silent failure.
8. **Wire session request (6.5)** — convert form date/time inputs to Unix seconds before calling.
9. **Wire Requests screen (6.6, 6.7)** — both tabs, kept as separate calls/state (don't merge their data).
10. **Wire My Connections (6.8)** — last, since it depends on an acceptance happening first.
11. **Add pending-state UI logic** — before rendering "Chat"/"Request session" as active on a card, cross-check against 6.7's data so users don't hit the 6.5 error blind.

---

## 11. End-to-End Validation Flow

Run this full pass logged in as the mentor test account after implementation:

1. Log in → confirm token stored, Home loads.
2. Open Mentors → confirm real directory data renders in the existing UI (not placeholders).
3. Search a partial name → confirm filtered results appear.
4. Open a profile → confirm real profile fields render; confirm "Connection not found" case doesn't break the UI.
5. Send a connect request → confirm success message, and confirm a second attempt to the same user is blocked with the correct error message shown.
6. Submit a session request → confirm success, or confirm the pending-error message renders correctly if one's already outstanding.
7. Open Requests → Session requests tab → confirm the request just sent appears.
8. Open Requests → Message requests tab → confirm the connect request appears.
9. Open My Connections → confirm it's empty (expected, since nothing's been accepted yet).
10. If a second test account is available to accept the request: accept it, then reload My Connections and confirm the user now appears there.

If all ten pass, Peer Connect integration is complete and demo-ready.
