import { useEffect, useState } from "react";
import { getConnectionInfo } from "../api/connections.api";
import { geocodeLocation } from "@/services/geocodingService";

/**
 * Progressively geocodes each result's real Location text, merging in
 * {lat, lon} as each one resolves (geocodeLocation's own queue keeps actual
 * requests staggered/cached, so awaiting them in sequence here is enough —
 * no extra rate-limit handling needed at this layer). Results with no
 * location, or one that fails to geocode, simply never gain coordinates —
 * callers treat that as "unplottable/unknown distance", not an error.
 *
 * `done` flips true once every result has been attempted (resolved or not)
 * — Search.jsx uses it, together with the fetch itself, to know when the
 * real fetch+geocode work behind the searching animation has actually
 * finished, rather than timing the animation off a guess.
 */
export function useGeocodedLocations(results) {
  const [coordsById, setCoordsById] = useState({});
  const [done, setDone] = useState(true);

  useEffect(() => {
    if (!results || results.length === 0) {
      setCoordsById({});
      setDone(true);
      return;
    }
    let cancelled = false;
    setCoordsById({});
    setDone(false);

    async function run() {
      for (const r of results) {
        if (cancelled) return;
        if (!r.location) continue;
        const coords = await geocodeLocation(r.location);
        if (cancelled) return;
        if (coords) setCoordsById((prev) => ({ ...prev, [r.id]: coords }));
      }
      if (!cancelled) setDone(true);
    }
    run();
    return () => {
      cancelled = true;
    };
  }, [results]);

  return { coordsById, done };
}

/** The current user's own real Location (from their Elevate profile) and its geocoded coordinates, for the Distance filter and the "you" map pin. */
export function useOwnGeocodedLocation(userId) {
  const [state, setState] = useState({
    loading: true,
    locationText: "",
    coords: null,
  });

  useEffect(() => {
    let cancelled = false;
    setState({ loading: true, locationText: "", coords: null });

    getConnectionInfo(userId)
      .then(async (profile) => {
        if (cancelled) return;
        const locationText = profile?.location || "";
        const coords = locationText
          ? await geocodeLocation(locationText)
          : null;
        if (!cancelled) setState({ loading: false, locationText, coords });
      })
      .catch(() => {
        if (!cancelled)
          setState({ loading: false, locationText: "", coords: null });
      });

    return () => {
      cancelled = true;
    };
  }, [userId]);

  return state;
}
