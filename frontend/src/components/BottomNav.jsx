import { NavLink } from 'react-router-dom';

const navItems = [
  { to: '/', icon: '💬', label: 'Chat' },
  { to: '/calendar', icon: '📅', label: 'Calendar' },
  { to: '/analytics', icon: '📊', label: 'Analytics' },
  { to: '/settings', icon: '⚙️', label: 'Settings' },
];

export default function BottomNav() {
  return (
    <nav className="bottom-nav" role="navigation" aria-label="Main navigation">
      {navItems.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
          aria-label={item.label}
        >
          <span className="nav-icon" aria-hidden="true">{item.icon}</span>
          <span className="nav-label">{item.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
