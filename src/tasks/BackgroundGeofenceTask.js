/**
 * BackgroundGeofenceTask.js
 *
 * Registers a background location task using expo-task-manager + expo-location.
 * This runs even when the app is in background or killed, periodically checking
 * if the user has entered any active alarm's geofence radius, and fires a
 * high-priority local notification if so.
 */

import * as TaskManager from 'expo-task-manager';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const BACKGROUND_GEOFENCE_TASK = 'BACKGROUND_GEOFENCE_TASK';

// Haversine distance (returns meters)
function getDistance(c1, c2) {
  const R = 6371e3;
  const lat1 = c1.latitude * Math.PI / 180;
  const lat2 = c2.latitude * Math.PI / 180;
  const dLat = (c2.latitude - c1.latitude) * Math.PI / 180;
  const dLng = (c2.longitude - c1.longitude) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Register the background task at module load time (MUST be at top level)
TaskManager.defineTask(BACKGROUND_GEOFENCE_TASK, async ({ data, error }) => {
  if (error) {
    console.error('[BGTask] Error:', error);
    return;
  }

  if (!data) return;

  const { locations } = data;
  if (!locations || locations.length === 0) return;

  const location = locations[locations.length - 1];
  const coords = {
    latitude: location.coords.latitude,
    longitude: location.coords.longitude,
  };

  try {
    // Load alarms from AsyncStorage
    const alarmsRaw = await AsyncStorage.getItem('rum_active_alarms');
    if (!alarmsRaw) return;
    const alarms = JSON.parse(alarmsRaw);
    if (!alarms || alarms.length === 0) return;

    // Load companion info
    const stateRaw = await AsyncStorage.getItem('rum_app_state');
    const appState = stateRaw ? JSON.parse(stateRaw) : {};
    const companionType = appState.companionType || 'dog';
    const companionName = appState.companionName || 'Rum';

    // Load already-notified set to avoid repeat fire
    const notifiedRaw = await AsyncStorage.getItem('rum_bg_notified') || '{}';
    const notified = JSON.parse(notifiedRaw);

    const soundMap = {
      dog: 'Bow-Bow', cat: 'Meow-Meow', rabbit: 'Thump-Thump', bird: 'Tweet-Tweet', fish: 'Glub-Glub'
    };
    const emojiMap = {
      dog: '🐶', cat: '🐱', rabbit: '🐰', bird: '🐦', fish: '🐠'
    };
    const sound = soundMap[companionType] || 'Bow-Wow';
    const emoji = emojiMap[companionType] || '🐶';
    const name = companionName;

    let notifiedChanged = false;

    for (const alarm of alarms) {
      if (!alarm.isActive) continue;

      const dist = getDistance(coords, alarm.coords);

      // APPROACHING warning: 2km before perimeter
      const approachKey = `approach_${alarm.id}`;
      if (dist <= alarm.radius + 2000 && !notified[approachKey]) {
        notified[approachKey] = true;
        notifiedChanged = true;

        await Notifications.scheduleNotificationAsync({
          content: {
            title: `${emoji} ${name} says: Almost there!`,
            body: `"${sound}! ${sound}!" — You're 2km from ${alarm.name}! Get ready to wake up!`,
            sound: 'default',
            priority: 'max',
            vibrate: [0, 250, 250, 250],
            data: { alarmId: alarm.id, type: 'approaching' },
          },
          trigger: null,
        });
      }

      // PERIMETER REACHED: fire full alarm notification
      const triggeredKey = `triggered_${alarm.id}`;
      if (dist <= alarm.radius && !notified[triggeredKey]) {
        notified[triggeredKey] = true;
        notifiedChanged = true;

        await Notifications.scheduleNotificationAsync({
          content: {
            title: `🚨 ${name} says: WAKE UP! You've arrived!`,
            body: `"${sound}! ${sound}!" — You've reached ${alarm.name}! Wake up, wake up!`,
            sound: 'default',
            priority: 'max',
            vibrate: [0, 500, 200, 500],
            sticky: true,
            data: { alarmId: alarm.id, type: 'triggered' },
          },
          trigger: null,
        });
      }
    }

    if (notifiedChanged) {
      await AsyncStorage.setItem('rum_bg_notified', JSON.stringify(notified));
    }
  } catch (e) {
    console.error('[BGTask] Exception:', e);
  }
});

/**
 * Start the background geofence tracking task.
 * Call this when the user arms an alarm.
 */
export async function startBackgroundGeofenceTask() {
  try {
    const { status: fgStatus } = await Location.requestForegroundPermissionsAsync();
    if (fgStatus !== 'granted') {
      console.log('[BGTask] Foreground location permission not granted');
      return false;
    }

    const { status: bgStatus } = await Location.requestBackgroundPermissionsAsync();
    if (bgStatus !== 'granted') {
      console.log('[BGTask] Background location permission not granted. On Android 10+, user must enable "Allow all the time" manually.');
      // Still try to start - will work in foreground/background mode
    }

    const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_GEOFENCE_TASK);
    if (!isRegistered) {
      await Location.startLocationUpdatesAsync(BACKGROUND_GEOFENCE_TASK, {
        accuracy: Location.Accuracy.Balanced,
        timeInterval: 10000,       // Check every 10 seconds
        distanceInterval: 30,      // Or when moved 30 meters
        showsBackgroundLocationIndicator: true,
        foregroundService: {
          notificationTitle: '🐾 Geofence Alarm Active',
          notificationBody: 'Bow-Bow is watching your location for the alarm.',
          notificationColor: '#2563eb',
        },
        pausesUpdatesAutomatically: false,
        activityType: Location.ActivityType.AutomotiveNavigation,
      });
      console.log('[BGTask] Background geofence task started');
    }
    return true;
  } catch (e) {
    console.error('[BGTask] Failed to start:', e);
    return false;
  }
}

/**
 * Stop the background geofence tracking task.
 * Call this when all alarms are deleted or user disarms.
 */
export async function stopBackgroundGeofenceTask() {
  try {
    const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_GEOFENCE_TASK);
    if (isRegistered) {
      await Location.stopLocationUpdatesAsync(BACKGROUND_GEOFENCE_TASK);
      console.log('[BGTask] Background geofence task stopped');
    }
    // Clear notified cache
    await AsyncStorage.removeItem('rum_bg_notified');
  } catch (e) {
    console.error('[BGTask] Failed to stop:', e);
  }
}
