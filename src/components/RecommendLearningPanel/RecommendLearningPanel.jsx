import { useState } from "react";
import { ChevronRightIcon } from "../../assets/icons";
import { LEARNING_CATALOG } from "../../services/learningCatalog";
import { createRecommendations } from "../../services/learningService";
import { sendChatMessage } from "../../features/chat/api/chat.api";
import "../../styles/recommend-learning-panel.css";

const DEFAULT_NOTIFY_MESSAGE =
  "I've recommended some learning materials for you! Open My Learning to check them out.";

/**
 * Mentor -> mentee only (gated by the caller: hidden on your own profile and
 * on anyone not yet an accepted connection). Lets a mentor pick from the
 * fixed 5-item curated catalog and send real recommendations to a real
 * connection — real database rows (learning_recommendations), then exactly
 * one real chat message via the already-working chat integration (never one
 * message per item, regardless of how many materials were selected).
 */
export default function RecommendLearningPanel({ mentor, mentee }) {
  const [expanded, setExpanded] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [message, setMessage] = useState("");
  const [sendState, setSendState] = useState("idle"); // 'idle' | 'sending' | 'sent' | 'error'
  const [sendError, setSendError] = useState("");
  const [chatWarning, setChatWarning] = useState("");

  function toggleItem(id) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleSend() {
    const items = LEARNING_CATALOG.filter((item) => selectedIds.has(item.id));
    if (items.length === 0) return;
    setSendState("sending");
    setSendError("");
    setChatWarning("");
    try {
      await createRecommendations({
        mentorId: mentor.id,
        mentorName: mentor.name,
        menteeId: mentee.id,
        menteeName: mentee.name,
        items,
      });
    } catch (err) {
      setSendState("error");
      setSendError(
        err.message || "Could not send the recommendation. Please try again.",
      );
      return;
    }

    // The recommendation rows are committed at this point — the mentee will
    // already see them in My Learning. Flip to "sent" right away rather than
    // waiting on the chat ping below: that's a real network call to a
    // separate external service (Rocket.Chat) and can be slow or fail (e.g.
    // "Failed to fetch"), which was surfacing as a scary red error even
    // though the recommendation itself had already gone through.
    setSendState("sent");
    setSelectedIds(new Set());
    setMessage("");

    if (!mentee.roomId) {
      setChatWarning(
        "The chat notification could not be sent (no chat room found for this connection yet).",
      );
      return;
    }
    // Personal note is optional — a blank field sends exactly the
    // original default message, unchanged.
    const trimmedMessage = message.trim();
    const notifyMessage = trimmedMessage
      ? `${trimmedMessage} — I've also recommended some learning materials for you, check My Learning!`
      : DEFAULT_NOTIFY_MESSAGE;
    try {
      await sendChatMessage(mentee.roomId, notifyMessage);
    } catch (err) {
      setChatWarning(
        err.message || "The chat notification could not be sent.",
      );
    }
  }

  return (
    <div className="card recommend-learning-panel">
      <button
        type="button"
        className="recommend-learning-panel__header"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
      >
        <span>Recommend Learning</span>
        <ChevronRightIcon
          style={{ transform: `rotate(${expanded ? -90 : 90}deg)` }}
        />
      </button>

      {expanded && (
        <div className="recommend-learning-panel__body">
          {sendState === "sent" ? (
            <>
              <p className="recommend-learning-panel__success">
                Sent! {mentee.name} will see it in My Learning
                {chatWarning ? "." : " and got a chat notification."}
              </p>
              {chatWarning && (
                <p className="recommend-learning-panel__error">
                  {chatWarning}
                </p>
              )}
            </>
          ) : (
            <>
              <p className="recommend-learning-panel__hint">
                Select one or more materials to recommend to {mentee.name}.
              </p>
              <ul className="recommend-learning-panel__list">
                {LEARNING_CATALOG.map((item) => (
                  <li key={item.id} className="recommend-learning-panel__item">
                    <label>
                      <input
                        type="checkbox"
                        checked={selectedIds.has(item.id)}
                        onChange={() => toggleItem(item.id)}
                      />
                      <span className="recommend-learning-panel__item-text">
                        <strong>{item.title}</strong>
                        <span className="recommend-learning-panel__item-meta">
                          {item.skillCategory} · {item.materialType}
                        </span>
                      </span>
                    </label>
                  </li>
                ))}
              </ul>

              <label className="recommend-learning-panel__message-field">
                <span>Add a message (optional)</span>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder={`Say something to ${mentee.name}…`}
                  rows={3}
                  maxLength={300}
                />
              </label>

              {sendState === "error" && sendError && (
                <p className="recommend-learning-panel__error">{sendError}</p>
              )}

              <button
                type="button"
                className="btn-primary"
                disabled={selectedIds.size === 0 || sendState === "sending"}
                onClick={handleSend}
              >
                {sendState === "sending" ? "Sending…" : "Send"}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
