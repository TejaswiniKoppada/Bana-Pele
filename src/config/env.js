// Elevate Mentoring backend — see PEER_CONNECT_FULL_INTEGRATION_GUIDE.md for the source cURLs.
//
// API_BASE_URL defaults to the local dev proxy (see vite.config.js), which
// exists solely to work around the API's Origin-based tenant resolution
// during local development. Override with VITE_API_BASE_URL once this app is
// deployed at the real portal origin (elevate-bana-pele.shikshalokam.org),
// where requests can go directly to the API host.
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/elevate-api';

export const ORG_ID = import.meta.env.VITE_ORG_ID || '72';
export const TENANT_CODE = import.meta.env.VITE_TENANT_CODE || 'banapele';
export const TIMEZONE = 'Asia/Calcutta';

// Chat runs on a separate Rocket.Chat-based service with its own auth token
// (see features/chat/api/chat.api.js) — unrelated to the Mentoring API above.
// Confirmed to accept direct cross-origin requests (no Origin-based tenant
// resolution like the Mentoring API), so no dev-proxy is needed for it.
export const CHAT_API_BASE_URL = import.meta.env.VITE_CHAT_API_BASE_URL || 'https://elevate-chat.shikshalokam.org';

// Community Voices YouTube content pipeline — entirely separate
// infrastructure from Elevate (see COMMUNITY_VOICES_YOUTUBE_ARCHITECTURE.md).
//
// SUPABASE_ANON_KEY is safe to ship in frontend code: it's the public,
// RLS-restricted key (content_items only readable where status='approved' —
// see the migration in supabase/migrations). It can NEVER write to that
// table. The YouTube Data API key and the Supabase *service role* key must
// never appear here or anywhere else in frontend code — both live only as
// Supabase Edge Function secrets (Deno.env), used server-side.
export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
export const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// PoC-only access control for /admin/content-review (Section 6) — a plain
// string comparison, bundled client-side like any other VITE_ var, so it is
// NOT a real secret (visible to anyone who inspects the bundle). The
// architecture doc explicitly accepts this as "sufficient for now" for an
// internal-only tool and calls for real authentication before production use.
export const ADMIN_REVIEW_PASSWORD = import.meta.env.VITE_ADMIN_REVIEW_PASSWORD || '';
