import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, StyleSheet, ScrollView, Alert, TouchableOpacity, Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { format, parseISO } from 'date-fns';
import { createTrip } from '../../api/trips';
import { useAuthStore } from '../../store/authStore';
import Button from '../../components/common/Button';
import { AppStackParamList } from '../../navigation/types';
import { SafeAreaView } from 'react-native-safe-area-context';
import { fetchTemplates, applyTemplatesToTrip, PackingTemplate } from '../../api/packingTemplates';

type Nav = StackNavigationProp<AppStackParamList>;

const TEMPLATES = [
  { label: '🏖️ Beach', description: 'Sun, sand, and relaxation. Beachside hotels, water sports, and sunset cocktails.' },
  { label: '🏔️ Adventure', description: 'Hiking, camping, and exploring the great outdoors.' },
  { label: '🏛️ Culture', description: 'Museums, historical sites, architecture, and local experiences.' },
  { label: '🍜 Food Tour', description: 'Discovering local cuisine, street food, restaurants, and cooking classes.' },
  { label: '🚂 Road Trip', description: 'Hitting the open road, roadside attractions, and scenic drives.' },
  { label: '🌍 Backpacking', description: 'Budget travel, hostels, and off-the-beaten-path adventures.' },
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

  // Native: lazy-load DateTimePicker to avoid web crash
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

export default function CreateTripScreen() {
  const nav = useNavigation<Nav>();
  const user = useAuthStore((s) => s.user);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [packingTemplates, setPackingTemplates] = useState<PackingTemplate[]>([]);
  const [selectedPackingIds, setSelectedPackingIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!user) return;
    fetchTemplates(user.id).then(setPackingTemplates).catch(() => {});
  }, [user]);

  function togglePackingTemplate(id: string) {
    setSelectedPackingIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  async function handleCreate() {
    if (!title.trim()) { Alert.alert('Please enter a trip name'); return; }
    if (!user) { Alert.alert('Not signed in', 'Please sign in to create a trip.'); return; }
    setLoading(true);
    try {
      const trip = await createTrip(user.id, {
        title: title.trim(),
        description: description.trim() || null,
        start_date: startDate ? format(startDate, 'yyyy-MM-dd') : null,
        end_date: endDate ? format(endDate, 'yyyy-MM-dd') : null,
      });
      if (selectedPackingIds.size > 0) {
        try {
          await applyTemplatesToTrip(trip.id, user.id, Array.from(selectedPackingIds));
        } catch {}
      }
      nav.replace('TripDetail', { tripId: trip.id });
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => nav.goBack()}>
          <Text style={styles.cancel}>Cancel</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>New Trip</Text>
        <View style={{ width: 60 }} />
      </View>
      <ScrollView contentContainerStyle={styles.form}>
        <Text style={styles.label}>Templates</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.templateRow}>
          {TEMPLATES.map((t) => {
            const active = selectedTemplate === t.label;
            return (
              <TouchableOpacity
                key={t.label}
                style={[styles.templateChip, active && styles.templateChipActive]}
                onPress={() => {
                  if (active) {
                    setSelectedTemplate(null);
                    setDescription('');
                  } else {
                    setSelectedTemplate(t.label);
                    setDescription(t.description);
                  }
                }}
                activeOpacity={0.7}
              >
                <Text style={[styles.templateChipText, active && styles.templateChipTextActive]}>{t.label}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <Text style={styles.label}>Trip Name *</Text>
        <TextInput style={styles.input} placeholder="e.g. Europe Summer 2026" value={title} onChangeText={setTitle} />

        <Text style={styles.label}>Description</Text>
        <TextInput style={[styles.input, styles.textarea]} placeholder="What's this trip about?" multiline numberOfLines={3} value={description} onChangeText={setDescription} />

        <DateInput label="Start Date" value={startDate} onChange={setStartDate} />
        <DateInput label="End Date" value={endDate} onChange={setEndDate} />

        {packingTemplates.length > 0 && (
          <>
            <Text style={styles.label}>Include Packing Templates</Text>
            <Text style={styles.templateHint}>Copy items from your saved packing lists into this trip.</Text>
            <View style={styles.packingList}>
              {packingTemplates.map((t) => {
                const selected = selectedPackingIds.has(t.id);
                return (
                  <TouchableOpacity
                    key={t.id}
                    style={[styles.packingChip, selected && styles.packingChipSelected]}
                    onPress={() => togglePackingTemplate(t.id)}
                  >
                    <Text style={[styles.packingChipText, selected && styles.packingChipTextSelected]}>
                      {selected ? '✓ ' : ''}🧳 {t.name} ({t.item_count})
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </>
        )}

        <Button title="Create Trip" onPress={handleCreate} loading={loading} style={styles.createBtn} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  cancel: { fontSize: 17, color: '#2563EB' },
  headerTitle: { fontSize: 17, fontWeight: '700', color: '#111827' },
  form: { padding: 20, gap: 4 },
  label: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 6, marginTop: 12 },
  input: { borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 10, padding: 14, fontSize: 16, backgroundColor: '#F9FAFB' },
  textarea: { height: 100, textAlignVertical: 'top' },
  dateBtn: { borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 10, padding: 14, backgroundColor: '#F9FAFB' },
  dateText: { fontSize: 16, color: '#111827' },
  datePlaceholder: { fontSize: 16, color: '#9CA3AF' },
  createBtn: { marginTop: 32 },
  templateRow: { flexDirection: 'row', gap: 8, paddingVertical: 4 },
  templateChip: { borderRadius: 12, borderWidth: 1, borderColor: '#D1D5DB', paddingHorizontal: 14, paddingVertical: 8, backgroundColor: '#fff' },
  templateChipActive: { backgroundColor: '#2563EB', borderColor: '#2563EB' },
  templateChipText: { fontSize: 14, color: '#374151', fontWeight: '500' },
  templateChipTextActive: { color: '#fff' },
  templateHint: { fontSize: 12, color: '#6B7280', marginBottom: 6 },
  packingList: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  packingChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, borderWidth: 1.5, borderColor: '#D1D5DB', backgroundColor: '#F9FAFB' },
  packingChipSelected: { borderColor: '#2563EB', backgroundColor: '#EFF6FF' },
  packingChipText: { fontSize: 13, color: '#374151', fontWeight: '600' },
  packingChipTextSelected: { color: '#2563EB' },
});
