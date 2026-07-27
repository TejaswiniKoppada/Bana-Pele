import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import SearchBar from '@/components/reusable/SearchBar/SearchBar';
import StoryCard from '@/features/stories/components/StoryCard/StoryCard';
import { CloseIcon, LinkIcon, UploadIcon, VideoIcon } from '@/assets/icons';
import { useUserStories } from '@/features/stories/hooks/useUserStories';
import { useAppState } from '@/app/providers/AppStateProvider';
import { ALLOWED_VIDEO_EXTENSIONS, ALLOWED_VIDEO_MIME_TYPES, MAX_UPLOAD_BYTES, validateStoryFile } from '@/features/stories/api/stories.api';

const ENTRY_MODES = { LINK: 'link', UPLOAD: 'upload' };
const FILE_INPUT_ACCEPT = [...ALLOWED_VIDEO_MIME_TYPES, ...ALLOWED_VIDEO_EXTENSIONS].join(',');
const MAX_UPLOAD_MB = Math.round(MAX_UPLOAD_BYTES / (1024 * 1024));
const CAPTURE_TIMEOUT_MS = 8000;

/**
 * Grabs a still frame from a local video file so an uploaded story's create
 * form can show a real preview instead of a blank box, and so there's a real
 * image to upload as the story's thumbnail (see userStoriesService's
 * createUploadStory/uploadThumbnail). Resolves null on any failure (codec
 * the browser can't decode, corrupt file, a file that never fires `seeked`)
 * so the caller can fall back gracefully — the story still posts, just
 * without a thumbnail. The caller owns `objectUrl` and is responsible for
 * revoking it.
 */
function captureVideoThumbnail(objectUrl) {
  return new Promise((resolve) => {
    const video = document.createElement('video');
    video.muted = true;
    video.playsInline = true;
    video.preload = 'metadata';

    let settled = false;
    let timer = null;

    const finish = (result) => {
      if (settled) return;
      settled = true;
      if (timer) clearTimeout(timer);
      video.removeAttribute('src');
      video.load();
      resolve(result);
    };

    video.addEventListener('loadedmetadata', () => {
      // Seek slightly into the clip — frame 0 is often black.
      const duration = Number.isFinite(video.duration) ? video.duration : 1;
      video.currentTime = Math.min(1, duration / 2);
    });

    video.addEventListener('seeked', () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth || 320;
        canvas.height = video.videoHeight || 180;
        canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);
        finish(canvas.toDataURL('image/jpeg', 0.85));
      } catch {
        finish(null);
      }
    });

    video.addEventListener('error', () => finish(null));

    timer = setTimeout(() => finish(null), CAPTURE_TIMEOUT_MS);
    video.src = objectUrl;
  });
}

/* ------------------------------------------------------------------ */
/* Create story modal                                                  */
/* ------------------------------------------------------------------ */

/**
 * `onPost` receives { mode: 'link', title, videoUrl } or
 * { mode: 'upload', title, file, thumbnail } and must return a promise —
 * matching useUserStories' addLinkStory/addUploadStory shape exactly. The
 * modal stays open and shows the rejection message if it throws, so the
 * user never loses what they typed.
 */
