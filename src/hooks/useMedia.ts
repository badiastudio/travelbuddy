import { useEffect, useState, useCallback } from 'react';
import { fetchMedia } from '../api/storage';
import { Media } from '../types/app.types';

export function useMedia(tripId: string, archived = false) {
  const [media, setMedia] = useState<Media[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchMedia(tripId, archived);
      setMedia(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [tripId, archived]);

  useEffect(() => { load(); }, [tripId, archived]);

  return { media, loading, error, reload: load };
}
