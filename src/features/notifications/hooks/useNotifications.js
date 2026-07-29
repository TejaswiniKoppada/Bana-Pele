import { useEffect, useState } from "react";
import { getNotifications } from "../api/notifications.api";

/** `menteeId` — state.currentUser.id — feeds the one real, DB-backed entry (pending learning recommendations); omit it to get just the static demo list. */
export function useNotifications(menteeId) {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    getNotifications(menteeId).then((data) => {
      if (!cancelled) {
        setNotifications(data);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [menteeId]);

  return { notifications, loading };
}