function CreateStoryModal({ open, onClose, onPost }) {
  const [title, setTitle] = useState('');
  const [mode, setMode] = useState(ENTRY_MODES.LINK);
  const [videoUrl, setVideoUrl] = useState('');
  const [file, setFile] = useState(null);
  const [thumbnail, setThumbnail] = useState(null);
  const [capturingThumb, setCapturingThumb] = useState(false);
  const [fileError, setFileError] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fileInputRef = useRef(null);
  const titleInputRef = useRef(null);
  const previewUrlRef = useRef(null);
  const captureTokenRef = useRef(0);
  const restoreFocusRef = useRef(null);

  const releasePreview = useCallback(() => {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }
  }, []);

  const reset = useCallback(() => {
    captureTokenRef.current += 1;
    releasePreview();
    setTitle('');
    setMode(ENTRY_MODES.LINK);
    setVideoUrl('');
    setFile(null);
    setThumbnail(null);
    setCapturingThumb(false);
    setFileError('');
    setSubmitError('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, [releasePreview]);

  const close = useCallback(() => {
    if (submitting) return;
    reset();
    onClose();
  }, [submitting, reset, onClose]);

  // Escape closes; focus moves into the dialog on open and back out on close.
  useEffect(() => {
    if (!open) return undefined;
    restoreFocusRef.current = document.activeElement;
    titleInputRef.current?.focus();

    const onKeyDown = (e) => {
      if (e.key === 'Escape') close();
    };
    document.addEventListener('keydown', onKeyDown);

    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = overflow;
      restoreFocusRef.current?.focus?.();
    };
  }, [open, close]);

  // Never leak the preview object URL if the modal unmounts mid-flow.
  useEffect(() => releasePreview, [releasePreview]);

  if (!open) return null;

  const canPost =
    Boolean(title.trim()) && (mode === ENTRY_MODES.LINK ? Boolean(videoUrl.trim()) : Boolean(file));

  function switchMode(next) {
    if (next === mode || submitting) return;
    setMode(next);
    setFileError('');
    setSubmitError('');
  }

  async function handleFile(e) {
    const picked = e.target.files?.[0] ?? null;
    const token = (captureTokenRef.current += 1);

    releasePreview();
    setThumbnail(null);
    setSubmitError('');

    if (!picked) {
      setFile(null);
      setFileError('');
      setCapturingThumb(false);
      return;
    }

    const validationError = validateStoryFile(picked);
    if (validationError) {
      setFile(null);
      setFileError(validationError);
      setCapturingThumb(false);
      e.target.value = '';
      return;
    }

    setFile(picked);
    setFileError('');
    setCapturingThumb(true);

    const url = URL.createObjectURL(picked);
    previewUrlRef.current = url;
    const thumb = await captureVideoThumbnail(url);

    // A newer pick (or a reset) landed while we were decoding — drop this one.
    if (token !== captureTokenRef.current) return;
    setThumbnail(thumb);
    setCapturingThumb(false);
  }

  async function submit(e) {
    e.preventDefault();
    if (submitting) return;

    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setSubmitError('Add a title so people know what your story is about.');
      titleInputRef.current?.focus();
      return;
    }
    if (mode === ENTRY_MODES.LINK && !videoUrl.trim()) {
      setSubmitError('Paste the link to your video.');
      return;
    }
    if (mode === ENTRY_MODES.UPLOAD && !file) {
      setFileError('Choose a video file to upload.');
      return;
    }

    setSubmitError('');
    setSubmitting(true);
    try {
      await onPost(
        mode === ENTRY_MODES.LINK
          ? { mode, title: trimmedTitle, videoUrl: videoUrl.trim() }
          : { mode, title: trimmedTitle, file, thumbnail }
      );
      reset();
      onClose();
    } catch (err) {
      setSubmitError(
        err?.message ||
          (mode === ENTRY_MODES.UPLOAD ? 'Upload failed. Try again.' : 'Could not post this story. Try again.')
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="storymodal"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div className="storymodal__card" role="dialog" aria-modal="true" aria-labelledby="create-story-title">
        <div className="storymodal__head">
          <h2 id="create-story-title" className="storymodal__title">
            Share your story
          </h2>
          <button type="button" className="storymodal__close" aria-label="Close" onClick={close} disabled={submitting}>
            <CloseIcon />
          </button>
        </div>

        <form onSubmit={submit} noValidate>
          <fieldset className="storymodal__fields" disabled={submitting}>
            <div className="field field--outlined">
              <input
                ref={titleInputRef}
                id="story-title"
                className="field__input"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. My journey to Bronze Certification"
                maxLength={120}
              />
              <label htmlFor="story-title" className="field__label">
                Story title
              </label>
            </div>

            <div className="search-view-toggle" role="tablist" aria-label="Video source">
              <button
                type="button"
                role="tab"
                aria-selected={mode === ENTRY_MODES.LINK}
                className={`search-view-toggle__btn${mode === ENTRY_MODES.LINK ? ' search-view-toggle__btn--active' : ''}`}
                onClick={() => switchMode(ENTRY_MODES.LINK)}
              >
                <LinkIcon aria-hidden="true" /> Paste YouTube link
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={mode === ENTRY_MODES.UPLOAD}
                className={`search-view-toggle__btn${mode === ENTRY_MODES.UPLOAD ? ' search-view-toggle__btn--active' : ''}`}
                onClick={() => switchMode(ENTRY_MODES.UPLOAD)}
              >
                <UploadIcon aria-hidden="true" /> Upload from device
              </button>
            </div>

            {mode === ENTRY_MODES.LINK ? (
              <div key={ENTRY_MODES.LINK} className="field field--outlined">
                <input
                  id="story-video-url"
                  className="field__input"
                  type="url"
                  inputMode="url"
                  value={videoUrl}
                  onChange={(e) => setVideoUrl(e.target.value)}
                  placeholder="https://www.youtube.com/watch?v=..."
                />
                <label htmlFor="story-video-url" className="field__label">
                  Video link
                </label>
              </div>
            ) : (
              <div key={ENTRY_MODES.UPLOAD} className="uploadbox">
                <input
                  ref={fileInputRef}
                  id="story-file"
                  type="file"
                  accept={FILE_INPUT_ACCEPT}
                  className="sr-only"
                  aria-describedby="story-file-hint"
                  onChange={handleFile}
                />
                <button type="button" className="uploadbox__btn" onClick={() => fileInputRef.current?.click()}>
                  <UploadIcon aria-hidden="true" />
                  {file ? file.name : 'Choose a video file'}
                </button>
                <p id="story-file-hint" className="uploadbox__hint">
                  MP4, MOV or WEBM — up to {MAX_UPLOAD_MB}MB.
                </p>

                {file && (capturingThumb || thumbnail) && (
                  <div className="uploadbox__preview">
                    {capturingThumb && <p className="uploadbox__hint">Generating preview…</p>}
                    {thumbnail && <img className="uploadbox__thumb" src={thumbnail} alt="" />}
                  </div>
                )}

                {fileError && (
                  <p className="field__error" role="alert">
                    {fileError}
                  </p>
                )}
              </div>
            )}

            {submitError && (
              <p className="field__error" role="alert">
                {submitError}
              </p>
            )}
          </fieldset>

          <div className="storymodal__actions">
            <button type="button" className="btn-secondary" onClick={close} disabled={submitting}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={!canPost || submitting || capturingThumb}>
              {submitting ? (mode === ENTRY_MODES.UPLOAD ? 'Uploading…' : 'Posting…') : 'Post story'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export default function MyStoriesPage() {
  const { state } = useAppState();
  const { stories, loading, error, addLinkStory, addUploadStory, shareStory, deleteStory } = useUserStories(
    state.currentUser?.id
  );

  const [query, setQuery] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const visibleStories = useMemo(() => {
    const q = query.trim().toLowerCase();
    return stories.filter((story) => story.title.toLowerCase().includes(q));
  }, [stories, query]);

  // Errors thrown here bubble back to the modal, which keeps itself open and
  // shows the message rather than silently discarding the user's input.
  async function postStory({ mode, title, videoUrl, file, thumbnail }) {
    if (mode === ENTRY_MODES.LINK) {
      await addLinkStory({ title, videoUrl });
      return;
    }
    await addUploadStory({ title, file, thumbnail });
  }

  async function handleDelete(story) {
    setDeleteError('');
    try {
      await deleteStory(story.id);
    } catch (err) {
      setDeleteError(err?.message || 'Could not delete this story.');
    }
  }

  const isEmpty = !loading && !error && visibleStories.length === 0;

  return (
    <div>
      <SearchBar value={query} onChange={setQuery} placeholder="Search" onFilterClick={() => {}} />

      <button type="button" className="btn-primary my-stories__cta" onClick={() => setCreateOpen(true)}>
        <VideoIcon />
        Create &amp; post your own story
      </button>

      {loading && <p className="page-status">Loading stories…</p>}
      {!loading && error && <p className="page-status">{error}</p>}
      {deleteError && (
        <p className="page-status" role="alert">
          {deleteError}
        </p>
      )}
      {isEmpty && (
        <p className="page-status">
          {query.trim()
            ? 'No stories match that search.'
            : 'No stories posted yet — share a link or upload a video above.'}
        </p>
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

      <CreateStoryModal open={createOpen} onClose={() => setCreateOpen(false)} onPost={postStory} />
    </div>
  );
}
