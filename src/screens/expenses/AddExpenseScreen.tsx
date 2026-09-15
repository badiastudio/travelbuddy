import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, StyleSheet, ScrollView, Alert, TouchableOpacity, ActivityIndicator, Platform } from 'react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { convert, formatCurrencyConverted } from '../../utils/currencyConverter';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { createExpense, updateExpense } from '../../api/expenses';
import { fetchMembers } from '../../api/trips';
import { uploadMedia, getSignedUrl } from '../../api/storage';
import { useAuthStore } from '../../store/authStore';
import { TripMember } from '../../types/app.types';
import Button from '../../components/common/Button';
import CategoryPicker from '../../components/common/CategoryPicker';
import { EXPENSE_CATEGORIES } from '../../constants/categories';
import { AppStackParamList, TripStackParamList } from '../../navigation/types';

type Route = RouteProp<TripStackParamList, 'AddExpense'>;
type Nav = StackNavigationProp<AppStackParamList>;

export default function AddExpenseScreen() {
  const nav = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { tripId, expenseId } = route.params;
  const user = useAuthStore((s) => s.user);
  const isEditing = !!expenseId;

  const [members, setMembers] = useState<TripMember[]>([]);
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [paidById, setPaidById] = useState(user?.id ?? '');
  const [splitMemberIds, setSplitMemberIds] = useState<string[]>([]);
  const [category, setCategory] = useState<string | null>(null);
  const [currency, setCurrency] = useState('USD');
  const [loadingMembers, setLoadingMembers] = useState(true);
  const [loading, setLoading] = useState(false);

  const [receiptUri, setReceiptUri] = useState<string | null>(null);
  const [receiptStoragePath, setReceiptStoragePath] = useState<string | null>(null);
  const fileInputRef = useRef<any>(null);
  const [repeatCount, setRepeatCount] = useState(1);

  useEffect(() => {
    fetchMembers(tripId).then((m) => {
      setMembers(m);
      setSplitMemberIds(m.map((member) => member.user_id));
    }).catch(() => {}).finally(() => setLoadingMembers(false));
  }, [tripId]);

  useEffect(() => {
    if (!expenseId) return;
    const { supabase } = require('../../lib/supabase');
    supabase
      .from('expenses')
      .select('*, splits:expense_splits(*)')
      .eq('id', expenseId)
      .single()
      .then(async ({ data }: any) => {
        if (!data) return;
        setTitle(data.title ?? '');
        setAmount(String(data.amount ?? ''));
        setPaidById(data.paid_by ?? '');
        setSplitMemberIds((data.splits ?? []).map((s: any) => s.user_id));
        setCategory(data.category ?? null);
        setCurrency(data.currency ?? 'USD');
        if (data.receipt_url) {
          setReceiptStoragePath(data.receipt_url);
          try {
            const url = await getSignedUrl(data.receipt_url);
            setReceiptUri(url);
          } catch {}
        }
      });
  }, [expenseId]);

  function toggleSplit(userId: string) {
    setSplitMemberIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  }

  async function pickReceiptNative() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.7,
    });
    if (!result.canceled && result.assets[0]) {
      setReceiptUri(result.assets[0].uri);
      setReceiptStoragePath(null);
    }
  }

  function pickReceiptWeb() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e: any) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        setReceiptUri(ev.target?.result as string);
        setReceiptStoragePath(null);
      };
      reader.readAsDataURL(file);
    };
    input.click();
  }

  async function handleSave() {
    const amt = parseFloat(amount);
    if (!title.trim() || isNaN(amt) || amt <= 0) {
      Alert.alert('Please enter a title and valid amount');
      return;
    }
    if (splitMemberIds.length === 0) {
      Alert.alert('Select at least one person to split with');
      return;
    }
    if (!user) { Alert.alert('Not signed in'); return; }

    const share = Math.round((amt / splitMemberIds.length) * 100) / 100;
    const splits = splitMemberIds.map((userId) => ({ userId, share }));

    setLoading(true);
    try {
      let finalReceiptPath = receiptStoragePath;

      if (receiptUri && !receiptStoragePath) {
        const ext = receiptUri.startsWith('data:image/png') ? 'png' : 'jpg';
        const fileName = `receipt_${Date.now()}.${ext}`;
        const mimeType = ext === 'png' ? 'image/png' : 'image/jpeg';
        finalReceiptPath = await uploadMedia(tripId, user.id, receiptUri, fileName, mimeType);
      }

      if (isEditing && expenseId) {
        await updateExpense(
          expenseId,
          { title: title.trim(), amount: amt, currency, paid_by: paidById, category, receipt_url: finalReceiptPath },
          splits
        );
      } else {
        const count = Math.max(1, Math.min(30, repeatCount));
        for (let i = 0; i < count; i++) {
          const suffix = count > 1 ? ` (Day ${i + 1})` : '';
          await createExpense(
            { trip_id: tripId, created_by: user.id, title: title.trim() + suffix, amount: amt, currency, paid_by: paidById, stop_id: null, category, receipt_url: finalReceiptPath },
            splits
          );
        }
      }
      if (nav.canGoBack()) {
        nav.goBack();
      } else {
        nav.navigate('TripDetail', { tripId });
      }
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
    }
  }

  if (loadingMembers) {
    return <View style={styles.center}><ActivityIndicator size="large" color="#2563EB" /></View>;
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.label}>Description *</Text>
      <TextInput style={styles.input} placeholder="e.g. Dinner at Le Jules Verne" value={title} onChangeText={setTitle} />

      <Text style={styles.label}>Category</Text>
      <CategoryPicker categories={EXPENSE_CATEGORIES} value={category} onChange={setCategory} />

      <Text style={styles.label}>Amount *</Text>
      <TextInput style={styles.input} placeholder="0.00" keyboardType="decimal-pad" value={amount} onChangeText={setAmount} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.currencyScroll} contentContainerStyle={styles.currencyScrollContent}>
        {['USD','EUR','GBP','JPY','CAD','AUD','MXN','THB','SGD','AED','CHF','INR','BRL'].map((c) => (
          <TouchableOpacity
            key={c}
            style={[styles.currencyChip, currency === c && styles.currencyChipActive]}
            onPress={() => setCurrency(c)}
          >
            <Text style={[styles.currencyChipText, currency === c && styles.currencyChipTextActive]}>{c}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
      {currency !== 'USD' && amount && !isNaN(parseFloat(amount)) && (
        <Text style={styles.conversionHint}>
          ≈ {formatCurrencyConverted(convert(parseFloat(amount), currency, 'USD'), 'USD')} USD
        </Text>
      )}

      <Text style={styles.label}>Receipt Photo</Text>
      <TouchableOpacity
        style={styles.receiptBox}
        onPress={Platform.OS === 'web' ? pickReceiptWeb : pickReceiptNative}
        activeOpacity={0.8}
      >
        {receiptUri ? (
          <Image source={{ uri: receiptUri }} style={styles.receiptImage} contentFit="cover" />
        ) : (
          <Text style={styles.receiptPlaceholder}>+ Add Receipt</Text>
        )}
      </TouchableOpacity>

      <Text style={styles.label}>Paid By</Text>
      <View style={styles.memberList}>
        {members.map((m) => (
          <TouchableOpacity
            key={m.user_id}
            style={[styles.memberChip, paidById === m.user_id && styles.memberChipSelected]}
            onPress={() => setPaidById(m.user_id)}
          >
            <Text style={[styles.memberChipText, paidById === m.user_id && styles.memberChipTextSelected]}>
              {m.profile?.display_name ?? 'Member'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.label}>Split Between</Text>
      <View style={styles.memberList}>
        {members.map((m) => {
          const selected = splitMemberIds.includes(m.user_id);
          return (
            <TouchableOpacity
              key={m.user_id}
              style={[styles.memberChip, selected && styles.memberChipSelected]}
              onPress={() => toggleSplit(m.user_id)}
            >
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

      {!isEditing && (
        <>
          <Text style={styles.label}>Repeat for multiple days?</Text>
          <Text style={styles.repeatHint}>Great for hotels, daily meals, or recurring costs.</Text>
          <View style={styles.repeatRow}>
            <TouchableOpacity
              style={[styles.repeatBtn, repeatCount <= 1 && styles.repeatBtnDisabled]}
              onPress={() => setRepeatCount(Math.max(1, repeatCount - 1))}
              disabled={repeatCount <= 1}
            >
              <Text style={styles.repeatBtnText}>−</Text>
            </TouchableOpacity>
            <View style={styles.repeatCountBox}>
              <Text style={styles.repeatCountText}>{repeatCount}</Text>
              <Text style={styles.repeatCountLabel}>{repeatCount === 1 ? 'day' : 'days'}</Text>
            </View>
            <TouchableOpacity
              style={styles.repeatBtn}
              onPress={() => setRepeatCount(Math.min(30, repeatCount + 1))}
            >
              <Text style={styles.repeatBtnText}>+</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.presetsRow}>
            {[1, 3, 5, 7, 14].map((n) => (
              <TouchableOpacity
                key={n}
                style={[styles.presetChip, repeatCount === n && styles.presetChipActive]}
                onPress={() => setRepeatCount(n)}
              >
                <Text style={[styles.presetChipText, repeatCount === n && styles.presetChipTextActive]}>
                  {n === 1 ? 'Once' : `${n}x`}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          {repeatCount > 1 && amount && !isNaN(parseFloat(amount)) && (
            <Text style={styles.repeatTotal}>
              Total: ${(parseFloat(amount) * repeatCount).toFixed(2)} ({repeatCount} entries)
            </Text>
          )}
        </>
      )}

      <Button
        title={isEditing ? 'Save Changes' : repeatCount > 1 ? `Add ${repeatCount} Expenses` : 'Add Expense'}
        onPress={handleSave}
        loading={loading}
        style={styles.addBtn}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: 20, paddingBottom: 60 },
  label: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 8, marginTop: 16 },
  input: { borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 10, padding: 14, fontSize: 16, backgroundColor: '#F9FAFB' },
  receiptBox: { borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 12, height: 140, backgroundColor: '#F9FAFB', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  receiptImage: { width: '100%', height: '100%' },
  receiptPlaceholder: { fontSize: 15, color: '#9CA3AF', fontWeight: '500' },
  memberList: { flexDirection: 'row', flexWrap: 'wrap' },
  memberChip: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: '#D1D5DB', borderRadius: 24, paddingHorizontal: 12, paddingVertical: 6, backgroundColor: '#F9FAFB', margin: 4 },
  memberChipSelected: { borderColor: '#2563EB', backgroundColor: '#EFF6FF' },
  memberChipText: { fontSize: 14, color: '#374151', fontWeight: '500' },
  memberChipTextSelected: { color: '#1E40AF', fontWeight: '600' },
  check: { fontSize: 12, color: '#2563EB', fontWeight: '700' },
  splitPreview: { marginTop: 12, fontSize: 14, color: '#2563EB', fontWeight: '600' },
  addBtn: { marginTop: 32 },
  currencyScroll: { marginTop: 10 },
  currencyScrollContent: { flexDirection: 'row', gap: 8, paddingRight: 8 },
  currencyChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, borderWidth: 1.5, borderColor: '#D1D5DB', backgroundColor: '#F9FAFB' },
  currencyChipActive: { borderColor: '#2563EB', backgroundColor: '#EFF6FF' },
  currencyChipText: { fontSize: 13, fontWeight: '600', color: '#374151' },
  currencyChipTextActive: { color: '#2563EB' },
  conversionHint: { marginTop: 6, fontSize: 13, color: '#6B7280', fontWeight: '500' },
  repeatHint: { fontSize: 12, color: '#6B7280', marginBottom: 12 },
  repeatRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 20, marginTop: 4, marginBottom: 12 },
  repeatBtn: { width: 44, height: 44, borderRadius: 22, borderWidth: 2, borderColor: '#2563EB', alignItems: 'center', justifyContent: 'center', backgroundColor: '#EFF6FF' },
  repeatBtnDisabled: { borderColor: '#D1D5DB', backgroundColor: '#F3F4F6' },
  repeatBtnText: { fontSize: 22, color: '#2563EB', fontWeight: '700' },
  repeatCountBox: { alignItems: 'center', minWidth: 80 },
  repeatCountText: { fontSize: 32, fontWeight: '800', color: '#111827' },
  repeatCountLabel: { fontSize: 12, color: '#6B7280', textTransform: 'uppercase', fontWeight: '600', letterSpacing: 0.5 },
  presetsRow: { flexDirection: 'row', gap: 8, justifyContent: 'center', flexWrap: 'wrap' },
  presetChip: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 14, borderWidth: 1.5, borderColor: '#D1D5DB', backgroundColor: '#F9FAFB' },
  presetChipActive: { borderColor: '#2563EB', backgroundColor: '#EFF6FF' },
  presetChipText: { fontSize: 13, fontWeight: '600', color: '#6B7280' },
  presetChipTextActive: { color: '#2563EB' },
  repeatTotal: { marginTop: 12, fontSize: 14, color: '#2563EB', fontWeight: '700', textAlign: 'center' },
});
