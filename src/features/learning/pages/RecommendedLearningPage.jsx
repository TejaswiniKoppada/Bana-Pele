import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAppState } from "../../../app/providers/AppStateProvider";
import {
  getRecommendationsByStatus,
  startRecommendation,
} from "../../../services/learningService";

export default function Recommended() {
  const { state } = useAppState();
  const menteeId = state.currentUser.id;
  const menteeName = state.currentUser.name;
  const navigate = useNavigate();
  const [items, setItems] = useState(null);
  const [error, setError] = useState("");
  const [startingId, setStartingId] = useState(null);

  function load() {
    getRecommendationsByStatus(menteeId, ["accepted"])
      .then(setItems)
      .catch((err) => {
        setError(err.message || "Could not load learning recommendations.");
        setItems([]); // stop showing "Loading…" forever — the error message above takes over
      });
  }

  useEffect(load, [menteeId]);

  async function handleStart(item) {
    setStartingId(item.id);
    // Same "take me to the material" behavior this always had — opens the
    // resource link before the status update below.
    window.open(item.resourceLink, "_blank", "noopener,noreferrer");
    try {
      await startRecommendation(item.id);
      navigate("/my-learning/in-progress");
    } finally {
      setStartingId(null);
    }
  }

  const loading = items === null;

  return (
    <div>
      {loading && <p className="page-status">Loading recommendations…</p>}
      {!loading && error && <p className="page-status">{error}</p>}
      {!loading && !error && items.length === 0 && (
        <p className="page-status">
          No recommended learning yet — check back soon.
        </p>
      )}

      <div className="learning-card-list">
        {!loading &&
          items.map((item) => (
            <div key={item.id} className="card learning-recommendation-group">
              <p className="learning-recommendation-group__message">
                Hi {menteeName}, <strong>{item.mentorName}</strong> recommended
                this learning for you.
              </p>
              <ul className="learning-recommendation-group__list">
                <li className="learning-recommendation-group__item">
                  <span className="learning-recommendation-group__item-title">
                    {item.title}
                  </span>
                  <span className="learning-recommendation-group__item-meta">
                    {item.skillCategory} · {item.materialType}
                  </span>
                </li>
              </ul>
              <button
                type="button"
                className="btn-primary"
                disabled={startingId === item.id}
                onClick={() => handleStart(item)}
              >
                {startingId === item.id ? "Starting…" : "Start Learning"}
              </button>
            </div>
          ))}
      </div>
    </div>
  );
}
