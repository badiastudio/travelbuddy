import { supabase } from '../lib/supabase';
import { Trip, TripMember } from '../types/app.types';

export async function fetchTrips(userId: string): Promise<Trip[]> {
  const { data, error } = await supabase
    .from('trips')
    .select('*, trip_members!inner(user_id)')
    .eq('trip_members.user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function fetchTrip(tripId: string): Promise<Trip> {
  const { data, error } = await supabase
    .from('trips')
    .select('*')
    .eq('id', tripId)
    .single();
  if (error) throw error;
  return data;
}

export async function createTrip(
  ownerId: string,
  trip: Pick<Trip, 'title' | 'description' | 'start_date' | 'end_date'>
): Promise<Trip> {
  const { data, error } = await supabase
    .from('trips')
    .insert({ ...trip, owner_id: ownerId })
    .select()
    .single();
  if (error) throw error;

  // auto-add owner as member
  await supabase.from('trip_members').insert({
    trip_id: data.id,
    user_id: ownerId,
    role: 'owner',
  });
  return data;
}

export async function updateTrip(tripId: string, updates: Partial<Trip>): Promise<Trip> {
  const { data, error } = await supabase
    .from('trips')
    .update(updates)
    .eq('id', tripId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteTrip(tripId: string): Promise<void> {
  const { error } = await supabase.from('trips').delete().eq('id', tripId);
  if (error) throw error;
}

export async function fetchMembers(tripId: string): Promise<TripMember[]> {
  const { data, error } = await supabase
    .from('trip_members')
    .select('*, profile:profiles(*)')
    .eq('trip_id', tripId);
  if (error) throw error;
  return data ?? [];
}

export async function joinTripByToken(userId: string, token: string): Promise<Trip> {
  const { data: trip, error: tripError } = await supabase
    .from('trips')
    .select('*')
    .eq('invite_token', token)
    .single();
  if (tripError) throw new Error('Invalid invite link');

  const { error: memberError } = await supabase
    .from('trip_members')
    .upsert({ trip_id: trip.id, user_id: userId, role: 'member' });
  if (memberError) throw memberError;
  return trip;
}
