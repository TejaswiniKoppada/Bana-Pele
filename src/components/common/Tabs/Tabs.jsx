import { NavLink } from 'react-router-dom';
import './Tabs.css';

export default function Tabs({ tabs }) {
  return (
    <div className="tabs">
      {tabs.map(({ label, to }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) => 'tabs__tab' + (isActive ? ' tabs__tab--active' : '')}
        >
          {label}
        </NavLink>
      ))}
    </div>
  );
}
