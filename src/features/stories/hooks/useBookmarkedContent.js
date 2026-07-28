import { useCallback, useEffect, useState } from 'react';
import { BOOKMARKED_PAGE_SIZE, getBookmarkedContentItems, removeBookmark } from '../api/bookmarks.api';

/** The Bookmarked tab's data: this user's bookmarked content_items, paginated server-side. */
export function useBookmarkedContent(userId) {
  const [page, setPage] = useState(1);
  const [items, setItems] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchPage = useCallback(
    async (targetPage) => {
      if (!userId) {
        setItems([]);
        setTotalCount(0);
        setLoading(false);
        return { items: [], count: 0 };
      }
      setLoading(true);
      try {
        const { items: data, totalCount: count } = await getBookmarkedContentItems(userId, {
          page: targetPage,
          pageSize: BOOKMARKED_PAGE_SIZE,
        });
        setItems(data);
        setTotalCount(count);
        setError('');
        return { items: data, count };
      } catch (err) {
        setError(err.message || 'Could not load bookmarks.');
        return { items: [], count: 0 };
      } finally {
        setLoading(false);
      }
    },
    [userId]
  );

  useEffect(() => {
    fetchPage(page);
  }, [page, fetchPage]);

  const totalPages = Math.max(1, Math.ceil(totalCount / BOOKMARKED_PAGE_SIZE));

  function goToPage(nextPage) {
    setPage(Math.min(Math.max(1, nextPage), totalPages));
  }

  const unbookmark = useCallback(
    async (contentItemId) => {
      try {
        await removeBookmark(userId, contentItemId);
      } catch (err) {
        setError(err.message || 'Could not remove bookmark.');
        return;
      }
      // Re-fetch rather than just filtering the item out locally — removing
      // the last item on a later page should pull the next page's item up
      // (or step back a page), not leave a short/empty page on screen.
      const { items: refreshed } = await fetchPage(page);
      if (refreshed.length === 0 && page > 1) {
        setPage(page - 1);
      }
    },
    [userId, page, fetchPage]
  );

  return { items, loading, error, page, totalPages, goToPage, unbookmark };
}
