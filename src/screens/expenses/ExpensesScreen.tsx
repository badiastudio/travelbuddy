import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, RefreshControl, Alert } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { MaterialTopTabScreenProps } from '@react-navigation/material-top-tabs';
import { useExpenses } from '../../hooks/useExpenses';
import { formatCurrency } from '../../utils/currencyUtils';
import { deleteExpense, archiveExpenses, unarchiveExpenses, deleteExpenses } from '../../api/expenses';
import { getCategoryIcon, EXPENSE_CATEGORIES } from '../../constants/categories';
import { AppStackParamList, TripTabParamList } from '../../navigation/types';
import EditActionBar from '../../components/common/EditActionBar';
import { useTripStore } from '../../store/tripStore';
import { scheduleLocalNotification } from '../../utils/notifications';

type Props = MaterialTopTabScreenProps<TripTabParamList, 'Expenses'>;
type Nav = StackNavigationProp<AppStackParamList>;

export default function ExpensesScreen({ route }: Props) {
  const { tripId } = route.params;
  const nav = useNavigation<Nav>();
  const [showArchived, setShowArchived] = useState(false);
  const { expenses, loading, reload } = useExpenses(tripId, showArchived);
  useFocusEffect(useCallback(() => { reload(); }, [reload]));
  const [editing, setEditing] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const notifFiredRef = useRef(false);

  const currentTrip = useTripStore((s) => s.currentTrip);
  const budget = currentTrip?.budget ?? null;

  const total = expenses.reduce((sum, e) => sum + Number(e.amount), 0);

  const budgetRatio = budget != null && budget > 0 ? total / budget : null;
  const showWarning = !bannerDismissed && budgetRatio != null && budgetRatio >= 0.8 && budgetRatio < 1;
  const showExceeded = !bannerDismissed && budgetRatio != null && budgetRatio >= 1;

  useEffect(() => {
    if (!notifFiredRef.current && budgetRatio != null && budgetRatio >= 0.8) {
      notifFiredRef.current = true;
      scheduleLocalNotification(
        '⚠️ Budget Alert',
        `You've used ${Math.round(budgetRatio * 100)}% of your trip budget.`,
      );
    }
  }, [budgetRatio]);

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function enterEdit() { setEditing(true); setSelected(new Set()); }
  function exitEdit() { setEditing(false); setSelected(new Set()); }

  async function handleDeleteSingle(expenseId: string) {
    Alert.alert('Delete expense?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => { await deleteExpense(expenseId); reload(); } },
    ]);
  }

  async function handleDelete() {
    if (selected.size === 0) return;
    Alert.alert(`Delete ${selected.size} expense${selected.size > 1 ? 's' : ''}?`, 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        await deleteExpenses(Array.from(selected));
        exitEdit(); reload();
      }},
    ]);
  }

  async function handleArchive() {
    if (selected.size === 0) return;
    await archiveExpenses(Array.from(selected));
    exitEdit(); reload();
  }

  async function handleRestore() {
    if (selected.size === 0) return;
    await unarchiveExpenses(Array.from(selected));
    exitEdit(); reload();
  }

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <View style={styles.toggle}>
          <TouchableOpacity
            style={[styles.toggleBtn, !showArchived && styles.toggleBtnActive]}
            onPress={() => { setShowArchived(false); exitEdit(); }}
          >
            <Text style={[styles.toggleText, !showArchived && styles.toggleTextActive]}>Active</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleBtn, showArchived && styles.toggleBtnActive]}
            onPress={() => { setShowArchived(true); exitEdit(); }}
          >
            <Text style={[styles.toggleText, showArchived && styles.toggleTextActive]}>Archived</Text>
          </TouchableOpacity>
        </View>
        {expenses.length > 0 && !editing && (
          <TouchableOpacity onPress={enterEdit}>
            <Text style={styles.editBtnText}>Edit</Text>
          </TouchableOpacity>
        )}
      </View>
      {(showWarning || showExceeded) && (
        <View style={[styles.alertBanner, showExceeded ? styles.alertBannerRed : styles.alertBannerYellow]}>
          <Text style={styles.alertBannerText}>
            {showExceeded ? '🚨 You\'ve exceeded your budget!' : '⚠️ You\'ve used 80% of your budget'}
          </Text>
          <TouchableOpacity onPress={() => setBannerDismissed(true)} style={styles.alertBannerClose}>
            <Text style={styles.alertBannerCloseText}>✕</Text>
          </TouchableOpacity>
        </View>
      )}
      {expenses.length > 0 && (
        <View style={styles.totalBar}>
          <Text style={styles.totalLabel}>Total Spent</Text>
          <Text style={styles.totalAmount}>{formatCurrency(total)}</Text>
          <TouchableOpacity onPress={() => (nav.getParent() ?? nav).navigate('Balance', { tripId })}>
            <Text style={styles.balanceLink}>View Balances →</Text>
          </TouchableOpacity>
        </View>
      )}
      <FlatList
        data={expenses}
        keyExtractor={(e) => e.id}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={reload} />}
        contentContainerStyle={expenses.length === 0 ? styles.empty : styles.list}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyInner}>
              <Text style={styles.emptyIcon}>💳</Text>
              <Text style={styles.emptyText}>No expenses yet</Text>
            </View>
          ) : null
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.card, editing && selected.has(item.id) && styles.cardSelected]}
            onPress={() => editing
              ? toggleSelect(item.id)
              : (nav.getParent() ?? nav).navigate('AddExpense', { tripId, expenseId: item.id })}
            onLongPress={() => !editing && handleDeleteSingle(item.id)}
            activeOpacity={0.8}
          >
            {editing && (
              <View style={[styles.checkbox, selected.has(item.id) && styles.checkboxSelected]}>
                {selected.has(item.id) && <Text style={styles.checkmark}>✓</Text>}
              </View>
            )}
            {item.category ? (
              <View style={styles.categoryIcon}>
                <Text style={styles.categoryIconText}>{getCategoryIcon(item.category, EXPENSE_CATEGORIES)}</Text>
              </View>
            ) : null}
            <View style={styles.cardLeft}>
              <Text style={styles.cardTitle}>{item.title}</Text>
              <Text style={styles.cardPayer}>Paid by {item.payer?.display_name ?? 'Unknown'}</Text>
            </View>
            <View style={styles.cardRight}>
              <Text style={styles.cardAmount}>{formatCurrency(Number(item.amount), item.currency)}</Text>
              {item.receipt_url ? <Text style={styles.receiptBadge}>🧾</Text> : null}
            </View>
          </TouchableOpacity>
        )}
      />
      {!editing && !showArchived && (
        <TouchableOpacity style={styles.fab} onPress={() => (nav.getParent() ?? nav).navigate('AddExpense', { tripId })}>
          <Text style={styles.fabText}>+ Add Expense</Text>
        </TouchableOpacity>
      )}
      {editing && (
        <EditActionBar
          selectedCount={selected.size}
          onDelete={handleDelete}
          onArchive={showArchived ? undefined : handleArchive}
          onRestore={showArchived ? handleRestore : undefined}
          onCancel={exitEdit}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  topBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 10, paddingBottom: 4 },
  toggle: { flexDirection: 'row', backgroundColor: '#E5E7EB', borderRadius: 20, padding: 3, flex: 1, marginRight: 12 },
  toggleBtn: { flex: 1, paddingVertical: 6, borderRadius: 17, alignItems: 'center' },
  toggleBtnActive: { backgroundColor: '#fff', shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 4, shadowOffset: { width: 0, height: 1 }, elevation: 2 },
  toggleText: { fontSize: 13, fontWeight: '600', color: '#6B7280' },
  toggleTextActive: { color: '#111827' },
  editBtnText: { fontSize: 15, color: '#2563EB', fontWeight: '600' },
  alertBanner: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10 },
  alertBannerYellow: { backgroundColor: '#FEF3C7' },
  alertBannerRed: { backgroundColor: '#FEE2E2' },
  alertBannerText: { flex: 1, fontSize: 14, fontWeight: '600', color: '#111827' },
  alertBannerClose: { padding: 4 },
  alertBannerCloseText: { fontSize: 14, color: '#6B7280', fontWeight: '700' },
  totalBar: { backgroundColor: '#EFF6FF', padding: 16, flexDirection: 'row', alignItems: 'center' },
  totalLabel: { fontSize: 14, color: '#374151', flex: 1 },
  totalAmount: { fontSize: 18, fontWeight: '700', color: '#1E40AF' },
  balanceLink: { fontSize: 14, color: '#2563EB', fontWeight: '600' },
  list: { padding: 16, paddingBottom: 100 },
  empty: { flex: 1 },
  emptyInner: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 60 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontSize: 16, color: '#6B7280' },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 8, flexDirection: 'row', alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 1 },
  cardSelected: { backgroundColor: '#EFF6FF', borderWidth: 1.5, borderColor: '#2563EB' },
  checkbox: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: '#D1D5DB', marginRight: 12, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  checkboxSelected: { backgroundColor: '#2563EB', borderColor: '#2563EB' },
  checkmark: { color: '#fff', fontSize: 13, fontWeight: '700' },
  cardLeft: { flex: 1 },
  cardTitle: { fontSize: 16, fontWeight: '600', color: '#111827', marginBottom: 2 },
  cardPayer: { fontSize: 13, color: '#6B7280' },
  cardRight: { alignItems: 'flex-end' },
  cardAmount: { fontSize: 18, fontWeight: '700', color: '#111827' },
  receiptBadge: { fontSize: 16, marginTop: 2 },
  categoryIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#EFF6FF', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  categoryIconText: { fontSize: 18 },
  fab: { position: 'absolute', bottom: 24, right: 24, backgroundColor: '#2563EB', borderRadius: 28, paddingHorizontal: 20, paddingVertical: 14, shadowColor: '#2563EB', shadowOpacity: 0.4, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 6 },
  fabText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
