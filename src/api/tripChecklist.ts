import { supabase } from '../lib/supabase';
import { TripChecklistItem } from '../types/app.types';

export async function fetchChecklistItems(tripId: string): Promise<TripChecklistItem[]> {
  const { data, error } = await supabase
    .from('trip_checklist')
    .select('*')
    .eq('trip_id', tripId)
    .order('sort_order', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function createChecklistItem(
  tripId: string,
  userId: string,
  label: string,
): Promise<TripChecklistItem> {
  const { data: existing } = await supabase
    .from('trip_checklist')
    .select('sort_order')
    .eq('trip_id', tripId)
    .order('sort_order', { ascending: false })
    .limit(1)
    .single();
  const sort_order = existing ? existing.sort_order + 1 : 0;
  const { data, error } = await supabase
    .from('trip_checklist')
    .insert({ trip_id: tripId, user_id: userId, label, checked: false, sort_order })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function toggleChecklistItem(id: string, checked: boolean): Promise<void> {
  const { error } = await supabase
    .from('trip_checklist')
    .update({ checked })
    .eq('id', id);
  if (error) throw error;
}

export async function deleteChecklistItem(id: string): Promise<void> {
  const { error } = await supabase
    .from('trip_checklist')
    .delete()
    .eq('id', id);
  if (error) throw error;
}
