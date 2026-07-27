import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import './OfflineBanner.css';

export default function OfflineBanner() {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return <div className="offline-banner">You're offline — changes will sync when reconnected.</div>;
}
