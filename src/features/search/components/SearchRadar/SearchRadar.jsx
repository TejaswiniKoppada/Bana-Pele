import { initialsForName } from '@/utils/formatters';
import './SearchRadar.css';

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
          <div
            className="search-radar__avatar"
            style={{ background: 'var(--color-primary)' }}
          >
            {initialsForName(name)}
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
