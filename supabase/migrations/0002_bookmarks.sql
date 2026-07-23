-- Per-user bookmarks for Community Voices content_items.
--
-- KNOWN LIMITATION (flagged, not silently worked around): this RLS policy
-- does not cryptographically verify which user is making the request — it
-- relies on the frontend correctly sending the right user_id. Users are
-- authenticated via Elevate's own Mentoring login, not Supabase's native
-- auth system, so true per-user RLS enforcement (auth.uid() checks) isn't
-- available here without a separate token-verification layer, which is out
-- of scope for this PoC. Acceptable for a PoC; a real security gap before
-- any production use — anyone with the anon key can read/write any user's
-- bookmarks by supplying an arbitrary user_id.
create table bookmarks (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  content_item_id uuid not null references content_items(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, content_item_id)
);

alter table bookmarks enable row level security;

create policy "Allow anon read/write on bookmarks"
on bookmarks for all to anon using (true) with check (true);
