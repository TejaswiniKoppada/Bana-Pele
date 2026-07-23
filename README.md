# Elevate Frontend — Peer Connect & Community Voices (PWA)

React + Vite Progressive Web App implementing the Bana Pele Peer Connect and Community Voices use cases, built per [PWA_Frontend_Architecture.md](./PWA_Frontend_Architecture.md).

## Getting started

```
npm install
npm run dev
```
Runs on `http://localhost:5173`.

## Build

```
npm run build
npm run preview
```

## Integration status

**Peer Connect** is wired to the real Elevate Mentoring API — see [`PEER_CONNECT_FULL_INTEGRATION_GUIDE.md`](./PEER_CONNECT_FULL_INTEGRATION_GUIDE.md) for the source cURLs/spec, and the integration summary (in project history) for what's wired vs. what's built-but-dormant pending a login screen.

**Community Voices** still runs on local mock data in `src/services/storiesService.js` — no confirmed backend for it yet.

### Why there's a dev proxy in `vite.config.js`

The Elevate API resolves tenant/org by the request's `Origin` header, which must exactly match the deployed portal origin (`elevate-bana-pele.shikshalokam.org`). Browsers don't allow client-side code to override `Origin` on a cross-origin fetch, so local dev proxies `/elevate-api/*` through the Vite dev server (a Node process, not subject to that restriction), which sets the correct header. Set `VITE_API_BASE_URL` to call the API directly once this app is actually deployed at the real portal origin, where no proxy is needed.

### No login screen yet

`services/authService.js` implements the real login call and session storage, and `AppStateContext` exposes `login()`/`logout()` — but nothing calls them yet, since no login UI exists in this app. Every Peer Connect screen currently renders whatever an unauthenticated call gracefully resolves to (an empty list), until a login screen is added.

`src/offline/syncQueue.js` queues bookmark and story-post actions taken while offline (Community Voices) and replays them once reconnected.
