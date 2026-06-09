import React from 'react';
import { View, StyleSheet, Text, Dimensions, SafeAreaView } from 'react-native';
import { Image } from 'expo-image';
import { WebView } from 'react-native-webview';
import { RouteProp, useRoute } from '@react-navigation/native';
import { TripStackParamList } from '../../navigation/types';

type Route = RouteProp<TripStackParamList, 'MediaDetail'>;

export default function MediaDetailScreen() {
  const route = useRoute<Route>();
  const { signedUrl, mimeType, fileName } = route.params;
  const isImage = mimeType.startsWith('image/');

  return (
    <View style={styles.container}>
      {isImage ? (
        <Image
          source={{ uri: signedUrl }}
          style={styles.image}
          contentFit="contain"
        />
      ) : (
        <SafeAreaView style={styles.container}>
          <Text style={styles.fileName}>{fileName}</Text>
          <WebView source={{ uri: signedUrl }} style={styles.webview} />
        </SafeAreaView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  image: { flex: 1, width: Dimensions.get('window').width },
  fileName: { color: '#fff', textAlign: 'center', padding: 12, fontSize: 15 },
  webview: { flex: 1 },
});
