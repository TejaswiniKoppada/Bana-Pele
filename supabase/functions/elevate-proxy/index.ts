// Reverse proxy for the Elevate Mentoring API, invoked at
// <SUPABASE_URL>/functions/v1/elevate-proxy/<elevate-path> — see
// src/config/env.js for how the frontend derives that URL automatically
// from VITE_SUPABASE_URL in production builds.
//
// WHY THIS EXISTS: Elevate resolves tenant/org by the request's Origin
// header, requiring it to be exactly
// https://elevate-bana-pele.shikshalokam.org (confirmed live — see
// docs/PEER_CONNECT_FULL_INTEGRATION_GUIDE.md and vite.config.js's
// dev-server proxy, which does the same override for local development).
// Browsers never let JavaScript set or override the Origin header — it's
// forbidden, enforced by the browser itself — so a static frontend calling
// Elevate directly always fails with "Tenant domain not found". This
// function sets Origin server-side, where that restriction doesn't apply,
// so the deployed site can reach Elevate the same way `npm run dev` already
// does through the Vite proxy.
const ELEVATE_API_ORIGIN = 'https://elevate-apis.shikshalokam.org';
const ELEVATE_PORTAL_ORIGIN = 'https://elevate-bana-pele.shikshalokam.org';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-auth-token, org-id, timezone',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const url = new URL(req.url);
  // Supabase invokes this function for any path under
  // /functions/v1/elevate-proxy/... — strip that prefix and forward the
  // rest verbatim (e.g. /user/v1/account/login) to the real API.
  const elevatePath = url.pathname.replace(/^\/functions\/v1\/elevate-proxy/, '');
  const targetUrl = `${ELEVATE_API_ORIGIN}${elevatePath}${url.search}`;

  const forwardHeaders = new Headers(req.headers);
  forwardHeaders.set('origin', ELEVATE_PORTAL_ORIGIN);
  forwardHeaders.delete('host');
  // These authenticate the call *to this function* (Supabase requires a
  // valid anon-key bearer token to invoke any Edge Function) — Elevate
  // doesn't need, and shouldn't see, them.
  forwardHeaders.delete('authorization');
  forwardHeaders.delete('apikey');

  const upstreamResponse = await fetch(targetUrl, {
    method: req.method,
    headers: forwardHeaders,
    body: ['GET', 'HEAD'].includes(req.method) ? undefined : req.body,
  });

  const responseHeaders = new Headers(upstreamResponse.headers);
  for (const [key, value] of Object.entries(corsHeaders)) {
    responseHeaders.set(key, value);
  }

  return new Response(upstreamResponse.body, {
    status: upstreamResponse.status,
    headers: responseHeaders,
  });
});
