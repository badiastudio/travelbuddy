import { useEffect, useState, useCallback } from 'react';
import { fetchStops } from '../api/itinerary';
import { Stop } from '../types/app.types';
import { supabase } from '../lib/supabase';

export function useItinerary(tripId: string) {
  const [stops, setStops] = useState<Stop[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchStops(tripId);
      setStops(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [tripId]);

  useEffect(() => {
    load();

    const channel = supabase
      .channel(`stops:${tripId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'stops', filter: `trip_id=eq.${tripId}` }, () => {
        load();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [tripId]);

  return { stops, loading, error, reload: load };
}
