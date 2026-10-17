import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';

import type { GuideStatus } from '../guide/guideController';
import type { Poi } from '../pois/types';
import { colors } from './theme';

interface Props {
  poi: Poi | null;
  narration: string | null;
  status: GuideStatus;
  onSkip: () => void;
}

export function NowPlayingCard({ poi, narration, status, onSkip }: Props) {
  if (!poi) {
    return (
      <View style={styles.card}>
        <Text style={styles.muted}>Walk around — I’ll speak up when you pass something interesting.</Text>
      </View>
    );
  }
  const narrating = status === 'narrating';
  return (
    <View style={styles.card}>
      <Text style={styles.label}>{narrating ? 'Now telling' : 'Last place'}</Text>
      <Text style={styles.title}>{poi.title}</Text>
      <Text style={styles.narration} testID="narration">
        {narration ?? 'Preparing…'}
      </Text>
      {/* CC BY-SA 4.0 requires attribution and a link to the source. */}
      <Text style={styles.attribution} onPress={() => void Linking.openURL(poi.url)}>
        Based on {poi.lang}.wikipedia.org (CC BY-SA 4.0) — open article
      </Text>
      {narrating && (
        <Pressable accessibilityRole="button" onPress={onSkip} style={styles.skip}>
          <Text style={styles.skipText}>Skip</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { margin: 16, padding: 16, borderRadius: 12, backgroundColor: colors.surface, gap: 6 },
  label: { color: colors.muted, fontSize: 12, textTransform: 'uppercase' },
  title: { color: colors.text, fontSize: 20, fontWeight: '700' },
  narration: { color: colors.text, fontSize: 15, lineHeight: 21 },
  attribution: { color: colors.primary, fontSize: 12, textDecorationLine: 'underline' },
  muted: { color: colors.muted },
  skip: {
    alignSelf: 'flex-start',
    marginTop: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  skipText: { color: colors.primary, fontWeight: '600' },
});
