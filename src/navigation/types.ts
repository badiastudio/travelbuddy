import { NavigatorScreenParams } from '@react-navigation/native';

export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
  ForgotPassword: undefined;
};

export type TripTabParamList = {
  Itinerary: { tripId: string };
  Map: { tripId: string };
  Expenses: { tripId: string };
  Media: { tripId: string };
  Packing: { tripId: string };
  Timeline: { tripId: string };
};

export type TripStackParamList = {
  TripDetail: { tripId: string };
  EditTrip: { tripId: string };
  AddStop: { tripId: string; dayIndex?: number; stopId?: string };
  AddExpense: { tripId: string; expenseId?: string };
  Balance: { tripId: string };
  MediaDetail: { mediaId: string; signedUrl: string; mimeType: string; fileName: string };
  InviteMembers: { tripId: string; inviteToken: string };
  SearchTrip: { tripId: string };
  StopComments: { stopId: string; tripId: string; stopTitle: string };
  ActivityFeed: { tripId: string };
  TripChat: { tripId: string };
  NearbyAttractions: { lat: number; lng: number; name: string };
  TripChecklist: { tripId: string };
};

export type AppStackParamList = {
  Tabs: undefined;
  Admin: undefined;
} & TripStackParamList;

export type TabParamList = {
  MyTrips: undefined;
  Profile: undefined;
};
