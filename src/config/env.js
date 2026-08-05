// Elevate Mentoring backend — see PEER_CONNECT_FULL_INTEGRATION_GUIDE.md for the source cURLs.

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

// API_BASE_URL defaults to the local dev proxy (see vite.config.js), which
// exists solely to work around the Mentoring API's Origin-based tenant
// resolution during local development — a Node process isn't a browser, so
// it's free to set the Origin header the API requires; a browser never is.
//
// A production static build has no such proxy, so it instead defaults to
// the elevate-proxy Supabase Edge Function (see
// supabase/functions/elevate-proxy) — same Origin-override trick, just
// running on Supabase's servers instead of localhost. Derived from
// SUPABASE_URL automatically so no separate var needs setting: whatever
// Supabase project is already configured for Community Voices is also where
// this function lives. Override either default with VITE_API_BASE_URL if
// needed (e.g. this app is ever served directly from the real portal origin,
// elevate-bana-pele.shikshalokam.org, where no proxy is needed at all).
const DEV_PROXY_PATH = '/elevate-api';

export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  (import.meta.env.PROD && SUPABASE_URL ? `${SUPABASE_URL}/functions/v1/elevate-proxy` : DEV_PROXY_PATH);

export const ORG_ID = import.meta.env.VITE_ORG_ID || '72';
export const TENANT_CODE = import.meta.env.VITE_TENANT_CODE || 'banapele';
export const TIMEZONE = 'Asia/Calcutta';

// Chat runs on a separate Rocket.Chat-based service with its own auth token
// (see features/chat/api/chat.api.js) — unrelated to the Mentoring API above.
// Confirmed to accept direct cross-origin requests (no Origin-based tenant
// resolution like the Mentoring API), so no dev-proxy or Edge Function
// detour is needed for it.
export const CHAT_API_BASE_URL = import.meta.env.VITE_CHAT_API_BASE_URL || 'https://elevate-chat.shikshalokam.org';

// demo-bap-server.js -- the Beckn buyer-side (BAP) service from the
// skillpath-backend repo. Powers the Registration Guide's AI-generated
// journey feature: triggers a real Beckn transaction with elevate-bpp
// (a separate, new Beckn provider), which generates a personalized
// journey via Claude. Entirely separate infrastructure from the
// Elevate Mentoring API above -- no relation to Peer Connect.
export const DEMO_BAP_BASE_URL = import.meta.env.VITE_DEMO_BAP_BASE_URL || 'http://localhost:3001';

// elevate-bpp-server.js -- talked to directly (not through demo-bap) only
// for the quick assessment-validation check, since that's a fast,
// throwaway call rather than a real Beckn transaction step. Everything
// else about journey generation goes through demo-bap as normal.
export const ELEVATE_BPP_BASE_URL = import.meta.env.VITE_ELEVATE_BPP_BASE_URL || 'http://localhost:3004';

// PoC-only access control for /admin/content-review (Section 6) — a plain
// string comparison, bundled client-side like any other VITE_ var, so it is
// NOT a real secret (visible to anyone who inspects the bundle). The
// architecture doc explicitly accepts this as "sufficient for now" for an
// internal-only tool and calls for real authentication before production use.
export const ADMIN_REVIEW_PASSWORD = import.meta.env.VITE_ADMIN_REVIEW_PASSWORD || '';
