import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, TextInput, TouchableOpacity, StyleSheet, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { RouteProp, useRoute } from '@react-navigation/native';
import { TripStackParamList } from '../../navigation/types';
import { fetchComments, addComment, deleteComment, StopComment } from '../../api/comments';
import { useAuthStore } from '../../store/authStore';
import { formatDistanceToNow } from 'date-fns';

type Route = RouteProp<TripStackParamList, 'StopComments'>;

export default function StopCommentsScreen() {
  const route = useRoute<Route>();
  const { stopId, tripId } = route.params;
  const user = useAuthStore((s) => s.user);

  const [comments, setComments] = useState<StopComment[]>([]);
  const [text, setText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await fetchComments(stopId);
      setComments(data);
    } catch {}
  }, [stopId]);

  useEffect(() => { load(); }, [load]);

  async function handleSend() {
    if (!text.trim() || !user) return;
    setSubmitting(true);
    try {
      await addComment(stopId, tripId, user.id, text.trim());
      setText('');
      await load();
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleLongPress(comment: StopComment) {
    if (comment.user_id !== user?.id) return;
    Alert.alert('Delete comment?', undefined, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try {
          await deleteComment(comment.id);
          await load();
        } catch {}
      }},
    ]);
  }

  function renderComment({ item }: { item: StopComment }) {
    const initial = (item.profile?.display_name ?? 'U')[0].toUpperCase();
    const name = item.profile?.display_name ?? 'Member';
    const timeAgo = formatDistanceToNow(new Date(item.created_at), { addSuffix: true });
    const isOwn = item.user_id === user?.id;

    return (
      <TouchableOpacity
        style={styles.commentRow}
        onLongPress={() => handleLongPress(item)}
        activeOpacity={isOwn ? 0.7 : 1}
      >
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initial}</Text>
        </View>
        <View style={styles.bubble}>
          <View style={styles.bubbleHeader}>
            <Text style={styles.commenterName}>{name}</Text>
            <Text style={styles.commentTime}>{timeAgo}</Text>
          </View>
          <Text style={styles.commentText}>{item.text}</Text>
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={90}>
      <FlatList
        data={comments}
        keyExtractor={(c) => c.id}
        renderItem={renderComment}
        contentContainerStyle={comments.length === 0 ? styles.emptyContainer : styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No comments yet. Be the first!</Text>
          </View>
        }
      />
      <View style={styles.inputBar}>
        <TextInput
          style={styles.textInput}
          placeholder="Add a comment..."
          value={text}
          onChangeText={setText}
          multiline
          maxLength={500}
        />
        <TouchableOpacity
          style={[styles.sendBtn, (!text.trim() || submitting) && styles.sendBtnDisabled]}
          onPress={handleSend}
          disabled={!text.trim() || submitting}
        >
          <Text style={styles.sendBtnText}>Send</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  list: { padding: 16, paddingBottom: 8 },
  emptyContainer: { flex: 1 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 60 },
  emptyText: { fontSize: 15, color: '#6B7280', textAlign: 'center' },
  commentRow: { flexDirection: 'row', marginBottom: 14 },
  avatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#2563EB', alignItems: 'center', justifyContent: 'center', marginRight: 10, flexShrink: 0 },
  avatarText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  bubble: { flex: 1, backgroundColor: '#fff', borderRadius: 12, padding: 12, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 1 },
  bubbleHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  commenterName: { fontSize: 13, fontWeight: '700', color: '#111827' },
  commentTime: { fontSize: 12, color: '#9CA3AF' },
  commentText: { fontSize: 14, color: '#374151', lineHeight: 20 },
  inputBar: { flexDirection: 'row', alignItems: 'flex-end', padding: 12, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#E5E7EB' },
  textInput: { flex: 1, borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 10, fontSize: 15, backgroundColor: '#F9FAFB', maxHeight: 100, marginRight: 8 },
  sendBtn: { backgroundColor: '#2563EB', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10 },
  sendBtnDisabled: { backgroundColor: '#93C5FD' },
  sendBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
});
