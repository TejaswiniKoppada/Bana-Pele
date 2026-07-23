import { useCallback, useEffect, useState } from 'react';
import { addBookmark, getBookmarkedContentItemIds, removeBookmark } from '../services/bookmarksService';

/**
 * Tracks which content_items ids the given user has bookmarked, for the
 * Recommended tab — cards stay visible regardless of bookmark state, so this
 * exposes a Set + an optimistic toggle rather than filtering a list.
 */
export function useBookmarkedIds(userId) {
  const [bookmarkedIds, setBookmarkedIds] = useState(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setBookmarkedIds(new Set());
      setLoading(false);
      return;
    }
    let cancelled = false;
    getBookmarkedContentItemIds(userId)
      .then((ids) => {
        if (!cancelled) setBookmarkedIds(ids);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const toggleBookmark = useCallback(
    async (contentItemId) => {
      const wasBookmarked = bookmarkedIds.has(contentItemId);

      // Reflect the change on the icon immediately; reconcile after the
      // request settles.
      setBookmarkedIds((prev) => {
        const next = new Set(prev);
        if (wasBookmarked) next.delete(contentItemId);
        else next.add(contentItemId);
        return next;
      });

      try {
        if (wasBookmarked) await removeBookmark(userId, contentItemId);
        else await addBookmark(userId, contentItemId);
      } catch {
        // Revert on failure.
        setBookmarkedIds((prev) => {
          const next = new Set(prev);
          if (wasBookmarked) next.add(contentItemId);
          else next.delete(contentItemId);
          return next;
        });
      }
    },
    [bookmarkedIds, userId]
  );

  return { bookmarkedIds, loading, toggleBookmark };
}
