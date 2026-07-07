import { supabase } from '../lib/supabase';
import { Expense, ExpenseSplit } from '../types/app.types';

export async function fetchExpenses(tripId: string, archived = false): Promise<Expense[]> {
  const query = supabase
    .from('expenses')
    .select('*, payer:profiles!paid_by(*), splits:expense_splits(*)')
    .eq('trip_id', tripId)
    .order('created_at', { ascending: false });
  const { data, error } = await (archived
    ? query.eq('archived', true)
    : query.or('archived.eq.false,archived.is.null'));
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

export async function updateExpense(
  expenseId: string,
  expense: Partial<Omit<Expense, 'id' | 'created_at' | 'splits' | 'payer'>>,
  splits: { userId: string; share: number }[]
): Promise<void> {
  const { error } = await supabase.from('expenses').update(expense).eq('id', expenseId);
  if (error) throw error;

  await supabase.from('expense_splits').delete().eq('expense_id', expenseId);
  const splitRows = splits.map((s) => ({ expense_id: expenseId, user_id: s.userId, share: s.share }));
  const { error: splitError } = await supabase.from('expense_splits').insert(splitRows);
  if (splitError) throw splitError;
}

export async function deleteExpense(expenseId: string): Promise<void> {
  const { error } = await supabase.from('expenses').delete().eq('id', expenseId);
  if (error) throw error;
}

export async function deleteAllExpenses(tripId: string): Promise<void> {
  const { error } = await supabase.from('expenses').delete().eq('trip_id', tripId);
  if (error) throw error;
}

export async function archiveExpenses(expenseIds: string[]): Promise<void> {
  const { error } = await supabase.from('expenses').update({ archived: true }).in('id', expenseIds);
  if (error) throw error;
}

export async function unarchiveExpenses(expenseIds: string[]): Promise<void> {
  const { error } = await supabase.from('expenses').update({ archived: false }).in('id', expenseIds);
  if (error) throw error;
}

export async function deleteExpenses(expenseIds: string[]): Promise<void> {
  const { error } = await supabase.from('expenses').delete().in('id', expenseIds);
  if (error) throw error;
}
