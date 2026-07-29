-- Removes the manual Pending -> Accept step: mentor-sent recommendations now
-- land directly as 'accepted' (visible in the mentee's Recommended tab),
-- skipping 'pending' entirely. Also adds recommendation_group_id so the one
-- or more materials sent together in a single "Recommend Learning" action
-- can be queried and displayed as one grouped card instead of one card per
-- material — see learningService.js's createRecommendations/
-- startRecommendationGroup.
alter table learning_recommendations
  add column recommendation_group_id uuid not null default gen_random_uuid();

update learning_recommendations
  set status = 'accepted', accepted_at = coalesce(accepted_at, created_at)
  where status = 'pending';

alter table learning_recommendations
  drop constraint learning_recommendations_status_check;

alter table learning_recommendations
  alter column status set default 'accepted';

alter table learning_recommendations
  add constraint learning_recommendations_status_check
  check (status in ('accepted', 'in_progress', 'completed'));
