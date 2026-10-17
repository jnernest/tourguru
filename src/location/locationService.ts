import * as Location from 'expo-location';
import { Platform } from 'react-native';

import type { LatLon } from '../geo/geo';
import { toFix, type Fix } from './fix';

// A distance threshold alone means no updates at all while the user sits still; use a time
// interval instead (Android only; iOS reports on change regardless).
const DISTANCE_INTERVAL_M = 0;
const TIME_INTERVAL_MS = 5_000;

/** ISO country code at a coordinate via the phone's geocoder. Not available on web. */
export async function lookupCountry(center: LatLon): Promise<string | null> {
  if (Platform.OS === 'web') {
    return null;
  }
  const [address] = await Location.reverseGeocodeAsync({
    latitude: center.lat,
    longitude: center.lon,
  });
  return address?.isoCountryCode ?? null;
}

/** Starts foreground GPS updates. Returns an unsubscribe function. */
export async function startLocationWatch(
  onFix: (fix: Fix) => void,
  onError: (reason: string) => void,
): Promise<() => void> {
  const permission = await Location.requestForegroundPermissionsAsync();
  if (permission.status !== Location.PermissionStatus.GRANTED) {
    throw new Error('Location permission was not granted.');
  }
  const subscription = await Location.watchPositionAsync(
    {
      accuracy: Location.Accuracy.High,
      distanceInterval: DISTANCE_INTERVAL_M,
      timeInterval: TIME_INTERVAL_MS,
    },
    (location) => onFix(toFix(location.coords, location.timestamp)),
    onError,
  );
  return () => subscription.remove();
}
