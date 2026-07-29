import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import SearchBar from "@/components/reusable/SearchBar/SearchBar";
import FilterBar from "../components/FilterBar/FilterBar";
import SearchRadar from "../components/SearchRadar/SearchRadar";
import SearchMapView from "../components/SearchMapView/SearchMapView";
import { useConnectionSearch } from "@/features/connections/hooks/useConnections";
import {
  useGeocodedLocations,
  useOwnGeocodedLocation,
} from "@/features/connections/hooks/useGeocoding";
import { useAppState } from "@/app/providers/AppStateProvider";
import { haversineDistanceKm } from "@/services/geocodingService";

// Roughly how long the searching animation should feel — real work
// (mentor/mentee fetch + own-location and per-result geocoding) is padded up
// to this floor, never extended past it. See the showLoading effect below.
// Now that the 6 curated demo accounts' coordinates are pre-cached (see
// geocodingService.js's DEMO_LOCATION_CACHE) rather than geocoded live one
// by one, the real work itself is fast — this floor is what actually sets
// the visible ~3s duration for the demo now, not padding on top of slow work.
const MIN_LOADING_MS = 2500;

export default function Search() {
  const { state } = useAppState();
  const { currentUser } = state;
  const [query, setQuery] = useState("");
  const [searchToken, setSearchToken] = useState(0);
  const { results, searching } = useConnectionSearch(query, searchToken);
  const [distanceKm, setDistanceKm] = useState(null);
  const navigate = useNavigate();

  const own = useOwnGeocodedLocation(currentUser.id);
  const { coordsById, done: coordsDone } = useGeocodedLocations(results);

  // Typing debounces so the real name-search endpoint isn't called on every keystroke.
  useEffect(() => {
    const timeout = setTimeout(() => setSearchToken((token) => token + 1), 400);
    return () => clearTimeout(timeout);
  }, [query]);

  // The searching animation is held until the real work behind it — the
  // mentor/mentee fetch, the user's own geocode, and per-result geocoding —
  // is actually done, padded up to MIN_LOADING_MS so it never just flashes,
  // but never held past however long the real work actually took.
  const dataReady = !searching && results != null && !own.loading && coordsDone;
  const [showLoading, setShowLoading] = useState(true);
  const loadStartRef = useRef(null);

  useEffect(() => {
    if (searchToken === 0) return;
    loadStartRef.current = Date.now();
    setShowLoading(true);
  }, [searchToken]);

  useEffect(() => {
    if (!dataReady || loadStartRef.current == null) return;
    const remaining = MIN_LOADING_MS - (Date.now() - loadStartRef.current);
    if (remaining <= 0) {
      setShowLoading(false);
      return;
    }
    const timeout = setTimeout(() => setShowLoading(false), remaining);
    return () => clearTimeout(timeout);
  }, [dataReady]);

  function handleOpenProfile(connection) {
    navigate(`/peer-connect/profile/${connection.id}`, {
      state: { profile: connection },
    });
  }

  const distanceUnavailableReason =
    !own.loading && !own.locationText
      ? "Set your own Location in your profile to use this filter"
      : null;

  // Enrich with real coordinates/distance as they resolve — geocoding is
  // progressive, so this recomputes as coordsById fills in.
  const enrichedResults = (results || []).map((r) => {
    const coords = coordsById[r.id];
    const distance =
      coords && own.coords
        ? haversineDistanceKm(
            own.coords.lat,
            own.coords.lon,
            coords.lat,
            coords.lon,
          )
        : null;
    return { ...r, lat: coords?.lat, lon: coords?.lon, distanceKm: distance };
  });

  const activeDistanceFilter = distanceKm && !distanceUnavailableReason;
  const visibleResults = activeDistanceFilter
    ? enrichedResults.filter(
        (r) => r.distanceKm != null && r.distanceKm <= distanceKm,
      )
    : enrichedResults;
  const mappableResults = visibleResults.filter((r) => r.lat != null);

  return (
    <div>
      <SearchBar
        value={query}
        onChange={setQuery}
        placeholder="Search mentors"
        showMic={false}
      />
      <FilterBar
        distanceKm={distanceKm}
        onDistanceChange={setDistanceKm}
        distanceUnavailableReason={distanceUnavailableReason}
      />

      {(showLoading || !results) && (
        <SearchRadar name={currentUser.name} location={own.locationText} />
      )}

      {!showLoading && results && (
        <>
          {activeDistanceFilter && visibleResults.length === 0 && (
            <p className="page-status">
              No practitioners found within {distanceKm} km.
            </p>
          )}
          <SearchMapView
            results={mappableResults}
            currentUserName={currentUser.name}
            currentUserId={currentUser.id}
            ownCoords={own.coords}
            onOpenProfile={handleOpenProfile}
          />
        </>
      )}
    </div>
  );
}
