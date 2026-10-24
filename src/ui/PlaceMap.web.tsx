import { StyleSheet, Text, View } from 'react-native';

import type { PlaceMapProps } from './placeMapProps';
import { colors } from './theme';

export function PlaceMap({ nearby, discoveredIds, onSelect }: PlaceMapProps) {
  const told = new Set(discoveredIds);
  return (
    <View style={styles.container} testID="place-map">
      <Text style={styles.note}>The interactive map is in the Android app. Places around you:</Text>
      {nearby.map(({ poi, distanceM }) => (
        <Text key={poi.id} style={styles.place} onPress={() => onSelect(poi.id)}>
          {told.has(poi.id) ? '✓' : '•'} {poi.title} · {Math.round(distanceM)} m
        </Text>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, gap: 8 },
  note: { color: colors.muted },
  place: { color: colors.text, fontSize: 15 },
});
