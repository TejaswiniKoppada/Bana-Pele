import { useEffect, useState } from 'react';
import { getApprovedContentItems } from '../services/contentItemsService';

/** Live, admin-approved YouTube content for the Recommended tab (replaces the old hardcoded list). */
export function useRecommendedContent() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getApprovedContentItems()
      .then((data) => {
        if (cancelled) return;
        setItems(data);
        setError('');
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || 'Could not load recommended content.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { items, loading, error };
}
