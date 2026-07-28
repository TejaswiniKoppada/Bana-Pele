import { useEffect, useState } from 'react';
import { getApprovedContentItems, RECOMMENDED_PAGE_SIZE } from '../api/contentItems.api';

// Keeps the feed from going stale during a long-lived session even if the
// user never navigates away and back (which would otherwise be the only
// thing that triggers a refetch) — 12h means it refreshes 1-2x/day without
// polling aggressively.
const AUTO_REFRESH_INTERVAL_MS = 12 * 60 * 60 * 1000;

/**
 * Live, admin-approved YouTube content for the Recommended tab, paginated
 * server-side (RECOMMENDED_PAGE_SIZE per page). Refetches whenever the page
 * number changes and again on a timer while mounted — since this hook is
 * instantiated fresh each time Community Voices is opened, that first fetch
 * also covers "refresh on open" with no stale data carried over from a
 * previous visit.
 */
export function useRecommendedContent() {
  const [page, setPage] = useState(1);
  const [items, setItems] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    function fetchPage({ silent = false } = {}) {
      if (!silent) setLoading(true);
      getApprovedContentItems({ page, pageSize: RECOMMENDED_PAGE_SIZE })
        .then(({ items: data, totalCount: count }) => {
          if (cancelled) return;
          setItems(data);
          setTotalCount(count);
          setError('');
        })
        .catch((err) => {
          if (!cancelled) setError(err.message || 'Could not load recommended content.');
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }

    fetchPage();
    // Background refresh of whatever page is currently open — silent so it
    // doesn't flash the loader for content the user is already looking at.
    const intervalId = setInterval(() => fetchPage({ silent: true }), AUTO_REFRESH_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(intervalId);
    };
  }, [page]);

  const totalPages = Math.max(1, Math.ceil(totalCount / RECOMMENDED_PAGE_SIZE));

  function goToPage(nextPage) {
    setPage(Math.min(Math.max(1, nextPage), totalPages));
  }

  return { items, loading, error, page, totalPages, goToPage };
}
