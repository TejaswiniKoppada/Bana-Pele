import { useMemo, useState } from "react";
import {
  BookmarkIcon,
  CloseIcon,
  FacebookIcon,
  InstagramIcon,
  PlayIcon,
  ShareIcon,
  TikTokIcon,
  TrashIcon,
  VideoIcon,
  WhatsAppIcon,
  YouTubeIcon,
} from "@/assets/icons";
import {
  getYouTubeThumbnailUrl,
  getYouTubeVideoId,
  thumbnailPlaceholderGradient,
} from "@/utils/formatters";
import "./StoryCard.css";

/**
 * Platforms offered from a story's Share row — all handled the same way
 * (native share sheet, falling back to a clipboard copy). To add a target:
 * add an entry here, everything else is already generic.
 */
const SHARE_TARGETS = [
  {
    id: "youtube",
    label: "YouTube",
    icon: YouTubeIcon,
    color: "var(--color-badge)",
  },
  {
    id: "instagram",
    label: "Instagram",
    icon: InstagramIcon,
    color: "#e1306c",
  },
  { id: "tiktok", label: "TikTok", icon: TikTokIcon, color: "#000000" },
  { id: "facebook", label: "Facebook", icon: FacebookIcon, color: "#1877f2" },
  {
    id: "whatsapp",
    label: "WhatsApp",
    icon: WhatsAppIcon,
    color: "var(--color-whatsapp)",
  },
];

/**
 * `shareable`/`onShare` are only used by My Stories' upload-type cards.
 * `onShare` just records the share (marks shared_to_social) once the user
 * actually picks a platform below — it never gates the Share button itself,
 * so the same video can be (re)shared anytime.
 *
 * `onDelete` is also My Stories-only (Recommended/Bookmarked never pass it).
 */
