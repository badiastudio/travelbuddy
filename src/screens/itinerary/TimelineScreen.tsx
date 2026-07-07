import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  SectionList,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { MaterialTopTabScreenProps } from '@react-navigation/material-top-tabs';
import { StackNavigationProp } from '@react-navigation/stack';
import { useItinerary } from '../../hooks/useItinerary';
import { getDayLabel, formatTime } from '../../utils/dateUtils';
import { getCategoryIcon, STOP_CATEGORIES } from '../../constants/categories';
import { useTripStore } from '../../store/tripStore';
import { Stop } from '../../types/app.types';
import { AppStackParamList, TripStackParamList, TripTabParamList } from '../../navigation/types';

type Props = MaterialTopTabScreenProps<TripTabParamList, 'Timeline'>;
type Nav = StackNavigationProp<AppStackParamList & TripStackParamList>;
type View_ = 'timeline' | 'calendar';

const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const WEEKDAYS = ['S','M','T','W','T','F','S'];

function stopDate(stop: Stop, tripStartDate: string | null): Date | null {
  if (stop.start_time) return new Date(stop.start_time);
  if (tripStartDate && stop.day_index != null) {
    const d = new Date(tripStartDate + 'T00:00:00');
    d.setDate(d.getDate() + stop.day_index);
    return d;
  }
  return null;
}

function toKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function TimelineScreen({ route }: Props) {
  const { tripId } = route.params;
  const nav = useNavigation<Nav>();
  const trip = useTripStore((s) => s.currentTrip);
  const { stops, loading, reload } = useItinerary(tripId);
  const [view, setView] = useState<View_>('timeline');
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

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
        data: data.sort((a, b) => {
          if (a.start_time && b.start_time)
            return new Date(a.start_time).getTime() - new Date(b.start_time).getTime();
          if (a.start_time) return -1;
          if (b.start_time) return 1;
          return a.sort_order - b.sort_order;
        }),
      }));
  }, [stops, trip]);

  // Group stops by calendar date key
  const stopsByDate = useMemo(() => {
    const map = new Map<string, Stop[]>();
    for (const stop of stops) {
      const d = stopDate(stop, trip?.start_date ?? null);
      if (!d) continue;
      const key = toKey(d);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(stop);
    }
    return map;
  }, [stops, trip]);

  // Compute month range: from trip start to end, or fallback to today
  const calendarMonths = useMemo(() => {
    const dates = stops
      .map((s) => stopDate(s, trip?.start_date ?? null))
      .filter((d): d is Date => d !== null);
    if (dates.length === 0 && !trip?.start_date) return [new Date()];
    const startDate = trip?.start_date ? new Date(trip.start_date + 'T00:00:00') : new Date(Math.min(...dates.map(d => d.getTime())));
    const endDate = trip?.end_date ? new Date(trip.end_date + 'T00:00:00') : dates.length > 0 ? new Date(Math.max(...dates.map(d => d.getTime()))) : startDate;
    const months: Date[] = [];
    const cur = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
    const end = new Date(endDate.getFullYear(), endDate.getMonth(), 1);
    while (cur <= end) {
      months.push(new Date(cur));
      cur.setMonth(cur.getMonth() + 1);
    }
    return months;
  }, [stops, trip]);

  const selectedStops = selectedDate ? (stopsByDate.get(selectedDate) ?? []) : [];

  return (
    <View style={styles.container}>
      {/* Toggle */}
      <View style={styles.toggleRow}>
        <View style={styles.toggle}>
          <TouchableOpacity
            style={[styles.toggleBtn, view === 'timeline' && styles.toggleBtnActive]}
            onPress={() => setView('timeline')}
          >
            <Text style={[styles.toggleText, view === 'timeline' && styles.toggleTextActive]}>📋 Timeline</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleBtn, view === 'calendar' && styles.toggleBtnActive]}
            onPress={() => setView('calendar')}
          >
            <Text style={[styles.toggleText, view === 'calendar' && styles.toggleTextActive]}>📅 Calendar</Text>
          </TouchableOpacity>
        </View>
      </View>

      {view === 'timeline' ? (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={reload} />}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            !loading ? (
              <View style={styles.empty}>
                <Text style={styles.emptyIcon}>📅</Text>
                <Text style={styles.emptyText}>No stops yet</Text>
                <Text style={styles.emptySubtext}>Add stops in the Plan tab to see them here</Text>
              </View>
            ) : null
          }
          renderSectionHeader={({ section }) => (
            <View style={styles.sectionHeaderRow}>
              <View style={styles.sectionHeaderLine} />
              <Text style={styles.sectionHeader}>{section.title}</Text>
              <View style={styles.sectionHeaderLine} />
            </View>
          )}
          renderItem={({ item, index, section }) => {
            const isLast = index === section.data.length - 1;
            const catIcon = getCategoryIcon(item.category, STOP_CATEGORIES);
            return (
              <TouchableOpacity
                style={styles.timelineRow}
                onPress={() => (nav.getParent() ?? nav).navigate('AddStop', { tripId, stopId: item.id })}
                activeOpacity={0.75}
              >
                <View style={styles.spine}>
                  <View style={styles.dot} />
                  {!isLast && <View style={styles.line} />}
                </View>
                <View style={styles.card}>
                  <View style={styles.cardTitleRow}>
                    <Text style={styles.cardTitle} numberOfLines={1}>{item.title}</Text>
                    {catIcon ? <Text style={styles.catIcon}>{catIcon}</Text> : null}
                  </View>
                  {item.start_time ? (
                    <Text style={styles.cardMeta}>
                      🕐 {formatTime(item.start_time)}
                      {item.end_time ? ` – ${formatTime(item.end_time)}` : ''}
                    </Text>
                  ) : null}
                  {item.location_name ? (
                    <Text style={styles.cardMeta}>📍 {item.location_name}</Text>
                  ) : null}
                  {item.notes ? (
                    <Text style={styles.cardNotes} numberOfLines={2}>{item.notes}</Text>
                  ) : null}
                </View>
              </TouchableOpacity>
            );
          }}
        />
      ) : (
        <ScrollView contentContainerStyle={styles.calendarWrap} refreshControl={<RefreshControl refreshing={loading} onRefresh={reload} />}>
          {calendarMonths.map((month) => {
            const year = month.getFullYear();
            const monthIdx = month.getMonth();
            const firstDay = new Date(year, monthIdx, 1).getDay();
            const daysInMonth = new Date(year, monthIdx + 1, 0).getDate();
            const cells: (number | null)[] = [];
            for (let i = 0; i < firstDay; i++) cells.push(null);
            for (let d = 1; d <= daysInMonth; d++) cells.push(d);
            while (cells.length % 7 !== 0) cells.push(null);

            return (
              <View key={`${year}-${monthIdx}`} style={styles.monthBox}>
                <Text style={styles.monthTitle}>{MONTH_NAMES[monthIdx]} {year}</Text>
                <View style={styles.weekdayRow}>
                  {WEEKDAYS.map((w, i) => (
                    <Text key={i} style={styles.weekdayLabel}>{w}</Text>
                  ))}
                </View>
                <View style={styles.daysGrid}>
                  {cells.map((day, i) => {
                    if (day === null) return <View key={i} style={styles.dayCell} />;
                    const key = toKey(new Date(year, monthIdx, day));
                    const dayStops = stopsByDate.get(key) ?? [];
                    const hasStops = dayStops.length > 0;
                    const isSelected = selectedDate === key;
                    return (
                      <TouchableOpacity
                        key={i}
                        style={[styles.dayCell, hasStops && styles.dayCellHasStops, isSelected && styles.dayCellSelected]}
                        onPress={() => setSelectedDate(isSelected ? null : key)}
                        disabled={!hasStops}
                      >
                        <Text style={[styles.dayNum, hasStops && styles.dayNumHasStops, isSelected && styles.dayNumSelected]}>{day}</Text>
                        {hasStops && !isSelected && <View style={styles.dayDot} />}
                        {hasStops && <Text style={[styles.dayCount, isSelected && { color: '#fff' }]}>{dayStops.length}</Text>}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            );
          })}

          {selectedDate && selectedStops.length > 0 && (
            <View style={styles.selectedPanel}>
              <Text style={styles.selectedTitle}>
                {new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
              </Text>
              {selectedStops.map((stop) => {
                const catIcon = getCategoryIcon(stop.category, STOP_CATEGORIES);
                return (
                  <TouchableOpacity
                    key={stop.id}
                    style={styles.selectedItem}
                    onPress={() => (nav.getParent() ?? nav).navigate('AddStop', { tripId, stopId: stop.id })}
                  >
                    <View style={styles.selectedIconBox}>
                      <Text style={styles.selectedIcon}>{catIcon || '📍'}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.selectedItemTitle}>{stop.title}</Text>
                      {stop.start_time && (
                        <Text style={styles.selectedItemMeta}>🕐 {formatTime(stop.start_time)}</Text>
                      )}
                      {stop.location_name && (
                        <Text style={styles.selectedItemMeta}>📍 {stop.location_name}</Text>
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {stops.length === 0 && !loading && (
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>📅</Text>
              <Text style={styles.emptyText}>No stops yet</Text>
              <Text style={styles.emptySubtext}>Add stops in the Plan tab to see them here</Text>
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  list: { padding: 16, paddingBottom: 40 },

  toggleRow: { paddingHorizontal: 16, paddingTop: 10, paddingBottom: 8, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  toggle: { flexDirection: 'row', backgroundColor: '#E5E7EB', borderRadius: 20, padding: 3 },
  toggleBtn: { flex: 1, paddingVertical: 7, borderRadius: 17, alignItems: 'center' },
  toggleBtnActive: { backgroundColor: '#fff', shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 4, shadowOffset: { width: 0, height: 1 }, elevation: 2 },
  toggleText: { fontSize: 13, fontWeight: '600', color: '#6B7280' },
  toggleTextActive: { color: '#111827' },

  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', marginTop: 20, marginBottom: 12 },
  sectionHeaderLine: { flex: 1, height: 1, backgroundColor: '#E5E7EB' },
  sectionHeader: { fontSize: 12, fontWeight: '700', color: '#6B7280', textTransform: 'uppercase', letterSpacing: 0.8, marginHorizontal: 10 },

  timelineRow: { flexDirection: 'row', marginBottom: 4 },
  spine: { width: 28, alignItems: 'center', paddingTop: 4 },
  dot: { width: 14, height: 14, borderRadius: 7, backgroundColor: '#2563EB', borderWidth: 2, borderColor: '#fff', shadowColor: '#2563EB', shadowOpacity: 0.35, shadowRadius: 4, shadowOffset: { width: 0, height: 2 }, elevation: 3, zIndex: 1 },
  line: { flex: 1, width: 2, backgroundColor: '#BFDBFE', marginTop: 2, marginBottom: -4 },

  card: { flex: 1, marginLeft: 12, marginBottom: 12, backgroundColor: '#fff', borderRadius: 12, padding: 14, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 1 },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  cardTitle: { fontSize: 15, fontWeight: '700', color: '#111827', flex: 1, marginRight: 8 },
  catIcon: { fontSize: 18 },
  cardMeta: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  cardNotes: { fontSize: 12, color: '#374151', marginTop: 6, fontStyle: 'italic' },

  // Calendar
  calendarWrap: { padding: 16, paddingBottom: 40 },
  monthBox: { backgroundColor: '#fff', borderRadius: 12, padding: 12, marginBottom: 16, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 1 },
  monthTitle: { fontSize: 16, fontWeight: '700', color: '#111827', textAlign: 'center', marginBottom: 10 },
  weekdayRow: { flexDirection: 'row', marginBottom: 6 },
  weekdayLabel: { flex: 1, textAlign: 'center', fontSize: 11, fontWeight: '700', color: '#9CA3AF' },
  daysGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  dayCell: { width: `${100/7}%`, aspectRatio: 1, alignItems: 'center', justifyContent: 'center', padding: 2 },
  dayCellHasStops: { },
  dayCellSelected: { backgroundColor: '#2563EB', borderRadius: 8 },
  dayNum: { fontSize: 14, color: '#374151' },
  dayNumHasStops: { color: '#2563EB', fontWeight: '700' },
  dayNumSelected: { color: '#fff', fontWeight: '700' },
  dayDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: '#2563EB', marginTop: 2 },
  dayCount: { fontSize: 9, color: '#2563EB', fontWeight: '700', marginTop: 1 },

  selectedPanel: { backgroundColor: '#fff', borderRadius: 12, padding: 14, marginTop: 4 },
  selectedTitle: { fontSize: 15, fontWeight: '700', color: '#111827', marginBottom: 10 },
  selectedItem: { flexDirection: 'row', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  selectedIconBox: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#EFF6FF', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  selectedIcon: { fontSize: 20 },
  selectedItemTitle: { fontSize: 14, fontWeight: '600', color: '#111827' },
  selectedItemMeta: { fontSize: 12, color: '#6B7280', marginTop: 2 },

  empty: { alignItems: 'center', paddingTop: 80 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontSize: 16, fontWeight: '700', color: '#374151', marginBottom: 6 },
  emptySubtext: { fontSize: 14, color: '#9CA3AF', textAlign: 'center' },
});
