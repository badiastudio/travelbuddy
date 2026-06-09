import { useEffect, useState, useCallback } from 'react';
import { fetchMedia } from '../api/storage';
import { Media } from '../types/app.types';

export function useMedia(tripId: string) {
  const [media, setMedia] = useState<Media[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchMedia(tripId);
      setMedia(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [tripId]);

  useEffect(() => { load(); }, [tripId]);

  return { media, loading, error, reload: load };
}
