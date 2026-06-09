import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Image } from 'expo-image';
import { fetchTrips } from '../../api/trips';
import { useAuthStore } from '../../store/authStore';
import { Trip } from '../../types/app.types';
import { formatTripDate } from '../../utils/dateUtils';
import { AppStackParamList } from '../../navigation/types';

type Nav = StackNavigationProp<AppStackParamList>;

export default function TripsListScreen() {
  const nav = useNavigation<Nav>();
  const user = useAuthStore((s) => s.user);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await fetchTrips(user.id);
      setTrips(data);
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { load(); }, []);

  function openTrip(tripId: string) {
    nav.navigate('TripStack', { screen: 'TripDetail', params: { tripId } });
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Trips</Text>
        <TouchableOpacity
          style={styles.newBtn}
          onPress={() => nav.navigate('TripStack', { screen: 'TripDetail', params: { tripId: 'new' } })}
        >
          <Text style={styles.newBtnText}>+ New</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={trips}
        keyExtractor={(t) => t.id}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
        contentContainerStyle={trips.length === 0 ? styles.empty : styles.list}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyInner}>
              <Text style={styles.emptyIcon}>🗺️</Text>
              <Text style={styles.emptyText}>No trips yet</Text>
              <Text style={styles.emptySubtext}>Create your first trip to get started!</Text>
            </View>
          ) : null
        }
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.card} onPress={() => openTrip(item.id)} activeOpacity={0.8}>
            {item.cover_image_url ? (
              <Image source={{ uri: item.cover_image_url }} style={styles.cover} contentFit="cover" />
            ) : (
              <View style={[styles.cover, styles.coverFallback]}>
                <Text style={styles.coverIcon}>✈️</Text>
              </View>
            )}
            <View style={styles.cardBody}>
              <Text style={styles.cardTitle} numberOfLines={1}>{item.title}</Text>
              {(item.start_date || item.end_date) && (
                <Text style={styles.cardDates}>
                  {formatTripDate(item.start_date)} {item.end_date ? `– ${formatTripDate(item.end_date)}` : ''}
                </Text>
              )}
            </View>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 60, paddingBottom: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  headerTitle: { fontSize: 24, fontWeight: '700', color: '#111827' },
  newBtn: { backgroundColor: '#2563EB', borderRadius: 8, paddingHorizontal: 16, paddingVertical: 8 },
  newBtnText: { color: '#fff', fontWeight: '600', fontSize: 15 },
  list: { padding: 16, gap: 12 },
  empty: { flex: 1 },
  emptyInner: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  emptyIcon: { fontSize: 64, marginBottom: 16 },
  emptyText: { fontSize: 20, fontWeight: '700', color: '#111827', marginBottom: 8 },
  emptySubtext: { fontSize: 15, color: '#6B7280', textAlign: 'center' },
  card: { backgroundColor: '#fff', borderRadius: 14, overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  cover: { width: '100%', height: 160 },
  coverFallback: { backgroundColor: '#DBEAFE', alignItems: 'center', justifyContent: 'center' },
  coverIcon: { fontSize: 48 },
  cardBody: { padding: 16 },
  cardTitle: { fontSize: 18, fontWeight: '700', color: '#111827', marginBottom: 4 },
  cardDates: { fontSize: 14, color: '#6B7280' },
});
