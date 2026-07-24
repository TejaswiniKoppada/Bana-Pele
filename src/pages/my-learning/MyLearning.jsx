import { Outlet } from 'react-router-dom';
import Tabs from '../../components/Tabs/Tabs';
import '../../styles/pages/my-learning.css';

const TABS = [
  { label: 'Recommended', to: '/my-learning/recommended' },
  { label: 'In Progress', to: '/my-learning/in-progress' },
];

export default function MyLearning() {
  return (
    <div className="my-learning-page">
      <Tabs tabs={TABS} />
      <Outlet />
    </div>
  );
}
