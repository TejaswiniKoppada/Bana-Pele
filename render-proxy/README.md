# Elevate Mentoring API proxy (Render)

Same purpose as `supabase/functions/elevate-proxy`: make the Elevate
Mentoring API reachable from a static frontend by setting the `Origin`
header server-side (browsers never allow JS to do this). That Supabase
version gets blocked by Elevate's WAF — this is a bet that a persistent
Render Web Service, on different infrastructure, isn't on the same
blocklist. **Not guaranteed** — deploying it is how we find out for sure.

Tested locally and confirmed working correctly (reaches Elevate, gets a
real response back) — what's unverified is only whether *Render's* IP
specifically is blocked the same way Supabase's is.

## Deploy it

1. Go to [render.com](https://dashboard.render.com) and sign up/log in
   (free tier is enough).
2. **New +** → **Web Service**.
3. Connect your GitHub account and select the `Bana-Pele` repo.
4. Fill in:
   - **Name**: anything, e.g. `bana-pele-elevate-proxy`
   - **Root Directory**: `render-proxy`
   - **Runtime**: Node
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Instance Type**: Free
5. Before deploying, note: the `ALLOWED_ORIGIN` constant in `server.js` is
   already set to `https://tejaswinikoppada.github.io` — only change it if
   your frontend's origin is different.
6. Click **Create Web Service**. Render builds and deploys it, then gives
   you a URL like `https://bana-pele-elevate-proxy.onrender.com`.

## Test it directly (before touching the frontend)

```
curl -X POST "https://<your-render-url>/user/v1/account/login" \
  -H "Content-Type: application/json" \
  -H "Origin: https://tejaswinikoppada.github.io" \
  -d '{"identifier":"test@example.com","password":"test"}'
```

- **If you get back JSON** like
  `{"responseCode":"CLIENT_ERROR",...,"message":"Invalid identifier or
  password..."}` — it worked. Render's IP isn't blocked. Move to "Wire it
  into the frontend" below.
- **If you get back a bare `403 Forbidden` HTML page** (no JSON) — same
  block as Supabase. Render doesn't get around this either, which tells us
  the block is broad (most/all cloud hosting), not Supabase-specific — at
  that point, Elevate's team really is the only remaining path.

## Wire it into the frontend (only if the test above succeeded)

GitHub repo → **Settings → Secrets and variables → Actions**:
- Add or update secret `VITE_API_BASE_URL` = your Render URL (no trailing
  slash), e.g. `https://bana-pele-elevate-proxy.onrender.com`

This takes priority over the auto-derived Supabase proxy URL (see
`src/config/env.js`), so setting it switches the whole app to use this
proxy instead, with no code changes needed.

Re-run the **Web CI** workflow to redeploy with it.

## Known tradeoff: cold starts

Render's free tier spins the service down after 15 minutes of no traffic,
and takes ~30-60 seconds to wake back up on the next request. The first
login attempt after a quiet period will feel slow; it's normal, not a bug.
If that's a problem later, Render's paid tier keeps it always-on.
