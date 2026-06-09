import React from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, RefreshControl } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { MaterialTopTabScreenProps } from '@react-navigation/material-top-tabs';
import { useExpenses } from '../../hooks/useExpenses';
import { formatCurrency } from '../../utils/currencyUtils';
import { TripStackParamList, TripTabParamList } from '../../navigation/types';

type Props = MaterialTopTabScreenProps<TripTabParamList, 'Expenses'>;
type Nav = StackNavigationProp<TripStackParamList>;

export default function ExpensesScreen({ route }: Props) {
  const { tripId } = route.params;
  const nav = useNavigation<Nav>();
  const { expenses, loading, reload } = useExpenses(tripId);

  const total = expenses.reduce((sum, e) => sum + Number(e.amount), 0);

  return (
    <View style={styles.container}>
      {expenses.length > 0 && (
        <View style={styles.totalBar}>
          <Text style={styles.totalLabel}>Total Spent</Text>
          <Text style={styles.totalAmount}>{formatCurrency(total)}</Text>
          <TouchableOpacity onPress={() => nav.navigate('Balance', { tripId })}>
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
          <View style={styles.card}>
            <View style={styles.cardLeft}>
              <Text style={styles.cardTitle}>{item.title}</Text>
              <Text style={styles.cardPayer}>Paid by {item.payer?.display_name ?? 'Unknown'}</Text>
            </View>
            <Text style={styles.cardAmount}>{formatCurrency(Number(item.amount), item.currency)}</Text>
          </View>
        )}
      />
      <TouchableOpacity style={styles.fab} onPress={() => nav.navigate('AddExpense', { tripId })}>
        <Text style={styles.fabText}>+ Add Expense</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  totalBar: { backgroundColor: '#EFF6FF', padding: 16, flexDirection: 'row', alignItems: 'center', gap: 8 },
  totalLabel: { fontSize: 14, color: '#374151', flex: 1 },
  totalAmount: { fontSize: 18, fontWeight: '700', color: '#1E40AF' },
  balanceLink: { fontSize: 14, color: '#2563EB', fontWeight: '600' },
  list: { padding: 16, paddingBottom: 100 },
  empty: { flex: 1 },
  emptyInner: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 60 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontSize: 16, color: '#6B7280' },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 8, flexDirection: 'row', alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 1 },
  cardLeft: { flex: 1 },
  cardTitle: { fontSize: 16, fontWeight: '600', color: '#111827', marginBottom: 2 },
  cardPayer: { fontSize: 13, color: '#6B7280' },
  cardAmount: { fontSize: 18, fontWeight: '700', color: '#111827' },
  fab: { position: 'absolute', bottom: 24, right: 24, backgroundColor: '#2563EB', borderRadius: 28, paddingHorizontal: 20, paddingVertical: 14, shadowColor: '#2563EB', shadowOpacity: 0.4, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 6 },
  fabText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
