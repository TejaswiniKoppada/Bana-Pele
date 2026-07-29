import { useCallback, useEffect, useState } from 'react';
import { BOOKMARKED_PAGE_SIZE, getBookmarkedContentItems, removeBookmark } from '../api/bookmarks.api';

// How long to wait after the user stops typing before the search actually
// re-queries Supabase — keeps a fast typist from firing a request per keystroke.
const SEARCH_DEBOUNCE_MS = 400;

/**
 * The Bookmarked tab's data: this user's bookmarked content_items, paginated
 * server-side and optionally filtered by a (debounced) title search — the
 * search runs server-side too, so pagination reflects the filtered result
 * count, not just what's on the current page.
 */
export function useBookmarkedContent(userId, search = '') {
  const [page, setPage] = useState(1);
  const [debouncedSearch, setDebouncedSearch] = useState(search);
  const [items, setItems] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Debounce the raw search text, and jump back to page 1 once it settles —
  // both updates land in the same tick so the fetch effect below only fires once.
  useEffect(() => {
    const timeout = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timeout);
  }, [search]);

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
          search: debouncedSearch,
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
    [userId, debouncedSearch]
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
