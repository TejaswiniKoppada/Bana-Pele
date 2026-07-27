import { MenuIcon, BellIcon, LogoutIcon } from '@/assets/icons';
import './Header.css';

export default function Header({ title, notificationCount = 0, onMenuClick, onBellClick, onLogoutClick }) {
  return (
    <header className="header">
      <button className="header__menu-btn" onClick={onMenuClick} aria-label="Open menu">
        <MenuIcon />
      </button>
      <h1 className="header__title">{title}</h1>
      <button className="header__bell-btn" onClick={onBellClick} aria-label="Notifications">
        <BellIcon />
        {notificationCount > 0 && <span className="header__badge">{notificationCount}</span>}
      </button>
      <button className="header__logout-btn" onClick={onLogoutClick} aria-label="Log out">
        <LogoutIcon />
      </button>
    </header>
  );
}