export default function StoryCard({
  story,
  bookmarked,
  onBookmarkToggle,
  shareable,
  onShare,
  onDelete,
  playing = false,
  onPlay,
  onStop,
}) {
  const { title, sourceUrl, storyType, thumbnailUrl } = story;
  const [shareOpen, setShareOpen] = useState(false);
  const [shareBusyId, setShareBusyId] = useState(null);
  const [shareStatus, setShareStatus] = useState("");
  const [shareError, setShareError] = useState("");

  const youtubeId = useMemo(() => getYouTubeVideoId(sourceUrl), [sourceUrl]);
  // YouTube links fall back to YouTube's public thumbnail CDN. Uploads use
  // their own captured thumbnail when one was saved (see
  // userStoriesService's createUploadStory/uploadThumbnail) — otherwise the
  // uploaded video itself stands in as its own poster frame (below), so
  // there's always something real to show instead of the gradient.
  const posterUrl = thumbnailUrl || getYouTubeThumbnailUrl(sourceUrl);
  const showVideoAsPoster = !posterUrl && storyType === "upload" && Boolean(sourceUrl);
  const canPlayInline = Boolean(youtubeId) || storyType === "upload";

  function handleDeleteClick() {
    if (window.confirm("Delete this story?")) {
      onDelete?.(story);
    }
  }

  async function handleShareTarget(target) {
    if (shareBusyId) return;
    if (!sourceUrl) {
      setShareError("This story has no shareable link yet.");
      return;
    }
    setShareBusyId(target.id);
    setShareStatus("");
    setShareError("");

    try {
      if (navigator.share) {
        await navigator.share({ title, url: sourceUrl });
      } else if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(sourceUrl);
        setShareStatus(`Link copied — paste it into ${target.label}.`);
      } else {
        setShareStatus(
          `${target.label} can't be opened from the browser. Copy the link instead.`,
        );
      }
      await onShare?.();
    } catch (err) {
      // The user dismissing the native share sheet is not a failure.
      if (err?.name === "AbortError") return;
      setShareError(err?.message || "Could not share this story.");
    } finally {
      setShareBusyId(null);
    }
  }

  return (
    <div className="card story-card">
      <div
        className="story-card__thumbnail"
        style={
          !posterUrl && !showVideoAsPoster && !playing
            ? { background: thumbnailPlaceholderGradient(title) }
            : undefined
        }
      >
        {playing ? (
          <>
            {youtubeId ? (
              <iframe
                className="story-card__player"
                src={`https://www.youtube.com/embed/${youtubeId}?autoplay=1`}
                title={title}
                allow="autoplay; encrypted-media; picture-in-picture"
                allowFullScreen
              />
            ) : (
              <video
                className="story-card__player"
                src={sourceUrl}
                controls
                autoPlay
              />
            )}
            <button
              type="button"
              className="story-card__player-close"
              aria-label="Stop playing"
              onClick={() => onStop?.()}
            >
              <CloseIcon />
            </button>
          </>
        ) : (
          <>
            {posterUrl && (
              <img className="story-card__poster" src={posterUrl} alt="" />
            )}
            {showVideoAsPoster && (
              // No saved thumbnail — decode a real frame from the video
              // itself instead of a flat gradient. The #t=0.1 media
              // fragment makes the browser seek and paint that frame
              // without playing (no controls/autoplay), so it just sits
              // there looking like a static poster image.
              <video
                className="story-card__poster"
                src={`${sourceUrl}#t=0.1`}
                muted
                playsInline
                preload="metadata"
              />
            )}
            {onBookmarkToggle && (
              <button
                className="story-card__bookmark-btn"
                onClick={() => onBookmarkToggle?.(story)}
                aria-label={bookmarked ? "Remove bookmark" : "Bookmark story"}
              >
                <BookmarkIcon filled={bookmarked} />
              </button>
            )}
            {onDelete && (
              <button
                className="story-card__delete-btn"
                onClick={handleDeleteClick}
                aria-label="Delete story"
              >
                <TrashIcon />
              </button>
            )}
            {canPlayInline ? (
              <button
                type="button"
                className="story-card__play-btn"
                onClick={() => onPlay?.()}
                aria-label={`Play ${title}`}
              >
                <PlayIcon />
              </button>
            ) : (
              // Nothing we can embed (not a YouTube link, not our own
              // upload) — a real anchor beats a JS window.open: it works
              // with right-click/open-in-new-tab and can't be popup-blocked.
              <a
                className="story-card__play-btn"
                href={sourceUrl}
                target="_blank"
                rel="noreferrer"
                aria-label={`Play ${title}`}
              >
                <PlayIcon />
              </a>
            )}
          </>
        )}
      </div>

      <div className="story-card__body">
        <p className="story-card__title">{title}</p>
        <a
          className="story-card__source"
          href={sourceUrl}
          target="_blank"
          rel="noreferrer"
        >
          {youtubeId ? <YouTubeIcon /> : <VideoIcon />}
          <span>{sourceUrl}</span>
        </a>
      </div>

      {/* My Stories only (Recommended/Bookmarked never pass onShare) */}
      {onShare && shareable && (
        <div className="story-card__share">
          <button
            type="button"
            className="story-card__share-toggle"
            aria-expanded={shareOpen}
            onClick={() => setShareOpen((v) => !v)}
          >
            <ShareIcon aria-hidden="true" />
            Share
          </button>

          {shareOpen && (
            <div className="story-card__share-row">
              {SHARE_TARGETS.map((target) => (
                <button
                  key={target.id}
                  type="button"
                  className="story-card__share-btn"
                  style={{ "--brand": target.color }}
                  aria-label={`Share to ${target.label}`}
                  disabled={Boolean(shareBusyId)}
                  onClick={() => handleShareTarget(target)}
                >
                  <target.icon aria-hidden="true" />
                </button>
              ))}
            </div>
          )}

          {shareStatus && (
            <p className="story-card__share-status" role="status">
              {shareStatus}
            </p>
          )}
          {shareError && (
            <p className="story-card__share-error" role="alert">
              {shareError}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
