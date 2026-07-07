import React, { useCallback, useState, useRef } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  Alert,
  SectionList,
  Modal,
  ScrollView,
  FlatList,
} from 'react-native';
import { MaterialTopTabScreenProps } from '@react-navigation/material-top-tabs';
import { TripTabParamList } from '../../navigation/types';
import { usePackingList } from '../../hooks/usePackingList';
import {
  createPackingItem,
  togglePackingItem,
  deletePackingItem,
  assignPackingItem,
} from '../../api/packingList';
import { useAuthStore } from '../../store/authStore';
import { useTripStore } from '../../store/tripStore';

type Props = MaterialTopTabScreenProps<TripTabParamList, 'Packing'>;

// ─── Suggestion helpers ──────────────────────────────────────────────────────

function getTripDurationDays(startDate: string | null, endDate: string | null): number {
  if (!startDate || !endDate) return 0;
  const start = new Date(startDate);
  const end = new Date(endDate);
  return Math.max(0, Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
}

function getSeason(startDate: string | null): 'summer' | 'winter' | 'other' {
  if (!startDate) return 'other';
  const month = new Date(startDate).getMonth() + 1; // 1-12
  if (month >= 6 && month <= 8) return 'summer';
  if (month === 12 || month <= 2) return 'winter';
  return 'other';
}

function getSuggestions(
  startDate: string | null,
  endDate: string | null,
  description: string | null,
): string[] {
  const suggestions: string[] = [
    'Passport',
    'Phone charger',
    'Headphones',
    'Travel pillow',
    'First aid kit',
    'Medications',
    'Travel insurance docs',
    'Cash',
  ];

  const duration = getTripDurationDays(startDate, endDate);
  if (duration > 7) {
    suggestions.push('Laundry bag', 'Extra socks');
  }

  const season = getSeason(startDate);
  if (season === 'summer') suggestions.push('Sunscreen', 'Sunglasses', 'Hat');
  if (season === 'winter') suggestions.push('Winter coat', 'Gloves', 'Thermal layers');

  const desc = (description ?? '').toLowerCase();
  if (desc.includes('beach') || desc.includes('sea') || desc.includes('ocean')) {
    suggestions.push('Swimsuit', 'Beach towel', 'Flip flops', 'Snorkel gear');
  }
  if (
    desc.includes('adventure') ||
    desc.includes('hiking') ||
    desc.includes('trek') ||
    desc.includes('camp')
  ) {
    suggestions.push('Hiking boots', 'Backpack', 'Water bottle', 'Insect repellent');
  }
  if (
    desc.includes('culture') ||
    desc.includes('museum') ||
    desc.includes('city') ||
    desc.includes('art')
  ) {
    suggestions.push('Comfortable walking shoes', 'Guidebook', 'Camera');
  }

  // Deduplicate
  return [...new Set(suggestions)];
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function PackingListScreen({ route }: Props) {
  const { tripId } = route.params;
  const { items, loading, reload } = usePackingList(tripId);
  useFocusEffect(useCallback(() => { reload(); }, [reload]));
  const user = useAuthStore((s) => s.user);
  const currentTrip = useTripStore((s) => s.currentTrip);
  const currentMembers = useTripStore((s) => s.currentMembers);

  const [text, setText] = useState('');
  const inputRef = useRef<TextInput>(null);

  // Suggestions modal state
  const [suggestionsVisible, setSuggestionsVisible] = useState(false);
  const [selectedSuggestions, setSelectedSuggestions] = useState<Set<string>>(new Set());
  const [addingItems, setAddingItems] = useState(false);

  const unchecked = items.filter((i) => !i.checked);
  const checked = items.filter((i) => i.checked);

  async function handleAdd() {
    const trimmed = text.trim();
    if (!trimmed || !user) return;
    setText('');
    await createPackingItem(tripId, user.id, trimmed);
    reload();
  }

  async function handleToggle(itemId: string, current: boolean) {
    await togglePackingItem(itemId, !current);
    reload();
  }

  function handleLongPress(itemId: string) {
    if (currentMembers.length === 0) {
      // Fallback to delete if no members
      Alert.alert('Delete item?', 'This cannot be undone.', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deletePackingItem(itemId);
            reload();
          },
        },
      ]);
      return;
    }

    const memberOptions = currentMembers.map((m) => ({
      text: m.profile?.display_name ?? m.user_id.slice(0, 8),
      onPress: async () => {
        await assignPackingItem(itemId, m.user_id);
        reload();
      },
    }));

    Alert.alert('Assign or delete', 'Assign this item to a member, or delete it.', [
      ...memberOptions,
      {
        text: 'Unassign',
        onPress: async () => {
          await assignPackingItem(itemId, null);
          reload();
        },
      },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deletePackingItem(itemId);
          reload();
        },
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }

  // ── Suggestions modal ──────────────────────────────────────────────────────

  function openSuggestions() {
    const suggestions = getSuggestions(
      currentTrip?.start_date ?? null,
      currentTrip?.end_date ?? null,
      currentTrip?.description ?? null,
    );
    // Pre-select items not already in list
    const existingLabels = new Set(items.map((i) => i.text.toLowerCase()));
    const preSelected = new Set(
      suggestions.filter((s) => !existingLabels.has(s.toLowerCase())),
    );
    setSelectedSuggestions(preSelected);
    setSuggestionsVisible(true);
  }

  function toggleSuggestion(label: string) {
    setSelectedSuggestions((prev) => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });
  }

  async function addSelectedSuggestions() {
    if (!user || selectedSuggestions.size === 0) return;
    setAddingItems(true);
    const existingLabels = new Set(items.map((i) => i.text.toLowerCase()));
    for (const label of selectedSuggestions) {
      if (!existingLabels.has(label.toLowerCase())) {
        await createPackingItem(tripId, user.id, label);
      }
    }
    setAddingItems(false);
    setSuggestionsVisible(false);
    reload();
  }

  const suggestions = getSuggestions(
    currentTrip?.start_date ?? null,
    currentTrip?.end_date ?? null,
    currentTrip?.description ?? null,
  );

  const sections = [
    ...(unchecked.length > 0 ? [{ title: 'Still needed', data: unchecked }] : []),
    ...(checked.length > 0 ? [{ title: 'Packed', data: checked }] : []),
  ];

  const isEmpty = items.length === 0 && !loading;

  return (
    <View style={styles.container}>
      {/* Top bar with Suggestions button */}
      <View style={styles.topBar}>
        <Text style={styles.topBarTitle}>Packing List</Text>
        <TouchableOpacity style={styles.suggestBtn} onPress={openSuggestions} activeOpacity={0.8}>
          <Text style={styles.suggestBtnText}>💡 Suggestions</Text>
        </TouchableOpacity>
      </View>

      {isEmpty ? (
        <View style={styles.emptyInner}>
          <Text style={styles.emptyIcon}>🧳</Text>
          <Text style={styles.emptyText}>Nothing packed yet</Text>
          <TouchableOpacity style={styles.suggestBtnLarge} onPress={openSuggestions} activeOpacity={0.8}>
            <Text style={styles.suggestBtnLargeText}>💡 Get suggestions</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={reload} />}
          contentContainerStyle={styles.list}
          stickySectionHeadersEnabled={false}
          renderSectionHeader={({ section }) => (
            <Text style={styles.sectionHeader}>{section.title}</Text>
          )}
          renderItem={({ item }) => {
            const assignee = item.assigned_to
              ? currentMembers.find((m) => m.user_id === item.assigned_to)
              : null;
            const assigneeName = assignee?.profile?.display_name ?? assignee?.user_id?.slice(0, 8);
            return (
              <TouchableOpacity
                style={styles.card}
                onPress={() => handleToggle(item.id, item.checked)}
                onLongPress={() => handleLongPress(item.id)}
                activeOpacity={0.7}
              >
                <View style={[styles.checkbox, item.checked && styles.checkboxChecked]}>
                  {item.checked && <Text style={styles.checkmark}>✓</Text>}
                </View>
                <Text style={[styles.itemText, item.checked && styles.itemTextChecked]}>
                  {item.text}
                </Text>
                {assigneeName ? (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{assigneeName}</Text>
                  </View>
                ) : null}
              </TouchableOpacity>
            );
          }}
        />
      )}

      <View style={styles.inputRow}>
        <TextInput
          ref={inputRef}
          style={styles.input}
          placeholder="Add an item…"
          placeholderTextColor="#9CA3AF"
          value={text}
          onChangeText={setText}
          onSubmitEditing={handleAdd}
          returnKeyType="done"
          blurOnSubmit={false}
        />
        <TouchableOpacity style={styles.addBtn} onPress={handleAdd} activeOpacity={0.8}>
          <Text style={styles.addBtnText}>+</Text>
        </TouchableOpacity>
      </View>

      {/* Suggestions Modal */}
      <Modal
        visible={suggestionsVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setSuggestionsVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>💡 Packing Suggestions</Text>
              <TouchableOpacity onPress={() => setSuggestionsVisible(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.modalSubtitle}>Tap items to select, then add them all at once.</Text>
            <ScrollView style={styles.modalScroll} contentContainerStyle={styles.modalScrollContent}>
              {suggestions.map((label) => {
                const alreadyHas = items.some((i) => i.text.toLowerCase() === label.toLowerCase());
                const selected = selectedSuggestions.has(label);
                return (
                  <TouchableOpacity
                    key={label}
                    style={[
                      styles.suggestionRow,
                      selected && styles.suggestionRowSelected,
                      alreadyHas && styles.suggestionRowDone,
                    ]}
                    onPress={() => !alreadyHas && toggleSuggestion(label)}
                    activeOpacity={alreadyHas ? 1 : 0.7}
                  >
                    <View style={[styles.suggestionCheck, selected && styles.suggestionCheckSelected]}>
                      {(selected || alreadyHas) && <Text style={styles.suggestionCheckMark}>✓</Text>}
                    </View>
                    <Text style={[styles.suggestionLabel, alreadyHas && styles.suggestionLabelDone]}>
                      {label}
                    </Text>
                    {alreadyHas ? (
                      <Text style={styles.alreadyBadge}>Added</Text>
                    ) : null}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[
                  styles.addSelectedBtn,
                  (selectedSuggestions.size === 0 || addingItems) && styles.addSelectedBtnDisabled,
                ]}
                onPress={addSelectedSuggestions}
                disabled={selectedSuggestions.size === 0 || addingItems}
                activeOpacity={0.8}
              >
                <Text style={styles.addSelectedBtnText}>
                  {addingItems
                    ? 'Adding…'
                    : `Add Selected (${selectedSuggestions.size})`}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  topBarTitle: { fontSize: 15, fontWeight: '700', color: '#111827' },
  suggestBtn: {
    backgroundColor: '#EFF6FF',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  suggestBtnText: { fontSize: 13, fontWeight: '600', color: '#2563EB' },
  list: { padding: 16, paddingBottom: 100 },
  sectionHeader: {
    fontSize: 13,
    fontWeight: '700',
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 8,
    marginBottom: 6,
  },
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
  itemText: { fontSize: 15, color: '#111827', flex: 1 },
  itemTextChecked: { textDecorationLine: 'line-through', color: '#9CA3AF' },
  badge: {
    backgroundColor: '#EFF6FF',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginLeft: 8,
  },
  badgeText: { fontSize: 11, color: '#2563EB', fontWeight: '600' },
  emptyInner: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 60 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontSize: 16, color: '#6B7280', marginBottom: 20 },
  suggestBtnLarge: {
    backgroundColor: '#2563EB',
    borderRadius: 24,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  suggestBtnLargeText: { fontSize: 15, fontWeight: '700', color: '#fff' },
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
  // Modal
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    paddingBottom: 32,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 8,
  },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#111827' },
  modalClose: { fontSize: 20, color: '#6B7280', padding: 4 },
  modalSubtitle: { fontSize: 13, color: '#6B7280', paddingHorizontal: 20, marginBottom: 12 },
  modalScroll: { flexGrow: 0 },
  modalScrollContent: { paddingHorizontal: 16, paddingBottom: 8 },
  suggestionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  suggestionRowSelected: { borderColor: '#2563EB', backgroundColor: '#EFF6FF' },
  suggestionRowDone: { opacity: 0.5 },
  suggestionCheck: {
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
  suggestionCheckSelected: { backgroundColor: '#2563EB', borderColor: '#2563EB' },
  suggestionCheckMark: { color: '#fff', fontSize: 13, fontWeight: '700' },
  suggestionLabel: { fontSize: 15, color: '#111827', flex: 1 },
  suggestionLabelDone: { color: '#9CA3AF' },
  alreadyBadge: {
    fontSize: 11,
    color: '#10B981',
    fontWeight: '600',
    backgroundColor: '#ECFDF5',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  modalFooter: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  addSelectedBtn: {
    backgroundColor: '#2563EB',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  addSelectedBtnDisabled: { backgroundColor: '#93C5FD' },
  addSelectedBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
