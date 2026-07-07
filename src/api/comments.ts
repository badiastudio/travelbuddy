import { supabase } from '../lib/supabase';

export interface StopComment {
  id: string;
  stop_id: string;
  trip_id: string;
  user_id: string;
  text: string;
  created_at: string;
  profile?: { display_name: string | null };
}

export async function fetchComments(stopId: string): Promise<StopComment[]> {
  const { data, error } = await supabase
    .from('stop_comments')
    .select('*, profile:profiles(display_name)')
    .eq('stop_id', stopId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function addComment(stopId: string, tripId: string, userId: string, text: string): Promise<void> {
  const { error } = await supabase
    .from('stop_comments')
    .insert({ stop_id: stopId, trip_id: tripId, user_id: userId, text });
  if (error) throw error;
}

export async function deleteComment(commentId: string): Promise<void> {
  const { error } = await supabase
    .from('stop_comments')
    .delete()
    .eq('id', commentId);
  if (error) throw error;
}
