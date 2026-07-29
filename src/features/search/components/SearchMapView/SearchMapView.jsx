import { useEffect, useRef } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  PeopleIcon,
  PersonIcon,
  BuildingIcon,
  GraduationCapIcon,
} from "@/assets/icons";
import "./SearchMapView.css";

const OSM_TILE_URL = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
const OSM_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
const DEFAULT_CENTER = [0, 0];
const DEFAULT_ZOOM = 2;

// Widen the locked view to a comfortable ~150km-wide area around the
// cluster, rather than sizing tightly to just the 6 real points (which felt
// cramped) — a fixed real-world buffer, not pixel padding, so the result is
// consistent regardless of container size/aspect ratio.
const TARGET_VIEW_SPAN_KM = 150;
const KM_PER_DEGREE_LAT = 111;

// ============================================================================
// DEMO SCOPING (TEMPORARY) — NOT a permanent architectural decision.
// Elevate's real `image` field is unused/empty for every account (confirmed
// live) — Thandi's own map marker uses a real photo for the demo, matched by
// her user id, while the other 5 connections stay icon-based markers. Same
// /images/thandi.jpg asset Home.jsx's own TEMP_DEMO_OVERRIDES already
// references for her profile card. Delete THANDI_USER_ID/THANDI_PHOTO_PATH
// and the youPhotoDivIconHtml branch below once a real Elevate `image` value
// exists for accounts that need one.
// ============================================================================
const THANDI_USER_ID = "1490";
const THANDI_PHOTO_PATH = "/images/thandi.jpg";

// variant -> { icon, className } — Practitioner and Expert each need both a
// distinct icon AND color (not color alone), so they still read apart under
// color-vision differences. Icon shapes per the attached design reference —
// Practitioner uses PersonIcon (single-person bust, matching the reference)
// rather than PeopleIcon (a two-person cluster, used elsewhere as a generic
// fallback); colors are set in search-map.css, unchanged from before.
const PIN_VARIANTS = {
  you: { Icon: PeopleIcon, className: "search-map__pin-icon--you", size: 40 },
  practitioner: {
    Icon: PersonIcon,
    className: "search-map__pin-icon--practitioner",
    size: 32,
  },
  expert: {
    Icon: GraduationCapIcon,
    className: "search-map__pin-icon--expert",
    size: 32,
  },
  // Fallback for any category outside today's curated demo set (e.g. a
  // future non-demo "communities-hubs"/"local-councils" account).
  building: {
    Icon: BuildingIcon,
    className: "search-map__pin-icon--building",
    size: 32,
  },
  default: { Icon: PeopleIcon, className: "", size: 32 },
};

function pinDivIcon(variant) {
  const { Icon, className, size } =
    PIN_VARIANTS[variant] || PIN_VARIANTS.default;
  const html = renderToStaticMarkup(
    <div className={`search-map__pin-icon${className ? ` ${className}` : ""}`}>
      <Icon />
    </div>,
  );
  return L.divIcon({
    html,
    className: "search-map__pin-icon-wrapper",
    iconSize: [size, size],
    iconAnchor: [size / 2, size],
  });
}

/**
 * Plain HTML string (not JSX/renderToStaticMarkup) so the inline onerror
 * fallback attribute survives — Leaflet's divIcon html isn't mounted by
 * React, so a JSX onError handler prop would never actually get wired up.
 *
 * Deliberately a plain circle — no teardrop pin shape, no icon overlaid or
 * alongside it. The other 5 markers keep the teardrop pin + category icon
 * treatment; Thandi's own marker is just her photo, per the Figma reference.
 * If the photo 404s, the surrounding circle's own background color (set in
 * CSS) is the only fallback — no icon substitute, since the point is "photo
 * only."
 */
function youPhotoDivIconHtml() {
  return (
    `<div class="search-map__you-photo">` +
    `<img src="${THANDI_PHOTO_PATH}" alt="" class="search-map__you-photo-img" onerror="this.style.display='none'" />` +
    `</div>`
  );
}

