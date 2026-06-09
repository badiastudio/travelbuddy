import { useEffect, useState, useCallback } from 'react';
import { fetchExpenses } from '../api/expenses';
import { Expense } from '../types/app.types';
import { supabase } from '../lib/supabase';

export function useExpenses(tripId: string) {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchExpenses(tripId);
      setExpenses(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [tripId]);

  useEffect(() => {
    load();

    const channel = supabase
      .channel(`expenses:${tripId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'expenses', filter: `trip_id=eq.${tripId}` }, () => {
        load();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [tripId]);

  return { expenses, loading, error, reload: load };
}
