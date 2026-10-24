import { useEffect, useState } from 'react';
import { Image, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import type { GalleryPhoto } from '../content/commonsGallery';
import { errorText } from '../diagnostics/log';
import { loadGallery } from '../guide/services';
import { colors } from './theme';

const HEIGHT = 160;

export function GalleryStrip({ wikidataId }: { wikidataId: string }) {
  const [photos, setPhotos] = useState<GalleryPhoto[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadGallery(wikidataId)
      .then((result) => !cancelled && setPhotos(result))
      .catch((e: unknown) => !cancelled && setError(errorText(e)));
    return () => {
      cancelled = true;
    };
  }, [wikidataId]);

  if (error) return <Text style={styles.muted}>Could not load photos: {error}</Text>;
  if (!photos) return <Text style={styles.muted}>Looking for old and new photos…</Text>;
  if (photos.length === 0) return <Text style={styles.muted}>No photo collection on Wikimedia Commons for this place.</Text>;
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.strip} testID="gallery">
      {photos.map((photo) => (
        <Pressable key={photo.pageUrl} onPress={() => void Linking.openURL(photo.pageUrl)} style={styles.item}>
          <Image source={{ uri: photo.thumbUrl }} style={{ height: HEIGHT, width: (HEIGHT * photo.width) / photo.height, borderRadius: 8 }} />
          <View style={[styles.badge, photo.historic && styles.historic]}>
            <Text style={styles.badgeText}>{photo.year ? `${photo.historic ? 'Then · ' : ''}${photo.year}` : 'Now'}</Text>
          </View>
          <Text style={styles.credit} numberOfLines={1}>
            {photo.credit}
          </Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  strip: { gap: 8, paddingVertical: 4 },
  item: { maxWidth: 260 },
  badge: { position: 'absolute', top: 6, left: 6, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, backgroundColor: '#000000AA' },
  historic: { backgroundColor: '#8D6E27DD' },
  badgeText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },
  credit: { color: colors.muted, fontSize: 10, marginTop: 2 },
  muted: { color: colors.muted, fontSize: 13 },
});
