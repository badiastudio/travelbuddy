import React, { useState, useRef } from 'react';
import {
  View, Text, TextInput, StyleSheet, ScrollView, Alert,
  TouchableOpacity, Platform, Modal, FlatList, ActivityIndicator,
} from 'react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { format, parseISO } from 'date-fns';
import { updateTrip } from '../../api/trips';
import { uploadTripCover } from '../../api/storage';
import { useTrip } from '../../hooks/useTrip';
import { AppStackParamList, TripStackParamList } from '../../navigation/types';
import { SafeAreaView } from 'react-native-safe-area-context';
import Button from '../../components/common/Button';

type Route = RouteProp<TripStackParamList, 'EditTrip'>;
type Nav = StackNavigationProp<AppStackParamList>;

const TRIP_ICONS = [
  '✈️','🏖️','🏔️','🗺️','🏛️','🍜','🚂','🚢','🏝️','🎡',
  '🏕️','🌍','🎭','🗼','🌸','⛷️','🤿','🛕','🎪','🌅',
  '🦁','🐘','🌴','🏄','🚵','🎿','🏊','🧗','🛶','🎑',
];

function DateInput({ label, value, onChange }: { label: string; value: Date | null; onChange: (d: Date) => void }) {
  if (Platform.OS === 'web') {
    return (
      <View>
        <Text style={styles.label}>{label}</Text>
        <input
          type="date"
          value={value ? format(value, 'yyyy-MM-dd') : ''}
          onChange={(e) => { if (e.target.value) onChange(parseISO(e.target.value)); }}
          style={{ border: '1px solid #D1D5DB', borderRadius: 10, padding: 14, fontSize: 16, backgroundColor: '#F9FAFB', width: '100%', boxSizing: 'border-box' as any }}
        />
      </View>
    );
  }
  const DateTimePicker = require('@react-native-community/datetimepicker').default;
  const [show, setShow] = useState(false);
  return (
    <View>
      <Text style={styles.label}>{label}</Text>
      <TouchableOpacity style={styles.dateBtn} onPress={() => setShow(true)}>
        <Text style={value ? styles.dateText : styles.datePlaceholder}>
          {value ? format(value, 'MMM d, yyyy') : `Select ${label.toLowerCase()}`}
        </Text>
      </TouchableOpacity>
      {show && (
        <DateTimePicker value={value ?? new Date()} mode="date" onChange={(_: any, d: Date) => { setShow(false); if (d) onChange(d); }} />
      )}
    </View>
  );
}

