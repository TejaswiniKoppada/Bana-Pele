import { useEffect, useState } from "react";
import LearningCard from "@/components/LearningCard/LearningCard";
import { useAppState } from "../../../app/providers/AppStateProvider";
import {
  completeRecommendation,
  getRecommendationsByStatus,
} from "../../../services/learningService";

export default function InProgress() {
  const { state } = useAppState();
  const menteeId = state.currentUser.id;
  const [items, setItems] = useState(null);
  const [error, setError] = useState("");
  const [completingId, setCompletingId] = useState(null);

  function load() {
    getRecommendationsByStatus(menteeId, ["in_progress", "completed"])
      .then(setItems)
      .catch((err) => {
        setError(err.message || "Could not load your learning progress.");
        setItems([]); // stop showing "Loading…" forever — the error message above takes over
      });
  }

  useEffect(load, [menteeId]);

  async function handleComplete(item) {
    setCompletingId(item.id);
    try {
      await completeRecommendation(item.id);
      load();
    } finally {
      setCompletingId(null);
    }
  }

  const loading = items === null;

  return (
    <div>
      {loading && <p className="page-status">Loading your progress…</p>}
      {!loading && error && <p className="page-status">{error}</p>}
      {!loading && !error && items.length === 0 && (
        <p className="page-status">
          Nothing in progress yet — start learning from the Recommended tab.
        </p>
      )}

      <div className="learning-card-list">
        {!loading &&
          items.map((item) => (
            <LearningCard
              key={item.id}
              item={item}
              statusLabel={
                item.status === "completed" ? "Completed" : "In Progress"
              }
              statusTone={item.status === "completed" ? "complete" : undefined}
              footer={
                item.status === "completed" ? (
                  <span className="learning-card__completed-badge">
                    Completed
                  </span>
                ) : (
                  <button
                    type="button"
                    className="btn-secondary"
                    disabled={completingId === item.id}
                    onClick={() => handleComplete(item)}
                  >
                    {completingId === item.id
                      ? "Marking complete…"
                      : "Mark Complete"}
                  </button>
                )
              }
            />
          ))}
      </div>
    </div>
  );
}
