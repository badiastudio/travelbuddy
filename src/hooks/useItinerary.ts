import { useEffect, useState, useCallback } from 'react';
import { fetchStops } from '../api/itinerary';
import { Stop } from '../types/app.types';

export function useItinerary(tripId: string, archived = false) {
  const [stops, setStops] = useState<Stop[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchStops(tripId, archived);
      setStops(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [tripId, archived]);

  useEffect(() => { load(); }, [load]);

  return { stops, loading, error, reload: load };
}
