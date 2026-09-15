import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, Alert, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { fetchTemplateItems, addTemplateItem, deleteTemplateItem, PackingTemplateItem } from '../../api/packingTemplates';
import { AppStackParamList } from '../../navigation/types';

type Route = RouteProp<AppStackParamList, 'PackingTemplateDetail'>;

export default function PackingTemplateDetailScreen() {
  const nav = useNavigation();
  const route = useRoute<Route>();
  const { templateId, name } = route.params;
  const [items, setItems] = useState<PackingTemplateItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [newItem, setNewItem] = useState('');
  const [adding, setAdding] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchTemplateItems(templateId);
      setItems(data);
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
    }
  }, [templateId]);

  useEffect(() => { load(); }, [load]);

  async function handleAdd() {
    if (!newItem.trim()) return;
    setAdding(true);
    try {
      await addTemplateItem(templateId, newItem.trim());
      setNewItem('');
      load();
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setAdding(false);
    }
  }

  function handleDelete(item: PackingTemplateItem) {
    Alert.alert('Remove item?', item.text, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: async () => {
        try { await deleteTemplateItem(item.id); load(); }
        catch (e: any) { Alert.alert('Error', e.message); }
      }},
    ]);
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => nav.goBack()}><Text style={styles.back}>‹ Back</Text></TouchableOpacity>
        <Text style={styles.title} numberOfLines={1}>{name}</Text>
        <View style={{ width: 60 }} />
      </View>

      <FlatList
        data={items}
        keyExtractor={(i) => i.id}
        contentContainerStyle={items.length === 0 ? styles.emptyWrap : styles.list}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
        ListEmptyComponent={!loading ? (
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>📝</Text>
            <Text style={styles.emptyText}>Add items you'd typically pack for this type of trip</Text>
          </View>
        ) : null}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.item} onLongPress={() => handleDelete(item)} activeOpacity={0.75}>
            <Text style={styles.itemBullet}>•</Text>
            <Text style={styles.itemText}>{item.text}</Text>
          </TouchableOpacity>
        )}
      />

      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          placeholder="Add item (e.g. Passport, Hiking boots)"
          value={newItem}
          onChangeText={setNewItem}
          onSubmitEditing={handleAdd}
          returnKeyType="done"
        />
        <TouchableOpacity style={[styles.addBtn, !newItem.trim() && styles.addBtnDisabled]} onPress={handleAdd} disabled={!newItem.trim() || adding}>
          {adding ? <ActivityIndicator color="#fff" /> : <Text style={styles.addBtnText}>Add</Text>}
        </TouchableOpacity>
      </View>
      <Text style={styles.hint}>Long-press an item to remove it</Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  back: { color: '#2563EB', fontSize: 16, fontWeight: '600', minWidth: 60 },
  title: { fontSize: 17, fontWeight: '700', color: '#111827', flex: 1, textAlign: 'center' },
  list: { padding: 16 },
  item: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 14, borderRadius: 10, marginBottom: 6 },
  itemBullet: { fontSize: 20, color: '#2563EB', marginRight: 10, fontWeight: '700' },
  itemText: { fontSize: 15, color: '#111827', flex: 1 },

  emptyWrap: { flexGrow: 1 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontSize: 14, color: '#6B7280', textAlign: 'center' },

  inputRow: { flexDirection: 'row', gap: 8, padding: 12, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#E5E7EB' },
  input: { flex: 1, borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, fontSize: 15, backgroundColor: '#F9FAFB' },
  addBtn: { backgroundColor: '#2563EB', borderRadius: 10, paddingHorizontal: 20, alignItems: 'center', justifyContent: 'center' },
  addBtnDisabled: { backgroundColor: '#93C5FD' },
  addBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  hint: { fontSize: 11, color: '#9CA3AF', textAlign: 'center', paddingVertical: 8, backgroundColor: '#fff' },
});
