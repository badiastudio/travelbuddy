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
      <AppNav.Screen name="AddStop" component={AddStopScreen} options={{ headerShown: true, title: 'Add Stop' }} />
      <AppNav.Screen name="AddExpense" component={AddExpenseScreen} options={{ headerShown: true, title: 'Add Expense' }} />
      <AppNav.Screen name="Balance" component={BalanceScreen} options={{ headerShown: true, title: 'Balances' }} />
      <AppNav.Screen name="MediaDetail" component={MediaDetailScreen} options={{ headerShown: true, title: '' }} />
      <AppNav.Screen name="InviteMembers" component={InviteMembersScreen} options={{ headerShown: true, title: 'Invite Members' }} />
    </AppNav.Navigator>
  );
}
