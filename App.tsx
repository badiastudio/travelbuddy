import 'react-native-gesture-handler';
import React, { useEffect, useState } from 'react';
import { LogBox, View, Text, ScrollView, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';
import RootNavigator from './src/navigation/RootNavigator';
import { useAuthStore } from './src/store/authStore';

LogBox.ignoreLogs(['VirtualizedLists should never be nested']);

// Prevent splash from auto-hiding while we load
SplashScreen.preventAutoHideAsync().catch(() => {});

// Aggressive failsafe: hide splash after 3s regardless of app state
setTimeout(() => {
  SplashScreen.hideAsync().catch(() => {});
}, 3000);

const SPLASH_BG = '#B8DCE8';

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { error: Error | null }
> {
  state = { error: null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  render() {
    if (this.state.error) {
      const err = this.state.error as Error;
      return (
        <View style={{ flex: 1, padding: 40, paddingTop: 80, backgroundColor: '#fff' }}>
          <Text style={{ fontSize: 18, fontWeight: '700', color: '#DC2626', marginBottom: 12 }}>
            Something went wrong. Please close and reopen the app.
          </Text>
          <ScrollView>
            <Text style={{ fontSize: 13, color: '#374151', fontFamily: 'monospace' }}>
              {err.message}{'\n\n'}{err.stack}
            </Text>
          </ScrollView>
        </View>
      );
    }
    return this.props.children;
  }
}

function AppInner() {
  const initialized = useAuthStore((s) => s.initialized);
  const [forceReady, setForceReady] = useState(false);

  // Hide splash + force ready as soon as we can
  useEffect(() => {
    SplashScreen.hideAsync().catch(() => {});
  }, []);

  // Force ready after 4 seconds even if auth is stuck
  useEffect(() => {
    const t = setTimeout(() => setForceReady(true), 4000);
    return () => clearTimeout(t);
  }, []);

  const ready = initialized || forceReady;

  if (!ready) {
    return (
      <View style={{ flex: 1, backgroundColor: SPLASH_BG, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color="#1E3A5F" />
      </View>
    );
  }

  return <RootNavigator />;
}

export default function App() {
  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <View style={{ flex: 1, backgroundColor: SPLASH_BG }}>
          <StatusBar style="dark" />
          <AppInner />
        </View>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}
