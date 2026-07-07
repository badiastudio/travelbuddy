import React from 'react';
import { View, Text, StyleSheet, Share, TouchableOpacity, Alert } from 'react-native';
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
      await Share.share({ message: `Join my trip on travelBuddy: ${link}`, url: link });
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Invite People</Text>
      <Text style={styles.subtitle}>Share this link with friends to invite them to your trip.</Text>
      <View style={styles.linkBox}>
        <Text style={styles.linkText} numberOfLines={3} selectable>{link}</Text>
      </View>
      <TouchableOpacity style={styles.shareBtn} onPress={handleShare}>
        <Text style={styles.shareBtnText}>Share Invite Link</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', padding: 24 },
  title: { fontSize: 22, fontWeight: '700', color: '#111827', marginBottom: 8 },
  subtitle: { fontSize: 15, color: '#6B7280', marginBottom: 24 },
  linkBox: { backgroundColor: '#F3F4F6', borderRadius: 10, padding: 16, marginBottom: 24 },
  linkText: { fontSize: 14, color: '#374151', fontFamily: 'monospace' },
  shareBtn: { backgroundColor: '#2563EB', borderRadius: 10, padding: 16, alignItems: 'center' },
  shareBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
