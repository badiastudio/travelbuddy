import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, SectionList, ScrollView, StyleSheet, TouchableOpacity, RefreshControl, Alert, Linking } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { MaterialTopTabScreenProps } from '@react-navigation/material-top-tabs';
import { useItinerary } from '../../hooks/useItinerary';
import { deleteStop, deleteStops, archiveStops, unarchiveStops } from '../../api/itinerary';
import { getCategoryIcon, STOP_CATEGORIES } from '../../constants/categories';
import { Stop } from '../../types/app.types';
import { getDayLabel, formatTime } from '../../utils/dateUtils';
import { useTripStore } from '../../store/tripStore';
import EditActionBar from '../../components/common/EditActionBar';
import { AppStackParamList, TripStackParamList, TripTabParamList } from '../../navigation/types';
import { useAuthStore } from '../../store/authStore';
import { fetchVotesForStops, upsertVote, deleteVote } from '../../api/stopVotes';

type Props = MaterialTopTabScreenProps<TripTabParamList, 'Itinerary'>;
type Nav = StackNavigationProp<AppStackParamList & TripStackParamList>;

export default function ItineraryScreen({ route }: Props) {
  const { tripId } = route.params;
  const nav = useNavigation<Nav>();
  const trip = useTripStore((s) => s.currentTrip);
  const [showArchived, setShowArchived] = useState(false);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const { stops, loading, reload } = useItinerary(tripId, showArchived);
  const [editing, setEditing] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const user = useAuthStore((s) => s.user);
  useFocusEffect(useCallback(() => { reload(); }, [reload]));
  const [votes, setVotes] = useState<Map<string, { up: number; down: number; mine: 1 | -1 | null }>>(new Map());

  const loadVotes = useCallback(async (stopList: Stop[]) => {
    if (!user || stopList.length === 0) return;
    const ids = stopList.map((s) => s.id);
    try {
      const map = await fetchVotesForStops(ids, user.id);
      setVotes(map);
    } catch {}
  }, [user]);

  useEffect(() => {
    loadVotes(stops);
  }, [stops, loadVotes]);

  async function handleVote(stopId: string, vote: 1 | -1) {
    if (!user) return;
    const current = votes.get(stopId) ?? { up: 0, down: 0, mine: null };
    const isToggle = current.mine === vote;

    // Optimistic update
    const next = new Map(votes);
    if (isToggle) {
      next.set(stopId, {
        up: vote === 1 ? current.up - 1 : current.up,
        down: vote === -1 ? current.down - 1 : current.down,
        mine: null,
      });
    } else {
      next.set(stopId, {
        up: vote === 1 ? current.up + 1 : current.mine === 1 ? current.up - 1 : current.up,
        down: vote === -1 ? current.down + 1 : current.mine === -1 ? current.down - 1 : current.down,
        mine: vote,
      });
    }
    setVotes(next);

    try {
      if (isToggle) {
        await deleteVote(stopId, user.id);
      } else {
        await upsertVote(stopId, user.id, vote);
      }
    } catch {
      // revert on error
      setVotes(votes);
    }
  }

  const allDays = useMemo(() => {
    const days = Array.from(new Set(stops.map((s) => s.day_index ?? 0))).sort((a, b) => a - b);
    return days;
  }, [stops]);

  const sections = useMemo(() => {
    const map = new Map<number, Stop[]>();
    for (const stop of stops) {
      const day = stop.day_index ?? 0;
      if (selectedDay !== null && day !== selectedDay) continue;
      if (!map.has(day)) map.set(day, []);
      map.get(day)!.push(stop);
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => a - b)
      .map(([day, data]) => ({
        title: getDayLabel(trip?.start_date ?? null, day),
        data: data.sort((a, b) => {
          if (a.start_time && b.start_time) return new Date(a.start_time).getTime() - new Date(b.start_time).getTime();
          if (a.start_time) return -1;
          if (b.start_time) return 1;
          return a.sort_order - b.sort_order;
        }),
      }));
  }, [stops, trip, selectedDay]);

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function enterEdit() { setEditing(true); setSelected(new Set()); }
  function exitEdit() { setEditing(false); setSelected(new Set()); }

  async function handleDelete() {
    if (selected.size === 0) return;
    Alert.alert(`Delete ${selected.size} stop${selected.size > 1 ? 's' : ''}?`, 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        await deleteStops(Array.from(selected));
        exitEdit(); reload();
      }},
    ]);
  }

  async function handleArchive() {
    if (selected.size === 0) return;
    await archiveStops(Array.from(selected));
    exitEdit(); reload();
  }

  async function handleRestore() {
    if (selected.size === 0) return;
    await unarchiveStops(Array.from(selected));
    exitEdit(); reload();
  }

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <View style={styles.toggle}>
          <TouchableOpacity
            style={[styles.toggleBtn, !showArchived && styles.toggleBtnActive]}
            onPress={() => { setShowArchived(false); setSelectedDay(null); exitEdit(); }}
          >
            <Text style={[styles.toggleText, !showArchived && styles.toggleTextActive]}>Active</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleBtn, showArchived && styles.toggleBtnActive]}
            onPress={() => { setShowArchived(true); setSelectedDay(null); exitEdit(); }}
          >
            <Text style={[styles.toggleText, showArchived && styles.toggleTextActive]}>Archived</Text>
          </TouchableOpacity>
        </View>
        {stops.length > 0 && !editing && (
          <TouchableOpacity onPress={enterEdit}>
            <Text style={styles.editBtnText}>Edit</Text>
          </TouchableOpacity>
        )}
      </View>
      {allDays.length > 1 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.dayChipsRow} contentContainerStyle={styles.dayChipsContent}>
          <TouchableOpacity
            style={[styles.dayChip, selectedDay === null && styles.dayChipActive]}
            onPress={() => setSelectedDay(null)}
          >
            <Text style={[styles.dayChipText, selectedDay === null && styles.dayChipTextActive]}>All</Text>
          </TouchableOpacity>
          {allDays.map((day) => (
            <TouchableOpacity
              key={day}
              style={[styles.dayChip, selectedDay === day && styles.dayChipActive]}
              onPress={() => setSelectedDay(day)}
            >
              <Text style={[styles.dayChipText, selectedDay === day && styles.dayChipTextActive]}>
                {getDayLabel(trip?.start_date ?? null, day)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
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
            style={[styles.stopCard, editing && selected.has(item.id) && styles.stopCardSelected]}
            onPress={() => editing ? toggleSelect(item.id) : (nav.getParent() ?? nav).navigate('AddStop', { tripId, stopId: item.id })}
            onLongPress={() => !editing && deleteStop(item.id).then(reload)}
            activeOpacity={0.8}
          >
            {editing && (
              <View style={[styles.checkbox, selected.has(item.id) && styles.checkboxSelected]}>
                {selected.has(item.id) && <Text style={styles.checkmark}>✓</Text>}
              </View>
            )}
            {!editing && <View style={styles.stopDot} />}
            <View style={styles.stopBody}>
              <View style={styles.stopTitleRow}>
                <Text style={styles.stopTitle}>{item.title}</Text>
                {item.category && <Text style={styles.stopCategoryIcon}>{getCategoryIcon(item.category, STOP_CATEGORIES)}</Text>}
              </View>
              {item.location_name ? (
                <Text style={styles.stopMeta}>{item.lat !== null ? '📍 ' : ''}{item.location_name}</Text>
              ) : null}
              {item.start_time ? <Text style={styles.stopMeta}>🕐 {formatTime(item.start_time)}{item.end_time ? ` – ${formatTime(item.end_time)}` : ''}</Text> : null}
              {item.notes ? <Text style={styles.stopNotes}>{item.notes}</Text> : null}
              {!editing && item.booking_url ? (
                <TouchableOpacity onPress={() => Linking.openURL(item.booking_url!)}>
                  <Text style={styles.bookingLink}>🔗 Open Booking</Text>
                </TouchableOpacity>
              ) : null}
              {!editing && (
                <TouchableOpacity
                  style={styles.commentBtn}
                  onPress={() => (nav.getParent() ?? nav).navigate('StopComments', { stopId: item.id, tripId, stopTitle: item.title })}
                >
                  <Text style={styles.commentBtnText}>💬 Comments</Text>
                </TouchableOpacity>
              )}
              {!editing && (
                <View style={styles.actionRow}>
                  <View style={styles.voteRow}>
                    <TouchableOpacity
                      style={[styles.voteBtn, votes.get(item.id)?.mine === 1 && styles.voteBtnActive]}
                      onPress={() => handleVote(item.id, 1)}
                    >
                      <Text style={[styles.voteBtnText, votes.get(item.id)?.mine === 1 && styles.voteBtnTextActive]}>
                        👍 {votes.get(item.id)?.up ?? 0}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.voteBtn, votes.get(item.id)?.mine === -1 && styles.voteBtnActive]}
                      onPress={() => handleVote(item.id, -1)}
                    >
                      <Text style={[styles.voteBtnText, votes.get(item.id)?.mine === -1 && styles.voteBtnTextActive]}>
                        👎 {votes.get(item.id)?.down ?? 0}
                      </Text>
                    </TouchableOpacity>
                  </View>
                  {item.lat !== null && item.lng !== null && (
                    <TouchableOpacity
                      style={styles.nearbyBtn}
                      onPress={() => (nav.getParent() ?? nav).navigate('NearbyAttractions', { lat: item.lat!, lng: item.lng!, name: item.title })}
                    >
                      <Text style={styles.nearbyBtnText}>📍 Nearby</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </View>
          </TouchableOpacity>
        )}
      />
      {!editing && !showArchived && (
        <TouchableOpacity style={styles.fab} onPress={() => (nav.getParent() ?? nav).navigate('AddStop', { tripId })}>
          <Text style={styles.fabText}>+ Add Stop</Text>
        </TouchableOpacity>
      )}
      {editing && (
        <EditActionBar
          selectedCount={selected.size}
          onDelete={handleDelete}
          onArchive={showArchived ? undefined : handleArchive}
          onRestore={showArchived ? handleRestore : undefined}
          onCancel={exitEdit}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  topBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 10, paddingBottom: 4 },
  toggle: { flexDirection: 'row', backgroundColor: '#E5E7EB', borderRadius: 20, padding: 3, flex: 1, marginRight: 12 },
  toggleBtn: { flex: 1, paddingVertical: 6, borderRadius: 17, alignItems: 'center' },
  toggleBtnActive: { backgroundColor: '#fff', shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 4, shadowOffset: { width: 0, height: 1 }, elevation: 2 },
  toggleText: { fontSize: 13, fontWeight: '600', color: '#6B7280' },
  toggleTextActive: { color: '#111827' },
  editBtnText: { fontSize: 15, color: '#2563EB', fontWeight: '600' },
  dayChipsRow: { backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E5E7EB', flexGrow: 0, flexShrink: 0, height: 64 },
  dayChipsContent: { paddingHorizontal: 12, paddingVertical: 12, alignItems: 'center', flexDirection: 'row' },
  dayChip: { marginRight: 10, paddingHorizontal: 18, height: 40, borderRadius: 20, borderWidth: 1.5, borderColor: '#D1D5DB', backgroundColor: '#F9FAFB', minWidth: 60, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  dayChipActive: { borderColor: '#2563EB', backgroundColor: '#2563EB' },
  dayChipText: { fontSize: 14, fontWeight: '700', color: '#374151', lineHeight: 18, includeFontPadding: false as any },
  dayChipTextActive: { color: '#fff' },
  list: { padding: 16, paddingBottom: 100 },
  sectionHeader: { fontSize: 13, fontWeight: '700', color: '#6B7280', textTransform: 'uppercase', letterSpacing: 0.8, marginTop: 16, marginBottom: 8 },
  stopCard: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 8, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 1 },
  stopCardSelected: { backgroundColor: '#EFF6FF', borderWidth: 1.5, borderColor: '#2563EB' },
  checkbox: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: '#D1D5DB', marginRight: 12, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  checkboxSelected: { backgroundColor: '#2563EB', borderColor: '#2563EB' },
  checkmark: { color: '#fff', fontSize: 13, fontWeight: '700' },
  stopDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#2563EB', marginTop: 6, marginRight: 12, flexShrink: 0 },
  stopBody: { flex: 1 },
  stopTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  stopCategoryIcon: { fontSize: 18 },
  stopTitle: { fontSize: 16, fontWeight: '600', color: '#111827', marginBottom: 4 },
  stopMeta: { fontSize: 13, color: '#6B7280', marginBottom: 2 },
  stopNotes: { fontSize: 13, color: '#374151', marginTop: 4, fontStyle: 'italic' },
  bookingLink: { fontSize: 13, color: '#2563EB', fontWeight: '600', marginTop: 6 },
  commentBtn: { marginTop: 6 },
  commentBtnText: { fontSize: 13, color: '#2563EB', fontWeight: '600' },
  actionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 },
  voteRow: { flexDirection: 'row', gap: 8 },
  voteBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, borderWidth: 1.5, borderColor: '#D1D5DB', backgroundColor: '#F9FAFB' },
  voteBtnActive: { borderColor: '#2563EB', backgroundColor: '#EFF6FF' },
  voteBtnText: { fontSize: 13, fontWeight: '600', color: '#6B7280' },
  voteBtnTextActive: { color: '#2563EB' },
  nearbyBtn: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, borderWidth: 1.5, borderColor: '#D1D5DB', backgroundColor: '#F9FAFB' },
  nearbyBtnText: { fontSize: 13, fontWeight: '600', color: '#6B7280' },
  empty: { alignItems: 'center', paddingTop: 80 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontSize: 16, color: '#6B7280' },
  fab: { position: 'absolute', bottom: 24, right: 24, backgroundColor: '#2563EB', borderRadius: 28, paddingHorizontal: 20, paddingVertical: 14, shadowColor: '#2563EB', shadowOpacity: 0.4, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 6 },
  fabText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
