import { useCallback, useEffect, useState } from 'react';
import { getBookmarkedContentItems, removeBookmark } from '../services/bookmarksService';

/** The Bookmarked tab's data: this user's bookmarked content_items, with removal filtering the visible list immediately. */
export function useBookmarkedContent(userId) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!userId) {
      setItems([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    getBookmarkedContentItems(userId)
      .then((data) => {
        if (cancelled) return;
        setItems(data);
        setError('');
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || 'Could not load bookmarks.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const unbookmark = useCallback(
    async (contentItemId) => {
      setItems((prev) => prev.filter((item) => item.id !== contentItemId));
      try {
        await removeBookmark(userId, contentItemId);
      } catch (err) {
        setError(err.message || 'Could not remove bookmark.');
      }
    },
    [userId]
  );

  return { items, loading, error, unbookmark };
}
