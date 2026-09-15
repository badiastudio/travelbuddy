import { supabase } from '../lib/supabase';
import { Stop } from '../types/app.types';
import { validateUUID, validateUUIDArray, validateString, validateNumericRange, validateItemID } from '../lib/validation';

export async function fetchStops(tripId: string, archived = false): Promise<Stop[]> {
  validateUUID(tripId, 'trip ID');
  const query = supabase
    .from('stops')
    .select('*')
    .eq('trip_id', tripId)
    .order('day_index', { ascending: true })
    .order('sort_order', { ascending: true });
  const { data, error } = await (archived
    ? query.eq('archived', true)
    : query.or('archived.eq.false,archived.is.null'));
  if (error) throw error;
  return data ?? [];
}

export async function createStop(stop: Omit<Stop, 'id' | 'created_at'>): Promise<void> {
  validateUUID(stop.trip_id, 'trip ID');
  validateUUID(stop.created_by, 'user ID');
  validateString(stop.title, 'stop title', 1, 500);
  if (stop.day_index !== null && stop.day_index !== undefined) {
    validateNumericRange(stop.day_index, 'day index', 0, 9999);
  }

  const { error } = await supabase
    .from('stops')
    .insert(stop);
  if (error) {
    console.error('createStop error:', JSON.stringify(error));
    throw error;
  }
}

export async function updateStop(stopId: string, updates: Partial<Stop>): Promise<Stop> {
  validateItemID(stopId);
  if (updates.title !== undefined) {
    validateString(updates.title, 'stop title', 1, 500);
  }
  if (updates.day_index !== undefined && updates.day_index !== null) {
    validateNumericRange(updates.day_index, 'day index', 0, 9999);
  }

  const { data, error } = await supabase
    .from('stops')
    .update(updates)
    .eq('id', stopId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteStop(stopId: string): Promise<void> {
  validateItemID(stopId);
  const { error } = await supabase.from('stops').delete().eq('id', stopId);
  if (error) throw error;
}

export async function deleteAllStops(tripId: string): Promise<void> {
  validateUUID(tripId, 'trip ID');
  const { error } = await supabase.from('stops').delete().eq('trip_id', tripId);
  if (error) throw error;
}

export async function archiveStops(stopIds: string[]): Promise<void> {
  validateUUIDArray(stopIds, 'stop IDs');
  const { error } = await supabase.from('stops').update({ archived: true }).in('id', stopIds);
  if (error) throw error;
}

export async function unarchiveStops(stopIds: string[]): Promise<void> {
  validateUUIDArray(stopIds, 'stop IDs');
  const { error } = await supabase.from('stops').update({ archived: false }).in('id', stopIds);
  if (error) throw error;
}

export async function deleteStops(stopIds: string[]): Promise<void> {
  validateUUIDArray(stopIds, 'stop IDs');
  const { error } = await supabase.from('stops').delete().in('id', stopIds);
  if (error) throw error;
}
