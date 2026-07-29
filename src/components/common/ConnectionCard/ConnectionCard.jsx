import { ChatIcon, PersonCheckIcon } from '../../../assets/icons';
import { avatarColorForName, initialsForName } from '../../../utils/formatters';
import { formatDate } from '../../../utils/date';
import '../../../styles/cards.css';

export default function ConnectionCard({
  connection,
  onChatClick,
  onOpenProfile,
  onSendRequest,
  requestState,
  requestError,
  avatarColor,
}) {
  const { name, tier, tagline, connectedOn, image } = connection;

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
      <span className="connection-card__avatar-ring">
        {image ? (
          <img className="card__avatar card__avatar--photo" src={image} alt="" />
        ) : (
          <div className="card__avatar" style={{ background: avatarColor || avatarColorForName(name) }}>
            {initialsForName(name)}
          </div>
        )}
      </span>
      <div className="connection-card__body">
        <p className="connection-card__name">{name}</p>
        <p className="connection-card__tier">{tagline || tier}</p>
        {connectedOn && <p className="connection-card__date">Connected On: {formatDate(connectedOn)}</p>}
        {requestState === 'error' && requestError && (
          <p className="connection-card__request-error">{requestError}</p>
        )}
      </div>
      {onChatClick && (
        <button
          className="connection-card__action-btn connection-card__action-btn--filled"
          onClick={handleChatClick}
          aria-label={`Chat with ${name}`}
        >
          <ChatIcon />
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
          {requestState === 'sent' && <PersonCheckIcon />}
          {requestState === 'sending' ? 'Sending…' : requestState === 'sent' ? 'Request sent' : 'Send request'}
        </button>
      )}
    </div>
  );
}
