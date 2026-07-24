import { Link, useNavigate } from 'react-router-dom';
import {
  RegistrationGuideIcon,
  LearningIcon,
  PeerConnectIcon,
  CommunityVoicesIcon,
  BadgeTierIcon,
  ChevronRightIcon,
} from '../../assets/icons';
import { useAppState } from '../../context/AppStateContext';
import { initialsForName, formatDate } from '../../utils/helpers';
import '../../styles/pages/home.css';

const MENU_ITEMS = [
  { label: 'My Registration Guide', to: null, Icon: RegistrationGuideIcon, enabled: false },
  { label: 'My Learning', to: '/my-learning', Icon: LearningIcon, enabled: true },
  { label: 'Community Connect', to: '/peer-connect', Icon: PeerConnectIcon, enabled: true },
  { label: 'Community Voices', to: '/community-voices', Icon: CommunityVoicesIcon, enabled: true },
];

export default function Home() {
  const { state } = useAppState();
  const { currentUser } = state;
  const navigate = useNavigate();

  function handleOpenOwnProfile() {
    navigate(`/peer-connect/profile/${currentUser.id}`);
  }

  return (
    <div>
      <div className="card profile-card">
        <button
          type="button"
          className="profile-card__identity"
          onClick={handleOpenOwnProfile}
          aria-label={`View ${currentUser.name}'s details`}
        >
          <div className="card__avatar" style={{ background: 'var(--color-primary)', width: 56, height: 56, fontSize: 20 }}>
            {initialsForName(currentUser.name)}
          </div>
          <div className="profile-card__body">
            <p className="profile-card__name">{currentUser.name}</p>
            <p className="profile-card__role">{currentUser.role}</p>
          </div>
        </button>
        <div className="profile-card__joined">
          <span>Joined On:</span>
          <strong>{formatDate(currentUser.joinedOn)}</strong>
        </div>
      </div>

      <div className="progress-badge">
        <RegistrationGuideIcon className="progress-badge__icon" />
        <div className="progress-badge__info">
          <p className="progress-badge__name">NoName</p>
          <p className="progress-badge__location">NoLocation</p>
        </div>
        <div className="progress-badge__tier">
          <BadgeTierIcon />
          <span>{currentUser.tier}</span>
        </div>
      </div>

      <ul className="menu-list">
        {MENU_ITEMS.map(({ label, to, Icon, enabled }) => (
          <li key={label}>
            {enabled ? (
              <Link to={to} className="menu-list__item">
                <Icon />
                <span>{label}</span>
                <ChevronRightIcon className="menu-list__chevron" />
              </Link>
            ) : (
              <span className="menu-list__item menu-list__item--disabled" title="Not part of this phase">
                <Icon />
                <span>{label}</span>
                <ChevronRightIcon className="menu-list__chevron" />
              </span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
