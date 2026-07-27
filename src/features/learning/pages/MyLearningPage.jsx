import { Outlet } from 'react-router-dom';
import Tabs from '@/components/common/Tabs/Tabs';
import './MyLearningPage.css';

const TABS = [
  { label: 'Recommended', to: '/my-learning/recommended' },
  { label: 'In Progress', to: '/my-learning/in-progress' },
];

export default function MyLearningPage() {
  return (
    <div className="my-learning-page">
      <Tabs tabs={TABS} />
      <Outlet />
    </div>
  );
}
