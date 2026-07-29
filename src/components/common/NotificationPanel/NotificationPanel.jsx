import { useNavigate } from "react-router-dom";
import {
  ChatIcon,
  HourglassIcon,
  LearningIcon,
  PersonCheckIcon,
  VideoIcon,
} from "@/assets/icons";
import "./NotificationPanel.css";

const ICONS_BY_TYPE = {
  "connect-accepted": PersonCheckIcon,
  "new-video": VideoIcon,
  "session-pending": HourglassIcon,
  "message-received": ChatIcon,
  "learning-recommendation": LearningIcon,
};

function NotificationBody({ segments }) {
  return (
    <p className="notification-item__body">
      {segments.map((segment, index) =>
        typeof segment === "string" ? (
          <span key={index}>{segment}</span>
        ) : (
          <strong key={index}>{segment.text}</strong>
        ),
      )}
    </p>
  );
}

export default function NotificationPanel({
  open,
  onClose,
  notifications,
  loading,
}) {
  const navigate = useNavigate();

  if (!open) return null;

  function handleItemClick(notification) {
    if (!notification.to) return;
    onClose?.();
    navigate(notification.to);
  }

  return (
    <div className="notification-panel-overlay" onClick={onClose}>
      <div className="notification-panel" onClick={(e) => e.stopPropagation()}>
        {loading && <p className="page-status">Loading notifications…</p>}
        <ul className="notification-list">
          {notifications.map((notification) => {
            const Icon = ICONS_BY_TYPE[notification.type];
            const clickable = Boolean(notification.to);
            return (
              <li
                key={notification.id}
                className={`notification-item${clickable ? " notification-item--clickable" : ""}`}
                onClick={
                  clickable ? () => handleItemClick(notification) : undefined
                }
                role={clickable ? "button" : undefined}
                tabIndex={clickable ? 0 : undefined}
              >
                <Icon className="notification-item__icon" />
                <div className="notification-item__content">
                  <p className="notification-item__title">
                    {notification.title}
                  </p>
                  <NotificationBody segments={notification.body} />
                  {notification.extra && (
                    <p className="notification-item__extra">
                      {notification.extra}
                    </p>
                  )}
                  {notification.footer && (
                    <p className="notification-item__footer">
                      {notification.footer}
                    </p>
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
