import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, TextInput, ActivityIndicator, RefreshControl, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useAuthStore } from '../../store/authStore';
import { fetchTemplates, createTemplate, deleteTemplate, renameTemplate, PackingTemplate } from '../../api/packingTemplates';
import { AppStackParamList } from '../../navigation/types';

type Nav = StackNavigationProp<AppStackParamList>;

export default function PackingTemplatesScreen() {
  const nav = useNavigation<Nav>();
  const user = useAuthStore((s) => s.user);
  const [templates, setTemplates] = useState<PackingTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await fetchTemplates(user.id);
      setTemplates(data);
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { load(); }, [load]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function handleCreate() {
    if (!user || !newName.trim()) return;
    setCreating(true);
    try {
      const t = await createTemplate(user.id, newName.trim());
      setNewName('');
      setModalVisible(false);
      nav.navigate('PackingTemplateDetail', { templateId: t.id, name: t.name });
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setCreating(false);
    }
  }

  function handleLongPress(template: PackingTemplate) {
    Alert.alert(template.name, undefined, [
      { text: 'Rename', onPress: () => promptRename(template) },
      { text: 'Delete', style: 'destructive', onPress: () => confirmDelete(template) },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }

  function promptRename(template: PackingTemplate) {
    Alert.prompt?.('Rename template', undefined, async (text) => {
      if (!text?.trim()) return;
      try {
        await renameTemplate(template.id, text.trim());
        load();
      } catch (e: any) {
        Alert.alert('Error', e.message);
      }
    }, 'plain-text', template.name);
  }

  function confirmDelete(template: PackingTemplate) {
    Alert.alert('Delete template?', `"${template.name}" and all its items will be permanently deleted.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try { await deleteTemplate(template.id); load(); }
        catch (e: any) { Alert.alert('Error', e.message); }
      }},
    ]);
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => nav.goBack()}><Text style={styles.back}>‹ Back</Text></TouchableOpacity>
        <Text style={styles.title}>Packing Templates</Text>
        <TouchableOpacity onPress={() => setModalVisible(true)}><Text style={styles.add}>+ New</Text></TouchableOpacity>
      </View>

      <FlatList
        data={templates}
        keyExtractor={(t) => t.id}
        contentContainerStyle={templates.length === 0 ? styles.emptyWrap : styles.list}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
        ListEmptyComponent={!loading ? (
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>🧳</Text>
            <Text style={styles.emptyTitle}>No templates yet</Text>
            <Text style={styles.emptyText}>Create reusable packing lists for different trip types (Beach, Hiking, Business, etc.)</Text>
            <TouchableOpacity style={styles.emptyBtn} onPress={() => setModalVisible(true)}>
              <Text style={styles.emptyBtnText}>+ Create your first template</Text>
            </TouchableOpacity>
          </View>
        ) : null}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() => nav.navigate('PackingTemplateDetail', { templateId: item.id, name: item.name })}
            onLongPress={() => handleLongPress(item)}
            activeOpacity={0.7}
          >
            <View style={styles.cardIconBox}>
              <Text style={styles.cardIcon}>🧳</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>{item.name}</Text>
              <Text style={styles.cardMeta}>{item.item_count} {item.item_count === 1 ? 'item' : 'items'}</Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>
        )}
      />

      <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>New Packing Template</Text>
            <Text style={styles.modalHint}>Give it a name like "Beach Trip", "Hiking", or "Business Travel".</Text>
            <TextInput
              style={styles.input}
              placeholder="Template name"
              value={newName}
              onChangeText={setNewName}
              autoFocus
              onSubmitEditing={handleCreate}
            />
            <View style={styles.modalRow}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => { setModalVisible(false); setNewName(''); }}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalCreate, !newName.trim() && styles.modalCreateDisabled]} onPress={handleCreate} disabled={!newName.trim() || creating}>
                {creating ? <ActivityIndicator color="#fff" /> : <Text style={styles.modalCreateText}>Create</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  back: { color: '#2563EB', fontSize: 16, fontWeight: '600', minWidth: 60 },
  title: { fontSize: 17, fontWeight: '700', color: '#111827' },
  add: { color: '#2563EB', fontSize: 16, fontWeight: '600', minWidth: 60, textAlign: 'right' },

  list: { padding: 16 },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 14, borderRadius: 12, marginBottom: 10, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, shadowOffset: { width: 0, height: 2 }, elevation: 1 },
  cardIconBox: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#EFF6FF', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  cardIcon: { fontSize: 22 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#111827' },
  cardMeta: { fontSize: 13, color: '#6B7280', marginTop: 2 },
  chevron: { fontSize: 24, color: '#9CA3AF' },

  emptyWrap: { flexGrow: 1 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  emptyIcon: { fontSize: 56, marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#111827', marginBottom: 8 },
  emptyText: { fontSize: 14, color: '#6B7280', textAlign: 'center', marginBottom: 24, lineHeight: 20 },
  emptyBtn: { backgroundColor: '#2563EB', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 10 },
  emptyBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, paddingBottom: 40 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#111827', marginBottom: 6 },
  modalHint: { fontSize: 13, color: '#6B7280', marginBottom: 16 },
  input: { borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 10, padding: 14, fontSize: 16, backgroundColor: '#F9FAFB', marginBottom: 16 },
  modalRow: { flexDirection: 'row', gap: 10 },
  modalCancel: { flex: 1, padding: 14, alignItems: 'center', borderRadius: 10, backgroundColor: '#F3F4F6' },
  modalCancelText: { color: '#6B7280', fontWeight: '600', fontSize: 15 },
  modalCreate: { flex: 1, padding: 14, alignItems: 'center', borderRadius: 10, backgroundColor: '#2563EB' },
  modalCreateDisabled: { backgroundColor: '#93C5FD' },
  modalCreateText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
