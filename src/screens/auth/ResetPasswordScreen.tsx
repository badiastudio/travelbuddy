import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/authStore';
import Button from '../../components/common/Button';

export default function ResetPasswordScreen() {
  const setPasswordRecovery = useAuthStore((s) => s.setPasswordRecovery);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSave() {
    if (password.length < 6) {
      Alert.alert('Password too short', 'Password must be at least 6 characters.');
      return;
    }
    if (password !== confirm) {
      Alert.alert('Passwords differ', 'Both fields must match.');
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setPasswordRecovery(false);
      Alert.alert('Password updated', 'You are signed in with your new password.');
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.inner}>
        <Text style={styles.title}>New Password</Text>
        <Text style={styles.subtitle}>Choose a new password for your account.</Text>
        <TextInput
          style={styles.input}
          placeholder="New password"
          secureTextEntry
          autoCapitalize="none"
          autoComplete="new-password"
          value={password}
          onChangeText={setPassword}
        />
        <TextInput
          style={styles.input}
          placeholder="Repeat new password"
          secureTextEntry
          autoCapitalize="none"
          autoComplete="new-password"
          value={confirm}
          onChangeText={setConfirm}
        />
        <Button title="Save New Password" onPress={handleSave} loading={loading} />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  inner: { flex: 1, padding: 24, justifyContent: 'center' },
  title: { fontSize: 26, fontWeight: '700', marginBottom: 12, color: '#111827' },
  subtitle: { fontSize: 15, color: '#6B7280', marginBottom: 24 },
  input: { borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 10, padding: 14, fontSize: 16, marginBottom: 14, backgroundColor: '#F9FAFB' },
});
