import React, { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/moy', label: 'Moy Transactions' },
  { to: '/person-summary', label: 'Person Summary' },
  { to: '/reports', label: 'Reports' },
  { to: '/settings', label: 'Settings' },
];

export function AppLayout() {
  const { passcodeEnabled, lock } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  // Close the mobile drawer after navigating.
  useEffect(() => { setMenuOpen(false); }, [location.pathname]);

  const handleLock = () => {
    lock();
    navigate('/login');
  };

  return (
    <div className="app-shell">
      {menuOpen && <div className="sidebar-backdrop" onClick={() => setMenuOpen(false)} />}
      <aside className={`sidebar${menuOpen ? ' open' : ''}`}>
        <div className="brand">Moy Tracker</div>
        <nav aria-label="Main">
          {NAV_ITEMS.map((item) => (
            <NavLink key={item.to} to={item.to} className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>
      <div className="main-area">
        <header className="topbar">
          <button
            className="menu-button"
            aria-label="Open menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((o) => !o)}
          >
            <span /><span /><span />
          </button>
          <span className="topbar-title">Moy Tracker</span>
          <span className="user-info">Data stored in this browser</span>
          {passcodeEnabled && <button className="btn btn-secondary" onClick={handleLock}>Lock</button>}
        </header>
        <main className="content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
