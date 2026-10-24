import type { ReactElement } from 'react';
import { FlatList, Pressable, StyleSheet, Text } from 'react-native';

import { openLabel } from '../pois/openingHours';
import type { RankedPoi } from '../pois/poiRanker';
import { PlaceImage } from './PlaceImage';
import { colors } from './theme';

interface Props {
  items: RankedPoi[];
  lang: string;
  onSelect: (poiId: string) => void;
  header?: ReactElement;
  discoveredIds: string[];
}

function formatDistance(m: number): string {
  return m < 1000 ? `${Math.round(m)} m` : `${(m / 1000).toFixed(1)} km`;
}

function hoursLabel(spec: string | null | undefined): string {
  const label = openLabel(spec, new Date());
  return label ? ` · ${label}` : '';
}

export function NearbyList({ items, lang, onSelect, header, discoveredIds }: Props) {
  const discovered = new Set(discoveredIds);
  return (
    <FlatList
      data={items}
      keyExtractor={(item) => item.poi.id}
      ListHeaderComponent={
        <>
          {header}
          <Text style={styles.header}>Nearby ({items.length}) · tap a place to hear about it</Text>
        </>
      }
      renderItem={({ item }) => (
        <Pressable
          accessibilityRole="button"
          onPress={() => onSelect(item.poi.id)}
          style={({ pressed }) => [styles.row, pressed && styles.pressed]}
        >
          <PlaceImage image={item.poi.image} title={item.poi.title} style={styles.thumb} />
          <Text style={[styles.title, discovered.has(item.poi.id) && styles.heard]} numberOfLines={2}>
            {discovered.has(item.poi.id) ? '✓ ' : ''}
            {item.poi.title}
          </Text>
          <Text style={styles.meta}>
            {formatDistance(item.distanceM)}
            {item.ahead ? ' · ahead' : ''}
            {item.poi.lang !== lang ? ` · ${item.poi.lang.toUpperCase()}` : ''}
            {hoursLabel(item.poi.openingHours)}
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
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  pressed: { backgroundColor: colors.surface },
  thumb: { width: 52, height: 52, borderRadius: 8 },
  title: { flex: 1, color: colors.text },
  heard: { color: colors.muted },
  meta: { color: colors.muted },
});
