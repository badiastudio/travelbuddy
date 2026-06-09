import React, { useMemo } from 'react';
import { View, Text, SectionList, StyleSheet, TouchableOpacity, RefreshControl, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { MaterialTopTabScreenProps } from '@react-navigation/material-top-tabs';
import { useItinerary } from '../../hooks/useItinerary';
import { deleteStop } from '../../api/itinerary';
import { Stop } from '../../types/app.types';
import { getDayLabel, formatTime } from '../../utils/dateUtils';
import { useTripStore } from '../../store/tripStore';
import { TripStackParamList, TripTabParamList } from '../../navigation/types';

type Props = MaterialTopTabScreenProps<TripTabParamList, 'Itinerary'>;
type Nav = StackNavigationProp<TripStackParamList>;

export default function ItineraryScreen({ route }: Props) {
  const { tripId } = route.params;
  const nav = useNavigation<Nav>();
  const trip = useTripStore((s) => s.currentTrip);
  const { stops, loading, reload } = useItinerary(tripId);

  const sections = useMemo(() => {
    const map = new Map<number, Stop[]>();
    for (const stop of stops) {
      const day = stop.day_index ?? 0;
      if (!map.has(day)) map.set(day, []);
      map.get(day)!.push(stop);
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => a - b)
      .map(([day, data]) => ({
        title: getDayLabel(trip?.start_date ?? null, day),
        data,
      }));
  }, [stops, trip]);

  async function handleDeleteStop(stopId: string) {
    Alert.alert('Delete stop?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => { await deleteStop(stopId); reload(); } },
    ]);
  }

  return (
    <View style={styles.container}>
      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={reload} />}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>📍</Text>
              <Text style={styles.emptyText}>No stops yet</Text>
            </View>
          ) : null
        }
        renderSectionHeader={({ section }) => (
          <Text style={styles.sectionHeader}>{section.title}</Text>
        )}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.stopCard}
            onLongPress={() => handleDeleteStop(item.id)}
            activeOpacity={0.8}
          >
            <View style={styles.stopDot} />
            <View style={styles.stopBody}>
              <Text style={styles.stopTitle}>{item.title}</Text>
              {item.location_name ? <Text style={styles.stopMeta}>📍 {item.location_name}</Text> : null}
              {item.start_time ? <Text style={styles.stopMeta}>🕐 {formatTime(item.start_time)}{item.end_time ? ` – ${formatTime(item.end_time)}` : ''}</Text> : null}
              {item.notes ? <Text style={styles.stopNotes}>{item.notes}</Text> : null}
            </View>
          </TouchableOpacity>
        )}
      />
      <TouchableOpacity style={styles.fab} onPress={() => nav.navigate('AddStop', { tripId })}>
        <Text style={styles.fabText}>+ Add Stop</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  list: { padding: 16, paddingBottom: 100 },
  sectionHeader: { fontSize: 13, fontWeight: '700', color: '#6B7280', textTransform: 'uppercase', letterSpacing: 0.8, marginTop: 16, marginBottom: 8 },
  stopCard: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 8, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 1 },
  stopDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#2563EB', marginTop: 6, marginRight: 12, flexShrink: 0 },
  stopBody: { flex: 1 },
  stopTitle: { fontSize: 16, fontWeight: '600', color: '#111827', marginBottom: 4 },
  stopMeta: { fontSize: 13, color: '#6B7280', marginBottom: 2 },
  stopNotes: { fontSize: 13, color: '#374151', marginTop: 4, fontStyle: 'italic' },
  empty: { alignItems: 'center', paddingTop: 80 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontSize: 16, color: '#6B7280' },
  fab: { position: 'absolute', bottom: 24, right: 24, backgroundColor: '#2563EB', borderRadius: 28, paddingHorizontal: 20, paddingVertical: 14, shadowColor: '#2563EB', shadowOpacity: 0.4, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 6 },
  fabText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
