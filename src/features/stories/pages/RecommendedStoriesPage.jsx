import { useState } from 'react';
import SearchBar from '@/components/reusable/SearchBar/SearchBar';
import Loader from '@/components/reusable/Loader/Loader';
import Pagination from '@/components/reusable/Pagination/Pagination';
import StoryCard from '@/features/stories/components/StoryCard/StoryCard';
import { useRecommendedContent } from '@/features/stories/hooks/useRecommendedContent';
import { useBookmarkedIds } from '@/features/stories/hooks/useBookmarks';
import { useAppState } from '@/app/providers/AppStateProvider';

export default function RecommendedStoriesPage() {
  const { items, loading, error, page, totalPages, goToPage } = useRecommendedContent();
  const { state } = useAppState();
  const { bookmarkedIds, toggleBookmark } = useBookmarkedIds(state.currentUser.id);
  const [query, setQuery] = useState('');

  // Filters within the page currently on screen — search doesn't reach across
  // other pages, since only the current page's items are ever fetched.
  const visibleItems = items.filter((item) => item.title.toLowerCase().includes(query.toLowerCase()));

  return (
    <div>
      <SearchBar value={query} onChange={setQuery} placeholder="Search" onFilterClick={() => {}} />

      {loading && <Loader label="Loading recommended stories…" />}
      {!loading && error && <p className="page-status">{error}</p>}
      {!loading && !error && visibleItems.length === 0 && (
        <p className="page-status">No recommended videos yet — check back soon.</p>
      )}

      {!loading && !error && visibleItems.length > 0 && (
        <div className="story-list">
          {visibleItems.map((item) => (
            <StoryCard
              key={item.id}
              story={item}
              bookmarked={bookmarkedIds.has(item.id)}
              onBookmarkToggle={() => toggleBookmark(item.id)}
            />
          ))}
        </div>
      )}

      {!loading && !error && <Pagination page={page} totalPages={totalPages} onPageChange={goToPage} />}
    </div>
  );
}
