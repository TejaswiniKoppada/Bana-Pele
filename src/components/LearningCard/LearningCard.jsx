import { CheckIcon, PlayIcon, VideoIcon, YouTubeIcon } from '../../assets/icons';
import { getYouTubeThumbnailUrl, getYouTubeVideoId, thumbnailPlaceholderGradient } from '../../utils/formatters';

/**
 * Shared card look for every My Learning list (Recommended, In Progress) —
 * every item here is a real YouTube link (see services/learningCatalog.js),
 * so the real public thumbnail CDN (getYouTubeThumbnailUrl, same helper
 * StoryCard already uses) gives each card a real poster image instead of
 * just a text row, with a styled fallback (gradient + link icon swap) for
 * the rare non-YouTube link. `onClick` makes the whole card a button; omit
 * it for lists that already have their own footer action button, since a
 * button can't be nested inside another. In-progress items get a real
 * progress bar driven by `item.progressPercent` (demo-illustrative — see
 * learningService.js); completed items get a checkmark badge and a muted
 * thumbnail instead.
 */
export default function LearningCard({ item, onClick, statusLabel, statusTone, footer }) {
  const youtubeId = getYouTubeVideoId(item.resourceLink);
  const posterUrl = getYouTubeThumbnailUrl(item.resourceLink);
  const Wrapper = onClick ? 'button' : 'div';
  const isCompleted = item.status === 'completed';
  const isInProgress = item.status === 'in_progress';

  return (
    <Wrapper
      type={onClick ? 'button' : undefined}
      className={`card learning-card${isCompleted ? ' learning-card--completed' : ''}`}
      onClick={onClick}
    >
      <div
        className="learning-card__thumb"
        style={!posterUrl ? { background: thumbnailPlaceholderGradient(item.title) } : undefined}
      >
        {posterUrl && <img className="learning-card__thumb-img" src={posterUrl} alt="" />}
        <span className="learning-card__play-badge" aria-hidden="true">
          <PlayIcon />
        </span>
        {item.materialType && (
          <span className="learning-card__type-badge">
            {youtubeId ? <YouTubeIcon /> : <VideoIcon />}
            {item.materialType}
          </span>
        )}
        {statusLabel && (
          <span
            className={`learning-card__status-badge${statusTone ? ` learning-card__status-badge--${statusTone}` : ''}`}
          >
            {isCompleted && <CheckIcon />}
            {statusLabel}
          </span>
        )}
      </div>
      <div className="learning-card__body">
        {item.skillCategory && <span className="learning-card__category">{item.skillCategory}</span>}
        <p className="learning-card__title">{item.title}</p>
        <p className="learning-card__by">By {item.mentorName}</p>
        {isInProgress && (
          <div className="learning-card__progress" role="progressbar" aria-valuenow={item.progressPercent} aria-valuemin={0} aria-valuemax={100}>
            <div className="learning-card__progress-track">
              <div className="learning-card__progress-fill" style={{ width: `${item.progressPercent}%` }} />
            </div>
            <span className="learning-card__progress-label">{item.progressPercent}% complete</span>
          </div>
        )}
        {footer && <div className="learning-card__footer">{footer}</div>}
      </div>
    </Wrapper>
  );
}
