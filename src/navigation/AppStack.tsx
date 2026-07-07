import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { AppStackParamList, TabParamList, TripStackParamList } from './types';
import TripsListScreen from '../screens/trips/TripsListScreen';
import ProfileScreen from '../screens/trips/ProfileScreen';
import TripDetailScreen from '../screens/trips/TripDetailScreen';
import AddStopScreen from '../screens/itinerary/AddStopScreen';
import AddExpenseScreen from '../screens/expenses/AddExpenseScreen';
import BalanceScreen from '../screens/expenses/BalanceScreen';
import MediaDetailScreen from '../screens/media/MediaDetailScreen';
import InviteMembersScreen from '../screens/trips/InviteMembersScreen';
import EditTripScreen from '../screens/trips/EditTripScreen';
import SearchScreen from '../screens/trips/SearchScreen';
import StopCommentsScreen from '../screens/itinerary/StopCommentsScreen';
import TripChatScreen from '../screens/trips/TripChatScreen';
import NearbyAttractionsScreen from '../screens/itinerary/NearbyAttractionsScreen';
import ActivityFeedScreen from '../screens/trips/ActivityFeedScreen';
import TripChecklistScreen from '../screens/trips/TripChecklistScreen';
import AdminScreen from '../screens/trips/AdminScreen';

const Tab = createBottomTabNavigator<TabParamList>();
const AppNav = createStackNavigator<AppStackParamList & TripStackParamList>();

function Tabs() {
  return (
    <Tab.Navigator screenOptions={{ headerShown: false }}>
      <Tab.Screen name="MyTrips" component={TripsListScreen} options={{ title: 'My Trips' }} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

export default function AppStack() {
  return (
    <AppNav.Navigator screenOptions={{ headerShown: false }}>
      <AppNav.Screen name="Tabs" component={Tabs} />
      <AppNav.Screen name="TripDetail" component={TripDetailScreen} />
      <AppNav.Screen name="AddStop" component={AddStopScreen} options={({ route }) => ({ headerShown: true, title: (route.params as any)?.stopId ? 'Edit Stop' : 'Add Stop' })} />
      <AppNav.Screen name="AddExpense" component={AddExpenseScreen} options={({ route }) => ({ headerShown: true, title: (route.params as any)?.expenseId ? 'Edit Expense' : 'Add Expense' })} />
      <AppNav.Screen name="Balance" component={BalanceScreen} options={{ headerShown: true, title: 'Balances' }} />
      <AppNav.Screen name="MediaDetail" component={MediaDetailScreen} options={{ headerShown: true, title: '' }} />
      <AppNav.Screen name="InviteMembers" component={InviteMembersScreen} options={{ headerShown: true, title: 'Invite Members' }} />
      <AppNav.Screen name="EditTrip" component={EditTripScreen} options={{ headerShown: false }} />
      <AppNav.Screen name="SearchTrip" component={SearchScreen} options={{ headerShown: false }} />
      <AppNav.Screen name="StopComments" component={StopCommentsScreen} options={{ headerShown: true, title: 'Comments' }} />
      <AppNav.Screen name="TripChat" component={TripChatScreen} options={{ headerShown: true, title: 'Trip Chat' }} />
      <AppNav.Screen name="NearbyAttractions" component={NearbyAttractionsScreen} options={{ headerShown: true, title: 'Nearby' }} />
      <AppNav.Screen name="ActivityFeed" component={ActivityFeedScreen} options={{ headerShown: false }} />
      <AppNav.Screen name="TripChecklist" component={TripChecklistScreen} options={{ headerShown: true, title: 'Pre-trip Checklist' }} />
      <AppNav.Screen name="Admin" component={AdminScreen} options={{ headerShown: false }} />
    </AppNav.Navigator>
  );
}
