import { PeopleIcon, BuildingIcon } from '../../assets/icons';
import '../../styles/components/search-map.css';

/**
 * Stylized, non-interactive map — a custom graphic laid out with mock
 * percentage positions (see utils/mockLocation.js), not a real map library
 * or real tile/GPS data. Category counts come from utils/mentorCategory.js,
 * an approximation of real designation data.
 */
export default function SearchMapView({ results, currentUserName, currentUserLocation }) {
  const counts = results.reduce(
    (acc, r) => {
      if (r.category === 'practitioners') acc.practitioners += 1;
      else if (r.category === 'local-councils') acc.localCouncils += 1;
      else acc.communitiesHubs += 1;
      return acc;
    },
    { practitioners: 0, communitiesHubs: 0, localCouncils: 0 }
  );

  return (
    <div className="search-map">
      <div className="search-map__canvas">
        {/* Static illustrated backdrop — same graphic for every search; only the pins above it change. */}
        <svg
          className="search-map__bg"
          viewBox="0 0 400 300"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <rect x="0" y="0" width="400" height="300" fill="#eef1ec" />

          {/* Parks / green space, kept clear of the central pin cluster */}
          <ellipse cx="55" cy="48" rx="52" ry="36" fill="#bfe3c0" opacity="0.85" />
          <ellipse cx="352" cy="252" rx="56" ry="40" fill="#bfe3c0" opacity="0.85" />
          <ellipse cx="352" cy="50" rx="30" ry="24" fill="#bfe3c0" opacity="0.75" />

          {/* Water body */}
          <ellipse cx="42" cy="256" rx="42" ry="30" fill="#a8d0e6" opacity="0.85" />

          {/* Building blocks — low-opacity texture, sits behind the pins */}
          <rect x="18" y="112" width="18" height="14" rx="2" fill="#c7cad0" opacity="0.45" />
          <rect x="66" y="196" width="14" height="18" rx="2" fill="#c7cad0" opacity="0.45" />
          <rect x="108" y="38" width="16" height="12" rx="2" fill="#c7cad0" opacity="0.45" />
          <rect x="176" y="252" width="20" height="14" rx="2" fill="#c7cad0" opacity="0.4" />
          <rect x="228" y="26" width="14" height="20" rx="2" fill="#c7cad0" opacity="0.4" />
          <rect x="298" y="168" width="18" height="14" rx="2" fill="#c7cad0" opacity="0.4" />
          <rect x="338" y="118" width="16" height="22" rx="2" fill="#c7cad0" opacity="0.45" />
          <rect x="150" y="272" width="22" height="12" rx="2" fill="#c7cad0" opacity="0.4" />
          <rect x="86" y="16" width="14" height="16" rx="2" fill="#c7cad0" opacity="0.4" />
          <rect x="368" y="198" width="12" height="18" rx="2" fill="#c7cad0" opacity="0.45" />

          {/* Roads / streets — thin light lines suggesting a city grid, not geographically accurate */}
          <g stroke="#ffffff" strokeLinecap="round" opacity="0.9">
            <line x1="0" y1="64" x2="400" y2="92" strokeWidth="6" />
            <line x1="0" y1="186" x2="400" y2="156" strokeWidth="6" />
            <line x1="0" y1="248" x2="400" y2="266" strokeWidth="5" />
            <line x1="64" y1="0" x2="34" y2="300" strokeWidth="5" />
            <line x1="252" y1="0" x2="288" y2="300" strokeWidth="5" />
            <line x1="152" y1="0" x2="152" y2="300" strokeWidth="4" opacity="0.7" />
            <line x1="0" y1="122" x2="400" y2="122" strokeWidth="4" opacity="0.7" />
          </g>
        </svg>

        <div className="search-map__pin search-map__pin--you" style={{ left: '50%', top: '50%' }}>
          <div className="search-map__pin-icon search-map__pin-icon--you">
            <PeopleIcon />
          </div>
          <span className="search-map__pin-label search-map__pin-label--you">
            {currentUserName} (you) · {currentUserLocation}
          </span>
        </div>
        {results.map((connection) => (
          <div
            key={connection.id}
            className="search-map__pin"
            style={{ left: `${connection.mockX}%`, top: `${connection.mockY}%` }}
          >
            <div className="search-map__pin-icon">
              {connection.category === 'local-councils' ? <BuildingIcon /> : <PeopleIcon />}
            </div>
            <span className="search-map__pin-label">
              {connection.name} · {connection.mockLocation}
            </span>
          </div>
        ))}
      </div>
      <p className="search-map__summary">
        Found: <strong>{counts.practitioners}</strong> Practitioners, <strong>{counts.communitiesHubs}</strong>{' '}
        Communities/Hubs, <strong>{counts.localCouncils}</strong> Local Councils
      </p>
    </div>
  );
}
