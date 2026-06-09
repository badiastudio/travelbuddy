import React, { useState, useRef } from 'react';
import { View, Text, TextInput, StyleSheet, ScrollView, Alert, TouchableOpacity, Platform } from 'react-native';
import { GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete';
import DateTimePicker from '@react-native-community/datetimepicker';
import { format } from 'date-fns';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { createStop } from '../../api/itinerary';
import { useAuthStore } from '../../store/authStore';
import Button from '../../components/common/Button';
import { TripStackParamList } from '../../navigation/types';

type Route = RouteProp<TripStackParamList, 'AddStop'>;
type Nav = StackNavigationProp<TripStackParamList>;

const GOOGLE_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ?? '';

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
  const [showStart, setShowStart] = useState(false);
  const [showEnd, setShowEnd] = useState(false);
  const [loading, setLoading] = useState(false);

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
        sort_order: Date.now(),
      });
      nav.goBack();
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
      <GooglePlacesAutocomplete
        placeholder="Search for a place..."
        query={{ key: GOOGLE_KEY, language: 'en' }}
        onPress={(data: any, details: any) => {
          setLocationName(data.description);
          if (details?.geometry?.location) {
            setLat(details.geometry.location.lat);
            setLng(details.geometry.location.lng);
          }
        }}
        fetchDetails
        debounce={300}
        styles={{
          container: { marginBottom: 4 },
          textInput: { ...styles.input, marginBottom: 0 },
          listView: { borderRadius: 10, borderWidth: 1, borderColor: '#E5E7EB' },
        }}
      />

      <Text style={styles.label}>Notes</Text>
      <TextInput style={[styles.input, styles.textarea]} placeholder="Any notes about this stop..." multiline numberOfLines={3} value={notes} onChangeText={setNotes} />

      <Text style={styles.label}>Start Time</Text>
      <TouchableOpacity style={styles.dateBtn} onPress={() => setShowStart(true)}>
        <Text style={startTime ? styles.dateText : styles.datePlaceholder}>
          {startTime ? format(startTime, 'h:mm a') : 'Select start time'}
        </Text>
      </TouchableOpacity>
      {showStart && (
        <DateTimePicker value={startTime ?? new Date()} mode="time" onChange={(_, d) => { setShowStart(false); if (d) setStartTime(d); }} />
      )}

      <Text style={styles.label}>End Time</Text>
      <TouchableOpacity style={styles.dateBtn} onPress={() => setShowEnd(true)}>
        <Text style={endTime ? styles.dateText : styles.datePlaceholder}>
          {endTime ? format(endTime, 'h:mm a') : 'Select end time'}
        </Text>
      </TouchableOpacity>
      {showEnd && (
        <DateTimePicker value={endTime ?? startTime ?? new Date()} mode="time" onChange={(_, d) => { setShowEnd(false); if (d) setEndTime(d); }} />
      )}

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
});
