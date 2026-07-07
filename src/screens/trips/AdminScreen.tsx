import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../../lib/supabase';

interface Stats {
  totalUsers: number;
  totalTrips: number;
  totalStops: number;
  totalExpenses: number;
  activeToday: number;
  activeThisWeek: number;
}

interface RecentUser {
  id: string;
  email: string;
  last_sign_in_at: string | null;
  created_at: string;
  trip_count: number;
}

interface RecentActivity {
  type: 'trip' | 'stop' | 'expense';
  title: string;
  created_at: string;
}

export default function AdminScreen() {
  const nav = useNavigation<any>();
  const [stats, setStats] = useState<Stats | null>(null);
  const [users, setUsers] = useState<RecentUser[]>([]);
  const [activity, setActivity] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [tripsRes, stopsRes, expensesRes] = await Promise.all([
        supabase.from('trips').select('id, title, created_at, owner_id', { count: 'exact' }).order('created_at', { ascending: false }).limit(10),
        supabase.from('stops').select('id, title, created_at', { count: 'exact' }).order('created_at', { ascending: false }).limit(10),
        supabase.from('expenses').select('id, title, created_at', { count: 'exact' }).order('created_at', { ascending: false }).limit(10),
      ]);

      const totalUsers = new Set(
        (tripsRes.data ?? []).map((t: any) => t.owner_id),
      ).size;

      const now = new Date();
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      const recentTrips = (tripsRes.data ?? []).filter((t: any) => new Date(t.created_at) > oneDayAgo);
      const weeklyTrips = (tripsRes.data ?? []).filter((t: any) => new Date(t.created_at) > oneWeekAgo);

      setStats({
        totalUsers,
        totalTrips: tripsRes.count ?? 0,
        totalStops: stopsRes.count ?? 0,
        totalExpenses: expensesRes.count ?? 0,
        activeToday: new Set(recentTrips.map((t: any) => t.owner_id)).size,
        activeThisWeek: new Set(weeklyTrips.map((t: any) => t.owner_id)).size,
      });

      const merged: RecentActivity[] = [
        ...(tripsRes.data ?? []).map((t: any) => ({ type: 'trip' as const, title: t.title, created_at: t.created_at })),
        ...(stopsRes.data ?? []).map((s: any) => ({ type: 'stop' as const, title: s.title, created_at: s.created_at })),
        ...(expensesRes.data ?? []).map((e: any) => ({ type: 'expense' as const, title: e.title, created_at: e.created_at })),
      ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 20);

      setActivity(merged);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const relTime = (iso: string) => {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => nav.goBack()}>
          <Text style={styles.back}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Admin Dashboard</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.body}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
      >
        {loading && !stats ? (
          <ActivityIndicator size="large" color="#2563EB" style={{ marginTop: 40 }} />
        ) : stats ? (
          <>
            <Text style={styles.sectionTitle}>Overview</Text>
            <View style={styles.statsGrid}>
              <StatCard label="Total Users" value={stats.totalUsers} icon="👥" />
              <StatCard label="Total Trips" value={stats.totalTrips} icon="✈️" />
              <StatCard label="Total Stops" value={stats.totalStops} icon="📍" />
              <StatCard label="Total Expenses" value={stats.totalExpenses} icon="💳" />
              <StatCard label="Active Today" value={stats.activeToday} icon="🔥" highlight />
              <StatCard label="Active This Week" value={stats.activeThisWeek} icon="📊" />
            </View>

            <Text style={styles.sectionTitle}>Recent Activity</Text>
            {activity.length === 0 ? (
              <Text style={styles.empty}>No activity yet</Text>
            ) : (
              activity.map((a, i) => (
                <View key={i} style={styles.activityRow}>
                  <Text style={styles.activityIcon}>
                    {a.type === 'trip' ? '✈️' : a.type === 'stop' ? '📍' : '💳'}
                  </Text>
                  <View style={styles.activityBody}>
                    <Text style={styles.activityTitle} numberOfLines={1}>{a.title}</Text>
                    <Text style={styles.activityMeta}>{a.type} · {relTime(a.created_at)}</Text>
                  </View>
                </View>
              ))
            )}
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function StatCard({ label, value, icon, highlight }: { label: string; value: number; icon: string; highlight?: boolean }) {
  return (
    <View style={[styles.statCard, highlight && styles.statCardHighlight]}>
      <Text style={styles.statIcon}>{icon}</Text>
      <Text style={[styles.statValue, highlight && { color: '#2563EB' }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  back: { color: '#2563EB', fontSize: 16, fontWeight: '600' },
  title: { fontSize: 17, fontWeight: '700', color: '#111827' },
  body: { padding: 16, paddingBottom: 40 },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: '#6B7280', textTransform: 'uppercase', letterSpacing: 0.8, marginTop: 16, marginBottom: 12 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  statCard: { flexBasis: '48%', backgroundColor: '#fff', borderRadius: 12, padding: 16, alignItems: 'flex-start', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, shadowOffset: { width: 0, height: 2 }, elevation: 1 },
  statCardHighlight: { borderWidth: 1.5, borderColor: '#2563EB' },
  statIcon: { fontSize: 24, marginBottom: 6 },
  statValue: { fontSize: 26, fontWeight: '800', color: '#111827' },
  statLabel: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  empty: { color: '#9CA3AF', fontStyle: 'italic', marginTop: 8 },
  activityRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 12, borderRadius: 10, marginBottom: 6 },
  activityIcon: { fontSize: 20, marginRight: 12 },
  activityBody: { flex: 1 },
  activityTitle: { fontSize: 14, fontWeight: '600', color: '#111827' },
  activityMeta: { fontSize: 12, color: '#6B7280', marginTop: 2 },
});
