import { supabase } from '../lib/supabase';
import { Media } from '../types/app.types';
import { validateUUID, validateUUIDArray, validateString, validateNumericRange, validateItemID } from '../lib/validation';

const BUCKET = 'trip-media';

async function uriToArrayBuffer(uri: string): Promise<ArrayBuffer> {
  if (uri.startsWith('data:')) {
    const base64 = uri.split(',')[1];
    const binary = atob(base64);
    const buf = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) buf[i] = binary.charCodeAt(i);
    return buf.buffer;
  }
  const response = await fetch(uri);
  return response.arrayBuffer();
}

export async function uploadTripCover(
  tripId: string,
  localUri: string,
  fileName: string,
  mimeType: string
): Promise<string> {
  validateUUID(tripId, 'trip ID');
  validateString(fileName, 'file name', 1, 500);
  validateString(mimeType, 'MIME type', 1, 100);

  const arrayBuffer = await uriToArrayBuffer(localUri);
  const storagePath = `covers/${tripId}/${Date.now()}_${fileName}`;

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, arrayBuffer, { contentType: mimeType, upsert: true });
  if (error) throw error;

  const { data } = await supabase.storage.from(BUCKET).createSignedUrl(storagePath, 60 * 60 * 24 * 365);
  return data?.signedUrl ?? storagePath;
}

export async function uploadMedia(
  tripId: string,
  userId: string,
  localUri: string,
  fileName: string,
  mimeType: string
): Promise<string> {
  validateUUID(tripId, 'trip ID');
  validateUUID(userId, 'user ID');
  validateString(fileName, 'file name', 1, 500);
  validateString(mimeType, 'MIME type', 1, 100);

  const arrayBuffer = await uriToArrayBuffer(localUri);
  const storagePath = `${tripId}/${userId}/${Date.now()}_${fileName}`;

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, arrayBuffer, { contentType: mimeType, upsert: false });
  if (error) throw error;
  return storagePath;
}

export async function getSignedUrl(storagePath: string, expiresIn = 3600): Promise<string> {
  validateString(storagePath, 'storage path', 1, 1000);
  validateNumericRange(expiresIn, 'expires in', 1, 31536000); // max 1 year

  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(storagePath, expiresIn);
  if (error) throw error;
  return data.signedUrl;
}

export async function fetchMedia(tripId: string, archived = false): Promise<Media[]> {
  validateUUID(tripId, 'trip ID');
  const query = supabase
    .from('media')
    .select('*')
    .eq('trip_id', tripId)
    .order('created_at', { ascending: false });
  const { data, error } = await (archived
    ? query.eq('archived', true)
    : query.or('archived.eq.false,archived.is.null'));
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
  validateUUID(record.trip_id, 'trip ID');
  validateUUID(record.uploaded_by, 'user ID');
  validateString(record.storage_path, 'storage path', 1, 1000);
  validateString(record.mime_type, 'MIME type', 1, 100);

  const { error } = await supabase
    .from('media')
    .insert(record);
  if (error) {
    console.error('saveMediaRecord error:', JSON.stringify(error));
    throw error;
  }
}

export async function deleteMedia(mediaId: string, storagePath: string): Promise<void> {
  validateItemID(mediaId);
  validateString(storagePath, 'storage path', 1, 1000);

  await supabase.storage.from(BUCKET).remove([storagePath]);
  const { error } = await supabase.from('media').delete().eq('id', mediaId);
  if (error) throw error;
}

export async function deleteAllMedia(tripId: string, storagePaths: string[]): Promise<void> {
  validateUUID(tripId, 'trip ID');
  if (storagePaths.length > 0) {
    storagePaths.forEach((p, i) => validateString(p, `storage path[${i}]`, 1, 1000));
    await supabase.storage.from(BUCKET).remove(storagePaths);
  }
  const { error } = await supabase.from('media').delete().eq('trip_id', tripId);
  if (error) throw error;
}

export async function archiveMediaItems(mediaIds: string[]): Promise<void> {
  validateUUIDArray(mediaIds, 'media IDs');
  const { error } = await supabase.from('media').update({ archived: true }).in('id', mediaIds);
  if (error) throw error;
}

export async function unarchiveMediaItems(mediaIds: string[]): Promise<void> {
  validateUUIDArray(mediaIds, 'media IDs');
  const { error } = await supabase.from('media').update({ archived: false }).in('id', mediaIds);
  if (error) throw error;
}

export async function deleteMediaItems(mediaIds: string[], storagePaths: string[]): Promise<void> {
  validateUUIDArray(mediaIds, 'media IDs');
  if (storagePaths.length > 0) {
    storagePaths.forEach((p, i) => validateString(p, `storage path[${i}]`, 1, 1000));
    await supabase.storage.from(BUCKET).remove(storagePaths);
  }
  const { error } = await supabase.from('media').delete().in('id', mediaIds);
  if (error) throw error;
}
