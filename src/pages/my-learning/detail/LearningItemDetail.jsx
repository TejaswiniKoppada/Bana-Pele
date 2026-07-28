import { useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { ChevronLeftIcon } from "@/assets/icons";
import { useAppState } from "@/app/providers/AppStateProvider";
import {
  getRecommendationsByStatus,
  startRecommendation,
} from "@/services/learningService";
import "@/features/learning/pages/MyLearningPage.css";
import "@/features/profile/pages/ProfilePage.css";

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

      {item && (
        <div className="card learning-detail">
          <p className="learning-detail__title">{item.title}</p>
          <p className="learning-detail__by">By {item.mentorName}</p>

          <div className="learning-detail__field">
            <span className="profile-field__label">Skill Category</span>
            <p className="profile-field__value">{item.skillCategory}</p>
          </div>
          <div className="learning-detail__field">
            <span className="profile-field__label">Material Type</span>
            <p className="profile-field__value">{item.materialType}</p>
          </div>
          <div className="learning-detail__field">
            <span className="profile-field__label">Resource Link</span>
            <p className="profile-field__value">
              <a href={item.resourceLink} target="_blank" rel="noreferrer">
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
      )}
    </div>
  );
}
