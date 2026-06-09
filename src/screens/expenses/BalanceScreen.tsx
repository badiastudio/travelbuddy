import React, { useMemo } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator } from 'react-native';
import { RouteProp, useRoute } from '@react-navigation/native';
import { useExpenses } from '../../hooks/useExpenses';
import { useTripStore } from '../../store/tripStore';
import { simplifyDebts, Balance } from '../../lib/debtSimplifier';
import { formatCurrency } from '../../utils/currencyUtils';
import { TripStackParamList } from '../../navigation/types';

type Route = RouteProp<TripStackParamList, 'Balance'>;

export default function BalanceScreen() {
  const route = useRoute<Route>();
  const { tripId } = route.params;
  const { expenses, loading } = useExpenses(tripId);
  const { currentMembers } = useTripStore();

  const { balances, settlements } = useMemo(() => {
    const netMap = new Map<string, number>();
    for (const expense of expenses) {
      const amt = Number(expense.amount);
      netMap.set(expense.paid_by, (netMap.get(expense.paid_by) ?? 0) + amt);
      for (const split of expense.splits ?? []) {
        netMap.set(split.user_id, (netMap.get(split.user_id) ?? 0) - Number(split.share));
      }
    }
    const memberMap = new Map(currentMembers.map((m) => [m.user_id, m.profile?.display_name ?? 'Member']));
    const balances: Balance[] = Array.from(netMap.entries()).map(([userId, amount]) => ({
      userId,
      name: memberMap.get(userId) ?? 'Member',
      amount: Math.round(amount * 100) / 100,
    }));
    return { balances, settlements: simplifyDebts(balances) };
  }, [expenses, currentMembers]);

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#2563EB" /></View>;

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Net Balances</Text>
      {balances.map((b) => (
        <View key={b.userId} style={styles.balanceRow}>
          <Text style={styles.balanceName}>{b.name}</Text>
          <Text style={[styles.balanceAmount, b.amount >= 0 ? styles.positive : styles.negative]}>
            {b.amount >= 0 ? '+' : ''}{formatCurrency(b.amount)}
          </Text>
        </View>
      ))}

      {settlements.length > 0 && (
        <>
          <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Suggested Payments</Text>
          {settlements.map((s, i) => (
            <View key={i} style={styles.settlementRow}>
              <Text style={styles.settlementText}>
                <Text style={styles.settlementName}>{s.fromName}</Text>
                {' owes '}
                <Text style={styles.settlementName}>{s.toName}</Text>
              </Text>
              <Text style={styles.settlementAmount}>{formatCurrency(s.amount)}</Text>
            </View>
          ))}
        </>
      )}

      {balances.length === 0 && (
        <Text style={styles.empty}>No expenses to balance yet.</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', padding: 20 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: '#6B7280', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 12 },
  balanceRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  balanceName: { flex: 1, fontSize: 16, color: '#111827' },
  balanceAmount: { fontSize: 16, fontWeight: '700' },
  positive: { color: '#16A34A' },
  negative: { color: '#DC2626' },
  settlementRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  settlementText: { flex: 1, fontSize: 15, color: '#374151' },
  settlementName: { fontWeight: '600', color: '#111827' },
  settlementAmount: { fontSize: 15, fontWeight: '700', color: '#2563EB' },
  empty: { fontSize: 15, color: '#6B7280', textAlign: 'center', marginTop: 40 },
});
