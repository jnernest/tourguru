import { useState } from 'react';
import { Image, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { USER_AGENT } from '../config';
import type { PoiImage } from '../pois/types';
import { colors } from './theme';

interface Props {
  image: PoiImage | null;
  title: string;
  style: StyleProp<ViewStyle>;
}

// Sends the app's User-Agent, as Wikimedia asks of API clients.
export function PlaceImage({ image, title, style }: Props) {
  const [failed, setFailed] = useState(false);
  if (!image || failed) {
    return (
      <View style={[styles.placeholder, style]} accessibilityLabel={title}>
        <Text style={styles.initial}>{title.charAt(0).toUpperCase()}</Text>
      </View>
    );
  }
  return (
    <Image
      source={{ uri: image.url, headers: { 'User-Agent': USER_AGENT } }}
      style={[styles.image, style as object]}
      resizeMode="cover"
      accessibilityLabel={title}
      onError={() => setFailed(true)}
    />
  );
}

const styles = StyleSheet.create({
  image: { backgroundColor: colors.surface },
  placeholder: { backgroundColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  initial: { color: colors.onPrimary, fontSize: 22, fontWeight: '700' },
});
