// Per-user bookmarks for Community Voices content_items (see
// supabase/migrations/0002_bookmarks.sql).
//
// SECURITY NOTE: the bookmarks table's RLS policy allows any anon-key
// request to read/write any row — it does not verify that the caller
// actually is the user_id it claims to be. That's because users are
// authenticated via Elevate's own Mentoring login, not Supabase's native
// auth, so there's no Supabase session/JWT to check user identity against
// with auth.uid(). Acceptable for this PoC; a real gap before production —
// anyone with the (public, unavoidably-exposed) anon key could pass an
// arbitrary user_id and read or modify someone else's bookmarks.
import { supabase } from '@/lib/supabase/client.js';
import { mapContentItem } from './contentItems.api.js';

export async function getBookmarkedContentItemIds(userId) {
  const { data, error } = await supabase.from('bookmarks').select('content_item_id').eq('user_id', String(userId));
  if (error) throw error;
  return new Set((data ?? []).map((row) => row.content_item_id));
}

export async function getBookmarkedContentItems(userId) {
  const { data, error } = await supabase
    .from('bookmarks')
    .select('content_item_id, content_items(id, title, video_id, published_at)')
    .eq('user_id', String(userId))
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data ?? []).filter((row) => row.content_items).map((row) => mapContentItem(row.content_items));
}

export async function addBookmark(userId, contentItemId) {
  const { error } = await supabase
    .from('bookmarks')
    .insert({ user_id: String(userId), content_item_id: contentItemId });
  if (error) throw error;
}

export async function removeBookmark(userId, contentItemId) {
  const { error } = await supabase
    .from('bookmarks')
    .delete()
    .eq('user_id', String(userId))
    .eq('content_item_id', contentItemId);
  if (error) throw error;
}
