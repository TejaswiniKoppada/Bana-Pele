import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import LearningCard from "@/components/LearningCard/LearningCard";
import { useAppState } from "../../../app/providers/AppStateProvider";
import {
  acceptRecommendation,
  getRecommendationsByStatus,
} from "../../../services/learningService";

/** Real recommendations for the current user (Supabase — see learningService.js). */
function useRecommendations(menteeId, statuses) {
  const [items, setItems] = useState(null);
  const [error, setError] = useState("");
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let cancelled = false;
    getRecommendationsByStatus(menteeId, statuses)
      .then((data) => {
        if (!cancelled) setItems(data);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err.message || "Could not load learning recommendations.");
        setItems([]); // stop showing "Loading…" forever — the error message above takes over
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [menteeId, reloadToken]);

  return { items, error, reload: () => setReloadToken((t) => t + 1) };
}

export default function Recommended() {
  const { state } = useAppState();
  const menteeId = state.currentUser.id;
  const navigate = useNavigate();
  const pending = useRecommendations(menteeId, ["pending"]);
  const accepted = useRecommendations(menteeId, ["accepted"]);
  const [acceptingId, setAcceptingId] = useState(null);

  async function handleAccept(item) {
    setAcceptingId(item.id);
    try {
      await acceptRecommendation(item.id);
      pending.reload();
      accepted.reload();
    } finally {
      setAcceptingId(null);
    }
  }

  const loading = pending.items === null || accepted.items === null;

  return (
    <div>
      {pending.error && <p className="page-status">{pending.error}</p>}

      {!loading && pending.items.length > 0 && (
        <div className="learning-pending">
          <p className="learning-pending__title">Pending</p>
          <div className="learning-card-list">
            {pending.items.map((item) => (
              <LearningCard
                key={item.id}
                item={item}
                pending
                statusLabel="Pending"
                footer={
                  <button
                    type="button"
                    className="btn-secondary"
                    disabled={acceptingId === item.id}
                    onClick={() => handleAccept(item)}
                  >
                    {acceptingId === item.id ? "Accepting…" : "Accept"}
                  </button>
                }
              />
            ))}
          </div>
        </div>
      )}

      {loading && <p className="page-status">Loading recommendations…</p>}
      {!loading && accepted.error && (
        <p className="page-status">{accepted.error}</p>
      )}
      {!loading &&
        !accepted.error &&
        accepted.items.length === 0 &&
        pending.items.length === 0 && (
          <p className="page-status">
            No recommended learning yet — check back soon.
          </p>
        )}

      <div className="learning-card-list">
        {!loading &&
          accepted.items.map((item) => (
            <LearningCard
              key={item.id}
              item={item}
              onClick={() =>
                navigate(`/my-learning/item/${item.id}`, { state: { item } })
              }
            />
          ))}
      </div>
    </div>
  );
}
