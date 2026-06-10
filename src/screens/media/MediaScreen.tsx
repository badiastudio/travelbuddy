import React, { useState, useRef } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity, Alert,
  RefreshControl, Dimensions, Platform, Modal, TextInput, ScrollView
} from 'react-native';
import { Image } from 'expo-image';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { MaterialTopTabScreenProps } from '@react-navigation/material-top-tabs';
import { useMedia } from '../../hooks/useMedia';
import { uploadMedia, saveMediaRecord } from '../../api/storage';
import { useAuthStore } from '../../store/authStore';
import { AppStackParamList, TripTabParamList } from '../../navigation/types';
import Button from '../../components/common/Button';

type Props = MaterialTopTabScreenProps<TripTabParamList, 'Media'>;
type Nav = StackNavigationProp<AppStackParamList>;

const COL = 8;
const SIZE = (Dimensions.get('window').width - 32 - (COL - 1) * 4) / COL;

interface PendingUpload {
  uri: string;
  fileName: string;
  mimeType: string;
}

export default function MediaScreen({ route }: Props) {
  const { tripId } = route.params;
  const nav = useNavigation<Nav>();
  const user = useAuthStore((s) => s.user);
  const { media, loading, reload } = useMedia(tripId);
  const fileInputRef = useRef<any>(null);

  const [pending, setPending] = useState<PendingUpload | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [description, setDescription] = useState('');
  const [takenAt, setTakenAt] = useState('');
  const [uploading, setUploading] = useState(false);

  function openFilePicker() {
    if (Platform.OS === 'web') {
      fileInputRef.current?.click();
    }
  }

  async function handleWebFileChange(e: any) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setPending({ uri: reader.result as string, fileName: file.name, mimeType: file.type });
      setDisplayName(file.name.replace(/\.[^/.]+$/, ''));
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  }

  async function handleUpload() {
    if (!pending || !user) return;
    setUploading(true);
    try {
      const storagePath = await uploadMedia(tripId, user.id, pending.uri, pending.fileName, pending.mimeType);
      await saveMediaRecord({
        trip_id: tripId,
        uploaded_by: user.id,
        stop_id: null,
        storage_path: storagePath,
        file_name: pending.fileName,
        mime_type: pending.mimeType,
        size_bytes: null,
        thumbnail_path: null,
        display_name: displayName.trim() || null,
        description: description.trim() || null,
        taken_at: takenAt || null,
      });
      setPending(null);
      setDisplayName('');
      setDescription('');
      setTakenAt('');
      reload();
    } catch (e: any) {
      Alert.alert('Upload failed', e.message);
    } finally {
      setUploading(false);
    }
  }

  const photos = media.filter((m) => m.mime_type.startsWith('image/'));
  const docs = media.filter((m) => !m.mime_type.startsWith('image/'));

  return (
    <View style={styles.container}>
      {Platform.OS === 'web' && (
        <input ref={fileInputRef} type="file" accept="*/*"
          style={{ display: 'none' }} onChange={handleWebFileChange} />
      )}

      {/* Upload metadata modal */}
      <Modal visible={!!pending} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <ScrollView style={styles.modalSheet} contentContainerStyle={styles.modalContent}>
            <Text style={styles.modalTitle}>Add Details</Text>

            {pending?.mimeType.startsWith('image/') && (
              <Image source={{ uri: pending.uri }} style={styles.previewImage} contentFit="cover" />
            )}

            <Text style={styles.fieldLabel}>Name</Text>
            <TextInput style={styles.fieldInput} value={displayName} onChangeText={setDisplayName} placeholder="Photo name" />

            <Text style={styles.fieldLabel}>Description</Text>
            <TextInput style={[styles.fieldInput, styles.textarea]} value={description} onChangeText={setDescription}
              placeholder="Add a caption or note..." multiline numberOfLines={3} />

            <Text style={styles.fieldLabel}>Date Taken</Text>
            {Platform.OS === 'web' ? (
              <input type="date" value={takenAt}
                onChange={(e) => setTakenAt(e.target.value)}
                style={{ border: '1px solid #D1D5DB', borderRadius: 10, padding: 14, fontSize: 16, backgroundColor: '#F9FAFB', width: '100%', boxSizing: 'border-box' as any, marginBottom: 8 }} />
            ) : (
              <TextInput style={styles.fieldInput} value={takenAt} onChangeText={setTakenAt} placeholder="YYYY-MM-DD" />
            )}

            <Button title="Upload" onPress={handleUpload} loading={uploading} style={styles.uploadBtn} />
            <TouchableOpacity onPress={() => setPending(null)} style={styles.cancelBtn}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Documents */}
        {docs.length > 0 && (
          <View>
            <Text style={styles.sectionTitle}>Documents</Text>
            {docs.map((doc) => (
              <TouchableOpacity key={doc.id} style={styles.docRow}
                onPress={() => (nav.getParent() ?? nav).navigate('MediaDetail', { mediaId: doc.id, signedUrl: doc.signedUrl ?? '', mimeType: doc.mime_type, fileName: doc.file_name })}>
                <Text style={styles.docIcon}>📄</Text>
                <View style={styles.docInfo}>
                  <Text style={styles.docName} numberOfLines={1}>{doc.display_name ?? doc.file_name}</Text>
                  {doc.description ? <Text style={styles.docDesc} numberOfLines={1}>{doc.description}</Text> : null}
                  {doc.taken_at ? <Text style={styles.docDate}>{doc.taken_at}</Text> : null}
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Photos */}
        {photos.length > 0 && <Text style={styles.sectionTitle}>Photos</Text>}
        <View style={styles.grid}>
          {photos.map((item) => (
            <TouchableOpacity key={item.id} style={styles.thumbContainer}
              onPress={() => (nav.getParent() ?? nav).navigate('MediaDetail', { mediaId: item.id, signedUrl: item.signedUrl ?? '', mimeType: item.mime_type, fileName: item.display_name ?? item.file_name })}>
              <Image source={{ uri: item.signedUrl }} style={styles.thumb} contentFit="cover" />
              {(item.display_name || item.taken_at) && (
                <View style={styles.thumbOverlay}>
                  {item.display_name ? <Text style={styles.thumbName} numberOfLines={1}>{item.display_name}</Text> : null}
                  {item.taken_at ? <Text style={styles.thumbDate}>{item.taken_at}</Text> : null}
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>

        {media.length === 0 && !loading && (
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>📸</Text>
            <Text style={styles.emptyText}>No photos or documents yet</Text>
          </View>
        )}
      </ScrollView>

      <TouchableOpacity style={styles.fab} onPress={openFilePicker}>
        <Text style={styles.fabText}>+ Upload</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  scroll: { padding: 16, paddingBottom: 100 },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: '#6B7280', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10, marginTop: 8 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  thumbContainer: { width: SIZE, borderRadius: 10, overflow: 'hidden', backgroundColor: '#E5E7EB' },
  thumb: { width: SIZE, height: SIZE },
  thumbOverlay: { backgroundColor: 'rgba(0,0,0,0.45)', padding: 6 },
  thumbName: { color: '#fff', fontSize: 11, fontWeight: '600' },
  thumbDate: { color: 'rgba(255,255,255,0.8)', fontSize: 10 },
  docRow: { flexDirection: 'row', alignItems: 'center', padding: 14, marginBottom: 8, backgroundColor: '#fff', borderRadius: 10, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  docIcon: { fontSize: 24, marginRight: 12 },
  docInfo: { flex: 1 },
  docName: { fontSize: 15, fontWeight: '600', color: '#111827' },
  docDesc: { fontSize: 13, color: '#6B7280', marginTop: 2 },
  docDate: { fontSize: 12, color: '#9CA3AF', marginTop: 2 },
  empty: { alignItems: 'center', paddingTop: 80 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontSize: 16, color: '#6B7280' },
  fab: { position: 'absolute', bottom: 24, right: 24, backgroundColor: '#2563EB', borderRadius: 28, paddingHorizontal: 20, paddingVertical: 14, shadowColor: '#2563EB', shadowOpacity: 0.4, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 6 },
  fabText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '90%' },
  modalContent: { padding: 24, paddingBottom: 40 },
  modalTitle: { fontSize: 20, fontWeight: '700', color: '#111827', marginBottom: 16 },
  previewImage: { width: '100%', height: 180, borderRadius: 12, marginBottom: 16 },
  fieldLabel: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 6, marginTop: 12 },
  fieldInput: { borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 10, padding: 14, fontSize: 16, backgroundColor: '#F9FAFB' },
  textarea: { height: 90, textAlignVertical: 'top' },
  uploadBtn: { marginTop: 24 },
  cancelBtn: { marginTop: 12, alignItems: 'center' },
  cancelText: { color: '#6B7280', fontSize: 15 },
});
