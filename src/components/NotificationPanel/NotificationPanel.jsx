import { ChatIcon, HourglassIcon, PersonCheckIcon, VideoIcon } from '../../assets/icons';
import { useNotifications } from '../../hooks/useNotifications';
import '../../styles/components/notification-panel.css';

const ICONS_BY_TYPE = {
  'connect-accepted': PersonCheckIcon,
  'new-video': VideoIcon,
  'session-pending': HourglassIcon,
  'message-received': ChatIcon,
};

function NotificationBody({ segments }) {
  return (
    <p className="notification-item__body">
      {segments.map((segment, index) =>
        typeof segment === 'string' ? (
          <span key={index}>{segment}</span>
        ) : (
          <strong key={index}>{segment.text}</strong>
        )
      )}
    </p>
  );
}

export default function NotificationPanel({ open, onClose }) {
  const { notifications, loading } = useNotifications();

  if (!open) return null;

  return (
    <div className="notification-panel-overlay" onClick={onClose}>
      <div className="notification-panel" onClick={(e) => e.stopPropagation()}>
        {loading && <p className="page-status">Loading notifications…</p>}
        <ul className="notification-list">
          {notifications.map((notification) => {
            const Icon = ICONS_BY_TYPE[notification.type];
            return (
              <li key={notification.id} className="notification-item">
                <Icon className="notification-item__icon" />
                <div className="notification-item__content">
                  <p className="notification-item__title">{notification.title}</p>
                  <NotificationBody segments={notification.body} />
                  {notification.extra && <p className="notification-item__extra">{notification.extra}</p>}
                  {notification.footer && (
                    <p className="notification-item__footer">{notification.footer}</p>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
