import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl, Alert, ActivityIndicator } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Image } from 'expo-image';
import { fetchTrips, duplicateTrip } from '../../api/trips';
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
  const [duplicating, setDuplicating] = useState(false);

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

  useFocusEffect(useCallback(() => { load(); }, [load]));

  function openTrip(tripId: string) {
    nav.navigate('TripDetail', { tripId });
  }

  function handleLongPress(item: Trip) {
    Alert.alert(item.title, undefined, [
      {
        text: 'Duplicate',
        onPress: async () => {
          if (!user) return;
          setDuplicating(true);
          try {
            await duplicateTrip(item.id, user.id);
            await load();
          } catch (e: any) {
            Alert.alert('Error', e.message);
          } finally {
            setDuplicating(false);
          }
        },
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }

  return (
    <View style={styles.container}>
      {duplicating && (
        <View style={styles.duplicatingOverlay}>
          <ActivityIndicator color="#2563EB" />
          <Text style={styles.duplicatingText}>Duplicating trip…</Text>
        </View>
      )}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Trips</Text>
        <TouchableOpacity
          style={styles.newBtn}
          onPress={() => nav.navigate('TripDetail', { tripId: 'new' })}
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
          <TouchableOpacity style={styles.card} onPress={() => openTrip(item.id)} onLongPress={() => handleLongPress(item)} activeOpacity={0.8}>
            <View style={styles.cover}>
              {item.cover_image_url ? (
                <Image source={{ uri: item.cover_image_url }} style={StyleSheet.absoluteFill} contentFit="cover" />
              ) : (
                <View style={[StyleSheet.absoluteFill, styles.coverFallback]} />
              )}
              <View style={styles.overlay} />
              <View style={styles.cardOverlayBody}>
                <View style={styles.cardRow}>
                  <View style={styles.cardTextBlock}>
                    <Text style={styles.cardTitle} numberOfLines={1}>{item.title}</Text>
                    {item.description ? (
                      <Text style={styles.cardDescription} numberOfLines={2}>{item.description}</Text>
                    ) : null}
                    {(item.start_date || item.end_date) && (
                      <Text style={styles.cardDates}>
                        📅 {formatTripDate(item.start_date)}{item.end_date ? ` – ${formatTripDate(item.end_date)}` : ''}
                      </Text>
                    )}
                  </View>
                  {!item.cover_image_url && (
                    <Text style={styles.coverIcon}>{item.cover_icon ?? '✈️'}</Text>
                  )}
                </View>
              </View>
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
  card: { borderRadius: 14, overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 3 },
  cover: { width: '100%', height: 140, justifyContent: 'flex-end' },
  coverFallback: { backgroundColor: '#1E3A5F' },
  coverIcon: { fontSize: 52, marginLeft: 12 },
  overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.38)' },
  cardOverlayBody: { padding: 14 },
  cardRow: { flexDirection: 'row', alignItems: 'center' },
  cardTextBlock: { flex: 1 },
  cardTitle: { fontSize: 18, fontWeight: '800', color: '#fff', marginBottom: 2 },
  cardDescription: { fontSize: 13, color: 'rgba(255,255,255,0.85)', marginBottom: 4, lineHeight: 18 },
  cardDates: { fontSize: 12, color: 'rgba(255,255,255,0.75)' },
  duplicatingOverlay: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: 'rgba(255,255,255,0.95)', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  duplicatingText: { fontSize: 14, color: '#2563EB', fontWeight: '600' },
});
