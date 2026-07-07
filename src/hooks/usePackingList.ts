import { useEffect, useState, useCallback } from 'react';
import { fetchPackingItems, PackingItem } from '../api/packingList';

export function usePackingList(tripId: string) {
  const [items, setItems] = useState<PackingItem[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchPackingItems(tripId);
      setItems(data);
    } finally {
      setLoading(false);
    }
  }, [tripId]);

  useEffect(() => { reload(); }, [reload]);

  return { items, loading, reload };
}
