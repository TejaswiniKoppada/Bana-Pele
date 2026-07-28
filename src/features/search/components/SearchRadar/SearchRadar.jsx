import { initialsForName } from "@/utils/formatters";
import "./SearchRadar.css";

/** Small location-pin badge overlaid on the searching avatar, per the Figma reference. */
function LocationBadge() {
  return (
    <svg
      className="search-radar__badge"
      viewBox="0 0 24 24"
      width="16"
      height="16"
      fill="none"
    >
      <path
        d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"
        fill="var(--color-accent)"
      />
      <circle cx="12" cy="9" r="2.5" fill="var(--color-surface)" />
    </svg>
  );
}

export default function SearchRadar({ name, location }) {
  return (
    <div className="search-radar">
      <p className="search-radar__label">Searching...</p>
      <div className="search-radar__rings">
        <div className="search-radar__ring search-radar__ring--3" />
        <div className="search-radar__ring search-radar__ring--2" />
        <div className="search-radar__ring search-radar__ring--1" />
        <div className="search-radar__center">
          {/* Always the current user's own avatar, so it uses the role theme color rather than the per-name palette used for other people's avatars. */}
          <div className="search-radar__avatar-wrap">
            <div
              className="search-radar__avatar"
              style={{ background: "var(--color-primary)" }}
            >
              {initialsForName(name)}
            </div>
            <LocationBadge />
          </div>
          <div className="search-radar__tag">
            <strong>{name}</strong>
            {location && <span>{location}</span>}
          </div>
        </div>
      </div>
    </div>
  );
}
