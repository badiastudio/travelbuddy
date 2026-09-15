import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Platform, ImageBackground, Alert } from 'react-native';
import { Image } from 'expo-image';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTrip } from '../../hooks/useTrip';
import ItineraryScreen from '../itinerary/ItineraryScreen';
import MapViewScreen from '../itinerary/MapViewScreen';
import ExpensesScreen from '../expenses/ExpensesScreen';
import MediaScreen from '../media/MediaScreen';
import PackingListScreen from '../packing/PackingListScreen';
import TimelineScreen from '../itinerary/TimelineScreen';
import { AppStackParamList, TripStackParamList, TripTabParamList } from '../../navigation/types';
import CreateTripScreen from './CreateTripScreen';
import { formatTripDate } from '../../utils/dateUtils';
import BudgetBar from '../../components/common/BudgetBar';
// import { registerForPushNotifications, scheduleTripReminder } from '../../utils/notifications';
import { fetchStops } from '../../api/itinerary';
import { fetchExpenses } from '../../api/expenses';
import { exportTripToPDF } from '../../utils/exportTripPdf';

const Tab = createMaterialTopTabNavigator<TripTabParamList>();
type Route = RouteProp<TripStackParamList, 'TripDetail'>;
type Nav = StackNavigationProp<AppStackParamList>;

const TAB_ICONS: Record<string, string> = {
  Itinerary: '📍',
  Map: '🗺️',
  Expenses: '💳',
  Media: '📸',
  Packing: '🧳',
  Timeline: '📅',
};

