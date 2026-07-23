import { Outlet } from 'react-router-dom';
import Tabs from '../../components/Tabs/Tabs';
import '../../styles/pages/community-voices.css';

const TABS = [
  { label: 'Recommended', to: '/community-voices/recommended' },
  { label: 'Bookmarked', to: '/community-voices/bookmarked' },
  { label: 'My Stories', to: '/community-voices/my-stories' },
];

export default function CommunityVoices() {
  return (
    <div className="community-voices-page">
      <Tabs tabs={TABS} />
      <Outlet />
    </div>
  );
}
