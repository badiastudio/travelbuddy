import { useEffect, useState, useCallback } from 'react';
import { fetchTrip, fetchMembers } from '../api/trips';
import { useTripStore } from '../store/tripStore';

export function useTrip(tripId: string) {
  const { setCurrentTrip, setCurrentMembers, currentTrip, currentMembers } = useTripStore();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [trip, members] = await Promise.all([fetchTrip(tripId), fetchMembers(tripId)]);
      setCurrentTrip(trip);
      setCurrentMembers(members);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [tripId]);

  useEffect(() => {
    load();
    return () => {
      setCurrentTrip(null);
      setCurrentMembers([]);
    };
  }, [tripId]);

  return { trip: currentTrip, members: currentMembers, loading, error, reload: load };
}
