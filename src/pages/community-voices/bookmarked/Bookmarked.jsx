import { useState } from 'react';
import SearchBar from '../../../components/SearchBar/SearchBar';
import StoryCard from '../../../components/StoryCard/StoryCard';
import { useBookmarkedContent } from '../../../hooks/useBookmarkedContent';
import { useAppState } from '../../../context/AppStateContext';

export default function Bookmarked() {
  const { state } = useAppState();
  const { items, loading, error, unbookmark } = useBookmarkedContent(state.currentUser.id);
  const [query, setQuery] = useState('');

  const visibleItems = items.filter((item) => item.title.toLowerCase().includes(query.toLowerCase()));

  return (
    <div>
      <SearchBar value={query} onChange={setQuery} placeholder="Search" onFilterClick={() => {}} />
      {loading && <p className="page-status">Loading stories…</p>}
      {!loading && error && <p className="page-status">{error}</p>}
      {!loading && !error && visibleItems.length === 0 && <p className="page-status">No bookmarked stories yet.</p>}
      <div className="story-list">
        {!loading &&
          !error &&
          visibleItems.map((item) => (
            <StoryCard key={item.id} story={item} bookmarked onBookmarkToggle={() => unbookmark(item.id)} />
          ))}
      </div>
    </div>
  );
}
