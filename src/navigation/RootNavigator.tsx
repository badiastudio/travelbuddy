import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { View, ActivityIndicator, Alert } from 'react-native';
import * as Linking from 'expo-linking';
import { useAuthStore } from '../store/authStore';
import { useAuthListener } from '../hooks/useAuth';
import AuthStack from './AuthStack';
import AppStack from './AppStack';
import ResetPasswordScreen from '../screens/auth/ResetPasswordScreen';
import { joinTripByToken } from '../api/trips';
import { supabase } from '../lib/supabase';

const prefix = Linking.createURL('/');

export default function RootNavigator() {
  useAuthListener();
  const session = useAuthStore((s) => s.session);
  const initialized = useAuthStore((s) => s.initialized);
  const passwordRecovery = useAuthStore((s) => s.passwordRecovery);
  const setPasswordRecovery = useAuthStore((s) => s.setPasswordRecovery);

  useEffect(() => {
    const handleUrl = async ({ url }: { url: string }) => {
      // Password reset links arrive while signed OUT, so handle them before
      // the session gate: travelpro://reset-password#access_token=…&refresh_token=…
      if (url.includes('reset-password')) {
        const params = new URLSearchParams(url.split('#')[1] ?? '');
        const errorDescription = params.get('error_description');
        if (errorDescription) {
          Alert.alert('Reset link problem', errorDescription.replace(/\+/g, ' '));
          return;
        }
        const access_token = params.get('access_token');
        const refresh_token = params.get('refresh_token');
        if (!access_token || !refresh_token) return;
        const { error } = await supabase.auth.setSession({ access_token, refresh_token });
        if (error) Alert.alert('Reset link problem', error.message);
        else setPasswordRecovery(true);
        return;
      }
      if (!session?.user) return;
      let token: string | null = null;
      try {
        token = new URL(url).searchParams.get('token');
      } catch {
        const match = url.match(/token=([a-zA-Z0-9\-_]+)/);
        token = match?.[1] ?? null;
      }
      if (!token) return;
      try {
        const trip = await joinTripByToken(session.user.id, token);
        Alert.alert('Joined trip!', `You've been added to "${trip.title}".`);
      } catch (e: any) {
        Alert.alert('Could not join trip', e?.message ?? 'Invalid or expired invite link.');
      }
    };
    const sub = Linking.addEventListener('url', handleUrl);
    // Also check for initial URL when app opens from a cold start
    Linking.getInitialURL().then((url) => {
      if (url) handleUrl({ url });
    });
    return () => sub.remove();
  }, [session]);

  if (!initialized) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' }}>
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

  return (
    <NavigationContainer linking={{ prefixes: [prefix] }}>
      {session && passwordRecovery ? (
        <ResetPasswordScreen />
      ) : session ? (
        <AppStack />
      ) : (
        <AuthStack />
      )}
    </NavigationContainer>
  );
}
