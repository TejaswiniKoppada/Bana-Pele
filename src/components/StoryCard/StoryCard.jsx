import { useState } from 'react';
import { BookmarkIcon, PlayIcon, TrashIcon, YouTubeIcon } from '../../assets/icons';
import { thumbnailPlaceholderGradient } from '../../utils/helpers';
import '../../styles/components/cards.css';

/**
 * `shareable`/`onShare` are only used by My Stories' upload-type cards — the
 * Web Share API only confirms the share sheet was used, not that posting
 * actually completed on the target platform, so "shared" here means "user
 * initiated a share," never a verified guarantee (surfaced in the copy
 * below). The Share button always stays visible/clickable once a story is
 * shareable — story.sharedToSocial only changes the badge text, it never
 * hides or disables the button, so the same video can be (re)shared anytime.
 *
 * `onDelete` is also My Stories-only (Recommended/Bookmarked never pass it).
 */
export default function StoryCard({ story, bookmarked, onBookmarkToggle, shareable, onShare, onDelete }) {
  const { title, sourceUrl } = story;
  const [shareError, setShareError] = useState('');
  const [justCopied, setJustCopied] = useState(false);
  const canNativeShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function';

  async function handleShareClick() {
    setShareError('');

    if (canNativeShare) {
      try {
        await navigator.share({ title, url: sourceUrl });
      } catch (err) {
        if (err?.name === 'AbortError') return; // user cancelled the share sheet
        setShareError('Could not open the share sheet.');
        return;
      }
      try {
        await onShare?.();
      } catch {
        setShareError('Shared, but could not update its status — try again.');
      }
      return;
    }

    try {
      await navigator.clipboard.writeText(sourceUrl);
    } catch {
      setShareError('Could not copy the link.');
      return;
    }
    setJustCopied(true);
    setTimeout(() => setJustCopied(false), 1200);
    try {
      await onShare?.();
    } catch {
      setShareError('Link copied, but could not update its status — try again.');
    }
  }

  function handleDeleteClick() {
    if (window.confirm('Delete this story?')) {
      onDelete?.(story);
    }
  }

  return (
    <div className="card story-card">
      <div className="story-card__thumbnail" style={{ background: thumbnailPlaceholderGradient(title) }}>
        {onBookmarkToggle && (
          <button
            className="story-card__bookmark-btn"
            onClick={() => onBookmarkToggle?.(story)}
            aria-label={bookmarked ? 'Remove bookmark' : 'Bookmark story'}
          >
            <BookmarkIcon filled={bookmarked} />
          </button>
        )}
        {onDelete && (
          <button className="story-card__delete-btn" onClick={handleDeleteClick} aria-label="Delete story">
            <TrashIcon />
          </button>
        )}
        <div className="story-card__play-btn">
          <PlayIcon />
        </div>
      </div>
      <div className="story-card__body">
        <p className="story-card__title">{title}</p>
        <a className="story-card__source" href={sourceUrl} target="_blank" rel="noreferrer">
          <YouTubeIcon />
          <span>{sourceUrl}</span>
        </a>
      </div>
      {/* Rendered (reserving consistent card height) whenever a My Stories
          context wires up onShare at all — link-type stories just render
          this row empty rather than growing/shrinking the card. */}
      {onShare && (
        <div className="story-card__share-row">
          {shareable && (
            <>
              {story.sharedToSocial ? (
                <span className="story-card__shared-badge">Shared ✓</span>
              ) : (
                <span className="story-card__unshared-badge">Not shared on social media yet</span>
              )}
              <button className="btn-secondary story-card__share-btn" onClick={handleShareClick}>
                {justCopied ? 'Copied!' : canNativeShare ? 'Share' : 'Copy link'}
              </button>
              {!canNativeShare && !shareError && (
                <span className="story-card__share-note">Native sharing isn't available in this browser.</span>
              )}
              {shareError && <span className="story-card__share-error">{shareError}</span>}
            </>
          )}
        </div>
      )}
    </div>
  );
}
