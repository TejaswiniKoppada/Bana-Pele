import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import Header from './components/Header/Header';
import SideNav from './components/SideNav/SideNav';
import NotificationPanel from './components/NotificationPanel/NotificationPanel';
import InstallPrompt from './components/InstallPrompt/InstallPrompt';
import OfflineBanner from './components/OfflineBanner/OfflineBanner';
import Login from './components/Login/Login';
import AppRouter from './router/AppRouter';
import ContentReview from './pages/admin/ContentReview';
import { useAppState } from './context/AppStateContext';

function pageTitleForPath(pathname) {
  if (pathname.startsWith('/peer-connect')) return 'Peer Connect';
  if (pathname.startsWith('/community-voices')) return 'Community Voices';
  return 'Home';
}

export default function App() {
  const location = useLocation();
  const [sideNavOpen, setSideNavOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const { state, logout } = useAppState();

  // Internal admin tool (Section 6) — its own password gate, independent of
  // the Mentoring login below, so it's reachable without an Elevate session.
  if (location.pathname.startsWith('/admin')) {
    return <ContentReview />;
  }

  if (!state.isAuthenticated) {
    return (
      <div className="app-shell">
        <Login />
      </div>
    );
  }

  return (
    <div className="app-shell">
      <Header
        title={pageTitleForPath(location.pathname)}
        notificationCount={state.notificationCount}
        onMenuClick={() => setSideNavOpen(true)}
        onBellClick={() => setNotificationsOpen(true)}
        onLogoutClick={logout}
      />
      <OfflineBanner />
      <SideNav open={sideNavOpen} onClose={() => setSideNavOpen(false)} />
      <NotificationPanel open={notificationsOpen} onClose={() => setNotificationsOpen(false)} />
      <main className="app-shell__content">
        <AppRouter />
      </main>
      <InstallPrompt />
    </div>
  );
}
