import { useCallback, useEffect, useState } from 'react';
import {
  createLinkStory,
  createUploadStory,
  deleteStory as deleteStoryService,
  getUserStories,
  markStoryShared,
} from '../api/stories.api';

/** My Stories' data: this user's posted stories (link + upload), server-side and keyed by user_id — persists across logout/login like bookmarks. */
export function useUserStories(userId) {
  const [stories, setStories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!userId) {
      setStories([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    getUserStories(userId)
      .then((data) => {
        if (cancelled) return;
        setStories(data);
        setError('');
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || 'Could not load stories.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const addLinkStory = useCallback(
    async ({ title, videoUrl }) => {
      const saved = await createLinkStory(userId, { title, videoUrl });
      setStories((prev) => [saved, ...prev]);
      return saved;
    },
    [userId]
  );

  const addUploadStory = useCallback(
    async ({ title, file, thumbnail }) => {
      const saved = await createUploadStory(userId, { title, file, thumbnail });
      setStories((prev) => [saved, ...prev]);
      return saved;
    },
    [userId]
  );

  const shareStory = useCallback(async (storyId) => {
    const updated = await markStoryShared(storyId);
    setStories((prev) => prev.map((story) => (story.id === storyId ? updated : story)));
    return updated;
  }, []);

  const deleteStory = useCallback(
    async (storyId) => {
      await deleteStoryService(userId, storyId);
      setStories((prev) => prev.filter((story) => story.id !== storyId));
    },
    [userId]
  );

  return { stories, loading, error, addLinkStory, addUploadStory, shareStory, deleteStory };
}
