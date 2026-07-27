import { Navigate, Route, Routes } from 'react-router-dom';
import HomePage from '@/features/home/pages/HomePage';
import MyConnectionsPage from '@/features/connections/pages/MyConnectionsPage';
import SearchPage from '@/features/search/pages/SearchPage';
import PeerConnectPage from '@/features/connections/pages/PeerConnectPage';
import ProfilePage from '@/features/profile/pages/ProfilePage';
import ChatPage from '@/features/chat/pages/ChatPage';
import RecommendedStoriesPage from '@/features/stories/pages/RecommendedStoriesPage';
import BookmarkedStoriesPage from '@/features/stories/pages/BookmarkedStoriesPage';
import MyStoriesPage from '@/features/stories/pages/MyStoriesPage';
import CommunityVoicesPage from '@/features/stories/pages/CommunityVoicesPage';
import MyLearningPage from '@/features/learning/pages/MyLearningPage';
import RecommendedLearningPage from '@/features/learning/pages/RecommendedLearningPage';
import InProgressPage from '@/features/learning/pages/InProgressPage';

export default function AppRouter() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/peer-connect" element={<PeerConnectPage />}>
        <Route index element={<Navigate to="connections" replace />} />
        <Route path="connections" element={<MyConnectionsPage />} />
        <Route path="search" element={<SearchPage />} />
      </Route>
      <Route path="/peer-connect/profile/:userId" element={<ProfilePage />} />
      <Route path="/peer-connect/chat/:connectionId" element={<ChatPage />} />
      <Route path="/community-voices" element={<CommunityVoicesPage />}>
        <Route index element={<Navigate to="recommended" replace />} />
        <Route path="recommended" element={<RecommendedStoriesPage />} />
        <Route path="bookmarked" element={<BookmarkedStoriesPage />} />
        <Route path="my-stories" element={<MyStoriesPage />} />
      </Route>
      <Route path="/my-learning" element={<MyLearningPage />}>
        <Route index element={<Navigate to="recommended" replace />} />
        <Route path="recommended" element={<RecommendedLearningPage />} />
        <Route path="in-progress" element={<InProgressPage />} />
      </Route>
    </Routes>
  );
}
