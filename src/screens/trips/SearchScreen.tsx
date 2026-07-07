import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, TextInput, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { AppStackParamList, TripStackParamList } from '../../navigation/types';
import { fetchStops } from '../../api/itinerary';
import { fetchExpenses } from '../../api/expenses';
import { Stop, Expense } from '../../types/app.types';
import { getCategoryIcon, STOP_CATEGORIES, EXPENSE_CATEGORIES } from '../../constants/categories';
import { formatCurrency } from '../../utils/currencyUtils';

type Route = RouteProp<TripStackParamList, 'SearchTrip'>;
type Nav = StackNavigationProp<AppStackParamList>;

export default function SearchScreen() {
  const route = useRoute<Route>();
  const nav = useNavigation<Nav>();
  const { tripId } = route.params;

  const [query, setQuery] = useState('');
  const [stops, setStops] = useState<Stop[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [s, e] = await Promise.all([fetchStops(tripId), fetchExpenses(tripId)]);
        setStops(s);
        setExpenses(e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [tripId]);

  const q = query.trim().toLowerCase();

  const filteredStops = useMemo(() => {
    if (!q) return [];
    return stops.filter(
      (s) =>
        s.title?.toLowerCase().includes(q) ||
        s.location_name?.toLowerCase().includes(q)
    );
  }, [stops, q]);

  const filteredExpenses = useMemo(() => {
    if (!q) return [];
    return expenses.filter((e) => e.title?.toLowerCase().includes(q));
  }, [expenses, q]);

  const hasResults = filteredStops.length > 0 || filteredExpenses.length > 0;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => nav.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>‹</Text>
        </TouchableOpacity>
        <TextInput
          style={styles.searchInput}
          placeholder="Search stops and expenses"
          placeholderTextColor="#9CA3AF"
          value={query}
          onChangeText={setQuery}
          autoFocus
          returnKeyType="search"
        />
      </View>

      {loading ? (
        <ActivityIndicator style={styles.loader} color="#2563EB" />
      ) : !q ? (
        <View style={styles.hint}>
          <Text style={styles.hintText}>Search stops and expenses</Text>
        </View>
      ) : !hasResults ? (
        <View style={styles.hint}>
          <Text style={styles.hintText}>No results for '{query}'</Text>
        </View>
      ) : (
        <FlatList
          data={[]}
          renderItem={null}
          ListHeaderComponent={
            <>
              {filteredStops.length > 0 && (
                <View>
                  <Text style={styles.sectionHeader}>Stops</Text>
                  {filteredStops.map((item) => (
                    <TouchableOpacity
                      key={item.id}
                      style={styles.resultCard}
                      onPress={() => nav.navigate('AddStop', { tripId, stopId: item.id })}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.resultIcon}>
                        {getCategoryIcon(item.category ?? null, STOP_CATEGORIES)}
                      </Text>
                      <View style={styles.resultText}>
                        <Text style={styles.resultTitle} numberOfLines={1}>{item.title}</Text>
                        {item.location_name ? (
                          <Text style={styles.resultSubtitle} numberOfLines={1}>{item.location_name}</Text>
                        ) : null}
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
              {filteredExpenses.length > 0 && (
                <View>
                  <Text style={styles.sectionHeader}>Expenses</Text>
                  {filteredExpenses.map((item) => (
                    <TouchableOpacity
                      key={item.id}
                      style={styles.resultCard}
                      onPress={() => nav.navigate('AddExpense', { tripId, expenseId: item.id })}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.resultIcon}>
                        {getCategoryIcon(item.category ?? null, EXPENSE_CATEGORIES)}
                      </Text>
                      <View style={styles.resultText}>
                        <Text style={styles.resultTitle} numberOfLines={1}>{item.title}</Text>
                        <Text style={styles.resultSubtitle}>
                          {formatCurrency(item.amount, item.currency ?? 'USD')}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </>
          }
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.listContent}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E5E7EB', gap: 8 },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  backText: { fontSize: 28, color: '#2563EB', lineHeight: 32 },
  searchInput: { flex: 1, height: 40, backgroundColor: '#F3F4F6', borderRadius: 10, paddingHorizontal: 14, fontSize: 16, color: '#111827' },
  loader: { marginTop: 40 },
  hint: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  hintText: { fontSize: 16, color: '#9CA3AF' },
  listContent: { paddingBottom: 32 },
  sectionHeader: { fontSize: 13, fontWeight: '700', color: '#6B7280', paddingHorizontal: 16, paddingTop: 20, paddingBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
  resultCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', marginHorizontal: 16, marginVertical: 4, borderRadius: 12, padding: 14, gap: 12, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, shadowOffset: { width: 0, height: 1 }, elevation: 1 },
  resultIcon: { fontSize: 24 },
  resultText: { flex: 1 },
  resultTitle: { fontSize: 15, fontWeight: '600', color: '#111827' },
  resultSubtitle: { fontSize: 13, color: '#6B7280', marginTop: 2 },
});
