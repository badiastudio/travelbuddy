import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, FlatList, StyleSheet } from 'react-native';
import { Category } from '../../constants/categories';

interface Props {
  categories: Category[];
  value: string | null;
  onChange: (value: string | null) => void;
}

export default function CategoryPicker({ categories, value, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const selected = categories.find((c) => c.value === value);

  return (
    <>
      <TouchableOpacity style={styles.selector} onPress={() => setOpen(true)}>
        <Text style={styles.selectorText}>
          {selected ? `${selected.icon}  ${selected.label}` : 'Select a category'}
        </Text>
        <Text style={styles.chevron}>›</Text>
      </TouchableOpacity>

      <Modal visible={open} animationType="slide" transparent>
        <View style={styles.overlay}>
          <View style={styles.sheet}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Select Category</Text>
              <TouchableOpacity onPress={() => setOpen(false)}>
                <Text style={styles.closeBtn}>Done</Text>
              </TouchableOpacity>
            </View>
            {value && (
              <TouchableOpacity style={styles.clearRow} onPress={() => { onChange(null); setOpen(false); }}>
                <Text style={styles.clearText}>✕  Clear category</Text>
              </TouchableOpacity>
            )}
            <FlatList
              data={categories}
              keyExtractor={(c) => c.value}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.row, item.value === value && styles.rowSelected]}
                  onPress={() => { onChange(item.value); setOpen(false); }}
                >
                  <Text style={styles.rowIcon}>{item.icon}</Text>
                  <Text style={[styles.rowLabel, item.value === value && styles.rowLabelSelected]}>
                    {item.label}
                  </Text>
                  {item.value === value && <Text style={styles.check}>✓</Text>}
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  selector: { borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 10, padding: 14, backgroundColor: '#F9FAFB', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  selectorText: { fontSize: 16, color: '#111827' },
  chevron: { fontSize: 20, color: '#9CA3AF' },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '75%' },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  sheetTitle: { fontSize: 17, fontWeight: '700', color: '#111827' },
  closeBtn: { fontSize: 16, color: '#2563EB', fontWeight: '600' },
  clearRow: { padding: 14, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  clearText: { fontSize: 15, color: '#EF4444' },
  row: { flexDirection: 'row', alignItems: 'center', padding: 14, borderBottomWidth: 1, borderBottomColor: '#F9FAFB' },
  rowSelected: { backgroundColor: '#EFF6FF' },
  rowIcon: { fontSize: 22, marginRight: 12 },
  rowLabel: { fontSize: 16, color: '#111827', flex: 1 },
  rowLabelSelected: { color: '#2563EB', fontWeight: '600' },
  check: { fontSize: 16, color: '#2563EB', fontWeight: '700' },
});
