import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTrip } from '../../hooks/useTrip';
import ItineraryScreen from '../itinerary/ItineraryScreen';
import MapViewScreen from '../itinerary/MapViewScreen';
import ExpensesScreen from '../expenses/ExpensesScreen';
import MediaScreen from '../media/MediaScreen';
import { TripStackParamList, TripTabParamList } from '../../navigation/types';
import CreateTripScreen from './CreateTripScreen';

const Tab = createMaterialTopTabNavigator<TripTabParamList>();
type Route = RouteProp<TripStackParamList, 'TripDetail'>;
type Nav = StackNavigationProp<TripStackParamList>;

export default function TripDetailScreen() {
  const route = useRoute<Route>();
  const nav = useNavigation<Nav>();
  const { tripId } = route.params;

  if (tripId === 'new') return <CreateTripScreen />;

  const { trip, loading } = useTrip(tripId);

  if (loading) return <View style={styles.loading}><ActivityIndicator size="large" color="#2563EB" /></View>;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => nav.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={styles.title} numberOfLines={1}>{trip?.title ?? ''}</Text>
        <TouchableOpacity onPress={() => nav.navigate('InviteMembers', { tripId, inviteToken: trip?.invite_token ?? '' })}>
          <Text style={styles.inviteText}>Invite</Text>
        </TouchableOpacity>
      </View>
      <Tab.Navigator
        screenOptions={{
          tabBarActiveTintColor: '#2563EB',
          tabBarInactiveTintColor: '#6B7280',
          tabBarIndicatorStyle: { backgroundColor: '#2563EB' },
          tabBarLabelStyle: { fontWeight: '600', fontSize: 13 },
          tabBarStyle: { backgroundColor: '#fff', elevation: 0, shadowOpacity: 0 },
        }}
      >
        <Tab.Screen name="Itinerary" component={ItineraryScreen} initialParams={{ tripId }} />
        <Tab.Screen name="Map" component={MapViewScreen} initialParams={{ tripId }} />
        <Tab.Screen name="Expenses" component={ExpensesScreen} initialParams={{ tripId }} />
        <Tab.Screen name="Media" component={MediaScreen} initialParams={{ tripId }} />
      </Tab.Navigator>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  backBtn: { minWidth: 60 },
  backText: { fontSize: 17, color: '#2563EB' },
  title: { flex: 1, fontSize: 17, fontWeight: '700', textAlign: 'center', color: '#111827' },
  inviteText: { fontSize: 15, color: '#2563EB', fontWeight: '600', minWidth: 60, textAlign: 'right' },
});
