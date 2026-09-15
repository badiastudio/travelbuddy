import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { joinTripByToken } from '../../api/trips';
import { useAuthStore } from '../../store/authStore';
import { AppStackParamList } from '../../navigation/types';

type Nav = StackNavigationProp<AppStackParamList>;

export default function JoinTripScreen() {
  const nav = useNavigation<Nav>();
  const user = useAuthStore((s) => s.user);
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleJoin() {
    const raw = code.trim();
    if (!raw) {
      Alert.alert('Missing code', 'Please enter an invite code.');
      return;
    }
    if (!user) {
      Alert.alert('Not signed in', 'Please sign in first.');
      return;
    }

    // Accept full URL or just the token
    let token = raw;
    try {
      const url = new URL(raw);
      const t = url.searchParams.get('token');
      if (t) token = t;
    } catch {
      // Not a URL — check for token in a plain string like "?token=xxx"
      const match = raw.match(/token=([a-zA-Z0-9\-_]+)/);
      if (match) token = match[1];
    }

    setLoading(true);
    try {
      const trip = await joinTripByToken(user.id, token);
      nav.replace('TripDetail', { tripId: trip.id });
    } catch (e: any) {
      Alert.alert('Could not join', e?.message ?? 'Invalid or expired invite code.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => nav.goBack()}>
          <Text style={styles.cancel}>Cancel</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Join Trip</Text>
        <View style={{ width: 60 }} />
      </View>

      <View style={styles.body}>
        <Text style={styles.icon}>🎟️</Text>
        <Text style={styles.title}>Enter an invite code</Text>
        <Text style={styles.subtitle}>Paste the invite code or link a friend shared with you.</Text>

        <TextInput
          style={styles.input}
          placeholder="Paste code or link here"
          value={code}
          onChangeText={setCode}
          autoCapitalize="none"
          autoCorrect={false}
          multiline
        />

        <TouchableOpacity style={styles.btn} onPress={handleJoin} disabled={loading}>
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.btnText}>Join Trip</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  cancel: { fontSize: 17, color: '#2563EB' },
  headerTitle: { fontSize: 17, fontWeight: '700', color: '#111827' },
  body: { flex: 1, padding: 24, alignItems: 'center' },
  icon: { fontSize: 56, marginTop: 32, marginBottom: 20 },
  title: { fontSize: 22, fontWeight: '700', color: '#111827', marginBottom: 8 },
  subtitle: { fontSize: 14, color: '#6B7280', textAlign: 'center', marginBottom: 24 },
  input: { width: '100%', minHeight: 100, borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 10, padding: 14, fontSize: 15, backgroundColor: '#F9FAFB', textAlignVertical: 'top', marginBottom: 20 },
  btn: { width: '100%', backgroundColor: '#2563EB', borderRadius: 10, paddingVertical: 14, alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
