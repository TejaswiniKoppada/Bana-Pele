import { useState } from 'react';
import SearchBar from '@/components/reusable/SearchBar/SearchBar';
import Loader from '@/components/reusable/Loader/Loader';
import Pagination from '@/components/reusable/Pagination/Pagination';
import StoryCard from '@/features/stories/components/StoryCard/StoryCard';
import { useBookmarkedContent } from '@/features/stories/hooks/useBookmarkedContent';
import { useAppState } from '@/app/providers/AppStateProvider';

export default function BookmarkedStoriesPage() {
  const { state } = useAppState();
  const { items, loading, error, page, totalPages, goToPage, unbookmark } = useBookmarkedContent(
    state.currentUser.id
  );
  const [query, setQuery] = useState('');

  // Filters within the page currently on screen — search doesn't reach across
  // other pages, since only the current page's items are ever fetched.
  const visibleItems = items.filter((item) => item.title.toLowerCase().includes(query.toLowerCase()));

  return (
    <div>
      <SearchBar value={query} onChange={setQuery} placeholder="Search" onFilterClick={() => {}} />

      {loading && <Loader label="Loading bookmarked stories…" />}
      {!loading && error && <p className="page-status">{error}</p>}
      {!loading && !error && visibleItems.length === 0 && <p className="page-status">No bookmarked stories yet.</p>}

      {!loading && !error && visibleItems.length > 0 && (
        <div className="story-list">
          {visibleItems.map((item) => (
            <StoryCard key={item.id} story={item} bookmarked onBookmarkToggle={() => unbookmark(item.id)} />
          ))}
        </div>
      )}

      {!loading && !error && <Pagination page={page} totalPages={totalPages} onPageChange={goToPage} />}
    </div>
  );
}
