import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import Header from '@/components/common/Header/Header';
import SideNav from '@/components/common/SideNav/SideNav';
import NotificationPanel from '@/components/common/NotificationPanel/NotificationPanel';
import InstallPrompt from '@/components/common/InstallPrompt/InstallPrompt';
import OfflineBanner from '@/components/common/OfflineBanner/OfflineBanner';
import LoginPage from '@/features/auth/pages/LoginPage';
import ContentReviewPage from '@/features/admin/pages/ContentReviewPage';
import { roleFromEmail } from '@/utils/formatters';
import AppRouter from './router/AppRouter';
import { useAppState } from './providers/AppStateProvider';

function pageTitleForPath(pathname) {
  if (pathname.startsWith('/peer-connect')) return 'Community Connect';
  if (pathname.startsWith('/community-voices')) return 'Community Voices';
  if (pathname.startsWith('/my-learning')) return 'My Learning';
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
    return <ContentReviewPage />;
  }

  if (!state.isAuthenticated) {
    return (
      <div className="app-shell">
        <LoginPage />
      </div>
    );
  }

  return (
    <div className="app-shell" data-role={roleFromEmail(state.currentUser.email)}>
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