function youDivIcon(currentUserId) {
  if (String(currentUserId) === THANDI_USER_ID) {
    return L.divIcon({
      html: youPhotoDivIconHtml(),
      className: "search-map__pin-icon-wrapper",
      iconSize: [44, 44],
      iconAnchor: [22, 44],
    });
  }
  return pinDivIcon("you");
}

function variantForResult(r) {
  if (r.category === "practitioners") return "practitioner";
  if (r.category === "experts") return "expert";
  if (r.category === "local-councils") return "building";
  return "default";
}

/** Name only — no location text, per the attached reference's compact label style. */
function tooltipHtml(name, isYou) {
  return `<strong>${isYou ? `${name} (you)` : name}</strong>`;
}

/** Extends a LatLngBounds to at least TARGET_VIEW_SPAN_KM wide/tall, centered
 * on its own center — union'd with the original so real points are never
 * excluded even if they'd otherwise fall outside the symmetric target box. */
function widenBounds(points) {
  const bounds = L.latLngBounds(points);
  const center = bounds.getCenter();
  const halfSpanKm = TARGET_VIEW_SPAN_KM / 2;
  const deltaLat = halfSpanKm / KM_PER_DEGREE_LAT;
  const kmPerDegreeLon =
    KM_PER_DEGREE_LAT * Math.cos((center.lat * Math.PI) / 180);
  const deltaLon = halfSpanKm / kmPerDegreeLon;
  const widened = L.latLngBounds(
    [center.lat - deltaLat, center.lng - deltaLon],
    [center.lat + deltaLat, center.lng + deltaLon],
  );
  return widened.extend(bounds);
}

// Approximate on-screen label size used only for collision detection below —
// doesn't need to be pixel-exact, just conservative enough to catch real
// overlaps between the permanent tooltip bubbles. Smaller than before now
// that labels are name-only, single-line (no more location text/line-wrap).
const LABEL_WIDTH_PX = 120;
const LABEL_HEIGHT_PX = 22;
const LABEL_GAP_PX = 4;

/**
 * Resolves a collision-free vertical offset for each entry's tooltip, given
 * the map's CURRENT (already-fixed) view — entries whose base position would
 * overlap an already-placed label get moved to the next candidate in a
 * bidirectional search (further above, then further below, alternating,
 * both checked against the canvas edges too) instead. Needed because the
 * reshuffled demo locations put up to 4 people within ~15km of each other
 * (Thandi and Maria now share exact coordinates) — more overlap pressure
 * than fits by only ever stacking upward, confirmed live (that produced
 * labels clipped above the visible canvas). Zero overlap is never
 * sacrificed even if a candidate has to fall outside the canvas as a last
 * resort — `entries` should be ordered by priority (most important first);
 * earlier entries get first claim on their preferred position.
 */
function resolveTooltipOffsets(map, entries) {
  const mapSize = map.getSize();
  const edgeMargin = 4;
  const step = LABEL_HEIGHT_PX + LABEL_GAP_PX;
  const placed = [];

  function boxAt(point, offsetY) {
    const centerY = point.y + offsetY;
    return {
      topY: centerY - LABEL_HEIGHT_PX / 2,
      bottomY: centerY + LABEL_HEIGHT_PX / 2,
    };
  }
  function withinCanvas(box) {
    return box.topY >= edgeMargin && box.bottomY <= mapSize.y - edgeMargin;
  }
  function collidesWithPlaced(x, box) {
    return placed.some(
      (p) =>
        Math.abs(p.x - x) < LABEL_WIDTH_PX &&
        !(
          box.bottomY < p.topY - LABEL_GAP_PX ||
          box.topY > p.bottomY + LABEL_GAP_PX
        ),
    );
  }

  return entries.map(({ latlng, baseOffsetY }) => {
    const point = map.latLngToContainerPoint(latlng);

    const candidateOffsets = [baseOffsetY];
    for (let i = 1; i <= 8; i++) {
      candidateOffsets.push(baseOffsetY - i * step); // further above the marker
      candidateOffsets.push(baseOffsetY + i * step); // toward/below the marker
    }

    // Pass 1: require both collision-free AND inside the visible canvas.
    let chosen = candidateOffsets
      .map((offsetY) => ({ offsetY, box: boxAt(point, offsetY) }))
      .find((c) => withinCanvas(c.box) && !collidesWithPlaced(point.x, c.box));

    // Pass 2 (fallback): collision-free is non-negotiable, but allow
    // spilling past the canvas edge if every in-bounds slot is taken.
    if (!chosen) {
      chosen = candidateOffsets
        .map((offsetY) => ({ offsetY, box: boxAt(point, offsetY) }))
        .find((c) => !collidesWithPlaced(point.x, c.box));
    }

    if (!chosen)
      chosen = { offsetY: baseOffsetY, box: boxAt(point, baseOffsetY) };

    placed.push({
      x: point.x,
      topY: chosen.box.topY,
      bottomY: chosen.box.bottomY,
    });
    return chosen.offsetY;
  });
}