export default function EditTripScreen() {
  const route = useRoute<Route>();
  const nav = useNavigation<Nav>();
  const { tripId } = route.params;
  const { trip, loading: tripLoading } = useTrip(tripId);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [coverUri, setCoverUri] = useState<string | null>(null);
  const [coverFileName, setCoverFileName] = useState('cover.jpg');
  const [coverMime, setCoverMime] = useState('image/jpeg');
  const [selectedIcon, setSelectedIcon] = useState<string | null>(null);
  const [iconPickerVisible, setIconPickerVisible] = useState(false);
  const [budget, setBudget] = useState('');
  const [budgetCurrency, setBudgetCurrency] = useState('USD');
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<any>(null);

  const [initialized, setInitialized] = useState(false);
  if (trip && !initialized) {
    setTitle(trip.title);
    setDescription(trip.description ?? '');
    setStartDate(trip.start_date ? parseISO(trip.start_date) : null);
    setEndDate(trip.end_date ? parseISO(trip.end_date) : null);
    setSelectedIcon(trip.cover_icon ?? null);
    setBudget(trip.budget != null ? String(trip.budget) : '');
    setBudgetCurrency(trip.budget_currency ?? 'USD');
    setInitialized(true);
  }

  function handleWebFileChange(e: any) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setCoverUri(reader.result as string);
      setCoverFileName(file.name);
      setCoverMime(file.type);
      setSelectedIcon(null);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  }

  async function handlePickImage() {
    if (Platform.OS === 'web') {
      fileInputRef.current?.click();
      return;
    }
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please allow access to your photo library in Settings.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      setCoverUri(asset.uri);
      setCoverFileName(asset.fileName ?? `cover_${Date.now()}.jpg`);
      setCoverMime(asset.mimeType ?? 'image/jpeg');
      setSelectedIcon(null);
    }
  }

  async function handleSave() {
    if (!title.trim()) { Alert.alert('Trip name is required'); return; }
    setSaving(true);
    try {
      let cover_image_url = trip?.cover_image_url ?? null;

      if (coverUri) {
        cover_image_url = await uploadTripCover(tripId, coverUri, coverFileName, coverMime);
      }

      await updateTrip(tripId, {
        title: title.trim(),
        description: description.trim() || null,
        start_date: startDate ? format(startDate, 'yyyy-MM-dd') : null,
        end_date: endDate ? format(endDate, 'yyyy-MM-dd') : null,
        cover_image_url: coverUri ? cover_image_url : (selectedIcon ? null : cover_image_url),
        cover_icon: selectedIcon,
        budget: budget.trim() ? parseFloat(budget) : null,
        budget_currency: budgetCurrency,
      });

      nav.goBack();
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setSaving(false);
    }
  }

  const previewUri = coverUri ?? trip?.cover_image_url ?? null;

  if (tripLoading || !initialized) {
    return <View style={styles.loading}><ActivityIndicator size="large" color="#2563EB" /></View>;
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Icon picker modal */}
      <Modal visible={iconPickerVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Choose an Icon</Text>
            <FlatList
              data={TRIP_ICONS}
              keyExtractor={(item) => item}
              numColumns={6}
              contentContainerStyle={styles.iconGrid}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.iconCell, selectedIcon === item && styles.iconCellSelected]}
                  onPress={() => { setSelectedIcon(item); setCoverUri(null); setIconPickerVisible(false); }}
                >
                  <Text style={styles.iconEmoji}>{item}</Text>
                </TouchableOpacity>
              )}
            />
            <TouchableOpacity style={styles.modalCancel} onPress={() => setIconPickerVisible(false)}>
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {Platform.OS === 'web' && (
        <input ref={fileInputRef} type="file" accept="image/*"
          style={{ display: 'none' }} onChange={handleWebFileChange} />
      )}

      <View style={styles.header}>
        <TouchableOpacity onPress={() => nav.goBack()}>
          <Text style={styles.cancel}>Cancel</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Trip</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={styles.form}>
        {/* Cover preview */}
        <View style={styles.coverSection}>
          {previewUri ? (
            <Image source={{ uri: previewUri }} style={styles.coverImage} contentFit="cover" />
          ) : selectedIcon ? (
            <View style={styles.coverIconPlaceholder}>
              <Text style={styles.coverIconBig}>{selectedIcon}</Text>
            </View>
          ) : (
            <View style={styles.coverPlaceholder}>
              <Text style={styles.coverPlaceholderText}>No cover</Text>
            </View>
          )}

          <View style={styles.coverBtns}>
            <TouchableOpacity style={styles.coverBtn} onPress={handlePickImage}>
              <Text style={styles.coverBtnText}>📷  Upload Photo</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.coverBtn} onPress={() => setIconPickerVisible(true)}>
              <Text style={styles.coverBtnText}>😊  Choose Icon</Text>
            </TouchableOpacity>
            {(previewUri || selectedIcon) && (
              <TouchableOpacity style={[styles.coverBtn, styles.coverBtnRemove]} onPress={() => { setCoverUri(null); setSelectedIcon(null); }}>
                <Text style={styles.coverBtnRemoveText}>Remove</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        <Text style={styles.label}>Trip Name *</Text>
        <TextInput
          style={styles.input}
          value={title}
          onChangeText={setTitle}
          placeholder="e.g. Europe Summer 2026"
        />

        <Text style={styles.label}>Description</Text>
        <TextInput
          style={[styles.input, styles.textarea]}
          value={description}
          onChangeText={setDescription}
          placeholder="What's this trip about?"
          multiline
          numberOfLines={3}
        />

        <DateInput label="Start Date" value={startDate} onChange={setStartDate} />
        <DateInput label="End Date" value={endDate} onChange={setEndDate} />

        <Text style={styles.label}>Budget</Text>
        <View style={styles.budgetRow}>
          <TextInput
            style={[styles.input, styles.budgetInput]}
            placeholder="0.00"
            keyboardType="decimal-pad"
            value={budget}
            onChangeText={setBudget}
          />
        </View>
        <View style={styles.currencyChips}>
          {['USD','EUR','GBP','JPY','CAD','AUD','MXN','THB','SGD','AED'].map((c) => (
            <TouchableOpacity
              key={c}
              style={[styles.currencyChip, budgetCurrency === c && styles.currencyChipActive]}
              onPress={() => setBudgetCurrency(c)}
            >
              <Text style={[styles.currencyChipText, budgetCurrency === c && styles.currencyChipTextActive]}>{c}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Button title="Save Changes" onPress={handleSave} loading={saving} style={styles.saveBtn} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  cancel: { fontSize: 17, color: '#2563EB' },
  headerTitle: { fontSize: 17, fontWeight: '700', color: '#111827' },
  form: { padding: 20, paddingBottom: 60, gap: 4 },
  coverSection: { marginBottom: 8 },
  coverImage: { width: '100%', height: 160, borderRadius: 14, backgroundColor: '#E5E7EB' },
  coverIconPlaceholder: { width: '100%', height: 160, borderRadius: 14, backgroundColor: '#EFF6FF', alignItems: 'center', justifyContent: 'center' },
  coverIconBig: { fontSize: 72 },
  coverPlaceholder: { width: '100%', height: 160, borderRadius: 14, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center' },
  coverPlaceholderText: { fontSize: 15, color: '#9CA3AF' },
  coverBtns: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  coverBtn: { flex: 1, minWidth: 140, paddingVertical: 10, paddingHorizontal: 14, borderRadius: 10, borderWidth: 1, borderColor: '#D1D5DB', alignItems: 'center', backgroundColor: '#F9FAFB' },
  coverBtnText: { fontSize: 14, fontWeight: '600', color: '#374151' },
  coverBtnRemove: { borderColor: '#FCA5A5', backgroundColor: '#FEF2F2', flex: 0, paddingHorizontal: 18 },
  coverBtnRemoveText: { fontSize: 14, fontWeight: '600', color: '#EF4444' },
  label: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 6, marginTop: 12 },
  input: { borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 10, padding: 14, fontSize: 16, backgroundColor: '#F9FAFB' },
  textarea: { height: 100, textAlignVertical: 'top' },
  dateBtn: { borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 10, padding: 14, backgroundColor: '#F9FAFB' },
  dateText: { fontSize: 16, color: '#111827' },
  datePlaceholder: { fontSize: 16, color: '#9CA3AF' },
  saveBtn: { marginTop: 32 },
  budgetRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  budgetInput: { flex: 1 },
  currencyChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  currencyChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, borderWidth: 1.5, borderColor: '#D1D5DB', backgroundColor: '#F9FAFB' },
  currencyChipActive: { borderColor: '#2563EB', backgroundColor: '#EFF6FF' },
  currencyChipText: { fontSize: 13, fontWeight: '600', color: '#374151' },
  currencyChipTextActive: { color: '#2563EB' },
  // Icon picker modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, paddingBottom: 40 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#111827', marginBottom: 16, textAlign: 'center' },
  iconGrid: { paddingBottom: 16 },
  iconCell: { flex: 1, aspectRatio: 1, margin: 4, alignItems: 'center', justifyContent: 'center', borderRadius: 12, backgroundColor: '#F3F4F6' },
  iconCellSelected: { backgroundColor: '#EFF6FF', borderWidth: 2, borderColor: '#2563EB' },
  iconEmoji: { fontSize: 28 },
  modalCancel: { alignItems: 'center', paddingTop: 8 },
  modalCancelText: { fontSize: 16, color: '#6B7280' },
});
