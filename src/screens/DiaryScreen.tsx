import { FlatList, Image, Linking, Pressable, Share, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useGuideContext } from '../guide/GuideContext';
import { colors } from '../ui/theme';
import { walkSummary, type Walk } from '../walk/diary';

function formatDistance(m: number): string {
  return m < 1000 ? `${Math.round(m)} m` : `${(m / 1000).toFixed(1)} km`;
}

function WalkCard({ walk }: { walk: Walk }) {
  const date = new Date(walk.startedAt);
  const minutes = walk.endedAt ? Math.round((walk.endedAt - walk.startedAt) / 60_000) : null;
  return (
    <View style={styles.card}>
      <Text style={styles.title}>
        {date.toLocaleDateString()} · {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </Text>
      <Text style={styles.muted}>
        {walk.places.length} {walk.places.length === 1 ? 'place' : 'places'} · {formatDistance(walk.distanceM)}
        {minutes !== null ? ` · ${minutes} min` : ''}
      </Text>
      {walk.places.map((place) => (
        <Pressable key={place.id} style={styles.place} onPress={() => void Linking.openURL(place.url)}>
          {place.imageUrl && <Image source={{ uri: place.imageUrl }} style={styles.thumb} />}
          <View style={styles.placeText}>
            <Text style={styles.placeTitle}>{place.title}</Text>
            <Text style={styles.narration} numberOfLines={3}>
              {place.narration}
            </Text>
          </View>
        </Pressable>
      ))}
      <Text
        style={styles.share}
        accessibilityRole="button"
        onPress={() => Share.share({ message: walkSummary(walk) }).catch(() => undefined)}
      >
        📤 Share this walk
      </Text>
    </View>
  );
}

export function DiaryScreen() {
  const { diary } = useGuideContext();
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Text style={styles.heading}>Walk diary</Text>
      <FlatList
        data={diary.walks}
        keyExtractor={(walk) => walk.id}
        renderItem={({ item }) => <WalkCard walk={item} />}
        ListEmptyComponent={<Text style={[styles.muted, styles.empty]}>Your walks appear here after you stop one.</Text>}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  heading: { fontSize: 24, fontWeight: '800', paddingHorizontal: 16, paddingVertical: 8, color: colors.text },
  card: { marginHorizontal: 16, marginBottom: 12, padding: 14, borderRadius: 12, backgroundColor: colors.surface, gap: 8 },
  title: { color: colors.text, fontSize: 16, fontWeight: '700' },
  muted: { color: colors.muted },
  empty: { paddingHorizontal: 16 },
  place: { flexDirection: 'row', gap: 10 },
  thumb: { width: 56, height: 56, borderRadius: 8 },
  placeText: { flex: 1 },
  placeTitle: { color: colors.text, fontWeight: '600' },
  narration: { color: colors.muted, fontSize: 13 },
  share: { color: colors.primary, fontWeight: '600' },
});
