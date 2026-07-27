// Ingestion job (Section 5). Loops over KEYWORDS, calls YouTube Data API v3
// search.list per keyword, and upserts results into content_items as
// 'pending'. YOUTUBE_API_KEY is read from a Supabase secret (Deno.env) —
// never hardcoded, never sent to or visible from the frontend.
//
// Invoke manually first (Section 8, step 3/7) before wiring the scheduled
// GitHub Actions trigger:
//   supabase functions deploy fetch-youtube-content
//   curl -i -X POST '<project-url>/functions/v1/fetch-youtube-content' \
//     -H "Authorization: Bearer <anon-or-service-role-key>"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { KEYWORDS } from './keywords.ts';

const YOUTUBE_SEARCH_URL = 'https://www.googleapis.com/youtube/v3/search';

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  if (req.method !== 'POST' && req.method !== 'GET') {
    return json({ error: 'Method not allowed' }, 405);
  }

  const youtubeApiKey = Deno.env.get('YOUTUBE_API_KEY');
  if (!youtubeApiKey) {
    return json({ error: 'YOUTUBE_API_KEY secret is not set for this function.' }, 500);
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceRoleKey) {
    return json({ error: 'SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are not available to this function.' }, 500);
  }
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  const results = [];

  for (const keyword of KEYWORDS) {
    const url = new URL(YOUTUBE_SEARCH_URL);
    url.searchParams.set('part', 'snippet');
    url.searchParams.set('q', keyword);
    url.searchParams.set('type', 'video');
    url.searchParams.set('order', 'relevance');
    url.searchParams.set('maxResults', '10');
    url.searchParams.set('key', youtubeApiKey);

    try {
      const response = await fetch(url.toString());
      if (!response.ok) {
        const body = await response.text();
        results.push({ keyword, error: `YouTube API ${response.status}: ${body.slice(0, 300)}` });
        continue;
      }

      const data = await response.json();
      const items = (data.items ?? []).filter((item) => item.id?.videoId);

      const rows = items.map((item) => ({
        platform: 'youtube',
        video_id: item.id.videoId,
        title: item.snippet?.title ?? '',
        description: item.snippet?.description ?? '',
        thumbnail_url: item.snippet?.thumbnails?.high?.url ?? item.snippet?.thumbnails?.default?.url ?? '',
        channel_title: item.snippet?.channelTitle ?? '',
        published_at: item.snippet?.publishedAt ?? null,
        search_keyword: keyword,
        // Keywords are all South-Africa-scoped now, so results are trusted
        // enough to skip manual admin review and go straight to approved.
        status: 'approved',
        reviewed_by: 'auto-ingest',
        reviewed_at: new Date().toISOString(),
      }));

      if (rows.length === 0) {
        results.push({ keyword, fetched: 0, inserted: 0 });
        continue;
      }

      // onConflict + ignoreDuplicates -> INSERT ... ON CONFLICT DO NOTHING.
      // A video already in the table (pending, approved, or rejected) is
      // left completely untouched — its status is never reset by a later
      // fetch run, per Section 5's upsert rule.
      const { data: upserted, error } = await supabase
        .from('content_items')
        .upsert(rows, { onConflict: 'platform,video_id', ignoreDuplicates: true })
        .select('id');

      if (error) {
        results.push({ keyword, error: error.message });
      } else {
        results.push({ keyword, fetched: rows.length, inserted: upserted?.length ?? 0 });
      }
    } catch (err) {
      results.push({ keyword, error: err instanceof Error ? err.message : String(err) });
    }
  }

  return json({ success: true, results });
});
