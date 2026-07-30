// Reverse proxy for the Elevate Mentoring API, meant to run as a Render Web
// Service — see README.md in this folder for why this exists and how to
// deploy it. Same logic as supabase/functions/elevate-proxy (that one is
// blocked by Elevate's WAF because it runs on Supabase's Edge Function
// infrastructure); this is a bet that a persistent server on different
// infrastructure isn't on the same blocklist. Not guaranteed — only
// deploying and testing it tells us for sure.
import express from 'express';

const ELEVATE_API_ORIGIN = 'https://elevate-apis.shikshalokam.org';
const ELEVATE_PORTAL_ORIGIN = 'https://elevate-bana-pele.shikshalokam.org';

// Restrict to your actual deployed frontend's origin rather than '*', so
// this proxy can't be used as an open relay for anyone else's requests to
// the Elevate API. Update if your frontend's origin ever changes.
const ALLOWED_ORIGIN = 'https://tejaswinikoppada.github.io';

const app = express();

// Capture the raw request body as a Buffer regardless of content type, so
// it can be forwarded byte-for-byte without needing to parse/re-serialize
// JSON (safer, and works for any body shape the app ever sends).
app.use(express.raw({ type: '*/*', limit: '5mb' }));

app.use((req, res, next) => {
  res.set('Access-Control-Allow-Origin', ALLOWED_ORIGIN);
  res.set('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  res.set('Access-Control-Allow-Headers', '*');
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }
  next();
});

app.all('*', async (req, res) => {
  const targetUrl = `${ELEVATE_API_ORIGIN}${req.originalUrl}`;

  const forwardHeaders = new Headers();
  for (const [key, value] of Object.entries(req.headers)) {
    // 'host' must match the target, not this proxy; Node sets it from the
    // outgoing request automatically. Skip hop-by-hop / connection-specific
    // headers that don't make sense to forward as-is.
    if (['host', 'connection', 'content-length'].includes(key)) continue;
    if (typeof value === 'string') forwardHeaders.set(key, value);
  }
  forwardHeaders.set('origin', ELEVATE_PORTAL_ORIGIN);

  try {
    const upstreamResponse = await fetch(targetUrl, {
      method: req.method,
      headers: forwardHeaders,
      body: ['GET', 'HEAD'].includes(req.method) ? undefined : req.body,
    });

    res.status(upstreamResponse.status);
    upstreamResponse.headers.forEach((value, key) => {
      if (!['access-control-allow-origin', 'access-control-allow-methods', 'access-control-allow-headers'].includes(key)) {
        res.set(key, value);
      }
    });

    const buffer = Buffer.from(await upstreamResponse.arrayBuffer());
    res.send(buffer);
  } catch (err) {
    res.status(502).json({ error: 'Proxy failed to reach Elevate', message: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`elevate-proxy listening on port ${PORT}`);
});
