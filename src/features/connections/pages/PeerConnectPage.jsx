import { Outlet } from 'react-router-dom';
import Tabs from '@/components/common/Tabs/Tabs';
import './PeerConnectPage.css';

const TABS = [
  { label: 'My Connections', to: '/peer-connect/connections' },
  { label: 'Search', to: '/peer-connect/search' },
];

export default function PeerConnectPage() {
  return (
    <div className="peer-connect-page">
      <Tabs tabs={TABS} />
      <Outlet />
    </div>
  );
}
