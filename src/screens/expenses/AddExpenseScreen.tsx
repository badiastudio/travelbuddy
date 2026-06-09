import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, ScrollView, Alert, TouchableOpacity } from 'react-native';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { createExpense } from '../../api/expenses';
import { useAuthStore } from '../../store/authStore';
import { useTripStore } from '../../store/tripStore';
import Button from '../../components/common/Button';
import Avatar from '../../components/common/Avatar';
import { TripStackParamList } from '../../navigation/types';

type Route = RouteProp<TripStackParamList, 'AddExpense'>;
type Nav = StackNavigationProp<TripStackParamList>;

export default function AddExpenseScreen() {
  const nav = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { tripId } = route.params;
  const user = useAuthStore((s) => s.user);
  const { currentMembers } = useTripStore();

  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [paidById, setPaidById] = useState(user?.id ?? '');
  const [splitMemberIds, setSplitMemberIds] = useState<string[]>(currentMembers.map((m) => m.user_id));
  const [loading, setLoading] = useState(false);

  function toggleSplit(userId: string) {
    setSplitMemberIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  }

  async function handleAdd() {
    const amt = parseFloat(amount);
    if (!title.trim() || isNaN(amt) || amt <= 0) {
      Alert.alert('Please enter a title and valid amount');
      return;
    }
    if (splitMemberIds.length === 0) {
      Alert.alert('Select at least one person to split with');
      return;
    }
    if (!user) return;

    const share = Math.round((amt / splitMemberIds.length) * 100) / 100;
    const splits = splitMemberIds.map((userId) => ({ userId, share }));

    setLoading(true);
    try {
      await createExpense(
        { trip_id: tripId, created_by: user.id, title: title.trim(), amount: amt, currency: 'USD', paid_by: paidById, stop_id: null },
        splits
      );
      nav.goBack();
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.label}>Description *</Text>
      <TextInput style={styles.input} placeholder="e.g. Dinner at Le Jules Verne" value={title} onChangeText={setTitle} />

      <Text style={styles.label}>Amount (USD) *</Text>
      <TextInput style={styles.input} placeholder="0.00" keyboardType="decimal-pad" value={amount} onChangeText={setAmount} />

      <Text style={styles.label}>Paid By</Text>
      <View style={styles.memberList}>
        {currentMembers.map((m) => (
          <TouchableOpacity
            key={m.user_id}
            style={[styles.memberChip, paidById === m.user_id && styles.memberChipSelected]}
            onPress={() => setPaidById(m.user_id)}
          >
            <Avatar uri={m.profile?.avatar_url} name={m.profile?.display_name} size={28} />
            <Text style={[styles.memberChipText, paidById === m.user_id && styles.memberChipTextSelected]}>
              {m.profile?.display_name ?? 'Member'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.label}>Split Between</Text>
      <View style={styles.memberList}>
        {currentMembers.map((m) => {
          const selected = splitMemberIds.includes(m.user_id);
          return (
            <TouchableOpacity
              key={m.user_id}
              style={[styles.memberChip, selected && styles.memberChipSelected]}
              onPress={() => toggleSplit(m.user_id)}
            >
              <Avatar uri={m.profile?.avatar_url} name={m.profile?.display_name} size={28} />
              <Text style={[styles.memberChipText, selected && styles.memberChipTextSelected]}>
                {m.profile?.display_name ?? 'Member'}
              </Text>
              {selected && <Text style={styles.check}>✓</Text>}
            </TouchableOpacity>
          );
        })}
      </View>

      {splitMemberIds.length > 0 && amount && !isNaN(parseFloat(amount)) && (
        <Text style={styles.splitPreview}>
          Each person owes: ${(parseFloat(amount) / splitMemberIds.length).toFixed(2)}
        </Text>
      )}

      <Button title="Add Expense" onPress={handleAdd} loading={loading} style={styles.addBtn} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 20, paddingBottom: 60 },
  label: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 8, marginTop: 16 },
  input: { borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 10, padding: 14, fontSize: 16, backgroundColor: '#F9FAFB' },
  memberList: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  memberChip: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1.5, borderColor: '#D1D5DB', borderRadius: 24, paddingHorizontal: 12, paddingVertical: 6, backgroundColor: '#F9FAFB' },
  memberChipSelected: { borderColor: '#2563EB', backgroundColor: '#EFF6FF' },
  memberChipText: { fontSize: 14, color: '#374151', fontWeight: '500' },
  memberChipTextSelected: { color: '#1E40AF', fontWeight: '600' },
  check: { fontSize: 12, color: '#2563EB', fontWeight: '700' },
  splitPreview: { marginTop: 12, fontSize: 14, color: '#2563EB', fontWeight: '600' },
  addBtn: { marginTop: 32 },
});