// Minimum on-screen distance kept between any two marker centers, in
// pixels — comfortably more than the larger "you" pin's own width (40px)
// so two markers this close never visually touch or hide one another,
// regardless of the icon involved.
const MIN_MARKER_SEPARATION_PX = 44;

/**
 * Two of today's curated demo accounts (Thandi and Maria) share the exact
 * same real-world coordinates (both keyed to "Holly County Sasolburg" in
 * geocodingService.js's DEMO_LOCATION_CACHE) — no amount of widening or
 * narrowing the fixed view can visually separate two markers plotted at
 * literally identical lat/lon, since they always land on the exact same
 * pixel. Resolved here instead, in pixel space, against the map's already-
 * locked projection: any marker that would land within
 * MIN_MARKER_SEPARATION_PX of an earlier one gets nudged outward along a
 * golden-angle spiral (each step ~137.5° further round, so repeated nudges
 * fan out rather than re-colliding) until clear, then clamped to stay
 * inside the visible canvas. `latlngs` should be ordered by priority —
 * earlier entries (namely "you") never move; later ones may be nudged to
 * stay clear of them and of each other.
 */
function resolveMarkerPositions(map, latlngs) {
  const mapSize = map.getSize();
  const margin = 20;
  const placed = [];

  return latlngs.map((latlng) => {
    const original = map.latLngToContainerPoint(latlng);
    let point = original;
    let attempt = 0;
    while (
      attempt < 60 &&
      placed.some((p) => point.distanceTo(p) < MIN_MARKER_SEPARATION_PX)
    ) {
      attempt += 1;
      const angle = attempt * 2.4; // golden angle, in radians
      const radius = MIN_MARKER_SEPARATION_PX * (0.7 + attempt * 0.3);
      point = L.point(
        Math.min(
          Math.max(original.x + radius * Math.cos(angle), margin),
          mapSize.x - margin,
        ),
        Math.min(
          Math.max(original.y + radius * Math.sin(angle), margin),
          mapSize.y - margin,
        ),
      );
    }
    placed.push(point);
    return map.containerPointToLatLng(point);
  });
}

/**
 * Real interactive map — Leaflet + OpenStreetMap tiles (no API key), not a
 * decorative canvas. Pins use real geocoded coordinates (see
 * hooks/useGeocoding.js + services/geocodingService.js). Tapping a
 * practitioner's pin opens their full profile page (same as tapping a
 * result used to elsewhere) rather than an inline card.
 *
 * The view (center/zoom) is fit ONCE, the first time real coordinates are
 * available, then locked for the lifetime of this mount — it deliberately
 * never re-fits on later renders (filter changes, tapping a pin, etc.) so
 * the map holds still during a live demo. Since it's fit from real,
 * deterministic geocoded data, remounting (e.g. navigating back from a
 * profile page) reproduces the same view rather than needing to persist
 * any state across the navigation.
 */
