import { supabase } from '../lib/supabase';

export interface VoteSummary {
  upvotes: number;
  downvotes: number;
  userVote: 1 | -1 | null;
}

export async function fetchVotes(stopId: string, userId: string): Promise<VoteSummary> {
  const { data, error } = await supabase
    .from('stop_votes')
    .select('*')
    .eq('stop_id', stopId);

  if (error) throw error;
  const rows = data ?? [];
  return {
    upvotes: rows.filter((r) => r.vote === 1).length,
    downvotes: rows.filter((r) => r.vote === -1).length,
    userVote: (rows.find((r) => r.user_id === userId)?.vote as 1 | -1) ?? null,
  };
}

export async function fetchVotesForStops(
  stopIds: string[],
  userId: string
): Promise<Map<string, { up: number; down: number; mine: 1 | -1 | null }>> {
  if (stopIds.length === 0) return new Map();
  const { data, error } = await supabase
    .from('stop_votes')
    .select('*')
    .in('stop_id', stopIds);

  if (error) throw error;
  const rows = data ?? [];
  const map = new Map<string, { up: number; down: number; mine: 1 | -1 | null }>();

  for (const id of stopIds) {
    const stopRows = rows.filter((r) => r.stop_id === id);
    map.set(id, {
      up: stopRows.filter((r) => r.vote === 1).length,
      down: stopRows.filter((r) => r.vote === -1).length,
      mine: (stopRows.find((r) => r.user_id === userId)?.vote as 1 | -1) ?? null,
    });
  }
  return map;
}

export async function upsertVote(stopId: string, userId: string, vote: 1 | -1): Promise<void> {
  const { error } = await supabase.from('stop_votes').upsert(
    { stop_id: stopId, user_id: userId, vote },
    { onConflict: 'stop_id,user_id' }
  );
  if (error) throw error;
}

export async function deleteVote(stopId: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from('stop_votes')
    .delete()
    .eq('stop_id', stopId)
    .eq('user_id', userId);
  if (error) throw error;
}
