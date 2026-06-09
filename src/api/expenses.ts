import { supabase } from '../lib/supabase';
import { Expense, ExpenseSplit } from '../types/app.types';

export async function fetchExpenses(tripId: string): Promise<Expense[]> {
  const { data, error } = await supabase
    .from('expenses')
    .select('*, payer:profiles!paid_by(*), splits:expense_splits(*, profile:profiles(*))')
    .eq('trip_id', tripId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function createExpense(
  expense: Omit<Expense, 'id' | 'created_at' | 'splits' | 'payer'>,
  splits: { userId: string; share: number }[]
): Promise<Expense> {
  const { data, error } = await supabase
    .from('expenses')
    .insert(expense)
    .select()
    .single();
  if (error) throw error;

  const splitRows = splits.map((s) => ({
    expense_id: data.id,
    user_id: s.userId,
    share: s.share,
  }));
  const { error: splitError } = await supabase.from('expense_splits').insert(splitRows);
  if (splitError) throw splitError;
  return data;
}

export async function deleteExpense(expenseId: string): Promise<void> {
  const { error } = await supabase.from('expenses').delete().eq('id', expenseId);
  if (error) throw error;
}
