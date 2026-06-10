import { Platform } from 'react-native';
import { supabase } from '../lib/supabase';
import { Media } from '../types/app.types';

const BUCKET = 'trip-media';

export async function uploadMedia(
  tripId: string,
  userId: string,
  localUri: string,
  fileName: string,
  mimeType: string
): Promise<string> {
  let base64: string;
  if (localUri.startsWith('data:')) {
    // Web: data URL — strip the prefix
    base64 = localUri.split(',')[1];
  } else {
    // Native: use expo-file-system
    const FileSystem = require('expo-file-system');
    base64 = await FileSystem.readAsStringAsync(localUri, {
      encoding: FileSystem.EncodingType.Base64,
    });
  }
  const arrayBuffer = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
  const storagePath = `${tripId}/${userId}/${Date.now()}_${fileName}`;

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, arrayBuffer, { contentType: mimeType, upsert: false });
  if (error) throw error;
  return storagePath;
}

export async function getSignedUrl(storagePath: string, expiresIn = 3600): Promise<string> {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(storagePath, expiresIn);
  if (error) throw error;
  return data.signedUrl;
}

export async function fetchMedia(tripId: string): Promise<Media[]> {
  const { data, error } = await supabase
    .from('media')
    .select('*')
    .eq('trip_id', tripId)
    .order('created_at', { ascending: false });
  if (error) throw error;

  const items = await Promise.all(
    (data ?? []).map(async (item) => ({
      ...item,
      signedUrl: await getSignedUrl(item.storage_path),
    }))
  );
  return items;
}

export async function saveMediaRecord(
  record: Omit<Media, 'id' | 'created_at' | 'signedUrl'>
): Promise<void> {
  const { error } = await supabase
    .from('media')
    .insert(record);
  if (error) {
    console.error('saveMediaRecord error:', JSON.stringify(error));
    throw error;
  }
}

export async function deleteMedia(mediaId: string, storagePath: string): Promise<void> {
  await supabase.storage.from(BUCKET).remove([storagePath]);
  const { error } = await supabase.from('media').delete().eq('id', mediaId);
  if (error) throw error;
}
