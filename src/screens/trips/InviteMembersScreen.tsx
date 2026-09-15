import React from 'react';
import { View, Text, StyleSheet, Share, TouchableOpacity, Alert, Clipboard } from 'react-native';
import { RouteProp, useRoute } from '@react-navigation/native';
import { TripStackParamList } from '../../navigation/types';
import { buildInviteLink } from '../../utils/linkUtils';

type Route = RouteProp<TripStackParamList, 'InviteMembers'>;

export default function InviteMembersScreen() {
  const route = useRoute<Route>();
  const { inviteToken } = route.params;
  const link = buildInviteLink(inviteToken);

  async function handleShare() {
    try {
      await Share.share({ message: `Join my trip on Travel Buddy+! Open the app, tap "Join Trip" on the trips list, and enter this code:\n\n${inviteToken}\n\nOr tap this link if you have the app installed:\n${link}` });
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
  }

  function handleCopyCode() {
    Clipboard.setString(inviteToken);
    Alert.alert('Copied!', 'Invite code copied to clipboard.');
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Invite People</Text>
      <Text style={styles.subtitle}>Share this code with friends. They can open Travel Buddy+, tap "Join Trip" on the trips list, and paste it in.</Text>

      <Text style={styles.label}>Invite Code</Text>
      <TouchableOpacity style={styles.codeBox} onPress={handleCopyCode} activeOpacity={0.7}>
        <Text style={styles.codeText} selectable>{inviteToken}</Text>
        <Text style={styles.tapToCopy}>Tap to copy</Text>
      </TouchableOpacity>

      <Text style={styles.label}>Or share a link</Text>
      <View style={styles.linkBox}>
        <Text style={styles.linkText} numberOfLines={3} selectable>{link}</Text>
      </View>

      <TouchableOpacity style={styles.shareBtn} onPress={handleShare}>
        <Text style={styles.shareBtnText}>Share Invite</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', padding: 24 },
  title: { fontSize: 22, fontWeight: '700', color: '#111827', marginBottom: 8 },
  subtitle: { fontSize: 14, color: '#6B7280', marginBottom: 24, lineHeight: 20 },
  label: { fontSize: 12, fontWeight: '700', color: '#6B7280', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8, marginTop: 8 },
  codeBox: { backgroundColor: '#EFF6FF', borderRadius: 10, padding: 20, marginBottom: 20, alignItems: 'center', borderWidth: 2, borderColor: '#2563EB' },
  codeText: { fontSize: 20, color: '#1E3A5F', fontFamily: 'monospace', fontWeight: '700', textAlign: 'center' },
  tapToCopy: { fontSize: 12, color: '#2563EB', marginTop: 8, fontWeight: '600' },
  linkBox: { backgroundColor: '#F3F4F6', borderRadius: 10, padding: 14, marginBottom: 24 },
  linkText: { fontSize: 12, color: '#374151', fontFamily: 'monospace' },
  shareBtn: { backgroundColor: '#2563EB', borderRadius: 10, padding: 16, alignItems: 'center' },
  shareBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
