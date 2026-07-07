import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useExpenses } from '../../hooks/useExpenses';
import { convert, formatCurrencyConverted } from '../../utils/currencyConverter';

interface Props {
  tripId: string;
  budget: number;
  currency: string;
}

export default function BudgetBar({ tripId, budget, currency }: Props) {
  const { expenses } = useExpenses(tripId);

  const spent = expenses.reduce((sum, e) => {
    return sum + convert(e.amount, e.currency, currency);
  }, 0);

  const ratio = budget > 0 ? spent / budget : 0;
  const pct = Math.min(ratio * 100, 100);

  const barColor = ratio >= 1 ? '#EF4444' : ratio >= 0.8 ? '#F59E0B' : '#22C55E';

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <Text style={styles.label}>
          Spent {formatCurrencyConverted(spent, currency)} of {formatCurrencyConverted(budget, currency)} budget
        </Text>
        <Text style={[styles.pctText, { color: barColor }]}>{Math.round(ratio * 100)}%</Text>
      </View>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${pct}%` as any, backgroundColor: barColor }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: '#F9FAFB', paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  label: { fontSize: 13, color: '#374151', fontWeight: '500' },
  pctText: { fontSize: 13, fontWeight: '700' },
  track: { height: 8, backgroundColor: '#E5E7EB', borderRadius: 4, overflow: 'hidden' },
  fill: { height: 8, borderRadius: 4 },
});
