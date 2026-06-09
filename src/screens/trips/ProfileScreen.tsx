import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { useAuthStore } from '../../store/authStore';
import { signOut } from '../../api/auth';
import Avatar from '../../components/common/Avatar';

export default function ProfileScreen() {
  const { profile } = useAuthStore();

  async function handleSignOut() {
    try { await signOut(); } catch (e: any) { Alert.alert('Error', e.message); }
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Profile</Text>
      </View>
      <View style={styles.body}>
        <Avatar uri={profile?.avatar_url} name={profile?.display_name} size={80} />
        <Text style={styles.name}>{profile?.display_name ?? 'Traveler'}</Text>
        <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut}>
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  header: { paddingHorizontal: 20, paddingTop: 60, paddingBottom: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  title: { fontSize: 24, fontWeight: '700', color: '#111827' },
  body: { flex: 1, alignItems: 'center', paddingTop: 48, gap: 16 },
  name: { fontSize: 20, fontWeight: '700', color: '#111827' },
  signOutBtn: { marginTop: 24, borderWidth: 1, borderColor: '#DC2626', borderRadius: 10, paddingVertical: 12, paddingHorizontal: 32 },
  signOutText: { color: '#DC2626', fontWeight: '600', fontSize: 16 },
});
