-- Community Voices YouTube content pipeline.
-- See COMMUNITY_VOICES_YOUTUBE_ARCHITECTURE.md (Section 4) for the full design.

create table if not exists content_items (
  id uuid primary key default gen_random_uuid(),
  platform text not null default 'youtube',
  video_id text not null,
  title text,
  description text,
  thumbnail_url text,
  channel_title text,
  published_at timestamptz,
  fetched_at timestamptz not null default now(),
  search_keyword text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  reviewed_by text,
  reviewed_at timestamptz,
  unique (platform, video_id)
);

-- Supports the Recommended tab's exact query (status = 'approved', ordered
-- by published_at desc) and the admin page's pending-list query.
create index if not exists content_items_status_published_at_idx
  on content_items (status, published_at desc);

alter table content_items enable row level security;

-- Public/anon read access allowed only for approved rows (Section 4).
create policy "Public can read approved content"
  on content_items
  for select
  to anon
  using (status = 'approved');

-- No insert/update/delete policy exists for anon or authenticated roles.
-- With RLS enabled, the absence of a policy for an operation denies it by
-- default — so writes are only possible via the service role key, which
-- bypasses RLS entirely. That's used exclusively server-side, by the
-- fetch-youtube-content and admin-content Edge Functions (Section 5 and 6) —
-- never by the frontend.
