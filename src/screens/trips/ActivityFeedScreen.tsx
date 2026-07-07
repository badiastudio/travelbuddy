import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';
import { AppStackParamList, TripStackParamList } from '../../navigation/types';

type Route = RouteProp<TripStackParamList, 'ActivityFeed'>;
type Nav = StackNavigationProp<AppStackParamList & TripStackParamList>;

interface FeedItem {
  id: string;
  label: string;
  subtitle?: string;
  created_at: string;
  type: 'stop' | 'expense' | 'media';
}

function relativeTime(isoString: string): string {
  const diffMs = Date.now() - new Date(isoString).getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  if (diffSecs < 60) return 'just now';
  const diffMins = Math.floor(diffSecs / 60);
  if (diffMins < 60) return `${diffMins} minute${diffMins === 1 ? '' : 's'} ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 30) return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
  const diffMonths = Math.floor(diffDays / 30);
  return `${diffMonths} month${diffMonths === 1 ? '' : 's'} ago`;
}

const TYPE_META: Record<FeedItem['type'], { icon: string; color: string; bg: string }> = {
  stop: { icon: '📍', color: '#2563EB', bg: '#EFF6FF' },
  expense: { icon: '💰', color: '#059669', bg: '#ECFDF5' },
  media: { icon: '📸', color: '#7C3AED', bg: '#F5F3FF' },
};

export default function ActivityFeedScreen() {
  const route = useRoute<Route>();
  const nav = useNavigation<Nav>();
  const { tripId } = route.params;

  const [items, setItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [stopsRes, expensesRes, mediaRes] = await Promise.all([
        supabase
          .from('stops')
          .select('id, title, created_at')
          .eq('trip_id', tripId)
          .order('created_at', { ascending: false }),
        supabase
          .from('expenses')
          .select('id, title, amount, currency, created_at')
          .eq('trip_id', tripId)
          .order('created_at', { ascending: false }),
        supabase
          .from('media_items')
          .select('id, file_name, created_at')
          .eq('trip_id', tripId)
          .order('created_at', { ascending: false }),
      ]);

      const feed: FeedItem[] = [
        ...(stopsRes.data ?? []).map((s: any) => ({
          id: `stop-${s.id}`,
          label: `Stop added: ${s.title}`,
          created_at: s.created_at,
          type: 'stop' as const,
        })),
        ...(expensesRes.data ?? []).map((e: any) => ({
          id: `expense-${e.id}`,
          label: `Expense added: ${e.title}`,
          subtitle: `${e.currency} ${Number(e.amount).toFixed(2)}`,
          created_at: e.created_at,
          type: 'expense' as const,
        })),
        ...(mediaRes.data ?? []).map((m: any) => ({
          id: `media-${m.id}`,
          label: 'Photo added',
          subtitle: m.file_name,
          created_at: m.created_at,
          type: 'media' as const,
        })),
      ];

      feed.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setItems(feed);
    } finally {
      setLoading(false);
    }
  }, [tripId]);

  useEffect(() => { load(); }, [load]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => nav.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Activity Feed</Text>
        <View style={{ width: 36 }} />
      </View>

      {loading && items.length === 0 ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color="#2563EB" />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>📋</Text>
              <Text style={styles.emptyText}>No activity yet</Text>
              <Text style={styles.emptySubtext}>Activity will appear here as you add stops, expenses, and photos</Text>
            </View>
          }
          renderItem={({ item }) => {
            const meta = TYPE_META[item.type];
            return (
              <View style={styles.feedRow}>
                {/* Icon badge */}
                <View style={[styles.iconBadge, { backgroundColor: meta.bg }]}>
                  <Text style={styles.iconBadgeText}>{meta.icon}</Text>
                </View>
                {/* Content */}
                <View style={styles.feedContent}>
                  <Text style={styles.feedLabel}>{item.label}</Text>
                  {item.subtitle ? (
                    <Text style={[styles.feedSubtitle, { color: meta.color }]}>{item.subtitle}</Text>
                  ) : null}
                  <Text style={styles.feedTime}>{relativeTime(item.created_at)}</Text>
                </View>
              </View>
            );
          }}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  backText: { fontSize: 28, color: '#111827', lineHeight: 32 },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '700', color: '#111827' },

  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  list: { padding: 16, paddingBottom: 40 },

  feedRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  iconBadge: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    flexShrink: 0,
  },
  iconBadgeText: { fontSize: 20 },
  feedContent: { flex: 1 },
  feedLabel: { fontSize: 14, fontWeight: '600', color: '#111827', marginBottom: 2 },
  feedSubtitle: { fontSize: 13, fontWeight: '600', marginBottom: 2 },
  feedTime: { fontSize: 12, color: '#9CA3AF' },

  separator: { height: 8 },

  empty: { alignItems: 'center', paddingTop: 80 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontSize: 16, fontWeight: '700', color: '#374151', marginBottom: 6 },
  emptySubtext: { fontSize: 14, color: '#9CA3AF', textAlign: 'center', paddingHorizontal: 32 },
});
