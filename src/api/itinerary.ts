import { supabase } from '../lib/supabase';
import { Stop } from '../types/app.types';

export async function fetchStops(tripId: string, archived = false): Promise<Stop[]> {
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
  const { error } = await supabase
    .from('stops')
    .insert(stop);
  if (error) {
    console.error('createStop error:', JSON.stringify(error));
    throw error;
  }
}

export async function updateStop(stopId: string, updates: Partial<Stop>): Promise<Stop> {
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
  const { error } = await supabase.from('stops').delete().eq('id', stopId);
  if (error) throw error;
}

export async function deleteAllStops(tripId: string): Promise<void> {
  const { error } = await supabase.from('stops').delete().eq('trip_id', tripId);
  if (error) throw error;
}

export async function archiveStops(stopIds: string[]): Promise<void> {
  const { error } = await supabase.from('stops').update({ archived: true }).in('id', stopIds);
  if (error) throw error;
}

export async function unarchiveStops(stopIds: string[]): Promise<void> {
  const { error } = await supabase.from('stops').update({ archived: false }).in('id', stopIds);
  if (error) throw error;
}

export async function deleteStops(stopIds: string[]): Promise<void> {
  const { error } = await supabase.from('stops').delete().in('id', stopIds);
  if (error) throw error;
}
