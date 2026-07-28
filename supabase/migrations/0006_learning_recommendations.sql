-- My Learning: real mentor-authored recommendations, built on Supabase (not
-- Elevate's Programs & Projects, which has no firm access timeline for this
-- project) — a real table backing a real recommend -> accept -> start ->
-- complete flow, not mock data.
--
-- KNOWN LIMITATION (same as bookmarks/user_stories, flagged not silently
-- changed): this RLS policy does not cryptographically verify which user is
-- making the request — it relies on the frontend correctly sending the
-- right mentor_id/mentee_id. Users are authenticated via Elevate's own
-- Mentoring login, not Supabase's native auth system, so true per-user RLS
-- enforcement (auth.uid() checks) isn't available here without a separate
-- token-verification layer, which is out of scope for this PoC. Acceptable
-- for a PoC; a real security gap before any production use — anyone with
-- the anon key can read/write any user's recommendations by supplying an
-- arbitrary mentor_id/mentee_id.
create table learning_recommendations (
  id uuid primary key default gen_random_uuid(),
  mentor_id text not null,
  mentor_name text not null,
  mentee_id text not null,
  mentee_name text not null,
  title text not null,
  skill_category text not null,
  material_type text not null,
  resource_link text not null,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'in_progress', 'completed')),
  created_at timestamptz not null default now(),
  accepted_at timestamptz,
  started_at timestamptz,
  completed_at timestamptz
);

alter table learning_recommendations enable row level security;

create policy "Allow anon read/write on learning_recommendations"
on learning_recommendations for all to anon using (true) with check (true);
