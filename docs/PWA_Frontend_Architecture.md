# Elevate PWA Frontend Architecture — Peer Connect & Community Voices

React-based Progressive Web App for the Bana Pele use cases, built to run installable/offline-capable on mobile, and structured for later integration with the Shikshalokam-hosted Elevate backend (Interface Service → Mentoring, Chat, Mitra).

---

## 1. Why PWA

| Need | PWA capability used |
|---|---|
| App-like feel on practitioners' phones without an app-store install | Web App Manifest (`display: standalone`, home-screen icon, splash screen) |
| Usable with patchy/no connectivity in the field | Service worker caching (app shell) + offline fallback UI |
| Bookmarking a story / sending a connect request while offline | Background Sync — action queued locally, replayed when back online |
| Notification bell staying meaningful | Web Push (backend-driven, once Interface Service is live) |
| Fast repeat loads | Cache-first for shell/static assets, stale-while-revalidate for data-ish content |

---

## 2. Architecture layers

```
┌─────────────────────────────────────────────┐
│  App Shell (cached, loads instantly offline) │
│   Header · Side Nav · Router outlet          │
├─────────────────────────────────────────────┤
│  Pages (routes)      │  Shared Components     │
│  Home / Peer Connect │  Cards, Tabs, Search,   │
│  / Community Voices  │  FilterBar, Radar       │
├─────────────────────────────────────────────┤
│  State (Context/Zustand)                     │
│  activeTab · filters · bookmarks · user       │
├─────────────────────────────────────────────┤
│  Services boundary (hooks + service modules)  │
│  local mock data now → hosted API later       │
├─────────────────────────────────────────────┤
│  Service Worker (Workbox)                     │
│  cache strategies · offline queue · push       │
└─────────────────────────────────────────────┘
                     │
                     ▼ (Phase 2)
        Shikshalokam Elevate Backend
     (Mentoring · Chat · Mitra via Interface Service)
```

Only the top four layers plus a **basic** service worker (app-shell caching + installability) are built now. Background sync, push notifications, and the live services layer activate once backend endpoints exist — the app is structured so none of that requires touching pages or components.

---

## 3. Tech stack

- **React** (Vite) + **React Router** — routing/pages
- **Context API + useReducer** (or Zustand if state grows) — cross-page state
- **Workbox** (via `vite-plugin-pwa`) — service worker generation, manifest injection, precaching
- **IndexedDB** (via `idb`) — offline queue for pending actions (bookmarks, connect requests) and cached last-known data
- Custom hooks (`useConnections`, `useStories`) as the only components that touch `services/` — swapped internally when APIs arrive

---

## 4. Folder structure

```
src/
├── assets/
├── styles/
├── components/
│   ├── Header/
│   ├── SideNav/
│   ├── Tabs/
│   ├── ConnectionCard/
│   ├── StoryCard/
│   ├── FilterBar/
│   ├── SearchRadar/
│   ├── SearchBar/
│   ├── InstallPrompt/         install-to-homescreen banner
│   └── OfflineBanner/          "you're offline" / "changes will sync" indicator
├── pages/
│   ├── Home/
│   ├── PeerConnect/
│   │   ├── MyConnections/
│   │   └── Search/
│   └── CommunityVoices/
│       ├── Recommended/
│       ├── Bookmarked/
│       └── MyStories/
├── router/
│   └── AppRouter.jsx
├── context/
│   └── AppStateContext.jsx
├── services/                     ← integration boundary
│   ├── connectionsService.js    (local data now → API later)
│   ├── storiesService.js
│   └── notificationsService.js  (placeholder for push)
├── hooks/
│   ├── useConnections.js
│   ├── useStories.js
│   ├── useOnlineStatus.js
│   └── useInstallPrompt.js
├── offline/
│   └── syncQueue.js              queued actions, replayed on reconnect
├── sw/
│   └── serviceWorker.js          Workbox-generated
├── manifest.webmanifest
└── App.jsx
```

