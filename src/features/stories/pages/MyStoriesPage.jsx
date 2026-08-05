import { useCallback, useEffect, useRef, useState } from 'react';
import SearchBar from '@/components/reusable/SearchBar/SearchBar';
import Loader from '@/components/reusable/Loader/Loader';
import Pagination from '@/components/reusable/Pagination/Pagination';
import StoryCard from '@/features/stories/components/StoryCard/StoryCard';
import { CameraIcon, CameraSwitchIcon, CloseIcon, LinkIcon, UploadIcon, VideoIcon } from '@/assets/icons';
import { useUserStories } from '@/features/stories/hooks/useUserStories';
import { useAppState } from '@/app/providers/AppStateProvider';
import { ALLOWED_VIDEO_EXTENSIONS, ALLOWED_VIDEO_MIME_TYPES, MAX_UPLOAD_BYTES, validateStoryFile } from '@/features/stories/api/stories.api';

const ENTRY_MODES = { LINK: 'link', UPLOAD: 'upload', RECORD: 'record' };
const FILE_INPUT_ACCEPT = [...ALLOWED_VIDEO_MIME_TYPES, ...ALLOWED_VIDEO_EXTENSIONS].join(',');
const MAX_UPLOAD_MB = Math.round(MAX_UPLOAD_BYTES / (1024 * 1024));
const CAPTURE_TIMEOUT_MS = 8000;
const MAX_RECORD_SECONDS = 5 * 60; // keeps recordings well under MAX_UPLOAD_BYTES at typical bitrates
const RECORD_MIME_CANDIDATES = [
  'video/webm;codecs=vp9,opus',
  'video/webm;codecs=vp8,opus',
  'video/webm',
  'video/mp4',
];

function pickSupportedRecordMimeType() {
  if (typeof MediaRecorder === 'undefined') return '';
  return RECORD_MIME_CANDIDATES.find((type) => MediaRecorder.isTypeSupported?.(type)) || '';
}

