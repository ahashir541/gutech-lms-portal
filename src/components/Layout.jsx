import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { initials } from '../lib/format';
import Icon from './Icon';

const NAV = [
  { to: '/', label: 'Dashboard', icon: 'home', end: true },
  { to: '/courses', label: 'Courses', icon: 'book' },
  { to: '/assignments', label: 'Assignments', icon: 'clipboard' },
  { to: '/grades', label: 'Grades', icon: 'award', roles: ['student'] },
  { to: '/announcements', label: 'Announcements', icon: 'megaphone' },
  { to: '/admin', label: 'Users', icon: 'users', roles: ['admin'] },
  { to: '/profile', label: 'Profile', icon: 'user' },
];

export function Brand({ light }) {
  return (
    <div className={`brand ${light ? 'brand-light' : ''}`}>
      <img src="/logo.svg" alt="" width="36" height="36" />
      <div>
        <strong>GUTECH</strong>
        <span>LMS Portal</span>
      </div>
    </div>
  );
}

export default function Layout() {
  const { profile, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => setOpen(false), [location.pathname]);

  const items = NAV.filter((n) => !n.roles || n.roles.includes(profile.role));

  return (
    <div className="shell">
      <aside className={`sidebar ${open ? 'open' : ''}`}>
        <div className="sidebar-top">
          <Brand light />
          <button className="icon-btn sidebar-close" onClick={() => setOpen(false)} aria-label="Close menu">
            <Icon name="x" />
          </button>
        </div>
        <nav>
          {items.map((n) => (
            <NavLink key={n.to} to={n.to} end={n.end} className="nav-link">
              <Icon name={n.icon} />
              <span>{n.label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-foot">
          <p>Korangi, Karachi</p>
          <p>Fall 2026 · Semester portal</p>
        </div>
      </aside>
      {open && <div className="scrim" onClick={() => setOpen(false)} />}

      <div className="main">
        <header className="topbar">
          <button className="icon-btn menu-btn" onClick={() => setOpen(true)} aria-label="Open menu">
            <Icon name="menu" />
          </button>
          <div className="topbar-title">Welcome back, {profile.full_name.split(' ')[0]}</div>
          <div className="topbar-user">
            <button className="user-chip" onClick={() => navigate('/profile')}>
              <span className="avatar">{initials(profile.full_name)}</span>
              <span className="user-meta">
                <strong>{profile.full_name}</strong>
                <span className="role-tag">{profile.role}</span>
              </span>
            </button>
            <button className="icon-btn" onClick={signOut} title="Log out" aria-label="Log out">
              <Icon name="logout" />
            </button>
          </div>
        </header>
        <main className="content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
