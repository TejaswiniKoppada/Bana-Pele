import { Outlet } from 'react-router-dom';
import Tabs from '@/components/common/Tabs/Tabs';
import './CommunityVoicesPage.css';

const TABS = [
  { label: 'Recommended', to: '/community-voices/recommended' },
  { label: 'Bookmarked', to: '/community-voices/bookmarked' },
  { label: 'My Stories', to: '/community-voices/my-stories' },
];

export default function CommunityVoicesPage() {
  return (
    <div className="community-voices-page">
      <Tabs tabs={TABS} />
      <Outlet />
    </div>
  );
}
