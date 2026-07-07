import React, { useMemo } from 'react';
import { View, StyleSheet, Text } from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import { MaterialTopTabScreenProps } from '@react-navigation/material-top-tabs';
import { useItinerary } from '../../hooks/useItinerary';
import { TripTabParamList } from '../../navigation/types';

type Props = MaterialTopTabScreenProps<TripTabParamList, 'Map'>;

export default function MapViewScreen({ route }: Props) {
  const { tripId } = route.params;
  const { stops, loading } = useItinerary(tripId);

  const stopsWithCoords = useMemo(
    () => stops
      .filter((s) => s.lat !== null && s.lng !== null)
      .sort((a, b) => {
        if (a.day_index !== b.day_index) return (a.day_index ?? 0) - (b.day_index ?? 0);
        if (a.start_time && b.start_time) return new Date(a.start_time).getTime() - new Date(b.start_time).getTime();
        if (a.start_time) return -1;
        if (b.start_time) return 1;
        return a.sort_order - b.sort_order;
      }),
    [stops]
  );

  const region = useMemo(() => {
    if (stopsWithCoords.length === 0) return undefined;
    const lats = stopsWithCoords.map((s) => s.lat!);
    const lngs = stopsWithCoords.map((s) => s.lng!);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);
    return {
      latitude: (minLat + maxLat) / 2,
      longitude: (minLng + maxLng) / 2,
      latitudeDelta: Math.max(maxLat - minLat, 0.05) * 1.4,
      longitudeDelta: Math.max(maxLng - minLng, 0.05) * 1.4,
    };
  }, [stopsWithCoords]);

  if (stopsWithCoords.length === 0 && !loading) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyIcon}>🗺️</Text>
        <Text style={styles.emptyText}>Add stops with locations to see them on the map</Text>
      </View>
    );
  }

  return (
    <MapView
      style={styles.map}
      region={region}
      showsUserLocation
    >
      {stopsWithCoords.map((stop, index) => (
        <Marker
          key={stop.id}
          coordinate={{ latitude: stop.lat!, longitude: stop.lng! }}
          title={stop.title}
          description={stop.location_name ?? undefined}
        >
          <View style={styles.markerContainer}>
            <View style={styles.markerBubble}>
              <Text style={styles.markerNumber}>{index + 1}</Text>
            </View>
            <View style={styles.markerTail} />
          </View>
        </Marker>
      ))}
      {stopsWithCoords.length > 1 && (
        <Polyline
          coordinates={stopsWithCoords.map((s) => ({ latitude: s.lat!, longitude: s.lng! }))}
          strokeColor="#2563EB"
          strokeWidth={2}
          lineDashPattern={[8, 4]}
        />
      )}
    </MapView>
  );
}

const styles = StyleSheet.create({
  map: { flex: 1 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40, backgroundColor: '#F9FAFB' },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontSize: 15, color: '#6B7280', textAlign: 'center' },
  markerContainer: { alignItems: 'center' },
  markerBubble: { backgroundColor: '#2563EB', borderRadius: 16, width: 32, height: 32, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#fff' },
  markerNumber: { color: '#fff', fontWeight: '700', fontSize: 13 },
  markerTail: { width: 0, height: 0, borderLeftWidth: 5, borderRightWidth: 5, borderTopWidth: 8, borderLeftColor: 'transparent', borderRightColor: 'transparent', borderTopColor: '#2563EB' },
});
