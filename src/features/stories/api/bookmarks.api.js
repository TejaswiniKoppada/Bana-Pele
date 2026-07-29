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
import { escapeIlike, mapContentItem } from './contentItems.api.js';

export const BOOKMARKED_PAGE_SIZE = 6;

export async function getBookmarkedContentItemIds(userId) {
  const { data, error } = await supabase.from('bookmarks').select('content_item_id').eq('user_id', String(userId));
  if (error) throw error;
  return new Set((data ?? []).map((row) => row.content_item_id));
}

/** One page of this user's bookmarked content_items (page is 1-based), optionally filtered by a case-insensitive title search, newest bookmark first. */
export async function getBookmarkedContentItems(userId, { page = 1, pageSize = BOOKMARKED_PAGE_SIZE, search = '' } = {}) {
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  const trimmedSearch = search.trim();

  // `!inner` makes the join required rather than left-outer, so filtering on
  // the embedded content_items.title actually excludes non-matching
  // bookmarks rather than just nulling out their embedded resource.
  let query = supabase
    .from('bookmarks')
    .select(
      `content_item_id, content_items${trimmedSearch ? '!inner' : ''}(id, title, video_id, published_at)`,
      { count: 'exact' }
    )
    .eq('user_id', String(userId));

  if (trimmedSearch) {
    query = query.ilike('content_items.title', `%${escapeIlike(trimmedSearch)}%`);
  }

  const { data, error, count } = await query.order('created_at', { ascending: false }).range(from, to);

  if (error) throw error;
  const items = (data ?? []).filter((row) => row.content_items).map((row) => mapContentItem(row.content_items));
  return { items, totalCount: count ?? 0 };
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