function TripDetailInner({ tripId }: { tripId: string }) {
  const nav = useNavigation<Nav>();
  const { trip, loading } = useTrip(tripId);
  const [exporting, setExporting] = useState(false);


  async function handleExport() {
    if (!trip) return;
    setExporting(true);
    try {
      const [stops, expenses] = await Promise.all([fetchStops(tripId), fetchExpenses(tripId)]);
      await exportTripToPDF(trip, stops, expenses);
    } catch (e: any) {
      Alert.alert('Export failed', e?.message ?? 'Could not generate PDF. Please try again.');
    } finally {
      setExporting(false);
    }
  }

  function showMenu() {
    Alert.alert(trip?.title ?? 'Trip', undefined, [
      { text: '✅  Pre-trip Checklist', onPress: () => nav.navigate('TripChecklist', { tripId }) },
      { text: '📋  Activity Feed', onPress: () => nav.navigate('ActivityFeed', { tripId }) },
      { text: '💬  Trip Chat', onPress: () => nav.navigate('TripChat', { tripId }) },
      { text: '🔍  Search', onPress: () => nav.navigate('SearchTrip', { tripId }) },
      { text: exporting ? 'Exporting…' : '📄  Export PDF', onPress: handleExport },
      { text: '✏️  Edit Trip', onPress: () => nav.navigate('EditTrip', { tripId }) },
      { text: '+ Invite Members', onPress: () => nav.navigate('InviteMembers', { tripId, inviteToken: trip?.invite_token ?? '' }) },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }

  if (loading) return <View style={styles.loading}><ActivityIndicator size="large" color="#2563EB" /></View>;

  const dateRange = trip?.start_date
    ? `${formatTripDate(trip.start_date)}${trip.end_date ? ` – ${formatTripDate(trip.end_date)}` : ''}`
    : null;

  const BannerWrapper = trip?.cover_image_url
    ? ({ children }: { children: React.ReactNode }) => (
        <ImageBackground source={{ uri: trip.cover_image_url! }} style={styles.banner} imageStyle={styles.bannerImage}>
          <View style={styles.bannerOverlay}>{children}</View>
        </ImageBackground>
      )
    : ({ children }: { children: React.ReactNode }) => (
        <View style={[styles.banner, styles.bannerSolid]}>
          <View style={styles.bannerOverlaySolid}>{children}</View>
        </View>
      );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Banner header */}
      <BannerWrapper>
        <TouchableOpacity onPress={() => nav.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>‹</Text>
        </TouchableOpacity>
        <View style={styles.bannerCenter}>
          {trip?.cover_icon && !trip?.cover_image_url ? (
            <Text style={styles.bannerIcon}>{trip.cover_icon}</Text>
          ) : null}
          <Text style={styles.bannerTitle} numberOfLines={1}>{trip?.title ?? ''}</Text>
          {dateRange ? <Text style={styles.bannerDate}>{dateRange}</Text> : null}
        </View>
        <View style={styles.bannerRight}>
          {exporting && <ActivityIndicator size="small" color="#fff" style={{ marginRight: 4 }} />}
          <TouchableOpacity style={styles.menuBtn} onPress={showMenu}>
            <Text style={styles.menuBtnText}>⋯</Text>
          </TouchableOpacity>
        </View>
      </BannerWrapper>

      {trip?.budget != null && (
        <BudgetBar tripId={tripId} budget={trip.budget} currency={trip.budget_currency ?? 'USD'} />
      )}

      <Tab.Navigator
        screenOptions={({ route: tabRoute }) => ({
          tabBarActiveTintColor: '#2563EB',
          tabBarInactiveTintColor: '#9CA3AF',
          tabBarIndicatorStyle: { backgroundColor: '#2563EB', height: 3, borderRadius: 2 },
          tabBarLabelStyle: { fontWeight: '700', fontSize: 10, textTransform: 'none' },
          tabBarStyle: { backgroundColor: '#fff', elevation: 0, shadowOpacity: 0, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
          tabBarItemStyle: { paddingVertical: 2, paddingHorizontal: 0 },
          swipeEnabled: false,
          tabBarLabel: ({ color }) => (
            <View style={styles.tabLabel}>
              <Text style={styles.tabIcon}>{TAB_ICONS[tabRoute.name]}</Text>
              <Text style={[styles.tabText, { color }]}>{tabRoute.name}</Text>
            </View>
          ),
        })}
      >
        <Tab.Screen name="Itinerary" component={ItineraryScreen} initialParams={{ tripId }} options={{ tabBarLabel: ({ color }) => <View style={styles.tabLabel}><Text style={styles.tabIcon}>{TAB_ICONS['Itinerary']}</Text><Text style={[styles.tabText, { color }]}>Plan</Text></View> }} />
        <Tab.Screen name="Map" component={MapViewScreen} initialParams={{ tripId }} />
        <Tab.Screen name="Expenses" component={ExpensesScreen} initialParams={{ tripId }} options={{ tabBarLabel: ({ color }) => <View style={styles.tabLabel}><Text style={styles.tabIcon}>{TAB_ICONS['Expenses']}</Text><Text style={[styles.tabText, { color }]}>Costs</Text></View> }} />
        <Tab.Screen name="Media" component={MediaScreen} initialParams={{ tripId }} />
        <Tab.Screen name="Packing" component={PackingListScreen} initialParams={{ tripId }} />
        <Tab.Screen name="Timeline" component={TimelineScreen} initialParams={{ tripId }} />
      </Tab.Navigator>
    </SafeAreaView>
  );
}

export default function TripDetailScreen() {
  const route = useRoute<Route>();
  const { tripId } = route.params;
  if (tripId === 'new') return <CreateTripScreen />;
  return <TripDetailInner tripId={tripId} />;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  banner: { overflow: 'hidden' },
  bannerSolid: { backgroundColor: '#1E3A5F' },
  bannerImage: { resizeMode: 'cover' },
  bannerOverlay: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, backgroundColor: 'rgba(0,0,0,0.35)' },
  bannerOverlaySolid: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14 },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  backText: { fontSize: 28, color: '#fff', lineHeight: 32 },
  bannerCenter: { flex: 1, alignItems: 'center', paddingHorizontal: 8 },
  bannerIcon: { fontSize: 28, marginBottom: 2 },
  bannerTitle: { fontSize: 18, fontWeight: '800', color: '#fff', textAlign: 'center' },
  bannerDate: { fontSize: 12, color: 'rgba(255,255,255,0.75)', marginTop: 2 },
  bannerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  editTripBtn: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  editTripBtnText: { fontSize: 18 },
  menuBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 18, borderWidth: 1, borderColor: 'rgba(255,255,255,0.4)' },
  menuBtnText: { color: '#fff', fontSize: 20, fontWeight: '700', lineHeight: 24 },
  exportBtnText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  inviteBtn: { backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 16, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: 'rgba(255,255,255,0.4)' },
  inviteBtnText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  tabLabel: { alignItems: 'center', justifyContent: 'center' },
  tabIcon: { fontSize: 16, marginBottom: 2 },
  tabText: { fontSize: 10, fontWeight: '700' },
});
