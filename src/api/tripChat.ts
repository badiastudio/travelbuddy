import { supabase } from '../lib/supabase';
import { Profile } from '../types/app.types';
import { validateUUID, validateString, validateItemID } from '../lib/validation';

export interface TripMessage {
  id: string;
  trip_id: string;
  user_id: string;
  message: string;
  created_at: string;
  profile?: Pick<Profile, 'display_name' | 'avatar_url'> | null;
}

export async function fetchMessages(tripId: string): Promise<TripMessage[]> {
  validateUUID(tripId, 'trip ID');
  const { data, error } = await supabase
    .from('trip_messages')
    .select('*, profile:profiles(display_name, avatar_url)')
    .eq('trip_id', tripId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []) as TripMessage[];
}

export async function sendMessage(tripId: string, userId: string, message: string): Promise<void> {
  validateUUID(tripId, 'trip ID');
  validateUUID(userId, 'user ID');
  validateString(message, 'message', 1, 10000);

  const { error } = await supabase
    .from('trip_messages')
    .insert({ trip_id: tripId, user_id: userId, message });
  if (error) throw error;
}

export async function deleteMessage(messageId: string): Promise<void> {
  validateItemID(messageId);
  const { error } = await supabase
    .from('trip_messages')
    .delete()
    .eq('id', messageId);
  if (error) throw error;
}
