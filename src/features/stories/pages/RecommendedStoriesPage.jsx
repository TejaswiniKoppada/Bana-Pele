import { useState } from 'react';
import SearchBar from '@/components/reusable/SearchBar/SearchBar';
import Loader from '@/components/reusable/Loader/Loader';
import Pagination from '@/components/reusable/Pagination/Pagination';
import StoryCard from '@/features/stories/components/StoryCard/StoryCard';
import { useRecommendedContent } from '@/features/stories/hooks/useRecommendedContent';
import { useBookmarkedIds } from '@/features/stories/hooks/useBookmarks';
import { useAppState } from '@/app/providers/AppStateProvider';

export default function RecommendedStoriesPage() {
  const [query, setQuery] = useState('');
  const { items, loading, error, page, totalPages, goToPage } = useRecommendedContent(query);
  const { state } = useAppState();
  const { bookmarkedIds, toggleBookmark } = useBookmarkedIds(state.currentUser.id);
  const [playingId, setPlayingId] = useState(null);

  return (
    <div>
      <SearchBar value={query} onChange={setQuery} placeholder="Search" showMic={false} />

      {loading && <Loader label="Loading recommended stories…" />}
      {!loading && error && <p className="page-status">{error}</p>}
      {!loading && !error && items.length === 0 && (
        <p className="page-status">
          {query.trim() ? 'No recommended videos match that search.' : 'No recommended videos yet — check back soon.'}
        </p>
      )}

      {!loading && !error && items.length > 0 && (
        <div className="story-list">
          {items.map((item) => (
            <StoryCard
              key={item.id}
              story={item}
              bookmarked={bookmarkedIds.has(item.id)}
              onBookmarkToggle={() => toggleBookmark(item.id)}
              playing={playingId === item.id}
              onPlay={() => setPlayingId(item.id)}
              onStop={() => setPlayingId(null)}
            />
          ))}
        </div>
      )}

      {!loading && !error && <Pagination page={page} totalPages={totalPages} onPageChange={goToPage} />}
    </div>
  );
}
