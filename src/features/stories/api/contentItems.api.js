// Frontend read path for the Recommended tab (Section 7). Reads directly
// from Supabase using the anon key — RLS on content_items restricts this to
// status='approved' rows only, so no custom backend endpoint is needed here.
import { supabase } from '@/lib/supabase/client.js';

const PAGE_SIZE = 20;

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

export async function getApprovedContentItems() {
  // A misconfigured/unreachable SUPABASE_URL can leave the underlying
  // fetch() pending indefinitely rather than rejecting quickly (behavior
  // varies by network) — in that case .then()/.catch() never fire and a
  // caller's loading state hangs forever. Force it to settle after
  // TIMEOUT_MS so a real error always surfaces.
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const { data, error } = await supabase
      .from('content_items')
      .select('id, title, video_id, published_at')
      .eq('status', 'approved')
      .order('published_at', { ascending: false })
      .limit(PAGE_SIZE)
      .abortSignal(controller.signal);

    if (error) throw error;
    return (data ?? []).map(mapContentItem);
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
