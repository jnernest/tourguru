import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';

import { bearingDegrees, distanceMeters, relativeDirection, type Direction } from '../geo/geo';
import type { Fix } from '../location/fix';
import { googleMapsWalkUrl, nextStop, type RoutePlan } from '../route/planner';
import { colors } from './theme';

interface Props {
  plan: RoutePlan;
  position: Fix | null;
  isTold: (poiId: string) => boolean;
  onEnd: () => void;
}

const SIDE: Record<Direction, string> = {
  ahead: 'ahead',
  right: 'on your right',
  left: 'on your left',
  behind: 'behind you',
};

function formatDistance(m: number): string {
  return m < 1000 ? `${Math.round(m / 10) * 10} m` : `${(m / 1000).toFixed(1)} km`;
}

function nextStopLine(position: Fix | null, stop: { title: string; lat: number; lon: number }): string {
  if (!position) return stop.title;
  const distance = formatDistance(distanceMeters(position, stop));
  const side = position.heading === null ? '' : ` ${SIDE[relativeDirection(bearingDegrees(position, stop), position.heading)]}`;
  return `${stop.title} · ${distance}${side}`;
}

export function RouteCard({ plan, position, isTold, onEnd }: Props) {
  const next = nextStop(plan, isTold);
  const visited = plan.stops.filter((s) => isTold(s.id)).length;
  const remaining = plan.stops.filter((s) => !isTold(s.id));
  const openMaps = () => {
    if (position && remaining.length > 0) void Linking.openURL(googleMapsWalkUrl(position, remaining));
  };

  return (
    <View style={styles.card}>
      <Text style={styles.label}>
        Your walk · {plan.stops.length} stops · {formatDistance(plan.distanceM)} · ~{plan.minutes} min
      </Text>
      {next ? (
        <Text style={styles.next}>Next: {nextStopLine(position, next)}</Text>
      ) : (
        <Text style={styles.next}>🎉 Walk complete — you heard about every stop!</Text>
      )}
      <Text style={styles.stops} numberOfLines={3}>
        {plan.stops.map((s, i) => `${isTold(s.id) ? '✓' : `${i + 1}.`} ${s.title}`).join('   ')}
      </Text>
      <Text style={styles.progress}>
        {visited} of {plan.stops.length} visited
      </Text>
      <View style={styles.actions}>
        {next && (
          <Pressable accessibilityRole="button" onPress={openMaps} style={styles.primary}>
            <Text style={styles.primaryText}>Open in Google Maps</Text>
          </Pressable>
        )}
        <Pressable accessibilityRole="button" onPress={onEnd} style={styles.secondary}>
          <Text style={styles.secondaryText}>End walk plan</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { marginHorizontal: 16, marginBottom: 8, padding: 14, borderRadius: 12, backgroundColor: colors.surface, gap: 6 },
  label: { color: colors.muted, fontSize: 12, textTransform: 'uppercase' },
  next: { color: colors.text, fontSize: 16, fontWeight: '700' },
  stops: { color: colors.muted, fontSize: 13 },
  progress: { color: colors.primary, fontSize: 13, fontWeight: '600' },
  actions: { flexDirection: 'row', gap: 8, marginTop: 4 },
  primary: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 8, backgroundColor: colors.primary },
  primaryText: { color: colors.onPrimary, fontWeight: '600' },
  secondary: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 8, borderWidth: 1, borderColor: colors.border },
  secondaryText: { color: colors.text },
});
