// My Learning — real mentor-authored recommendations (see
// supabase/migrations/0006_learning_recommendations.sql). Built on Supabase
// rather than Elevate's Programs & Projects, which has no firm access
// timeline for this project — a documented, timeline-justified decision,
// not mock data.
//
// SECURITY NOTE: same known limitation as bookmarks/user_stories — this
// table's RLS policy allows any anon-key request to read/write any row; it
// does not verify the caller actually is the mentor_id/mentee_id it claims.
// Acceptable for this PoC; a real gap before production. See the migration
// file for the full comment.
import { supabase } from "@/lib/supabase/client.js";

function mapRecommendation(row) {
  return {
    id: row.id,
    mentorId: row.mentor_id,
    mentorName: row.mentor_name,
    menteeId: row.mentee_id,
    menteeName: row.mentee_name,
    title: row.title,
    skillCategory: row.skill_category,
    materialType: row.material_type,
    resourceLink: row.resource_link,
    status: row.status,
    progressPercent: row.progress_percent ?? 0,
    createdAt: row.created_at,
    acceptedAt: row.accepted_at,
    startedAt: row.started_at,
    completedAt: row.completed_at,
  };
}

function randomInRange(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/** Mentor recommends one or more catalog items to a connection — one row per item, all 'pending'. */
export async function createRecommendations({
  mentorId,
  mentorName,
  menteeId,
  menteeName,
  items,
}) {
  const rows = items.map((item) => ({
    mentor_id: String(mentorId),
    mentor_name: mentorName,
    mentee_id: String(menteeId),
    mentee_name: menteeName,
    title: item.title,
    skill_category: item.skillCategory,
    material_type: item.materialType,
    resource_link: item.resourceLink,
  }));
  const { error } = await supabase
    .from("learning_recommendations")
    .insert(rows);
  if (error) throw error;
}

/** Recommendations for the current user, filtered to one or more statuses. */
export async function getRecommendationsByStatus(menteeId, statuses) {
  const { data, error } = await supabase
    .from("learning_recommendations")
    .select("*")
    .eq("mentee_id", String(menteeId))
    .in("status", statuses)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(mapRecommendation);
}

/** Pending -> accepted. */
export async function acceptRecommendation(id) {
  const { error } = await supabase
    .from("learning_recommendations")
    .update({ status: "accepted", accepted_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

/**
 * Accepted -> in_progress (also called when the resource link is opened).
 * progress_percent is seeded to a "just started" 10-25% — DEMO-ILLUSTRATIVE
 * ONLY, not real video-watch telemetry (not feasible without a player
 * integration) — so the Progress tab shows a real partial bar instead of
 * jumping straight from 0 to Completed. Only completeRecommendation below
 * is allowed to reach 100.
 */
export async function startRecommendation(id) {
  const { error } = await supabase
    .from("learning_recommendations")
    .update({
      status: "in_progress",
      started_at: new Date().toISOString(),
      progress_percent: randomInRange(10, 25),
    })
    .eq("id", id);
  if (error) throw error;
}

/**
 * Nudges an in-progress item's simulated progress up by 15-20%, capped at
 * 95 so it can never read as complete on its own — optional, called when
 * the mentee reopens an in-progress item's detail view, to simulate
 * continued engagement. Same demo-illustrative caveat as startRecommendation.
 */
export async function bumpRecommendationProgress(id, currentPercent) {
  const next = Math.min((currentPercent ?? 0) + randomInRange(15, 20), 95);
  const { error } = await supabase
    .from("learning_recommendations")
    .update({ progress_percent: next })
    .eq("id", id);
  if (error) throw error;
  return next;
}

/** In_progress -> completed. The only path that ever sets progress_percent to 100. */
export async function completeRecommendation(id) {
  const { error } = await supabase
    .from("learning_recommendations")
    .update({
      status: "completed",
      completed_at: new Date().toISOString(),
      progress_percent: 100,
    })
    .eq("id", id);
  if (error) throw error;
}

/**
 * Pending recommendations for a mentee, grouped by mentor — feeds the real
 * "you have new recommended learning" notification (see
 * notificationsService.js). `count` is how many items that mentor sent in
 * one go; groups sort newest-first by their most recent item.
 */
export async function getPendingRecommendationGroups(menteeId) {
  const { data, error } = await supabase
    .from("learning_recommendations")
    .select("mentor_id, mentor_name, created_at")
    .eq("mentee_id", String(menteeId))
    .eq("status", "pending")
    .order("created_at", { ascending: false });
  if (error) throw error;

  const groups = new Map();
  for (const row of data ?? []) {
    const existing = groups.get(row.mentor_id);
    if (existing) {
      existing.count += 1;
      if (row.created_at > existing.latestCreatedAt)
        existing.latestCreatedAt = row.created_at;
    } else {
      groups.set(row.mentor_id, {
        mentorId: row.mentor_id,
        mentorName: row.mentor_name,
        count: 1,
        latestCreatedAt: row.created_at,
      });
    }
  }
  return [...groups.values()].sort((a, b) =>
    a.latestCreatedAt < b.latestCreatedAt ? 1 : -1,
  );
}
