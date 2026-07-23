import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { ChevronLeftIcon } from '../../../assets/icons';
import { avatarColorForName, initialsForName } from '../../../utils/helpers';
import { getMyConnections } from '../../../services/connectionsService';
import { getMyChatUserId, loadChatHistory, sendChatMessage } from '../../../services/chatService';
import '../../../styles/pages/chat.css';

const POLL_INTERVAL_MS = 5000;

function formatMessageTime(timestamp) {
  return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

/**
 * Chat screen for a single connection's room. Uses connection_meta.room_id
 * (already present on connections fetched for My Connections) — see
 * services/chatService.js for the REST calls against the separate Elevate
 * chat backend. No WebSocket: while this screen is mounted it polls
 * loadHistory every few seconds to pick up messages from the other side.
 */
export default function Chat() {
  const { connectionId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [connection, setConnection] = useState(location.state?.connection ?? null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [draft, setDraft] = useState('');
  const listRef = useRef(null);

  // Resolve the connection (and its room_id) if the Chat button didn't hand
  // it to us via navigation state — e.g. a direct link or page refresh.
  useEffect(() => {
    if (connection) return;
    let cancelled = false;
    getMyConnections()
      .then((list) => {
        if (cancelled) return;
        const match = list.find((c) => c.id === connectionId) ?? null;
        setConnection(match);
        if (!match) setLoading(false);
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [connection, connectionId]);

  // Load history, then poll for new messages while this screen stays open.
  useEffect(() => {
    if (!connection?.roomId) return;
    let cancelled = false;

    async function refresh({ silent }) {
      if (!silent) setLoading(true);
      try {
        const history = await loadChatHistory(connection.roomId);
        if (cancelled) return;
        setMessages(history);
        setError('');
      } catch (err) {
        if (!cancelled && !silent) setError(err.message || 'Could not load messages.');
      } finally {
        if (!cancelled && !silent) setLoading(false);
      }
    }

    refresh({ silent: false });
    const intervalId = setInterval(() => refresh({ silent: true }), POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(intervalId);
    };
  }, [connection?.roomId]);

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages]);

  async function handleSend(e) {
    e.preventDefault();
    const text = draft.trim();
    if (!text || !connection?.roomId || sending) return;
    setSending(true);
    setDraft('');
    try {
      const sent = await sendChatMessage(connection.roomId, text);
      setMessages((prev) => [...prev, sent]);
      setError('');
    } catch (err) {
      setError(err.message || 'Could not send message.');
      setDraft(text);
    } finally {
      setSending(false);
    }
  }

  const myChatUserId = getMyChatUserId();

  return (
    <div className="chat-page">
      <div className="chat-page__header">
        <button className="chat-page__back" onClick={() => navigate(-1)} aria-label="Back">
          <ChevronLeftIcon />
        </button>
        {connection && (
          <>
            {connection.image ? (
              <img className="card__avatar chat-page__avatar" src={connection.image} alt="" />
            ) : (
              <div
                className="card__avatar chat-page__avatar"
                style={{ background: avatarColorForName(connection.name) }}
              >
                {initialsForName(connection.name)}
              </div>
            )}
            <span className="chat-page__name">{connection.name}</span>
          </>
        )}
      </div>

      {!connection && !loading && <p className="page-status">This chat isn't available right now.</p>}

      {connection && (
        <>
          <div className="chat-page__messages" ref={listRef}>
            {loading && <p className="page-status">Loading messages…</p>}
            {!loading && messages.length === 0 && <p className="page-status">No messages yet. Say hello!</p>}
            {!loading &&
              messages.map((message) => {
                const isMine = message.senderId === myChatUserId;
                return (
                  <div key={message.id} className={`chat-bubble-row${isMine ? ' chat-bubble-row--mine' : ''}`}>
                    <div className={`chat-bubble${isMine ? ' chat-bubble--mine' : ''}`}>
                      <p className="chat-bubble__text">{message.text}</p>
                      <span className="chat-bubble__time">{formatMessageTime(message.timestamp)}</span>
                    </div>
                  </div>
                );
              })}
          </div>

          {error && <p className="chat-page__error">{error}</p>}

          <form className="chat-page__composer" onSubmit={handleSend}>
            <input
              className="chat-page__input"
              type="text"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Type a message"
            />
            <button className="chat-page__send-btn" type="submit" disabled={!draft.trim() || sending}>
              {sending ? 'Sending…' : 'Send'}
            </button>
          </form>
        </>
      )}
    </div>
  );
}
