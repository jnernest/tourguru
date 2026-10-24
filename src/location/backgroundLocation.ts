import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';

import { toFix, type Fix } from './fix';

const TASK = 'tourguide-location';
const TIME_INTERVAL_MS = 5_000;

const listeners = new Set<(fix: Fix) => void>();

TaskManager.defineTask<{ locations: Location.LocationObject[] }>(TASK, async ({ data, error }) => {
  if (error || !data) return;
  for (const location of data.locations) {
    const fix = toFix(location.coords, location.timestamp);
    listeners.forEach((listener) => listener(fix));
  }
});

export async function startBackgroundWatch(onFix: (fix: Fix) => void): Promise<() => void> {
  const foreground = await Location.requestForegroundPermissionsAsync();
  if (foreground.status !== Location.PermissionStatus.GRANTED) {
    throw new Error('Location permission was not granted.');
  }
  const background = await Location.requestBackgroundPermissionsAsync();
  if (background.status !== Location.PermissionStatus.GRANTED) {
    throw new Error('To guide with the screen off, allow location "All the time" for TourGuide in Android settings.');
  }
  listeners.add(onFix);
  if (!(await Location.hasStartedLocationUpdatesAsync(TASK))) {
    await Location.startLocationUpdatesAsync(TASK, {
      accuracy: Location.Accuracy.High,
      distanceInterval: 0,
      timeInterval: TIME_INTERVAL_MS,
      foregroundService: {
        notificationTitle: 'TourGuide is guiding your walk',
        notificationBody: 'Tells you about places as you pass them. Stop the walk in the app to end.',
        notificationColor: '#1B5E7A',
        killServiceOnDestroy: true,
      },
    });
  }
  return () => {
    listeners.delete(onFix);
    if (listeners.size === 0) void Location.stopLocationUpdatesAsync(TASK).catch(() => undefined);
  };
}