---

## 5. PWA-specific concerns

**Web App Manifest** — name, short_name, icons (192/512), `theme_color`, `background_color`, `display: "standalone"`, `start_url: "/"`.

**Caching strategy**
- App shell (JS/CSS/fonts/icons): **cache-first**, precached at install.
- Page data (connections, stories — currently local, later API): **stale-while-revalidate** so the UI shows last-known data instantly, then refreshes.
- Navigation requests: fallback to a cached shell page if offline.

**Install prompt** — `useInstallPrompt` hook captures `beforeinstallprompt`, `InstallPrompt` component surfaces an "Add to Home Screen" CTA (dismissible, shown once per session).

**Offline behavior**
- `useOnlineStatus` hook drives an `OfflineBanner` ("You're offline — changes will sync when reconnected").
- Actions that would normally hit the backend (bookmarking a story, sending a connect request) are written to `offline/syncQueue.js` (IndexedDB) when offline, and to Context immediately for optimistic UI; queue flushes and calls the real service once `navigator.onLine` fires and the services layer is live.

**Push notifications (Phase 2)** — the notification bell is UI-only now; `notificationsService.js` is a reserved placeholder for subscribing to Web Push once the backend exposes it (mirrors the `services/` pattern from the rest of the app).

---

## 6. User flow

1. **First visit** — user opens the PWA URL → app shell + Home load → after a few seconds of engagement, `InstallPrompt` may offer "Add to Home Screen."
2. **Home** — profile card, progress/badge widget, menu into Peer Connect / Community Voices / Learning / Registration Guide, via persistent Header + Side Nav drawer.
3. **Peer Connect**
   - Opens on **My Connections**: Search Bar + Connection Cards (avatar, tier, connect date, chat action), served instantly from cache, refreshed if online.
   - Switch to **Search**: Filter Bar (distance, type) → apply → Search Radar ("searching…") → Results (same Connection Card). If offline, results come from last-cached data with an inline "offline — showing saved results" note.
4. **Community Voices**
   - Opens on **Recommended**: Search Bar + Story Cards (thumbnail, title, source link, bookmark).
   - **Bookmarked** / **My Stories** are sibling tabs sharing Story Card; bookmarking works offline (optimistic update + queued sync).
   - **My Stories** exposes "Create & post your own story" — if offline, the draft is queued and posted once reconnected.
5. **Reconnect** — `syncQueue` flushes queued actions (bookmarks, connect requests, story posts) through the services layer; `OfflineBanner` clears.
6. **Notifications (Phase 2)** — once backend push is available, bell badge updates from a Web Push event without the user having the app open.

---

## 7. Structuring for future backend integration

- Pages/components consume data only through hooks (`useConnections`, `useStories`), never `fetch` directly — so wiring in the hosted Elevate backend is a change inside `services/*.js` only.
- `syncQueue.js` and `notificationsService.js` are reserved boundaries, same pattern as the base architecture's empty `services/` folder — they activate without restructuring the app.
- Router/state/offline-queue logic is data-source-agnostic, so none of it changes when real endpoints replace local mock data.

---

## 8. Recommended next steps

1. Scaffold Vite + React project, add `vite-plugin-pwa` (manifest + Workbox config).
2. Build shared components: Header, SideNav, Tabs, ConnectionCard, StoryCard, InstallPrompt, OfflineBanner.
3. Build Home, Peer Connect, Community Voices pages against Figma, using local structured content via hooks.
4. Wire React Router + Context for navigation/state.
5. Add basic service worker: precache shell, stale-while-revalidate for data, offline fallback.
6. Add `syncQueue` for offline bookmark/connect/story actions (optimistic UI now, queued for real sync later).
7. Validate installability (Lighthouse PWA audit) and offline behavior before backend integration begins.
8. Once Interface Service endpoints are shared: implement `services/*.js` for real calls, `notificationsService.js` for push, and flush logic in `syncQueue.js`.
