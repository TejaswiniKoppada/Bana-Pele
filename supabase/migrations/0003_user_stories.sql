-- My Stories rebuild: link posts + device uploads.
--
-- KNOWN LIMITATION (same as bookmarks, flagged not silently changed): this
-- RLS policy does not cryptographically verify the requesting user — it
-- relies on the frontend correctly sending the right user_id, since users
-- are authenticated via Elevate's own Mentoring login, not Supabase's
-- native auth (no auth.uid() to check against). Acceptable for this PoC;
-- a real gap before production.
create table user_stories (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  title text not null,
  story_type text not null check (story_type in ('link', 'upload')),
  video_url text,
  storage_path text,
  shared_to_social boolean not null default false,
  created_at timestamptz not null default now()
);

alter table user_stories enable row level security;

create policy "Allow anon read/write on user_stories"
on user_stories for all to anon using (true) with check (true);

-- Storage bucket for uploaded video files (Section 2). Not specified
-- verbatim in the brief like the table above — this is the standard
-- Supabase pattern for a public-read bucket with anon upload, matching the
-- same PoC-permissive stance already used for user_stories/bookmarks above.
-- Flagged in the implementation summary as the one place left to fill in.
insert into storage.buckets (id, name, public)
values ('story-uploads', 'story-uploads', true)
on conflict (id) do nothing;

create policy "Allow anon upload to story-uploads"
on storage.objects for insert
to anon
with check (bucket_id = 'story-uploads');

create policy "Allow anon read story-uploads"
on storage.objects for select
to anon
using (bucket_id = 'story-uploads');