function formatDuration(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

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

  // 'idle' | 'starting' | 'live' | 'recording' | 'stopped'
  const [recordingState, setRecordingState] = useState('idle');
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [cameraError, setCameraError] = useState('');
  const [facingMode, setFacingMode] = useState('user'); // 'user' (front) | 'environment' (back)
  const [switchingCamera, setSwitchingCamera] = useState(false);

  const fileInputRef = useRef(null);
  const titleInputRef = useRef(null);
  const previewUrlRef = useRef(null);
  const captureTokenRef = useRef(0);
  const restoreFocusRef = useRef(null);
  const liveVideoRef = useRef(null);
  const streamRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const recordedChunksRef = useRef([]);
  const recordTimerRef = useRef(null);

  const releasePreview = useCallback(() => {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }
  }, []);

  // Releases the camera/mic and tears down any in-flight recorder — called
  // whenever the user leaves the Record tab, closes the modal, or unmounts
  // mid-recording, so the browser's camera indicator always goes away.
  const stopCamera = useCallback(() => {
    if (recordTimerRef.current) {
      clearInterval(recordTimerRef.current);
      recordTimerRef.current = null;
    }
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.ondataavailable = null;
      mediaRecorderRef.current.onstop = null;
      if (mediaRecorderRef.current.state !== 'inactive') mediaRecorderRef.current.stop();
      mediaRecorderRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  }, []);

  const startCamera = useCallback(async () => {
    setCameraError('');
    setRecordingState('starting');

    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError('Camera recording is not supported in this browser.');
      setRecordingState('idle');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: facingMode } },
        audio: true,
      });
      streamRef.current = stream;
      if (liveVideoRef.current) {
        liveVideoRef.current.srcObject = stream;
        await liveVideoRef.current.play().catch(() => {});
      }
      setRecordingState('live');
    } catch (err) {
      setCameraError(
        err?.name === 'NotAllowedError'
          ? 'Camera access was denied. Allow camera & microphone access to record a video.'
          : 'Could not access your camera. Try again.'
      );
      setRecordingState('idle');
    }
  }, [facingMode]);

  // Swaps the active camera (front/back) while previewing, without
  // interrupting an in-progress recording — only offered while 'live'.
  const switchCamera = useCallback(async () => {
    if (recordingState !== 'live' || switchingCamera) return;
    const nextFacing = facingMode === 'user' ? 'environment' : 'user';
    setSwitchingCamera(true);
    setCameraError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: nextFacing } },
        audio: true,
      });
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
      streamRef.current = stream;
      if (liveVideoRef.current) {
        liveVideoRef.current.srcObject = stream;
        await liveVideoRef.current.play().catch(() => {});
      }
      setFacingMode(nextFacing);
    } catch {
      setCameraError('Could not switch camera — your device may only have one.');
    } finally {
      setSwitchingCamera(false);
    }
  }, [recordingState, switchingCamera, facingMode]);

  // Shared by the file picker and the recorder: validates the file, stores
  // it, and generates a thumbnail from it. `picked` is either a chosen
  // <input type="file"> file or a File built from a MediaRecorder blob.
  const processPickedFile = useCallback(
    async (picked) => {
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
    },
    [releasePreview]
  );

  const reset = useCallback(() => {
    captureTokenRef.current += 1;
    releasePreview();
    stopCamera();
    setTitle('');
    setMode(ENTRY_MODES.LINK);
    setVideoUrl('');
    setFile(null);
    setThumbnail(null);
    setCapturingThumb(false);
    setFileError('');
    setSubmitError('');
    setRecordingState('idle');
    setRecordSeconds(0);
    setCameraError('');
    setFacingMode('user');
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, [releasePreview, stopCamera]);

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

  // Never leak the preview object URL, or leave the camera running, if the
  // modal unmounts mid-flow.
  useEffect(() => releasePreview, [releasePreview]);
  useEffect(() => stopCamera, [stopCamera]);

  // Entering the Record tab (or retaking) requests the camera automatically;
  // cameraError blocks the auto-retry so a denied permission doesn't loop.
  useEffect(() => {
    if (mode === ENTRY_MODES.RECORD && recordingState === 'idle' && !cameraError) {
      startCamera();
    }
  }, [mode, recordingState, cameraError, startCamera]);

  // Auto-stop a recording that's run long enough to risk exceeding the upload size limit.
  useEffect(() => {
    if (recordingState === 'recording' && recordSeconds >= MAX_RECORD_SECONDS) {
      stopRecording();
    }
  }, [recordSeconds, recordingState]);

  if (!open) return null;

  const canPost =
    Boolean(title.trim()) && (mode === ENTRY_MODES.LINK ? Boolean(videoUrl.trim()) : Boolean(file));

  // Each tab starts fresh — carrying a file/link/recording over from
  // whichever tab was active before was confusing (e.g. Record showing the
  // video picked in Upload), so switching tabs clears the other tabs' input.
  function switchMode(next) {
    if (next === mode || submitting) return;
    if (mode === ENTRY_MODES.RECORD) {
      stopCamera();
    }
    releasePreview();
    captureTokenRef.current += 1;
    setVideoUrl('');
    setFile(null);
    setThumbnail(null);
    setCapturingThumb(false);
    setFileError('');
    setSubmitError('');
    setRecordingState('idle');
    setRecordSeconds(0);
    setCameraError('');
    if (fileInputRef.current) fileInputRef.current.value = '';
    setMode(next);
  }

  async function handleFile(e) {
    const picked = e.target.files?.[0] ?? null;
    if (picked && validateStoryFile(picked)) {
      e.target.value = '';
    }
    await processPickedFile(picked);
  }

  function startRecording() {
    if (!streamRef.current || recordingState !== 'live') return;
    const mimeType = pickSupportedRecordMimeType();
    try {
      const recorder = new MediaRecorder(streamRef.current, mimeType ? { mimeType } : undefined);
      recordedChunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) recordedChunksRef.current.push(e.data);
      };
      recorder.onstop = handleRecordingStop;
      recorder.start();
      mediaRecorderRef.current = recorder;
      setRecordSeconds(0);
      setRecordingState('recording');
      recordTimerRef.current = setInterval(() => setRecordSeconds((s) => s + 1), 1000);
    } catch {
      setCameraError('Could not start recording. Try again.');
    }
  }

  function stopRecording() {
    if (recordTimerRef.current) {
      clearInterval(recordTimerRef.current);
      recordTimerRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
  }

  async function handleRecordingStop() {
    const chunks = recordedChunksRef.current;
    recordedChunksRef.current = [];
    const recorder = mediaRecorderRef.current;
    mediaRecorderRef.current = null;

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    const type = recorder?.mimeType || 'video/webm';
    const blob = new Blob(chunks, { type });
    if (blob.size === 0) {
      setCameraError('Recording failed — try again.');
      setRecordingState('idle');
      return;
    }

    const extension = type.includes('mp4') ? '.mp4' : '.webm';
    const recordedFile = new File([blob], `story-recording-${Date.now()}${extension}`, { type });
    await processPickedFile(recordedFile);
    setRecordingState('stopped');
  }

  function retakeRecording() {
    releasePreview();
    setFile(null);
    setThumbnail(null);
    setFileError('');
    setCameraError('');
    setRecordSeconds(0);
    setRecordingState('idle');
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
    if (mode !== ENTRY_MODES.LINK && !file) {
      setFileError(mode === ENTRY_MODES.RECORD ? 'Record a video first.' : 'Choose a video file to upload.');
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
          (mode !== ENTRY_MODES.LINK ? 'Upload failed. Try again.' : 'Could not post this story. Try again.')
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
              <button
                type="button"
                role="tab"
                aria-selected={mode === ENTRY_MODES.RECORD}
                className={`search-view-toggle__btn${mode === ENTRY_MODES.RECORD ? ' search-view-toggle__btn--active' : ''}`}
                onClick={() => switchMode(ENTRY_MODES.RECORD)}
              >
                <CameraIcon aria-hidden="true" /> Record video
              </button>
            </div>

            {mode === ENTRY_MODES.LINK && (
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
            )}

            {mode === ENTRY_MODES.UPLOAD && (
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

            {mode === ENTRY_MODES.RECORD && (
              <div key={ENTRY_MODES.RECORD} className="recordbox">
                {cameraError && (
                  <p className="field__error" role="alert">
                    {cameraError}
                  </p>
                )}

                {(recordingState === 'starting' || recordingState === 'live' || recordingState === 'recording') && (
                  <div className="recordbox__stage">
                    {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
                    <video ref={liveVideoRef} className="recordbox__video" muted playsInline autoPlay />
                    {recordingState === 'recording' && (
                      <span className="recordbox__timer" aria-live="polite">
                        <span className="recordbox__dot" aria-hidden="true" />
                        {formatDuration(recordSeconds)}
                      </span>
                    )}
                    {recordingState === 'live' && (
                      <button
                        type="button"
                        className="recordbox__flip-btn"
                        onClick={switchCamera}
                        disabled={switchingCamera}
                        aria-label="Switch between front and back camera"
                        title="Switch camera"
                      >
                        <CameraSwitchIcon aria-hidden="true" />
                      </button>
                    )}
                  </div>
                )}

                {recordingState === 'stopped' && file && (
                  <div className="recordbox__stage">
                    {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
                    <video className="recordbox__video" src={previewUrlRef.current} controls />
                  </div>
                )}

                {recordingState === 'starting' && <p className="uploadbox__hint">Requesting camera access…</p>}

                <div className="recordbox__controls">
                  {recordingState === 'live' && (
                    <button type="button" className="btn-primary" onClick={startRecording}>
                      <span className="recordbox__dot" aria-hidden="true" /> Start recording
                    </button>
                  )}
                  {recordingState === 'recording' && (
                    <button type="button" className="btn-primary" onClick={stopRecording}>
                      Stop recording
                    </button>
                  )}
                  {recordingState === 'stopped' && (
                    <button type="button" className="btn-secondary" onClick={retakeRecording}>
                      Retake
                    </button>
                  )}
                  {recordingState === 'idle' && cameraError && (
                    <button type="button" className="btn-secondary" onClick={startCamera}>
                      Try again
                    </button>
                  )}
                </div>

                {capturingThumb && <p className="uploadbox__hint">Preparing preview…</p>}

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
              {submitting ? (mode !== ENTRY_MODES.LINK ? 'Uploading…' : 'Posting…') : 'Post story'}
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
  const [query, setQuery] = useState('');
  const {
    stories,
    loading,
    error,
    page,
    totalPages,
    goToPage,
    addLinkStory,
    addUploadStory,
    shareStory,
    deleteStory,
  } = useUserStories(state.currentUser?.id, query);

  const [createOpen, setCreateOpen] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [playingId, setPlayingId] = useState(null);

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

  const isEmpty = !loading && !error && stories.length === 0;

  return (
    <div>
      <SearchBar value={query} onChange={setQuery} placeholder="Search" showMic={false} />

      <button type="button" className="btn-primary my-stories__cta" onClick={() => setCreateOpen(true)}>
        <VideoIcon />
        Create &amp; post your own story
      </button>

      {loading && <Loader label="Loading your stories…" />}
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

      {!loading && !error && stories.length > 0 && (
        <div className="story-list">
          {stories.map((story) => (
            <StoryCard
              key={story.id}
              story={story}
              shareable={story.storyType === 'upload'}
              onShare={() => shareStory(story.id)}
              onDelete={() => handleDelete(story)}
              playing={playingId === story.id}
              onPlay={() => setPlayingId(story.id)}
              onStop={() => setPlayingId(null)}
            />
          ))}
        </div>
      )}

      {!loading && !error && <Pagination page={page} totalPages={totalPages} onPageChange={goToPage} />}

      <CreateStoryModal open={createOpen} onClose={() => setCreateOpen(false)} onPost={postStory} />
    </div>
  );
}
