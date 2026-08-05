import { NavLink } from 'react-router-dom';
import {
  MenuIcon,
  HomeIcon,
  RegistrationGuideIcon,
  LearningIcon,
  PeerConnectIcon,
  CommunityVoicesIcon,
} from '@/assets/icons';
import './SideNav.css';

const NAV_ITEMS = [
  { label: 'Home', to: '/', Icon: HomeIcon, enabled: true },
  { label: 'My Registration Guide', to: '/registration-guide', Icon: RegistrationGuideIcon, enabled: true },
  { label: 'My Learning', to: '/my-learning', Icon: LearningIcon, enabled: true },
  { label: 'Community Connect', to: '/peer-connect', Icon: PeerConnectIcon, enabled: true },
  { label: 'Community Voices', to: '/community-voices', Icon: CommunityVoicesIcon, enabled: true },
];

export default function SideNav({ open, onClose }) {
  if (!open) return null;

  return (
    <div className="side-nav-overlay" onClick={onClose}>
      <nav className="side-nav" onClick={(e) => e.stopPropagation()}>
        <button className="side-nav__menu-btn" onClick={onClose} aria-label="Close menu">
          <MenuIcon />
        </button>
        <ul className="side-nav__list">
          {NAV_ITEMS.map(({ label, to, Icon, enabled }) => (
            <li key={label}>
              {enabled ? (
                <NavLink
                  to={to}
                  end={to === '/'}
                  className={({ isActive }) => 'side-nav__item' + (isActive ? ' side-nav__item--active' : '')}
                  onClick={onClose}
                >
                  <Icon />
                  <span>{label}</span>
                </NavLink>
              ) : (
                <span className="side-nav__item side-nav__item--disabled" title="Not part of this phase">
                  <Icon />
                  <span>{label}</span>
                </span>
              )}
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
