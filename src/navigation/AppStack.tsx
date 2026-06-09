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

const Tab = createBottomTabNavigator<TabParamList>();
const AppNav = createStackNavigator<AppStackParamList>();
const TripNav = createStackNavigator<TripStackParamList>();

function Tabs() {
  return (
    <Tab.Navigator screenOptions={{ headerShown: false }}>
      <Tab.Screen name="MyTrips" component={TripsListScreen} options={{ title: 'My Trips' }} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

function TripStack() {
  return (
    <TripNav.Navigator>
      <TripNav.Screen name="TripDetail" component={TripDetailScreen} options={{ headerShown: false }} />
      <TripNav.Screen name="AddStop" component={AddStopScreen} options={{ title: 'Add Stop', presentation: 'modal' }} />
      <TripNav.Screen name="AddExpense" component={AddExpenseScreen} options={{ title: 'Add Expense', presentation: 'modal' }} />
      <TripNav.Screen name="Balance" component={BalanceScreen} options={{ title: 'Balances' }} />
      <TripNav.Screen name="MediaDetail" component={MediaDetailScreen} options={{ title: '', headerTransparent: true }} />
      <TripNav.Screen name="InviteMembers" component={InviteMembersScreen} options={{ title: 'Invite Members' }} />
    </TripNav.Navigator>
  );
}

export default function AppStack() {
  return (
    <AppNav.Navigator screenOptions={{ headerShown: false }}>
      <AppNav.Screen name="Tabs" component={Tabs} />
      <AppNav.Screen name="TripStack" component={TripStack} />
    </AppNav.Navigator>
  );
}
