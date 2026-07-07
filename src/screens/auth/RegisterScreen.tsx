import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, KeyboardAvoidingView, Platform, TouchableOpacity, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { signUp } from '../../api/auth';
import Button from '../../components/common/Button';
import { AuthStackParamList } from '../../navigation/types';

type Nav = StackNavigationProp<AuthStackParamList, 'Register'>;

export default function RegisterScreen() {
  const nav = useNavigation<Nav>();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleRegister() {
    if (!name || !email || !password) {
      Alert.alert('Please fill in all fields');
      return;
    }
    setLoading(true);
    try {
      await signUp(email.trim(), password, name.trim());
      Alert.alert('Account created!', 'Please check your email to confirm your account.');
      nav.navigate('Login');
    } catch (e: any) {
      Alert.alert('Registration failed', e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.inner}>
        <Text style={styles.logo}>✈️ travelBuddy</Text>
        <Text style={styles.title}>Create account</Text>

        <TextInput style={styles.input} placeholder="Your name" value={name} onChangeText={setName} />
        <TextInput style={styles.input} placeholder="Email" autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail} />
        <TextInput style={styles.input} placeholder="Password (min 6 chars)" secureTextEntry value={password} onChangeText={setPassword} />

        <Button title="Sign Up" onPress={handleRegister} loading={loading} style={styles.btn} />

        <TouchableOpacity onPress={() => nav.navigate('Login')}>
          <Text style={styles.link}>Already have an account? <Text style={styles.linkBold}>Log in</Text></Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  inner: { flex: 1, padding: 24, justifyContent: 'center' },
  logo: { fontSize: 32, textAlign: 'center', marginBottom: 8 },
  title: { fontSize: 26, fontWeight: '700', textAlign: 'center', marginBottom: 32, color: '#111827' },
  input: { borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 10, padding: 14, fontSize: 16, marginBottom: 14, backgroundColor: '#F9FAFB' },
  btn: { marginTop: 8, marginBottom: 20 },
  link: { textAlign: 'center', color: '#6B7280', marginTop: 12, fontSize: 15 },
  linkBold: { color: '#2563EB', fontWeight: '600' },
});