export default function SearchMapView({
  results,
  currentUserName,
  currentUserId,
  ownCoords,
  onOpenProfile,
}) {
  const mapElRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef([]);
  const viewLockedRef = useRef(false);

  const counts = results.reduce(
    (acc, r) => {
      if (r.category === "practitioners") acc.practitioners += 1;
      else if (r.category === "experts") acc.experts += 1;
      else if (r.category === "local-councils") acc.localCouncils += 1;
      else acc.communitiesHubs += 1;
      return acc;
    },
    { practitioners: 0, experts: 0, communitiesHubs: 0, localCouncils: 0 },
  );
  // Built from whichever categories actually have someone in them, so the
  // text never hardcodes all four buckets (the previous fixed 3-part comma
  // list is what produced a run-on/truncated line for this curated set,
  // which today is only ever practitioners + experts).
  const summaryParts = [
    {
      count: counts.practitioners,
      label: counts.practitioners === 1 ? "Practitioner" : "Practitioners",
    },
    {
      count: counts.experts,
      label: counts.experts === 1 ? "Expert" : "Experts",
    },
    { count: counts.communitiesHubs, label: "Communities/Hubs" },
    {
      count: counts.localCouncils,
      label: counts.localCouncils === 1 ? "Local Council" : "Local Councils",
    },
  ].filter((part) => part.count > 0);

  const plottable = results.filter((r) => r.lat != null && r.lon != null);

  // Create the map instance once; tear it down on unmount. React 18
  // StrictMode double-invokes this in dev (mount, cleanup, mount again) —
  // the lock must reset in the cleanup alongside the map instance itself,
  // otherwise the real, surviving map from the second mount never gets its
  // view fit (confirmed live: markers landed at the right coordinates, but
  // the map stayed at the [0,0] default because the stale lock from the
  // first, discarded instance blocked fitBounds on the second).
  //
  // Fully static display: the fixed bounds computed below are the only view
  // this map ever shows — no zoom control, no scroll/drag/double-click/box/
  // touch zoom, no panning. Marker taps still work; only the map's own
  // pan/zoom interactivity is disabled.
  useEffect(() => {
    if (mapRef.current || !mapElRef.current) return;
    const map = L.map(mapElRef.current, {
      zoomControl: false,
      attributionControl: false,
      scrollWheelZoom: false,
      doubleClickZoom: false,
      boxZoom: false,
      touchZoom: false,
      dragging: false,
      keyboard: false,
    }).setView(DEFAULT_CENTER, DEFAULT_ZOOM);
    L.tileLayer(OSM_TILE_URL, {
      attribution: OSM_ATTRIBUTION,
      maxZoom: 19,
    }).addTo(map);
    mapRef.current = map;
    return () => {
      // Leaflet's own remove() can throw if it's called while tiles are
      // still mid-load (a long-standing upstream issue, easy to hit here
      // since this demo map is often navigated away from within a second
      // or two of opening) — an uncaught throw here aborts the rest of
      // React's unmount commit, which is what left the map's tiles/pins
      // visibly stuck behind the next page rather than actually removed
      // from the DOM. Swallow it: the ref resets below still need to run
      // regardless, and React removes this container's own DOM node as
      // part of the same commit either way.
      try {
        map.remove();
      } catch (err) {
        console.warn("SearchMapView: map.remove() failed during cleanup", err);
      }
      mapRef.current = null;
      viewLockedRef.current = false;
    };
  }, []);

  // Rebuild pins whenever the plottable set or own location changes.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];

    // Real (unadjusted) coordinates — used only to compute the fixed view's
    // bounds, so the framing always reflects everyone's true geographic
    // spread regardless of any later on-screen nudging.
    const realPoints = [];
    // "You" first (when present) so it gets first claim on both its
    // preferred tooltip position and its exact real-world marker position
    // in the collision resolution below — it's the most important pin/label
    // to keep exactly placed and readable.
    const entries = [];

    if (ownCoords) {
      realPoints.push([ownCoords.lat, ownCoords.lon]);
      entries.push({
        latlng: [ownCoords.lat, ownCoords.lon],
        baseOffsetY: -40,
        html: tooltipHtml(currentUserName, true),
        className: "search-map__tooltip search-map__tooltip--you",
        buildMarker: (latlng) =>
          L.marker(latlng, {
            icon: youDivIcon(currentUserId),
            zIndexOffset: 1000,
          }),
      });
    }

    plottable.forEach((r) => {
      realPoints.push([r.lat, r.lon]);
      entries.push({
        latlng: [r.lat, r.lon],
        baseOffsetY: -32,
        html: tooltipHtml(r.name, false),
        className: "search-map__tooltip",
        buildMarker: (latlng) => {
          const marker = L.marker(latlng, {
            icon: pinDivIcon(variantForResult(r)),
          });
          marker.on("click", () => onOpenProfile?.(r));
          return marker;
        },
      });
    });

    // Fixed view: fit once, the first time there's something to fit, then
    // never touch the view again for the rest of this mount. invalidateSize
    // first — the container's real pixel size isn't always settled yet at
    // this point (e.g. right after the conditional block this component
    // lives in first mounts), and fitBounds silently miscalculates the zoom
    // if it trusts a stale/zero size, confirmed by reproducing it live.
    // Bounds are widened to ~150km first (see widenBounds) so the fixed view
    // has comfortable breathing room around the cluster rather than sizing
    // tightly to just these 6 points; the pixel padding on top of that is
    // only for tooltip clearance, not for overall breathing room anymore.
    if (!viewLockedRef.current && realPoints.length > 0) {
      map.invalidateSize();
      map.fitBounds(widenBounds(realPoints), {
        paddingTopLeft: [24, 50],
        paddingBottomRight: [24, 24],
      });
      viewLockedRef.current = true;
    }

    if (entries.length === 0) return;

    // Resolved AFTER the view is final (fresh fit above, or already locked
    // from an earlier run) — two of today's demo accounts share the exact
    // same real coordinates, which fitBounds/zoom alone can never visually
    // separate (see resolveMarkerPositions), so pins get placed at these
    // resolved positions instead of their raw real lat/lon.
    const plotLatLngs = resolveMarkerPositions(
      map,
      entries.map((e) => e.latlng),
    );

    entries.forEach((entry, i) => {
      const marker = entry.buildMarker(plotLatLngs[i]).addTo(map);
      markersRef.current.push(marker);
    });

    // Tooltip collision offsets are resolved against the same resolved
    // (post-nudge) positions, so each label still stacks off its own pin.
    const offsets = resolveTooltipOffsets(
      map,
      entries.map((entry, i) => ({
        latlng: plotLatLngs[i],
        baseOffsetY: entry.baseOffsetY,
      })),
    );
    entries.forEach((entry, i) => {
      markersRef.current[i].bindTooltip(entry.html, {
        permanent: true,
        direction: "top",
        offset: [0, offsets[i]],
        className: entry.className,
      });
    });

    // Defensive, not load-bearing — map.remove() at unmount already tears
    // every marker down with it, but explicitly clearing them here too
    // means a later re-run of this same effect never has stale markers to
    // race against, regardless of ordering with the map-instance effect.
    return () => {
      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current = [];
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    plottable.map((r) => r.id).join(","),
    ownCoords?.lat,
    ownCoords?.lon,
    currentUserName,
    currentUserId,
  ]);

  return (
    <div className="search-map">
      <div className="search-map__canvas" ref={mapElRef} />
      <div className="search-map__legend">
        <span className="search-map__legend-item">
          <span className="search-map__legend-swatch search-map__legend-swatch--you">
            <PeopleIcon />
          </span>
          You
        </span>
        <span className="search-map__legend-item">
          <span className="search-map__legend-swatch search-map__legend-swatch--practitioner">
            <PersonIcon />
          </span>
          Practitioner
        </span>
        <span className="search-map__legend-item">
          <span className="search-map__legend-swatch search-map__legend-swatch--expert">
            <GraduationCapIcon />
          </span>
          Expert
        </span>
      </div>
      <p className="search-map__summary">
        {summaryParts.length > 0 ? (
          <>
            Found:{" "}
            {summaryParts.map((part, i) => (
              <span key={part.label}>
                {i > 0 && " and "}
                <strong>{part.count}</strong> {part.label}
              </span>
            ))}
          </>
        ) : (
          "No practitioners found."
        )}
      </p>
    </div>
  );
}
