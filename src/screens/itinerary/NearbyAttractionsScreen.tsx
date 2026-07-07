import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Linking,
  ActivityIndicator,
  Image,
  ScrollView,
} from 'react-native';
import { RouteProp, useRoute } from '@react-navigation/native';
import { TripStackParamList } from '../../navigation/types';

type Route = RouteProp<TripStackParamList, 'NearbyAttractions'>;

const GOOGLE_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ?? '';

type PlaceType = 'tourist_attraction' | 'restaurant' | 'lodging' | 'shopping_mall';

const FILTERS: { label: string; type: PlaceType }[] = [
  { label: '🏛️ Attractions', type: 'tourist_attraction' },
  { label: '🍽️ Restaurants', type: 'restaurant' },
  { label: '🏨 Hotels', type: 'lodging' },
  { label: '🛍️ Shopping', type: 'shopping_mall' },
];

interface Place {
  place_id: string;
  name: string;
  vicinity: string;
  rating?: number;
  photos?: { photo_reference: string }[];
}

function getPhotoUrl(photoRef: string): string {
  return `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${photoRef}&key=${GOOGLE_KEY}`;
}

export default function NearbyAttractionsScreen() {
  const route = useRoute<Route>();
  const { lat, lng, name } = route.params;

  const [activeType, setActiveType] = useState<PlaceType>('tourist_attraction');
  const [places, setPlaces] = useState<Place[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPlaces = useCallback(async (type: PlaceType) => {
    setLoading(true);
    setError(null);
    try {
      const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=1000&type=${type}&key=${GOOGLE_KEY}`;
      const res = await fetch(url);
      const json = await res.json();
      if (json.status === 'OK' || json.status === 'ZERO_RESULTS') {
        setPlaces(json.results ?? []);
      } else {
        setError(json.error_message ?? `API error: ${json.status}`);
        setPlaces([]);
      }
    } catch (e: any) {
      setError(e.message ?? 'Network error');
      setPlaces([]);
    } finally {
      setLoading(false);
    }
  }, [lat, lng]);

  useEffect(() => {
    fetchPlaces(activeType);
  }, [activeType, fetchPlaces]);

  function handleTypeChange(type: PlaceType) {
    setActiveType(type);
  }

  function openInMaps(item: Place) {
    Linking.openURL(
      `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(item.name)}&query_place_id=${item.place_id}`
    );
  }

  function renderStars(rating: number) {
    const full = Math.round(rating);
    return '⭐'.repeat(full);
  }

  return (
    <View style={styles.container}>
      <Text style={styles.subtitle}>Near {name}</Text>

      {/* Type filter row */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterRow}
        contentContainerStyle={styles.filterContent}
      >
        {FILTERS.map((f) => (
          <TouchableOpacity
            key={f.type}
            style={[styles.filterChip, activeType === f.type && styles.filterChipActive]}
            onPress={() => handleTypeChange(f.type)}
          >
            <Text style={[styles.filterChipText, activeType === f.type && styles.filterChipTextActive]}>
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {loading && (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#2563EB" />
        </View>
      )}

      {!loading && error && (
        <View style={styles.centered}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {!loading && !error && (
        <FlatList
          data={places}
          keyExtractor={(item) => item.place_id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.centered}>
              <Text style={styles.emptyText}>No results found nearby.</Text>
            </View>
          }
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.card} onPress={() => openInMaps(item)} activeOpacity={0.8}>
              {item.photos?.[0] && (
                <Image
                  source={{ uri: getPhotoUrl(item.photos[0].photo_reference) }}
                  style={styles.photo}
                  resizeMode="cover"
                />
              )}
              <View style={styles.cardBody}>
                <Text style={styles.placeName}>{item.name}</Text>
                {item.vicinity ? <Text style={styles.vicinity}>📍 {item.vicinity}</Text> : null}
                {item.rating != null ? (
                  <Text style={styles.rating}>
                    {renderStars(item.rating)} {item.rating.toFixed(1)}
                  </Text>
                ) : null}
              </View>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  subtitle: { fontSize: 13, color: '#6B7280', paddingHorizontal: 16, paddingTop: 8 },
  filterRow: {
    maxHeight: 52,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  filterContent: { paddingHorizontal: 12, paddingVertical: 10, gap: 8, flexDirection: 'row' },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#D1D5DB',
    backgroundColor: '#F9FAFB',
  },
  filterChipActive: { borderColor: '#2563EB', backgroundColor: '#EFF6FF' },
  filterChipText: { fontSize: 13, fontWeight: '600', color: '#6B7280' },
  filterChipTextActive: { color: '#2563EB' },
  list: { padding: 16, paddingBottom: 40 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  photo: { width: '100%', height: 140 },
  cardBody: { padding: 14 },
  placeName: { fontSize: 16, fontWeight: '600', color: '#111827', marginBottom: 4 },
  vicinity: { fontSize: 13, color: '#6B7280', marginBottom: 4 },
  rating: { fontSize: 13, color: '#374151', fontWeight: '500' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 60 },
  errorText: { fontSize: 14, color: '#DC2626', textAlign: 'center' },
  emptyText: { fontSize: 15, color: '#6B7280' },
});
