// SQL: ALTER TABLE packing_items ADD COLUMN IF NOT EXISTS assigned_to uuid REFERENCES auth.users(id);

import { supabase } from '../lib/supabase';
import { validateUUID, validateString, validateItemID } from '../lib/validation';

export interface PackingItem {
  id: string;
  trip_id: string;
  created_by: string;
  text: string;
  checked: boolean;
  sort_order: number;
  created_at: string;
  assigned_to: string | null;
}

export async function assignPackingItem(itemId: string, userId: string | null): Promise<void> {
  validateItemID(itemId);
  if (userId !== null) {
    validateUUID(userId, 'user ID');
  }
  const { error } = await supabase
    .from('packing_items')
    .update({ assigned_to: userId })
    .eq('id', itemId);
  if (error) throw error;
}

export async function fetchPackingItems(tripId: string): Promise<PackingItem[]> {
  validateUUID(tripId, 'trip ID');
  const { data, error } = await supabase
    .from('packing_items')
    .select('*')
    .eq('trip_id', tripId)
    .order('sort_order', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function createPackingItem(tripId: string, userId: string, text: string): Promise<PackingItem> {
  validateUUID(tripId, 'trip ID');
  validateUUID(userId, 'user ID');
  validateString(text, 'item text', 1, 500);

  const { data: existing } = await supabase
    .from('packing_items')
    .select('sort_order')
    .eq('trip_id', tripId)
    .order('sort_order', { ascending: false })
    .limit(1)
    .single();
  const sort_order = existing ? existing.sort_order + 1 : 0;
  const { data, error } = await supabase
    .from('packing_items')
    .insert({ trip_id: tripId, created_by: userId, text, checked: false, sort_order })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function togglePackingItem(itemId: string, checked: boolean): Promise<void> {
  validateItemID(itemId);
  const { error } = await supabase
    .from('packing_items')
    .update({ checked })
    .eq('id', itemId);
  if (error) throw error;
}

export async function deletePackingItem(itemId: string): Promise<void> {
  validateItemID(itemId);
  const { error } = await supabase
    .from('packing_items')
    .delete()
    .eq('id', itemId);
  if (error) throw error;
}

export async function deleteAllPackingItems(tripId: string): Promise<void> {
  validateUUID(tripId, 'trip ID');
  const { error } = await supabase
    .from('packing_items')
    .delete()
    .eq('trip_id', tripId);
  if (error) throw error;
}
