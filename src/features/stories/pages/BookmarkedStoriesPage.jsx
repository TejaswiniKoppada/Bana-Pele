import { useState } from 'react';
import SearchBar from '@/components/reusable/SearchBar/SearchBar';
import Loader from '@/components/reusable/Loader/Loader';
import Pagination from '@/components/reusable/Pagination/Pagination';
import StoryCard from '@/features/stories/components/StoryCard/StoryCard';
import { useBookmarkedContent } from '@/features/stories/hooks/useBookmarkedContent';
import { useAppState } from '@/app/providers/AppStateProvider';

export default function BookmarkedStoriesPage() {
  const { state } = useAppState();
  const [query, setQuery] = useState('');
  const { items, loading, error, page, totalPages, goToPage, unbookmark } = useBookmarkedContent(
    state.currentUser.id,
    query
  );
  const [playingId, setPlayingId] = useState(null);

  return (
    <div>
      <SearchBar value={query} onChange={setQuery} placeholder="Search" showMic={false} />

      {loading && <Loader label="Loading bookmarked stories…" />}
      {!loading && error && <p className="page-status">{error}</p>}
      {!loading && !error && items.length === 0 && (
        <p className="page-status">
          {query.trim() ? 'No bookmarked stories match that search.' : 'No bookmarked stories yet.'}
        </p>
      )}

      {!loading && !error && items.length > 0 && (
        <div className="story-list">
          {items.map((item) => (
            <StoryCard
              key={item.id}
              story={item}
              bookmarked
              onBookmarkToggle={() => unbookmark(item.id)}
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
