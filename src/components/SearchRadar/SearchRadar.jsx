import { avatarColorForName, initialsForName } from '../../utils/helpers';
import '../../styles/components/search-radar.css';

export default function SearchRadar({ name, location }) {
  return (
    <div className="search-radar">
      <p className="search-radar__label">Searching...</p>
      <div className="search-radar__rings">
        <div className="search-radar__ring search-radar__ring--3" />
        <div className="search-radar__ring search-radar__ring--2" />
        <div className="search-radar__ring search-radar__ring--1" />
        <div className="search-radar__center">
          <div
            className="search-radar__avatar"
            style={{ background: avatarColorForName(name) }}
          >
            {initialsForName(name)}
          </div>
          <div className="search-radar__tag">
            <strong>{name}</strong>
            <span>{location}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
