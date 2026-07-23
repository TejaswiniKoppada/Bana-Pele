import { useEffect, useState } from 'react';
import { getMyConnections, searchConnections, searchMentorsByName } from '../services/connectionsService';
import { attachMockLocation, parseRadiusKm } from '../utils/mockLocation';
import { categoryForTier } from '../utils/mentorCategory';

const MIN_SEARCHING_MS = 700;

export function useMyConnections() {
  const [connections, setConnections] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    getMyConnections()
      .then((data) => {
        if (!cancelled) setConnections(data.map(attachMockLocation));
      })
      .catch((err) => {
        if (!cancelled) console.warn('getMyConnections failed:', err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { connections, loading };
}

/**
 * `query` (free text) uses the real name-search endpoint when non-empty,
 * otherwise falls back to the directory listing — both already-existing,
 * unmodified service calls. `filters.distance` filters the enriched results
 * client-side against the MOCK distance attached below (see mockLocation.js);
 * it has no real server-side equivalent.
 *
 * `searching` stays true for at least MIN_SEARCHING_MS so the radar
 * transition is tied to the real request but never just flashes if the
 * response comes back very quickly.
 */
export function useConnectionSearch(filters, query, searchToken) {
  const [results, setResults] = useState(null);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (!searchToken) return;
    let cancelled = false;
    setSearching(true);
    setResults(null);
    const startedAt = Date.now();

    const trimmedQuery = query.trim();
    const fetchResults = trimmedQuery ? searchMentorsByName(trimmedQuery) : searchConnections(filters);

    fetchResults
      .then((data) => {
        if (cancelled) return;
        const enriched = data.map(attachMockLocation).map((r) => ({ ...r, category: categoryForTier(r.tier) }));
        const radiusKm = parseRadiusKm(filters.distance);
        const filtered = radiusKm != null ? enriched.filter((r) => r.mockDistanceKm <= radiusKm) : enriched;
        setResults(filtered);
      })
      .catch((err) => {
        if (!cancelled) {
          console.warn('search failed:', err.message);
          setResults([]);
        }
      })
      .finally(async () => {
        const elapsed = Date.now() - startedAt;
        if (elapsed < MIN_SEARCHING_MS) {
          await new Promise((resolve) => setTimeout(resolve, MIN_SEARCHING_MS - elapsed));
        }
        if (!cancelled) setSearching(false);
      });
    return () => {
      cancelled = true;
    };
  }, [searchToken, filters, query]);

  return { results, searching };
}
