import { Navigate, Route, Routes } from 'react-router-dom';
import Home from '../pages/home/Home';
import MyConnections from '../pages/peer-connect/my-connections/MyConnections';
import Search from '../pages/peer-connect/search/Search';
import PeerConnect from '../pages/peer-connect/PeerConnect';
import Profile from '../pages/peer-connect/profile/Profile';
import Chat from '../pages/peer-connect/chat/Chat';
import Recommended from '../pages/community-voices/recommended/Recommended';
import Bookmarked from '../pages/community-voices/bookmarked/Bookmarked';
import MyStories from '../pages/community-voices/my-stories/MyStories';
import CommunityVoices from '../pages/community-voices/CommunityVoices';

export default function AppRouter() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/peer-connect" element={<PeerConnect />}>
        <Route index element={<Navigate to="connections" replace />} />
        <Route path="connections" element={<MyConnections />} />
        <Route path="search" element={<Search />} />
      </Route>
      <Route path="/peer-connect/profile/:userId" element={<Profile />} />
      <Route path="/peer-connect/chat/:connectionId" element={<Chat />} />
      <Route path="/community-voices" element={<CommunityVoices />}>
        <Route index element={<Navigate to="recommended" replace />} />
        <Route path="recommended" element={<Recommended />} />
        <Route path="bookmarked" element={<Bookmarked />} />
        <Route path="my-stories" element={<MyStories />} />
      </Route>
    </Routes>
  );
}
