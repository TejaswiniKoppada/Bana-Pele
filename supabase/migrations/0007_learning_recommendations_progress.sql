-- Adds a simulated/illustrative progress value to the Progress tab so
-- "Start Learning" no longer jumps straight from accepted to complete —
-- see learningService.js's startRecommendation/completeRecommendation/
-- bumpRecommendationProgress. This is NOT real video-watch telemetry (not
-- feasible without a video player integration); it's a demo-only number
-- that starts low on Start Learning, can tick up slightly while the item
-- is reopened, and only ever reaches 100 when the mentee taps Mark
-- Complete.
alter table learning_recommendations
  add column progress_percent integer not null default 0
  check (progress_percent >= 0 and progress_percent <= 100);
