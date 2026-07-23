import { useRef, useState } from 'react';
import SearchBar from '../../../components/SearchBar/SearchBar';
import StoryCard from '../../../components/StoryCard/StoryCard';
import { VideoIcon } from '../../../assets/icons';
import { useUserStories } from '../../../hooks/useUserStories';
import { useAppState } from '../../../context/AppStateContext';
import { validateStoryFile } from '../../../services/userStoriesService';

const ENTRY_MODES = { LINK: 'link', UPLOAD: 'upload' };

export default function MyStories() {
  const { state } = useAppState();
  const { stories, loading, error, addLinkStory, addUploadStory, shareStory, deleteStory } = useUserStories(
    state.currentUser.id
  );
  const [query, setQuery] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [entryMode, setEntryMode] = useState(ENTRY_MODES.LINK);

  const [title, setTitle] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');
  const [file, setFile] = useState(null);
  const [fileError, setFileError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const fileInputRef = useRef(null);

  const visibleStories = stories.filter((story) => story.title.toLowerCase().includes(query.toLowerCase()));

  function resetForm() {
    setTitle('');
    setSourceUrl('');
    setFile(null);
    setFileError('');
    setSubmitError('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  function handleFileChange(e) {
    const picked = e.target.files?.[0] ?? null;
    if (!picked) {
      setFile(null);
      setFileError('');
      return;
    }
    const validationError = validateStoryFile(picked);
    if (validationError) {
      setFile(null);
      setFileError(validationError);
      e.target.value = '';
      return;
    }
    setFile(picked);
    setFileError('');
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!title.trim()) return;
    setSubmitError('');

    if (entryMode === ENTRY_MODES.LINK) {
      if (!sourceUrl.trim()) return;
      setSubmitting(true);
      try {
        await addLinkStory({ title: title.trim(), videoUrl: sourceUrl.trim() });
        resetForm();
        setFormOpen(false);
      } catch (err) {
        setSubmitError(err.message || 'Could not post this story.');
      } finally {
        setSubmitting(false);
      }
      return;
    }

    if (!file) {
      setFileError('Please choose a video file.');
      return;
    }
    setSubmitting(true);
    try {
      await addUploadStory({ title: title.trim(), file });
      resetForm();
      setFormOpen(false);
    } catch (err) {
      setSubmitError(err.message || 'Could not upload this story.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(story) {
    setDeleteError('');
    try {
      await deleteStory(story.id);
    } catch (err) {
      setDeleteError(err.message || 'Could not delete this story.');
    }
  }

  return (
    <div>
      <SearchBar value={query} onChange={setQuery} placeholder="Search" onFilterClick={() => {}} />

      <button className="btn-primary my-stories__cta" onClick={() => setFormOpen((v) => !v)}>
        <VideoIcon />
        Create & post your own story
      </button>

      {formOpen && (
        <div className="my-stories__form-wrapper">
          <div className="search-view-toggle my-stories__mode-toggle">
            <button
              type="button"
              className={`search-view-toggle__btn${entryMode === ENTRY_MODES.LINK ? ' search-view-toggle__btn--active' : ''}`}
              onClick={() => setEntryMode(ENTRY_MODES.LINK)}
            >
              Share an existing link
            </button>
            <button
              type="button"
              className={`search-view-toggle__btn${entryMode === ENTRY_MODES.UPLOAD ? ' search-view-toggle__btn--active' : ''}`}
              onClick={() => setEntryMode(ENTRY_MODES.UPLOAD)}
            >
              Upload from my device
            </button>
          </div>

          <form className="my-stories__form" onSubmit={handleSubmit}>
            <input
              type="text"
              placeholder="Story title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />

            {entryMode === ENTRY_MODES.LINK ? (
              <input
                type="url"
                placeholder="Video link (e.g. YouTube URL)"
                value={sourceUrl}
                onChange={(e) => setSourceUrl(e.target.value)}
                required
              />
            ) : (
              <>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="video/mp4,video/quicktime,video/webm,.mp4,.mov,.webm"
                  onChange={handleFileChange}
                />
                <p className="my-stories__file-hint">MP4, MOV, or WEBM — up to 50MB.</p>
                {fileError && <p className="my-stories__field-error">{fileError}</p>}
              </>
            )}

            {submitError && <p className="my-stories__field-error">{submitError}</p>}

            <button type="submit" className="btn-secondary" disabled={submitting}>
              {submitting ? (entryMode === ENTRY_MODES.UPLOAD ? 'Uploading…' : 'Posting…') : 'Post story'}
            </button>
          </form>
        </div>
      )}

      {loading && <p className="page-status">Loading stories…</p>}
      {!loading && error && <p className="page-status">{error}</p>}
      {deleteError && <p className="page-status">{deleteError}</p>}
      {!loading && !error && visibleStories.length === 0 && (
        <p className="page-status">No stories posted yet — share a link or upload a video above.</p>
      )}
      <div className="story-list">
        {!loading &&
          !error &&
          visibleStories.map((story) => (
            <StoryCard
              key={story.id}
              story={story}
              shareable={story.storyType === 'upload'}
              onShare={() => shareStory(story.id)}
              onDelete={() => handleDelete(story)}
            />
          ))}
      </div>
    </div>
  );
}
