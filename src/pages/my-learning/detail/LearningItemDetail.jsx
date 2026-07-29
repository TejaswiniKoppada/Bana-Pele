import { useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import {
  CheckIcon,
  ChevronLeftIcon,
  PlayIcon,
  VideoIcon,
  YouTubeIcon,
} from "../../../assets/icons";
import { useAppState } from "../../../app/providers/AppStateProvider";
import {
  getRecommendationsByStatus,
  startRecommendation,
} from "../../../services/learningService";
import {
  getYouTubeThumbnailUrl,
  getYouTubeVideoId,
  thumbnailPlaceholderGradient,
} from "../../../utils/formatters";
import "../../../features/learning/pages/MyLearningPage.css";
import "../../../features/profile/pages/ProfilePage.css";

/**
 * Accepted learning item detail — top-level route (same pattern as
 * Profile/Chat: data arrives via navigation state from the Recommended
 * list, with a live re-fetch fallback for a direct link/refresh).
 */
export default function LearningItemDetail() {
  const { itemId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { state } = useAppState();
  const [item, setItem] = useState(location.state?.item ?? null);
  const [loading, setLoading] = useState(!location.state?.item);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    if (item) return;
    let cancelled = false;
    getRecommendationsByStatus(state.currentUser.id, [
      "accepted",
      "in_progress",
      "completed",
    ])
      .then((list) => {
        if (cancelled) return;
        setItem(list.find((i) => i.id === itemId) ?? null);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemId]);

  async function handleStartLearning() {
    if (!item || starting) return;
    setStarting(true);
    window.open(item.resourceLink, "_blank", "noopener,noreferrer");
    try {
      await startRecommendation(item.id);
      navigate("/my-learning/in-progress");
    } finally {
      setStarting(false);
    }
  }

  return (
    <div className="learning-detail-page">
      <button
        className="profile-page__back"
        onClick={() => navigate(-1)}
        aria-label="Back"
      >
        <ChevronLeftIcon />
      </button>

      {loading && <p className="page-status">Loading…</p>}
      {!loading && !item && (
        <p className="page-status">This item isn't available right now.</p>
      )}

      {item &&
        (() => {
          const youtubeId = getYouTubeVideoId(item.resourceLink);
          const posterUrl = getYouTubeThumbnailUrl(item.resourceLink);
          const isCompleted = item.status === "completed";
          const isInProgress = item.status === "in_progress";
          return (
            <div className="card learning-detail">
              <div
                className={`learning-card__thumb learning-detail__thumb${isCompleted ? " learning-card--completed" : ""}`}
                style={
                  !posterUrl
                    ? { background: thumbnailPlaceholderGradient(item.title) }
                    : undefined
                }
              >
                {posterUrl && (
                  <img
                    className="learning-card__thumb-img"
                    src={posterUrl}
                    alt=""
                  />
                )}
                <a
                  className="learning-card__play-badge learning-detail__play-badge"
                  href={item.resourceLink}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={`Watch ${item.title}`}
                >
                  <PlayIcon />
                </a>
                {item.materialType && (
                  <span className="learning-card__type-badge">
                    {youtubeId ? <YouTubeIcon /> : <VideoIcon />}
                    {item.materialType}
                  </span>
                )}
                {isCompleted && (
                  <span className="learning-card__status-badge learning-card__status-badge--complete">
                    <CheckIcon />
                    Completed
                  </span>
                )}
              </div>

              <div className="learning-detail__body">
                {item.skillCategory && (
                  <span className="learning-card__category">
                    {item.skillCategory}
                  </span>
                )}
                <p className="learning-detail__title">{item.title}</p>
                <p className="learning-detail__by">By {item.mentorName}</p>

                {isInProgress && (
                  <div className="learning-card__progress learning-detail__progress">
                    <div className="learning-card__progress-track">
                      <div
                        className="learning-card__progress-fill"
                        style={{ width: `${item.progressPercent}%` }}
                      />
                    </div>
                    <span className="learning-card__progress-label">
                      {item.progressPercent}% complete
                    </span>
                  </div>
                )}

                <div className="learning-detail__field">
                  <span className="profile-field__label">Resource Link</span>
                  <p className="profile-field__value">
                    <a
                      className="learning-detail__link"
                      href={item.resourceLink}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {item.resourceLink}
                    </a>
                  </p>
                </div>

                {item.status === "accepted" && (
                  <button
                    type="button"
                    className="btn-primary"
                    disabled={starting}
                    onClick={handleStartLearning}
                  >
                    {starting ? "Starting…" : "Start Learning"}
                  </button>
                )}
              </div>
            </div>
          );
        })()}
    </div>
  );
}
