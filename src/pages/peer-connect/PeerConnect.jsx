import { Outlet } from 'react-router-dom';
import Tabs from '../../components/Tabs/Tabs';
import '../../styles/pages/peer-connect.css';

const TABS = [
  { label: 'My Connections', to: '/peer-connect/connections' },
  { label: 'Search', to: '/peer-connect/search' },
];

export default function PeerConnect() {
  return (
    <div className="peer-connect-page">
      <Tabs tabs={TABS} />
      <Outlet />
    </div>
  );
}
