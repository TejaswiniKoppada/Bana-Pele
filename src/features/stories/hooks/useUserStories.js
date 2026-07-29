import { useCallback, useEffect, useState } from 'react';
import {
  createLinkStory,
  createUploadStory,
  deleteStory as deleteStoryService,
  getUserStories,
  markStoryShared,
  MY_STORIES_PAGE_SIZE,
} from '../api/stories.api';

// How long to wait after the user stops typing before the search actually
// re-queries Supabase — keeps a fast typist from firing a request per keystroke.
const SEARCH_DEBOUNCE_MS = 400;

/**
 * My Stories' data: this user's posted stories (link + upload), paginated
 * server-side and keyed by user_id — persists across logout/login like
 * bookmarks. Optionally filtered by a (debounced) title search, which runs
 * server-side too, so pagination reflects the filtered result count, not
 * just what's on the current page.
 */
export function useUserStories(userId, search = '') {
  const [page, setPage] = useState(1);
  const [debouncedSearch, setDebouncedSearch] = useState(search);
  const [stories, setStories] = useState([]);
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
        setStories([]);
        setTotalCount(0);
        setLoading(false);
        return { items: [], count: 0 };
      }
      setLoading(true);
      try {
        const { items, totalCount: count } = await getUserStories(userId, {
          page: targetPage,
          pageSize: MY_STORIES_PAGE_SIZE,
          search: debouncedSearch,
        });
        setStories(items);
        setTotalCount(count);
        setError('');
        return { items, count };
      } catch (err) {
        setError(err.message || 'Could not load stories.');
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

  const totalPages = Math.max(1, Math.ceil(totalCount / MY_STORIES_PAGE_SIZE));

  function goToPage(nextPage) {
    setPage(Math.min(Math.max(1, nextPage), totalPages));
  }

  const addLinkStory = useCallback(
    async ({ title, videoUrl }) => {
      const saved = await createLinkStory(userId, { title, videoUrl });
      // New stories sort first (created_at desc) — jump back to page 1 so
      // the one just posted is immediately visible.
      if (page === 1) await fetchPage(1);
      else setPage(1);
      return saved;
    },
    [userId, page, fetchPage]
  );

  const addUploadStory = useCallback(
    async ({ title, file, thumbnail }) => {
      const saved = await createUploadStory(userId, { title, file, thumbnail });
      if (page === 1) await fetchPage(1);
      else setPage(1);
      return saved;
    },
    [userId, page, fetchPage]
  );

  const shareStory = useCallback(async (storyId) => {
    const updated = await markStoryShared(storyId);
    setStories((prev) => prev.map((story) => (story.id === storyId ? updated : story)));
    return updated;
  }, []);

  const deleteStory = useCallback(
    async (storyId) => {
      await deleteStoryService(userId, storyId);
      // Re-fetch the current page rather than just filtering it client-side —
      // deleting the last item on a later page should pull the next page's
      // item up (or step back a page), not leave a short/empty page on screen.
      const { items } = await fetchPage(page);
      if (items.length === 0 && page > 1) {
        setPage(page - 1);
      }
    },
    [userId, page, fetchPage]
  );

  return {
    stories,
    loading,
    error,
    page,
    totalPages,
    goToPage,
    addLinkStory,
    addUploadStory,
    shareStory,
    deleteStory,
  };
}
