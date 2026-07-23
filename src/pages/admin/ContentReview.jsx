import { useEffect, useState } from 'react';
import { ADMIN_REVIEW_PASSWORD } from '../../config/env.js';
import { approveContentItem, listPendingContentItems, rejectContentItem } from '../../services/adminContentService.js';
import '../../styles/pages/admin-content-review.css';

const SESSION_KEY = 'elevate.adminReviewUnlocked';

/**
 * Password-gated admin review page (Section 6) — approve/reject queue for
 * YouTube videos the ingestion job surfaced. Only approved rows are ever
 * visible to the Recommended tab; see supabase/migrations for the RLS policy
 * that enforces this at the database level, not just in this UI.
 */
export default function ContentReview() {
  const [unlocked, setUnlocked] = useState(() => sessionStorage.getItem(SESSION_KEY) === 'true');
  const [passwordInput, setPasswordInput] = useState('');
  const [gateError, setGateError] = useState('');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actioningId, setActioningId] = useState(null);

  function handleUnlock(e) {
    e.preventDefault();
    if (ADMIN_REVIEW_PASSWORD && passwordInput === ADMIN_REVIEW_PASSWORD) {
      sessionStorage.setItem(SESSION_KEY, 'true');
      setUnlocked(true);
      setGateError('');
    } else {
      setGateError('Incorrect password.');
    }
  }

  async function refresh() {
    setLoading(true);
    try {
      const data = await listPendingContentItems();
      setItems(data);
      setError('');
    } catch (err) {
      setError(err.message || 'Could not load pending items.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (unlocked) refresh();
  }, [unlocked]);

  async function handleDecision(id, action) {
    setActioningId(id);
    try {
      if (action === 'approve') await approveContentItem(id);
      else await rejectContentItem(id);
      setItems((prev) => prev.filter((item) => item.id !== id));
    } catch (err) {
      setError(err.message || 'Could not update this item.');
    } finally {
      setActioningId(null);
    }
  }

  if (!unlocked) {
    return (
      <div className="admin-gate">
        <form className="admin-gate__form" onSubmit={handleUnlock}>
          <h1>Content Review</h1>
          <p>Internal tool — enter the shared password to continue.</p>
          <input
            type="password"
            value={passwordInput}
            onChange={(e) => setPasswordInput(e.target.value)}
            placeholder="Password"
            autoFocus
          />
          {gateError && <p className="admin-gate__error">{gateError}</p>}
          <button type="submit" className="btn-primary">
            Unlock
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="admin-review">
      <h1>Pending YouTube Content</h1>
      <p className="admin-review__subtitle">
        Approve or reject videos surfaced by the automated keyword search before they can appear in Community
        Voices' Recommended tab.
      </p>

      {loading && <p className="page-status">Loading pending items…</p>}
      {!loading && error && <p className="admin-review__error">{error}</p>}
      {!loading && !error && items.length === 0 && <p className="page-status">No pending items right now.</p>}

      <div className="admin-review__list">
        {items.map((item) => (
          <div key={item.id} className="admin-review__item">
            {item.thumbnail_url && <img src={item.thumbnail_url} alt="" className="admin-review__thumbnail" />}
            <div className="admin-review__details">
              <p className="admin-review__title">{item.title}</p>
              <p className="admin-review__meta">
                {item.channel_title} · surfaced by "{item.search_keyword}"
              </p>
              <a
                className="admin-review__link"
                href={`https://www.youtube.com/watch?v=${item.video_id}`}
                target="_blank"
                rel="noreferrer"
              >
                Watch on YouTube
              </a>
            </div>
            <div className="admin-review__actions">
              <button
                className="btn-primary admin-review__approve-btn"
                disabled={actioningId === item.id}
                onClick={() => handleDecision(item.id, 'approve')}
              >
                Approve
              </button>
              <button
                className="btn-secondary"
                disabled={actioningId === item.id}
                onClick={() => handleDecision(item.id, 'reject')}
              >
                Reject
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
