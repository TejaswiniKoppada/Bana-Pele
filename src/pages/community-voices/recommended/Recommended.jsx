import { useState } from 'react';
import SearchBar from '../../../components/SearchBar/SearchBar';
import StoryCard from '../../../components/StoryCard/StoryCard';
import { useRecommendedContent } from '../../../hooks/useRecommendedContent';
import { useBookmarkedIds } from '../../../hooks/useBookmarks';
import { useAppState } from '../../../context/AppStateContext';

export default function Recommended() {
  const { items, loading, error } = useRecommendedContent();
  const { state } = useAppState();
  const { bookmarkedIds, toggleBookmark } = useBookmarkedIds(state.currentUser.id);
  const [query, setQuery] = useState('');

  const visibleItems = items.filter((item) => item.title.toLowerCase().includes(query.toLowerCase()));

  return (
    <div>
      <SearchBar value={query} onChange={setQuery} placeholder="Search" onFilterClick={() => {}} />
      {loading && <p className="page-status">Loading stories…</p>}
      {!loading && error && <p className="page-status">{error}</p>}
      {!loading && !error && visibleItems.length === 0 && (
        <p className="page-status">No recommended videos yet — check back soon.</p>
      )}
      <div className="story-list">
        {!loading &&
          !error &&
          visibleItems.map((item) => (
            <StoryCard
              key={item.id}
              story={item}
              bookmarked={bookmarkedIds.has(item.id)}
              onBookmarkToggle={() => toggleBookmark(item.id)}
            />
          ))}
      </div>
    </div>
  );
}
