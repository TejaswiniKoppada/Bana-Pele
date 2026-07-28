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
    createdAt: row.created_at,
    acceptedAt: row.accepted_at,
    startedAt: row.started_at,
    completedAt: row.completed_at,
  };
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

/** Accepted -> in_progress (also called when the resource link is opened). */
export async function startRecommendation(id) {
  const { error } = await supabase
    .from("learning_recommendations")
    .update({ status: "in_progress", started_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

/** In_progress -> completed. */
export async function completeRecommendation(id) {
  const { error } = await supabase
    .from("learning_recommendations")
    .update({ status: "completed", completed_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}
