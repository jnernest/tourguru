import { useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';

import type { GuideStatus } from '../guide/guideController';
import type { Poi } from '../pois/types';
import { googleMapsWalkToUrl } from '../route/planner';
import { PlaceImage } from './PlaceImage';
import { colors } from './theme';

interface Props {
  poi: Poi | null;
  narration: string | null;
  status: GuideStatus;
  onSkip: () => void;
  onMore: () => void;
}

const MIN_ASPECT = 4 / 3;
const MAX_ASPECT = 16 / 9;
const COLLAPSED_LINES = 2;

export function NowPlayingCard({ poi, narration, status, onSkip, onMore }: Props) {
  const [expanded, setExpanded] = useState(false);
  if (!poi) {
    return (
      <View style={[styles.card, styles.padded]}>
        <Text style={styles.muted}>Walk around — I’ll speak up when you pass something interesting.</Text>
      </View>
    );
  }
  const narrating = status === 'narrating';
  const aspect = poi.image ? Math.min(MAX_ASPECT, Math.max(MIN_ASPECT, poi.image.width / poi.image.height)) : MAX_ASPECT;
  return (
    <View style={styles.card}>
      <PlaceImage image={poi.image} title={poi.title} style={[styles.photo, { aspectRatio: aspect }]} />
      <View style={styles.padded}>
        <Text style={styles.label}>{narrating ? 'Now telling' : 'Last place'}</Text>
        <Text style={styles.title}>{poi.title}</Text>
        <Text
          style={styles.narration}
          testID="narration"
          numberOfLines={expanded ? undefined : COLLAPSED_LINES}
          onPress={() => setExpanded((e) => !e)}
        >
          {narration ?? 'Preparing…'}
        </Text>
        {/* CC BY-SA 4.0 requires attribution and a link to the source. */}
        <Text style={styles.attribution} onPress={() => void Linking.openURL(poi.url)}>
          Based on {poi.lang}.wikipedia.org (CC BY-SA 4.0){poi.image ? ' · photo: Wikimedia Commons' : ''} — open article
        </Text>
        <View style={styles.buttons}>
          <Pressable accessibilityRole="button" onPress={onMore} style={[styles.skip, styles.more]}>
            <Text style={[styles.skipText, styles.moreText]}>📜 Tell me more</Text>
          </Pressable>
          <Pressable
            accessibilityRole="link"
            accessibilityLabel={`Walking directions to ${poi.title} in Google Maps`}
            onPress={() => void Linking.openURL(googleMapsWalkToUrl(poi))}
            style={styles.skip}
          >
            <Text style={styles.skipText}>🧭 Walk there</Text>
          </Pressable>
          {narrating && (
            <Pressable accessibilityRole="button" onPress={onSkip} style={styles.skip}>
              <Text style={styles.skipText}>Skip</Text>
            </Pressable>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { margin: 16, borderRadius: 12, backgroundColor: colors.surface, overflow: 'hidden' },
  padded: { padding: 16, gap: 6 },
  photo: { width: '100%', maxHeight: 220 },
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
  buttons: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  more: { backgroundColor: colors.primary },
  moreText: { color: colors.onPrimary },
});
