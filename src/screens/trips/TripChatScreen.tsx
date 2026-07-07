import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { RouteProp, useRoute } from '@react-navigation/native';
import { TripStackParamList } from '../../navigation/types';
import { fetchMessages, sendMessage, deleteMessage, TripMessage } from '../../api/tripChat';
import { useAuthStore } from '../../store/authStore';
import { formatDistanceToNow } from 'date-fns';

type Route = RouteProp<TripStackParamList, 'TripChat'>;

export default function TripChatScreen() {
  const route = useRoute<Route>();
  const { tripId } = route.params;
  const user = useAuthStore((s) => s.user);

  const [messages, setMessages] = useState<TripMessage[]>([]);
  const [text, setText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const listRef = useRef<FlatList<TripMessage>>(null);

  const load = useCallback(async () => {
    try {
      const data = await fetchMessages(tripId);
      setMessages(data);
    } catch {}
  }, [tripId]);

  useEffect(() => {
    load();
    const interval = setInterval(load, 10000);
    return () => clearInterval(interval);
  }, [load]);

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages]);

  async function handleSend() {
    if (!text.trim() || !user) return;
    setSubmitting(true);
    try {
      await sendMessage(tripId, user.id, text.trim());
      setText('');
      await load();
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleLongPress(msg: TripMessage) {
    if (msg.user_id !== user?.id) return;
    Alert.alert('Delete message?', undefined, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteMessage(msg.id);
            await load();
          } catch {}
        },
      },
    ]);
  }

  function renderMessage({ item }: { item: TripMessage }) {
    const isOwn = item.user_id === user?.id;
    const initial = (item.profile?.display_name ?? 'U')[0].toUpperCase();
    const name = item.profile?.display_name ?? 'Member';
    const timeAgo = formatDistanceToNow(new Date(item.created_at), { addSuffix: true });

    return (
      <TouchableOpacity
        activeOpacity={isOwn ? 0.7 : 1}
        onLongPress={() => handleLongPress(item)}
        style={[styles.messageRow, isOwn ? styles.messageRowOwn : styles.messageRowOther]}
      >
        {!isOwn && (
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initial}</Text>
          </View>
        )}
        <View style={[styles.bubble, isOwn ? styles.bubbleOwn : styles.bubbleOther]}>
          {!isOwn && <Text style={styles.senderName}>{name}</Text>}
          <Text style={[styles.messageText, isOwn ? styles.messageTextOwn : styles.messageTextOther]}>
            {item.message}
          </Text>
          <Text style={[styles.timeText, isOwn ? styles.timeTextOwn : styles.timeTextOther]}>
            {timeAgo}
          </Text>
        </View>
        {isOwn && (
          <View style={[styles.avatar, styles.avatarOwn]}>
            <Text style={styles.avatarText}>{initial}</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}
    >
      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(m) => m.id}
        renderItem={renderMessage}
        contentContainerStyle={messages.length === 0 ? styles.emptyContainer : styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No messages yet. Say hello! 👋</Text>
          </View>
        }
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
      />
      <View style={styles.inputBar}>
        <TextInput
          style={styles.textInput}
          placeholder="Type a message..."
          value={text}
          onChangeText={setText}
          multiline
          maxLength={1000}
          returnKeyType="default"
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

  messageRow: { flexDirection: 'row', marginBottom: 12, alignItems: 'flex-end' },
  messageRowOwn: { justifyContent: 'flex-end' },
  messageRowOther: { justifyContent: 'flex-start' },

  avatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  avatarOwn: { marginLeft: 8 },
  avatarText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  bubble: { maxWidth: '72%', borderRadius: 16, paddingHorizontal: 14, paddingVertical: 10 },
  bubbleOwn: { backgroundColor: '#2563EB', borderBottomRightRadius: 4, marginRight: 0 },
  bubbleOther: { backgroundColor: '#F3F4F6', borderBottomLeftRadius: 4, marginLeft: 8 },

  senderName: { fontSize: 12, fontWeight: '700', color: '#6B7280', marginBottom: 3 },

  messageText: { fontSize: 15, lineHeight: 21 },
  messageTextOwn: { color: '#fff' },
  messageTextOther: { color: '#111827' },

  timeText: { fontSize: 11, marginTop: 4 },
  timeTextOwn: { color: 'rgba(255,255,255,0.65)', textAlign: 'right' },
  timeTextOther: { color: '#9CA3AF' },

  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 12,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    backgroundColor: '#F9FAFB',
    maxHeight: 100,
    marginRight: 8,
  },
  sendBtn: { backgroundColor: '#2563EB', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10 },
  sendBtnDisabled: { backgroundColor: '#93C5FD' },
  sendBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
});
