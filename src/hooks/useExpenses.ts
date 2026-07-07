import { useEffect, useState, useCallback } from 'react';
import { fetchExpenses } from '../api/expenses';
import { Expense } from '../types/app.types';

export function useExpenses(tripId: string, archived = false) {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchExpenses(tripId, archived);
      setExpenses(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [tripId, archived]);

  useEffect(() => { load(); }, [load]);


  return { expenses, loading, error, reload: load };
}
