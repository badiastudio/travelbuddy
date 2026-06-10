import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function MapViewScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.icon}>🗺️</Text>
      <Text style={styles.text}>Map view is available on the mobile app</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F9FAFB', padding: 40 },
  icon: { fontSize: 48, marginBottom: 16 },
  text: { fontSize: 16, color: '#6B7280', textAlign: 'center' },
});
