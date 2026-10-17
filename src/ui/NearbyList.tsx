import { FlatList, Pressable, StyleSheet, Text } from 'react-native';

import type { RankedPoi } from '../pois/poiRanker';
import { colors } from './theme';

interface Props {
  items: RankedPoi[];
  /** The narration language; places from another Wikipedia edition get a language tag. */
  lang: string;
  /** Tap a place to hear about it now. */
  onSelect: (poiId: string) => void;
}

function formatDistance(m: number): string {
  return m < 1000 ? `${Math.round(m)} m` : `${(m / 1000).toFixed(1)} km`;
}

export function NearbyList({ items, lang, onSelect }: Props) {
  return (
    <FlatList
      data={items}
      keyExtractor={(item) => item.poi.id}
      ListHeaderComponent={
        <Text style={styles.header}>Nearby ({items.length}) · tap a place to hear about it</Text>
      }
      renderItem={({ item }) => (
        <Pressable
          accessibilityRole="button"
          onPress={() => onSelect(item.poi.id)}
          style={({ pressed }) => [styles.row, pressed && styles.pressed]}
        >
          <Text style={styles.title} numberOfLines={1}>
            {item.poi.title}
          </Text>
          <Text style={styles.meta}>
            {formatDistance(item.distanceM)}
            {item.ahead ? ' · ahead' : ''}
            {item.poi.lang !== lang ? ` · ${item.poi.lang.toUpperCase()}` : ''}
          </Text>
        </Pressable>
      )}
    />
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 16, paddingVertical: 8, color: colors.muted, fontWeight: '600' },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  pressed: { backgroundColor: colors.surface },
  title: { flex: 1, color: colors.text },
  meta: { color: colors.muted },
});
