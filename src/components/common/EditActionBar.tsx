import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

interface Props {
  selectedCount: number;
  onDelete: () => void;
  onArchive?: () => void;
  onRestore?: () => void;
  onCancel: () => void;
}

export default function EditActionBar({ selectedCount, onDelete, onArchive, onRestore, onCancel }: Props) {
  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={onCancel} style={styles.cancelBtn}>
        <Text style={styles.cancelText}>Cancel</Text>
      </TouchableOpacity>
      <Text style={styles.count}>{selectedCount} selected</Text>
      <View style={styles.actions}>
        {onRestore && (
          <TouchableOpacity
            style={[styles.actionBtn, styles.restoreBtn, selectedCount === 0 && styles.disabled]}
            onPress={onRestore}
            disabled={selectedCount === 0}
          >
            <Text style={styles.restoreText}>Restore</Text>
          </TouchableOpacity>
        )}
        {onArchive && (
          <TouchableOpacity
            style={[styles.actionBtn, styles.archiveBtn, selectedCount === 0 && styles.disabled]}
            onPress={onArchive}
            disabled={selectedCount === 0}
          >
            <Text style={styles.archiveText}>Archive</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[styles.actionBtn, styles.deleteBtn, selectedCount === 0 && styles.disabled]}
          onPress={onDelete}
          disabled={selectedCount === 0}
        >
          <Text style={styles.deleteText}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#E5E7EB' },
  cancelBtn: { minWidth: 60 },
  cancelText: { fontSize: 15, color: '#2563EB', fontWeight: '600' },
  count: { flex: 1, textAlign: 'center', fontSize: 14, color: '#6B7280', fontWeight: '500' },
  actions: { flexDirection: 'row', gap: 8 },
  actionBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8 },
  restoreBtn: { backgroundColor: '#D1FAE5' },
  restoreText: { fontSize: 14, fontWeight: '600', color: '#065F46' },
  archiveBtn: { backgroundColor: '#F3F4F6' },
  archiveText: { fontSize: 14, fontWeight: '600', color: '#374151' },
  deleteBtn: { backgroundColor: '#FEE2E2' },
  deleteText: { fontSize: 14, fontWeight: '600', color: '#EF4444' },
  disabled: { opacity: 0.4 },
});
