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
};

export type TripStackParamList = {
  TripDetail: { tripId: string };
  AddStop: { tripId: string; dayIndex?: number };
  AddExpense: { tripId: string };
  Balance: { tripId: string };
  MediaDetail: { mediaId: string; signedUrl: string; mimeType: string; fileName: string };
  InviteMembers: { tripId: string; inviteToken: string };
};

export type AppStackParamList = {
  Tabs: undefined;
} & TripStackParamList;

export type TabParamList = {
  MyTrips: undefined;
  Profile: undefined;
};
