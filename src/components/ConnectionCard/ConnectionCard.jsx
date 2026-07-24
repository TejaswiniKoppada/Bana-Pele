import { avatarColorForName, initialsForName, formatDate } from '../../utils/helpers';
import '../../styles/components/cards.css';

export default function ConnectionCard({
  connection,
  onChatClick,
  onOpenProfile,
  onSendRequest,
  requestState,
  requestError,
  avatarColor,
}) {
  const { name, tier, connectedOn, image } = connection;

  function handleChatClick(e) {
    e.stopPropagation();
    onChatClick?.(connection);
  }

  function handleSendRequestClick(e) {
    e.stopPropagation();
    if (requestState === 'sending' || requestState === 'sent') return;
    onSendRequest?.(connection);
  }

  return (
    <div
      className="card connection-card"
      style={{ cursor: onOpenProfile ? 'pointer' : 'default' }}
      onClick={onOpenProfile ? () => onOpenProfile(connection) : undefined}
      role={onOpenProfile ? 'button' : undefined}
      tabIndex={onOpenProfile ? 0 : undefined}
    >
      {image ? (
        <img className="card__avatar card__avatar--photo" src={image} alt="" />
      ) : (
        <div className="card__avatar" style={{ background: avatarColor || avatarColorForName(name) }}>
          {initialsForName(name)}
        </div>
      )}
      <div className="connection-card__body">
        <p className="connection-card__name">{name}</p>
        <p className="connection-card__tier">{tier}</p>
        {connectedOn && <p className="connection-card__date">Connected On: {formatDate(connectedOn)}</p>}
        {requestState === 'error' && requestError && (
          <p className="connection-card__request-error">{requestError}</p>
        )}
      </div>
      {onChatClick && (
        <button className="connection-card__action-btn" onClick={handleChatClick} aria-label={`Chat with ${name}`}>
          Chat
        </button>
      )}
      {onSendRequest && (
        <button
          className="connection-card__action-btn"
          onClick={handleSendRequestClick}
          disabled={requestState === 'sending' || requestState === 'sent'}
          aria-label={`Send connect request to ${name}`}
        >
          {requestState === 'sending' ? 'Sending…' : requestState === 'sent' ? 'Request sent' : 'Send request'}
        </button>
      )}
    </div>
  );
}
