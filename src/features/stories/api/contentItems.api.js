// Frontend read path for the Recommended tab (Section 7). Reads directly
// from Supabase using the anon key — RLS on content_items restricts this to
// status='approved' rows only, so no custom backend endpoint is needed here.
import { supabase } from '@/lib/supabase/client.js';

export const RECOMMENDED_PAGE_SIZE = 6;

/** Maps a content_items row into the shape StoryCard already expects. */
export function mapContentItem(row) {
  return {
    id: row.id,
    title: row.title,
    sourceUrl: `https://www.youtube.com/watch?v=${row.video_id}`,
    category: 'recommended',
  };
}

const TIMEOUT_MS = 10000;

/**
 * One page of approved content_items for the Recommended tab (page is
 * 1-based). Uses Postgrest's exact count alongside the page's rows — in the
 * same request — so the caller can derive total page count without a
 * separate query.
 */
export async function getApprovedContentItems({ page = 1, pageSize = RECOMMENDED_PAGE_SIZE } = {}) {
  // A misconfigured/unreachable SUPABASE_URL can leave the underlying
  // fetch() pending indefinitely rather than rejecting quickly (behavior
  // varies by network) — in that case .then()/.catch() never fire and a
  // caller's loading state hangs forever. Force it to settle after
  // TIMEOUT_MS so a real error always surfaces.
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  try {
    const { data, error, count } = await supabase
      .from('content_items')
      .select('id, title, video_id, published_at', { count: 'exact' })
      .eq('status', 'approved')
      .order('published_at', { ascending: false })
      .range(from, to)
      .abortSignal(controller.signal);

    if (error) throw error;
    return { items: (data ?? []).map(mapContentItem), totalCount: count ?? 0 };
  } catch (err) {
    if (controller.signal.aborted) {
      throw new Error(
        'Timed out reaching Supabase. Check VITE_SUPABASE_URL/VITE_SUPABASE_ANON_KEY and your network connection.'
      );
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
}
