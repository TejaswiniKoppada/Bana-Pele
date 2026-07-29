import { useEffect, useState } from "react";
import {
  getMyConnections,
  searchConnections,
  searchMentorsByName,
} from "../api/connections.api";
import { categoryForPerson } from "@/features/search/constants/mentorCategories";

export function useMyConnections() {
  const [connections, setConnections] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    getMyConnections()
      .then((data) => {
        if (!cancelled) setConnections(data);
      })
      .catch((err) => {
        if (!cancelled) console.warn("getMyConnections failed:", err.message);
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
 * unmodified service calls.
 *
 * `searching` reflects only the real request's own lifetime — no artificial
 * padding here. Search.jsx combines it with the geocoding hooks' own
 * completion state to time the searching animation off the real combined
 * work, rather than this hook guessing at a floor in isolation.
 */
export function useConnectionSearch(query, searchToken) {
  const [results, setResults] = useState(null);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (!searchToken) return;
    let cancelled = false;
    setSearching(true);
    setResults(null);

    const trimmedQuery = query.trim();
    const fetchResults = trimmedQuery
      ? searchMentorsByName(trimmedQuery)
      : searchConnections();

    fetchResults
      .then((data) => {
        if (cancelled) return;
        setResults(data.map((r) => ({ ...r, category: categoryForPerson(r) })));
      })
      .catch((err) => {
        if (!cancelled) {
          console.warn("search failed:", err.message);
          setResults([]);
        }
      })
      .finally(() => {
        if (!cancelled) setSearching(false);
      });
    return () => {
      cancelled = true;
    };
  }, [searchToken, query]);

  return { results, searching };
}
