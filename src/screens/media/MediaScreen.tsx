import React, { useState } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, Alert, RefreshControl, Dimensions, ActionSheetIOS, Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { Image } from 'expo-image';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { MaterialTopTabScreenProps } from '@react-navigation/material-top-tabs';
import { useMedia } from '../../hooks/useMedia';
import { uploadMedia, saveMediaRecord } from '../../api/storage';
import { useAuthStore } from '../../store/authStore';
import { TripStackParamList, TripTabParamList } from '../../navigation/types';

type Props = MaterialTopTabScreenProps<TripTabParamList, 'Media'>;
type Nav = StackNavigationProp<TripStackParamList>;

const COL = 3;
const SIZE = (Dimensions.get('window').width - 4) / COL;

export default function MediaScreen({ route }: Props) {
  const { tripId } = route.params;
  const nav = useNavigation<Nav>();
  const user = useAuthStore((s) => s.user);
  const { media, loading, reload } = useMedia(tripId);
  const [uploading, setUploading] = useState(false);

  async function pickAndUpload(type: 'image' | 'document') {
    if (!user) return;
    let uri = '', fileName = '', mimeType = '';

    if (type === 'image') {
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.8 });
      if (result.canceled) return;
      const asset = result.assets[0];
      uri = asset.uri;
      fileName = asset.fileName ?? `photo_${Date.now()}.jpg`;
      mimeType = asset.mimeType ?? 'image/jpeg';
    } else {
      const result = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true });
      if (result.canceled) return;
      const asset = result.assets[0];
      uri = asset.uri;
      fileName = asset.name;
      mimeType = asset.mimeType ?? 'application/octet-stream';
    }

    setUploading(true);
    try {
      const storagePath = await uploadMedia(tripId, user.id, uri, fileName, mimeType);
      await saveMediaRecord({ trip_id: tripId, uploaded_by: user.id, stop_id: null, storage_path: storagePath, file_name: fileName, mime_type: mimeType, size_bytes: null, thumbnail_path: null });
      reload();
    } catch (e: any) {
      Alert.alert('Upload failed', e.message);
    } finally {
      setUploading(false);
    }
  }

  function handleUploadPress() {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        { options: ['Cancel', 'Photo from Library', 'Upload Document'], cancelButtonIndex: 0 },
        (idx) => { if (idx === 1) pickAndUpload('image'); else if (idx === 2) pickAndUpload('document'); }
      );
    } else {
      Alert.alert('Upload', 'Choose type', [
        { text: 'Photo', onPress: () => pickAndUpload('image') },
        { text: 'Document', onPress: () => pickAndUpload('document') },
        { text: 'Cancel', style: 'cancel' },
      ]);
    }
  }

  const photos = media.filter((m) => m.mime_type.startsWith('image/'));
  const docs = media.filter((m) => !m.mime_type.startsWith('image/'));

  return (
    <View style={styles.container}>
      <FlatList
        data={photos}
        keyExtractor={(m) => m.id}
        numColumns={COL}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={reload} />}
        contentContainerStyle={styles.grid}
        ListHeaderComponent={
          docs.length > 0 ? (
            <View>
              <Text style={styles.sectionTitle}>Documents</Text>
              {docs.map((doc) => (
                <TouchableOpacity key={doc.id} style={styles.docRow} onPress={() => nav.navigate('MediaDetail', { mediaId: doc.id, signedUrl: doc.signedUrl ?? '', mimeType: doc.mime_type, fileName: doc.file_name })}>
                  <Text style={styles.docIcon}>📄</Text>
                  <Text style={styles.docName} numberOfLines={1}>{doc.file_name}</Text>
                </TouchableOpacity>
              ))}
              {photos.length > 0 && <Text style={[styles.sectionTitle, { marginTop: 16 }]}>Photos</Text>}
            </View>
          ) : null
        }
        ListEmptyComponent={
          !loading && docs.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>📸</Text>
              <Text style={styles.emptyText}>No photos or documents yet</Text>
            </View>
          ) : null
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.photoCell}
            onPress={() => nav.navigate('MediaDetail', { mediaId: item.id, signedUrl: item.signedUrl ?? '', mimeType: item.mime_type, fileName: item.file_name })}
          >
            <Image source={{ uri: item.signedUrl }} style={{ width: SIZE, height: SIZE }} contentFit="cover" />
          </TouchableOpacity>
        )}
      />
      <TouchableOpacity style={[styles.fab, uploading && styles.fabDisabled]} onPress={handleUploadPress} disabled={uploading}>
        <Text style={styles.fabText}>{uploading ? 'Uploading...' : '+ Upload'}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  grid: { paddingBottom: 100 },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: '#6B7280', textTransform: 'uppercase', letterSpacing: 0.8, paddingHorizontal: 16, paddingVertical: 8 },
  photoCell: { width: SIZE, height: SIZE, margin: 1 },
  docRow: { flexDirection: 'row', alignItems: 'center', padding: 14, marginHorizontal: 16, marginBottom: 8, backgroundColor: '#fff', borderRadius: 10, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  docIcon: { fontSize: 24, marginRight: 12 },
  docName: { flex: 1, fontSize: 15, color: '#111827' },
  empty: { alignItems: 'center', paddingTop: 80 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontSize: 16, color: '#6B7280' },
  fab: { position: 'absolute', bottom: 24, right: 24, backgroundColor: '#2563EB', borderRadius: 28, paddingHorizontal: 20, paddingVertical: 14, shadowColor: '#2563EB', shadowOpacity: 0.4, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 6 },
  fabDisabled: { opacity: 0.6 },
  fabText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
