import React, { useMemo, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { MaterialTopTabScreenProps } from '@react-navigation/material-top-tabs';
import { useItinerary } from '../../hooks/useItinerary';
import { getCategoryIcon, STOP_CATEGORIES } from '../../constants/categories';
import { TripTabParamList } from '../../navigation/types';

type Props = MaterialTopTabScreenProps<TripTabParamList, 'Map'>;

export default function MapViewScreen({ route }: Props) {
  const { tripId } = route.params;
  const { stops } = useItinerary(tripId);
  const mapRef = useRef<MapView | null>(null);

  const pinnedStops = useMemo(
    () => stops.filter((s) => s.lat !== null && s.lng !== null),
    [stops],
  );

  const initialRegion = useMemo(() => {
    if (pinnedStops.length === 0) {
      return { latitude: 40.7128, longitude: -74.006, latitudeDelta: 20, longitudeDelta: 20 };
    }
    const lats = pinnedStops.map((s) => s.lat!);
    const lngs = pinnedStops.map((s) => s.lng!);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);
    return {
      latitude: (minLat + maxLat) / 2,
      longitude: (minLng + maxLng) / 2,
      latitudeDelta: Math.max(0.05, (maxLat - minLat) * 1.5),
      longitudeDelta: Math.max(0.05, (maxLng - minLng) * 1.5),
    };
  }, [pinnedStops]);

  useEffect(() => {
    if (mapRef.current && pinnedStops.length > 1) {
      mapRef.current.fitToCoordinates(
        pinnedStops.map((s) => ({ latitude: s.lat!, longitude: s.lng! })),
        { edgePadding: { top: 60, right: 60, bottom: 60, left: 60 }, animated: true },
      );
    }
  }, [pinnedStops]);

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
        initialRegion={initialRegion}
      >
        {pinnedStops.map((stop) => (
          <Marker
            key={stop.id}
            coordinate={{ latitude: stop.lat!, longitude: stop.lng! }}
            title={stop.title}
            description={stop.location_name ?? undefined}
          />
        ))}
      </MapView>
      {pinnedStops.length === 0 && (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>📍</Text>
          <Text style={styles.emptyText}>No pinned stops yet</Text>
          <Text style={styles.emptySubtext}>Add a stop with a location to see it on the map</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },
  empty: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(249,250,251,0.95)' },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontSize: 16, fontWeight: '600', color: '#111827', marginBottom: 6 },
  emptySubtext: { fontSize: 13, color: '#6B7280', textAlign: 'center', paddingHorizontal: 40 },
});
