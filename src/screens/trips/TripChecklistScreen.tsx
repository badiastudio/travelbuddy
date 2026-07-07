import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { RouteProp, useRoute } from '@react-navigation/native';
import { TripStackParamList } from '../../navigation/types';
import { TripChecklistItem } from '../../types/app.types';
import {
  createChecklistItem,
  deleteChecklistItem,
  fetchChecklistItems,
  toggleChecklistItem,
} from '../../api/tripChecklist';
import { useAuthStore } from '../../store/authStore';

type Route = RouteProp<TripStackParamList, 'TripChecklist'>;

const DEFAULTS = [
  'Book flights',
  'Book accommodation',
  'Check visa requirements',
  'Get travel insurance',
  'Notify bank of travel',
  'Pack passport',
  'Download offline maps',
  'Check vaccination requirements',
  'Set up international data plan',
  'Arrange airport transport',
];

export default function TripChecklistScreen() {
  const route = useRoute<Route>();
  const { tripId } = route.params;
  const user = useAuthStore((s) => s.user);

  const [items, setItems] = useState<TripChecklistItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [text, setText] = useState('');
  const inputRef = useRef<TextInput>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchChecklistItems(tripId);
      setItems(data);
    } catch (e) {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, [tripId]);

  useEffect(() => { load(); }, [load]);

  async function handleAdd(label: string) {
    const trimmed = label.trim();
    if (!trimmed || !user) return;
    setText('');
    await createChecklistItem(tripId, user.id, trimmed);
    load();
  }

  async function handleToggle(item: TripChecklistItem) {
    await toggleChecklistItem(item.id, !item.checked);
    load();
  }

  function handleLongPress(item: TripChecklistItem) {
    Alert.alert('Delete item?', `"${item.label}" will be removed.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteChecklistItem(item.id);
          load();
        },
      },
    ]);
  }

  const showDefaults = items.length === 0 && !loading;

  return (
    <View style={styles.container}>
      <FlatList
        data={items}
        keyExtractor={(i) => i.id}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          !loading ? (
            <View>
              <Text style={styles.suggestionHeader}>Suggestions — tap to add</Text>
              {DEFAULTS.map((d) => (
                <TouchableOpacity
                  key={d}
                  style={styles.suggestionItem}
                  onPress={() => handleAdd(d)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.suggestionPlus}>+</Text>
                  <Text style={styles.suggestionText}>{d}</Text>
                </TouchableOpacity>
              ))}
            </View>
          ) : null
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() => handleToggle(item)}
            onLongPress={() => handleLongPress(item)}
            activeOpacity={0.7}
          >
            <View style={[styles.checkbox, item.checked && styles.checkboxChecked]}>
              {item.checked && <Text style={styles.checkmark}>✓</Text>}
            </View>
            <Text style={[styles.itemLabel, item.checked && styles.itemLabelChecked]}>
              {item.label}
            </Text>
          </TouchableOpacity>
        )}
      />

      <View style={styles.inputRow}>
        <TextInput
          ref={inputRef}
          style={styles.input}
          placeholder="Add a task…"
          placeholderTextColor="#9CA3AF"
          value={text}
          onChangeText={setText}
          onSubmitEditing={() => handleAdd(text)}
          returnKeyType="done"
          blurOnSubmit={false}
        />
        <TouchableOpacity style={styles.addBtn} onPress={() => handleAdd(text)} activeOpacity={0.8}>
          <Text style={styles.addBtnText}>+</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  list: { padding: 16, paddingBottom: 100 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  checkboxChecked: { backgroundColor: '#2563EB', borderColor: '#2563EB' },
  checkmark: { color: '#fff', fontSize: 13, fontWeight: '700' },
  itemLabel: { fontSize: 15, color: '#111827', flex: 1 },
  itemLabelChecked: { textDecorationLine: 'line-through', color: '#9CA3AF' },
  suggestionHeader: {
    fontSize: 13,
    fontWeight: '700',
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  suggestionItem: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  suggestionPlus: { fontSize: 18, color: '#2563EB', marginRight: 12, fontWeight: '700' },
  suggestionText: { fontSize: 15, color: '#374151', flex: 1 },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  input: {
    flex: 1,
    height: 44,
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
    paddingHorizontal: 14,
    fontSize: 15,
    color: '#111827',
    marginRight: 10,
  },
  addBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBtnText: { color: '#fff', fontSize: 24, fontWeight: '400', lineHeight: 28 },
});
