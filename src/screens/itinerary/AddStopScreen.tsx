import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, StyleSheet, ScrollView, Alert, TouchableOpacity, Platform, FlatList } from 'react-native';
import { format } from 'date-fns';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { createStop } from '../../api/itinerary';
import { useAuthStore } from '../../store/authStore';
import Button from '../../components/common/Button';
import { AppStackParamList, TripStackParamList } from '../../navigation/types';

type Route = RouteProp<TripStackParamList, 'AddStop'>;
type Nav = StackNavigationProp<AppStackParamList>;

const GOOGLE_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ?? '';

interface PlaceSuggestion {
  place_id: string;
  description: string;
}

// Web location input: uses Google Places Autocomplete REST API directly
function WebLocationInput({ value, onChangeText, onSelectPlace }: {
  value: string;
  onChangeText: (t: string) => void;
  onSelectPlace: (name: string, lat: number | null, lng: number | null) => void;
}) {
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const debounceRef = useRef<any>(null);

  async function fetchSuggestions(text: string) {
    if (!text || text.length < 3) { setSuggestions([]); return; }
    try {
      const res = await fetch(
        `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(text)}&key=${GOOGLE_KEY}`
      );
      const json = await res.json();
      setSuggestions(json.predictions ?? []);
    } catch {
      setSuggestions([]);
    }
  }

  async function selectPlace(suggestion: PlaceSuggestion) {
    setShowSuggestions(false);
    setSuggestions([]);
    onChangeText(suggestion.description);
    // Fetch lat/lng via Place Details
    try {
      const res = await fetch(
        `https://maps.googleapis.com/maps/api/place/details/json?place_id=${suggestion.place_id}&fields=geometry&key=${GOOGLE_KEY}`
      );
      const json = await res.json();
      const loc = json.result?.geometry?.location;
      onSelectPlace(suggestion.description, loc?.lat ?? null, loc?.lng ?? null);
    } catch {
      onSelectPlace(suggestion.description, null, null);
    }
  }

  function handleChange(text: string) {
    onChangeText(text);
    onSelectPlace(text, null, null); // clear coords when typing
    setShowSuggestions(true);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchSuggestions(text), 300);
  }

  return (
    <View style={{ zIndex: 10 }}>
      <TextInput
        style={styles.input}
        placeholder="Search address or type plain text"
        value={value}
        onChangeText={handleChange}
        onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
        onFocus={() => value.length >= 3 && setShowSuggestions(true)}
      />
      {showSuggestions && suggestions.length > 0 && (
        <View style={styles.suggestionList}>
          {suggestions.map((s) => (
            <TouchableOpacity key={s.place_id} style={styles.suggestionItem} onPress={() => selectPlace(s)}>
              <Text style={styles.suggestionText}>📍 {s.description}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
      <Text style={styles.hint}>Select a suggestion to pin on the map, or type any text to save as plain address.</Text>
    </View>
  );
}

function NativeLocationInput({ value, onChangeText, onSelectPlace }: {
  value: string;
  onChangeText: (t: string) => void;
  onSelectPlace: (name: string, lat: number | null, lng: number | null) => void;
}) {
  const { GooglePlacesAutocomplete } = require('react-native-google-places-autocomplete');
  return (
    <GooglePlacesAutocomplete
      placeholder="Search address or type any text..."
      query={{ key: GOOGLE_KEY, language: 'en' }}
      onPress={(data: any, details: any) => {
        onSelectPlace(
          data.description,
          details?.geometry?.location?.lat ?? null,
          details?.geometry?.location?.lng ?? null
        );
      }}
      fetchDetails
      debounce={300}
      textInputProps={{
        onChangeText: (text: string) => {
          onChangeText(text);
          onSelectPlace(text, null, null);
        },
      }}
      styles={{
        container: { marginBottom: 4 },
        textInput: { ...styles.input, marginBottom: 0 },
        listView: { borderRadius: 10, borderWidth: 1, borderColor: '#E5E7EB' },
      }}
    />
  );
}

function DateTimeInput({ label, value, onChange }: { label: string; value: Date | null; onChange: (d: Date) => void }) {
  if (Platform.OS === 'web') {
    return (
      <View>
        <Text style={styles.label}>{label}</Text>
        <input
          type="datetime-local"
          value={value ? format(value, "yyyy-MM-dd'T'HH:mm") : ''}
          onChange={(e) => { if (e.target.value) onChange(new Date(e.target.value)); }}
          style={{ border: '1px solid #D1D5DB', borderRadius: 10, padding: 14, fontSize: 16, backgroundColor: '#F9FAFB', width: '100%', boxSizing: 'border-box' as any }}
        />
      </View>
    );
  }
  const DateTimePicker = require('@react-native-community/datetimepicker').default;
  const [showDate, setShowDate] = useState(false);
  const [showTime, setShowTime] = useState(false);
  return (
    <View>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.dateTimeRow}>
        <TouchableOpacity style={[styles.dateBtn, { flex: 1, marginRight: 6 }]} onPress={() => setShowDate(true)}>
          <Text style={value ? styles.dateText : styles.datePlaceholder}>
            {value ? format(value, 'MMM d, yyyy') : 'Date'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.dateBtn, { flex: 1 }]} onPress={() => setShowTime(true)}>
          <Text style={value ? styles.dateText : styles.datePlaceholder}>
            {value ? format(value, 'h:mm a') : 'Time'}
          </Text>
        </TouchableOpacity>
      </View>
      {showDate && (
        <DateTimePicker value={value ?? new Date()} mode="date" onChange={(_: any, d: Date) => {
          setShowDate(false);
          if (d) {
            const merged = value ? new Date(value) : new Date(d);
            merged.setFullYear(d.getFullYear(), d.getMonth(), d.getDate());
            onChange(merged);
          }
        }} />
      )}
      {showTime && (
        <DateTimePicker value={value ?? new Date()} mode="time" onChange={(_: any, d: Date) => {
          setShowTime(false);
          if (d) {
            const merged = value ? new Date(value) : new Date(d);
            merged.setHours(d.getHours(), d.getMinutes());
            onChange(merged);
          }
        }} />
      )}
    </View>
  );
}

export default function AddStopScreen() {
  const nav = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { tripId, dayIndex } = route.params;
  const user = useAuthStore((s) => s.user);

  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [locationName, setLocationName] = useState('');
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [endTime, setEndTime] = useState<Date | null>(null);
  const [loading, setLoading] = useState(false);

  function handleSelectPlace(name: string, la: number | null, ln: number | null) {
    setLocationName(name);
    setLat(la);
    setLng(ln);
  }

  async function handleAdd() {
    if (!title.trim()) { Alert.alert('Please enter a stop name'); return; }
    if (!user) return;
    setLoading(true);
    try {
      await createStop({
        trip_id: tripId,
        created_by: user.id,
        title: title.trim(),
        notes: notes.trim() || null,
        location_name: locationName || null,
        lat,
        lng,
        start_time: startTime?.toISOString() ?? null,
        end_time: endTime?.toISOString() ?? null,
        day_index: dayIndex ?? 0,
        sort_order: 0,
      });
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

  return (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
      <Text style={styles.label}>Stop Name *</Text>
      <TextInput style={styles.input} placeholder="e.g. Eiffel Tower" value={title} onChangeText={setTitle} />

      <Text style={styles.label}>Location</Text>
      {Platform.OS === 'web' ? (
        <WebLocationInput
          value={locationName}
          onChangeText={setLocationName}
          onSelectPlace={handleSelectPlace}
        />
      ) : (
        <NativeLocationInput
          value={locationName}
          onChangeText={setLocationName}
          onSelectPlace={handleSelectPlace}
        />
      )}
      {lat !== null && (
        <Text style={styles.coordBadge}>📍 Pinned on map ({lat.toFixed(4)}, {lng?.toFixed(4)})</Text>
      )}

      <Text style={styles.label}>Notes</Text>
      <TextInput style={[styles.input, styles.textarea]} placeholder="Any notes about this stop..." multiline numberOfLines={3} value={notes} onChangeText={setNotes} />

      <DateTimeInput label="Start Date & Time" value={startTime} onChange={setStartTime} />
      <DateTimeInput label="End Date & Time" value={endTime} onChange={setEndTime} />

      <Button title="Add Stop" onPress={handleAdd} loading={loading} style={styles.addBtn} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 20, paddingBottom: 60 },
  label: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 6, marginTop: 16 },
  input: { borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 10, padding: 14, fontSize: 16, backgroundColor: '#F9FAFB', marginBottom: 4 },
  textarea: { height: 90, textAlignVertical: 'top' },
  dateBtn: { borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 10, padding: 14, backgroundColor: '#F9FAFB' },
  dateText: { fontSize: 16, color: '#111827' },
  datePlaceholder: { fontSize: 16, color: '#9CA3AF' },
  addBtn: { marginTop: 32 },
  suggestionList: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 10, marginTop: 2, overflow: 'hidden' },
  suggestionItem: { padding: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  suggestionText: { fontSize: 14, color: '#374151' },
  hint: { fontSize: 12, color: '#9CA3AF', marginTop: 4 },
  coordBadge: { fontSize: 12, color: '#16A34A', marginTop: 4, fontWeight: '600' },
  dateTimeRow: { flexDirection: 'row' },
});
