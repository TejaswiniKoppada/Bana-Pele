import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAppState } from "../../../app/providers/AppStateProvider";
import {
  getRecommendationsByStatus,
  startRecommendationGroup,
} from "../../../services/learningService";

/** Groups flat 'accepted' rows by recommendation_group_id — everything sent
 * together in one Recommend Learning action renders as one card. */
function groupByRecommendation(items) {
  const groups = new Map();
  for (const item of items) {
    const existing = groups.get(item.groupId);
    if (existing) {
      existing.items.push(item);
    } else {
      groups.set(item.groupId, {
        groupId: item.groupId,
        mentorName: item.mentorName,
        createdAt: item.createdAt,
        items: [item],
      });
    }
  }
  return [...groups.values()].sort((a, b) =>
    a.createdAt < b.createdAt ? 1 : -1,
  );
}

export default function Recommended() {
  const { state } = useAppState();
  const menteeId = state.currentUser.id;
  const menteeName = state.currentUser.name;
  const navigate = useNavigate();
  const [items, setItems] = useState(null);
  const [error, setError] = useState("");
  const [startingGroupId, setStartingGroupId] = useState(null);

  function load() {
    getRecommendationsByStatus(menteeId, ["accepted"])
      .then(setItems)
      .catch((err) => {
        setError(err.message || "Could not load learning recommendations.");
        setItems([]); // stop showing "Loading…" forever — the error message above takes over
      });
  }

  useEffect(load, [menteeId]);

  async function handleStart(group) {
    setStartingGroupId(group.groupId);
    // Same "take me to the material" behavior the single-item flow always
    // had — opens every material in the group (only ever one tab in the
    // common single-material case), before the status update below.
    for (const item of group.items) {
      window.open(item.resourceLink, "_blank", "noopener,noreferrer");
    }
    try {
      await startRecommendationGroup(group.groupId);
      navigate("/my-learning/in-progress");
    } finally {
      setStartingGroupId(null);
    }
  }

  const loading = items === null;
  const groups = loading ? [] : groupByRecommendation(items);

  return (
    <div>
      {loading && <p className="page-status">Loading recommendations…</p>}
      {!loading && error && <p className="page-status">{error}</p>}
      {!loading && !error && groups.length === 0 && (
        <p className="page-status">
          No recommended learning yet — check back soon.
        </p>
      )}

      <div className="learning-card-list">
        {!loading &&
          groups.map((group) => (
            <div
              key={group.groupId}
              className="card learning-recommendation-group"
            >
              <p className="learning-recommendation-group__message">
                Hi {menteeName}, <strong>{group.mentorName}</strong>{" "}
                recommended these learnings for you.
              </p>
              <ul className="learning-recommendation-group__list">
                {group.items.map((item) => (
                  <li
                    key={item.id}
                    className="learning-recommendation-group__item"
                  >
                    <span className="learning-recommendation-group__item-title">
                      {item.title}
                    </span>
                    <span className="learning-recommendation-group__item-meta">
                      {item.skillCategory} · {item.materialType}
                    </span>
                  </li>
                ))}
              </ul>
              <button
                type="button"
                className="btn-primary"
                disabled={startingGroupId === group.groupId}
                onClick={() => handleStart(group)}
              >
                {startingGroupId === group.groupId
                  ? "Starting…"
                  : "Start Learning"}
              </button>
            </div>
          ))}
      </div>
    </div>
  );
}
