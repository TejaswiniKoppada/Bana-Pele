// My Stories — link posts + device uploads (see
// supabase/migrations/0003_user_stories.sql for the table + storage bucket).
//
// SECURITY NOTE: same limitation as bookmarks — the user_stories RLS policy
// allows any anon-key request to read/write any row; it does not verify the
// caller actually is the user_id it claims to be, since there's no Supabase
// auth session to check against (Elevate/Mentoring handles auth
// separately). Acceptable for this PoC; a real gap before production.
import { supabase } from '@/lib/supabase/client.js';

export const ALLOWED_VIDEO_MIME_TYPES = ['video/mp4', 'video/quicktime', 'video/webm'];
export const ALLOWED_VIDEO_EXTENSIONS = ['.mp4', '.mov', '.webm'];
export const MAX_UPLOAD_BYTES = 50 * 1024 * 1024; // 50MB

const BUCKET = 'story-uploads';

/**
 * Client-side check before any upload starts — mirrored by the bucket's own
 * file_size_limit/allowed_mime_types as a server-side backstop, but this is
 * what actually stops a bad pick before a long upload attempt begins.
 */
export function validateStoryFile(file) {
  if (!file) return 'Please choose a video file.';
  const hasAllowedExtension = ALLOWED_VIDEO_EXTENSIONS.some((ext) => file.name.toLowerCase().endsWith(ext));
  const hasAllowedType = ALLOWED_VIDEO_MIME_TYPES.includes(file.type);
  if (!hasAllowedType && !hasAllowedExtension) {
    return 'Only MP4, MOV, or WEBM video files are supported.';
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return 'That file is too large — videos must be 50MB or smaller.';
  }
  return null;
}

function mapUserStory(row) {
  return {
    id: row.id,
    title: row.title,
    sourceUrl: row.video_url || '',
    storyType: row.story_type,
    thumbnailUrl: row.thumbnail_url || '',
    sharedToSocial: row.shared_to_social,
  };
}

export async function getUserStories(userId) {
  const { data, error } = await supabase
    .from('user_stories')
    .select('*')
    .eq('user_id', String(userId))
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data ?? []).map(mapUserStory);
}

export async function createLinkStory(userId, { title, videoUrl }) {
  const { data, error } = await supabase
    .from('user_stories')
    .insert({ user_id: String(userId), title, story_type: 'link', video_url: videoUrl })
    .select()
    .single();

  if (error) throw error;
  return mapUserStory(data);
}

function sanitizeFileName(name) {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_');
}

/**
 * Best-effort: the thumbnail is a nice-to-have preview, not the story
 * itself, so any failure here (bad data URL, upload rejected) just means no
 * thumbnail gets saved — it never blocks or fails the story post.
 */
async function uploadThumbnail(userId, dataUrl) {
  try {
    const blob = await (await fetch(dataUrl)).blob();
    const path = `${userId}/thumbnails/${Date.now()}.jpg`;
    const { error: uploadError } = await supabase.storage.from(BUCKET).upload(path, blob, {
      contentType: 'image/jpeg',
      upsert: false,
    });
    if (uploadError) throw uploadError;
    const {
      data: { publicUrl },
    } = supabase.storage.from(BUCKET).getPublicUrl(path);
    return publicUrl;
  } catch (err) {
    console.warn('Could not save story thumbnail:', err.message);
    return null;
  }
}

export async function createUploadStory(userId, { title, file, thumbnail }) {
  const validationError = validateStoryFile(file);
  if (validationError) throw new Error(validationError);

  const path = `${userId}/${Date.now()}-${sanitizeFileName(file.name)}`;

  const { error: uploadError } = await supabase.storage.from(BUCKET).upload(path, file, {
    contentType: file.type,
    upsert: false,
  });
  if (uploadError) throw uploadError;

  const {
    data: { publicUrl },
  } = supabase.storage.from(BUCKET).getPublicUrl(path);

  const thumbnailUrl = thumbnail ? await uploadThumbnail(userId, thumbnail) : null;

  const baseRow = {
    user_id: String(userId),
    title,
    story_type: 'upload',
    storage_path: path,
    video_url: publicUrl,
  };

  let { data, error } = await supabase
    .from('user_stories')
    .insert({ ...baseRow, thumbnail_url: thumbnailUrl })
    .select()
    .single();

  // PGRST204 = "column not found in schema cache" — the thumbnail_url
  // migration (supabase/migrations/0005_story_thumbnails.sql) hasn't been
  // run against this project yet. Don't let a missing nice-to-have column
  // block the story post itself; retry without it.
  if (error?.code === 'PGRST204') {
    console.warn('thumbnail_url column missing — run 0005_story_thumbnails.sql. Posting without a thumbnail.');
    ({ data, error } = await supabase.from('user_stories').insert(baseRow).select().single());
  }

  if (error) throw error;
  return mapUserStory(data);
}

/**
 * The Web Share API only confirms the user was handed the share sheet, not
 * that they actually completed posting on whatever platform they picked —
 * "shared" here means "user initiated a share," not a verified guarantee.
 * shared_to_social is purely informational (badge text) — it never hides or
 * disables the Share button itself.
 */
export async function markStoryShared(storyId) {
  const { data, error } = await supabase
    .from('user_stories')
    .update({ shared_to_social: true })
    .eq('id', storyId)
    .select()
    .single();

  if (error) throw error;
  return mapUserStory(data);
}

/**
 * Scoped to (id, user_id) so a request can only ever delete its own
 * stories — matches the same user_id filter used everywhere else. Deletes
 * the row first, then removes the uploaded file (if any) from Storage; if
 * that second step fails the row is already gone (so the delete already
 * succeeded from the UI's point of view) — just warn rather than surface an
 * error for what's now an orphaned-file cleanup concern, not a failed delete.
 */
export async function deleteStory(userId, storyId) {
  const { data, error } = await supabase
    .from('user_stories')
    .delete()
    .eq('id', storyId)
    .eq('user_id', String(userId))
    .select()
    .single();

  if (error) throw error;

  const paths = [data?.storage_path, thumbnailPathFromUrl(data?.thumbnail_url)].filter(Boolean);
  if (paths.length) {
    const { error: removeError } = await supabase.storage.from(BUCKET).remove(paths);
    if (removeError) {
      console.warn('Story deleted, but its uploaded file(s) could not be removed from storage:', removeError.message);
    }
  }

  return data.id;
}

function thumbnailPathFromUrl(thumbnailUrl) {
  if (!thumbnailUrl) return null;
  const marker = `/${BUCKET}/`;
  const index = thumbnailUrl.indexOf(marker);
  return index === -1 ? null : thumbnailUrl.slice(index + marker.length);
}
