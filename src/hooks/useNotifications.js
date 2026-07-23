import { useEffect, useState } from 'react';
import { getNotifications } from '../services/notificationsService';

export function useNotifications() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    getNotifications().then((data) => {
      if (!cancelled) {
        setNotifications(data);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return { notifications, loading };
}
