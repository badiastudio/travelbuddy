import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useAuthStore } from '../../store/authStore';
import { signOut } from '../../api/auth';
import Avatar from '../../components/common/Avatar';
import { AppStackParamList } from '../../navigation/types';

const ADMIN_EMAILS = ['cshunnarah@gmail.com'];

type Nav = StackNavigationProp<AppStackParamList>;

export default function ProfileScreen() {
  const nav = useNavigation<Nav>();
  const { profile, user } = useAuthStore();
  const isAdmin = user?.email ? ADMIN_EMAILS.includes(user.email.toLowerCase()) : false;

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
        {user?.email && <Text style={styles.email}>{user.email}</Text>}

        <TouchableOpacity style={styles.templatesBtn} onPress={() => nav.navigate('PackingTemplates')}>
          <Text style={styles.templatesText}>🧳  My Packing Templates</Text>
        </TouchableOpacity>

        {isAdmin && (
          <TouchableOpacity style={styles.adminBtn} onPress={() => nav.navigate('Admin')}>
            <Text style={styles.adminText}>⚙️  Admin Dashboard</Text>
          </TouchableOpacity>
        )}

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
  body: { flex: 1, alignItems: 'center', paddingTop: 48, gap: 12 },
  name: { fontSize: 20, fontWeight: '700', color: '#111827' },
  email: { fontSize: 14, color: '#6B7280' },
  templatesBtn: { marginTop: 24, backgroundColor: '#EFF6FF', borderRadius: 10, paddingVertical: 12, paddingHorizontal: 32, borderWidth: 1.5, borderColor: '#2563EB' },
  templatesText: { color: '#2563EB', fontWeight: '700', fontSize: 15 },
  adminBtn: { marginTop: 8, backgroundColor: '#2563EB', borderRadius: 10, paddingVertical: 12, paddingHorizontal: 32 },
  adminText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  signOutBtn: { marginTop: 8, borderWidth: 1, borderColor: '#DC2626', borderRadius: 10, paddingVertical: 12, paddingHorizontal: 32 },
  signOutText: { color: '#DC2626', fontWeight: '600', fontSize: 16 },
});
