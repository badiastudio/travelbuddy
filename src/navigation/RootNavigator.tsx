import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { View, ActivityIndicator } from 'react-native';
import * as Linking from 'expo-linking';
import { useAuthStore } from '../store/authStore';
import { useAuthListener } from '../hooks/useAuth';
import AuthStack from './AuthStack';
import AppStack from './AppStack';
import { joinTripByToken } from '../api/trips';

const prefix = Linking.createURL('/');

export default function RootNavigator() {
  useAuthListener();
  const session = useAuthStore((s) => s.session);
  const initialized = useAuthStore((s) => s.initialized);

  useEffect(() => {
    const handleUrl = async ({ url }: { url: string }) => {
      if (!session?.user) return;
      const token = new URL(url).searchParams.get('token');
      if (token) {
        try {
          await joinTripByToken(session.user.id, token);
        } catch {}
      }
    };
    const sub = Linking.addEventListener('url', handleUrl);
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
      {session ? <AppStack /> : <AuthStack />}
    </NavigationContainer>
  );
}
