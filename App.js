import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, StatusBar, Text, ScrollView, TouchableOpacity, Platform, Animated, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getDistance } from 'geolib';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import { ThemeProvider, useTheme } from './src/components/ThemeContext';
import {
  startBackgroundGeofenceTask,
  stopBackgroundGeofenceTask,
  BACKGROUND_GEOFENCE_TASK,
} from './src/tasks/BackgroundGeofenceTask';

// Configure notification behavior (show even when app is in foreground)
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// Import Screens
import HomeScreen from './src/screens/HomeScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import TrackingScreen from './src/screens/TrackingScreen';
import RingingScreen from './src/screens/RingingScreen';
import SoundsScreen from './src/screens/SoundsScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import AnimatedTabBar from './src/components/AnimatedTabBar';
import ProfileSetupModal from './src/components/ProfileSetupModal';

// Splash Screen
import MascotRum from './src/components/MascotRum';

// Error Boundary Component
class ErrorBoundary extends React.Component {
  state = { hasError: false, error: null, errorInfo: null };

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error", error, errorInfo);
    this.setState({ errorInfo });
    try {
      AsyncStorage.setItem('rum_last_crash', JSON.stringify({
        message: error.message || String(error),
        stack: error.stack || '',
        info: errorInfo ? errorInfo.componentStack : ''
      }));
    } catch (e) {}
  }

  render() {
    if (this.state.hasError) {
      return (
        <SafeAreaView style={{ flex: 1, backgroundColor: '#1c1412', padding: 20, justifyContent: 'center' }}>
          <Text style={{ color: '#ff4d4d', fontSize: 24, fontWeight: 'bold', marginBottom: 10 }}>⚠️ App Crash Detected</Text>
          <Text style={{ color: '#fff', fontSize: 16, marginBottom: 20 }}>
            The app encountered a Javascript error. Please share this screen with the developer to fix the issue:
          </Text>
          <ScrollView style={{ backgroundColor: '#2d221e', padding: 10, borderRadius: 5, maxHeight: 300 }}>
            <Text style={{ color: '#ffcc00', fontFamily: 'monospace', fontSize: 14 }}>
              Error: {this.state.error ? this.state.error.message : 'Unknown error'}
            </Text>
            <Text style={{ color: '#baa49d', fontFamily: 'monospace', fontSize: 12, marginTop: 10 }}>
              {this.state.error ? this.state.error.stack : ''}
            </Text>
            <Text style={{ color: '#baa49d', fontFamily: 'monospace', fontSize: 12, marginTop: 10 }}>
              {this.state.errorInfo ? this.state.errorInfo.componentStack : ''}
            </Text>
          </ScrollView>
          <TouchableOpacity 
            style={{ marginTop: 20, backgroundColor: '#e09f67', padding: 15, borderRadius: 5, alignItems: 'center' }}
            onPress={() => this.setState({ hasError: false, error: null, errorInfo: null })}
          >
            <Text style={{ color: '#fff', fontWeight: 'bold' }}>Try Again</Text>
          </TouchableOpacity>
        </SafeAreaView>
      );
    }
    return this.props.children;
  }
}

// Register global error handler
if (global.ErrorUtils) {
  const previousHandler = global.ErrorUtils.getGlobalHandler();
  global.ErrorUtils.setGlobalHandler((error, isFatal) => {
    try {
      AsyncStorage.setItem('rum_last_crash', JSON.stringify({
        message: error.message || String(error),
        stack: error.stack || '',
        info: 'Global Error Handler'
      }));
    } catch (e) {}
    
    if (previousHandler) {
      previousHandler(error, isFatal);
    }
  });
}

function MainAppShell() {
  const { colors, theme } = useTheme();
  
  const [lastCrash, setLastCrash] = useState(null);

  useEffect(() => {
    const checkCrashLog = async () => {
      try {
        const raw = await AsyncStorage.getItem('rum_last_crash');
        if (raw) {
          setLastCrash(JSON.parse(raw));
        }
      } catch (e) {}
    };
    checkCrashLog();
  }, []);

  // Request notification permissions on mount
  useEffect(() => {
    const setupNotifications = async () => {
      try {
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;
        if (existingStatus !== 'granted') {
          const { status } = await Notifications.requestPermissionsAsync();
          finalStatus = status;
        }
        if (finalStatus !== 'granted') {
          console.log('Notification permission not granted');
        }
        // Android notification channel
        if (Platform.OS === 'android') {
          await Notifications.setNotificationChannelAsync('alarm-channel', {
            name: 'Geofence Alarms',
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 250, 250, 250],
            sound: 'default',
          });
        }
      } catch (e) {
        console.error('Notification setup error:', e);
      }
    };
    setupNotifications();
  }, []);

  // Send a local alarm notification with companion-specific text
  const sendAlarmNotification = async (alarmName, cType, cName) => {
    const soundMap = {
      dog: 'Bow-Bow', cat: 'Meow-Meow', rabbit: 'Thump-Thump', bird: 'Tweet-Tweet', fish: 'Glub-Glub'
    };
    const sound = soundMap[cType] || 'Bow-Bow';
    const name = cName || 'Rum';

    const wakeMessages = {
      dog: `🐶 ${name} is barking: "${sound}! ${sound}!" You're reaching ${alarmName}! Wake up! Wake up!`,
      cat: `🐱 ${name} is meowing: "${sound}! ${sound}!" You're reaching ${alarmName}! Wake up! Wake up!`,
      rabbit: `🐰 ${name} is thumping: "${sound}! ${sound}!" You're reaching ${alarmName}! Wake up! Wake up!`,
      bird: `🐦 ${name} is chirping: "${sound}! ${sound}!" You're reaching ${alarmName}! Wake up! Wake up!`,
      fish: `🐠 ${name} is splashing: "${sound}! ${sound}!" You're reaching ${alarmName}! Wake up! Wake up!`,
    };

    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: `🚨 ${name} says: Wake up!`,
          body: wakeMessages[cType] || wakeMessages.dog,
          sound: 'default',
          priority: Notifications.AndroidNotificationPriority.MAX,
        },
        trigger: null, // fire immediately
      });
    } catch (e) {
      console.error('Failed to send notification:', e);
    }
  };

  // Send a local approaching notification 2km before perimeter with companion-specific text
  const sendApproachingNotification = async (alarmName, cType, cName) => {
    const soundMap = {
      dog: 'Bow-Bow', cat: 'Meow-Meow', rabbit: 'Thump-Thump', bird: 'Tweet-Tweet', fish: 'Glub-Glub'
    };
    const sound = soundMap[cType] || 'Bow-Bow';
    const name = cName || 'Rum';

    const approachingMessages = {
      dog: `🐶 ${name} is barking: "${sound}! ${sound}!" You are 2km away from the perimeter of ${alarmName}! Wake up! Wake up!`,
      cat: `🐱 ${name} is meowing: "${sound}! ${sound}!" You are 2km away from the perimeter of ${alarmName}! Wake up! Wake up!`,
      rabbit: `🐰 ${name} is thumping: "${sound}! ${sound}!" You are 2km away from the perimeter of ${alarmName}! Wake up! Wake up!`,
      bird: `🐦 ${name} is chirping: "${sound}! ${sound}!" You are 2km away from the perimeter of ${alarmName}! Wake up! Wake up!`,
      fish: `🐠 ${name} is splashing: "${sound}! ${sound}!" You are 2km away from the perimeter of ${alarmName}! Wake up! Wake up!`,
    };

    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: `🚨 ${name} says: Reaching perimeter soon!`,
          body: approachingMessages[cType] || approachingMessages.dog,
          sound: 'default',
          priority: Notifications.AndroidNotificationPriority.MAX,
        },
        trigger: null, // fire immediately
      });
    } catch (e) {
      console.error('Failed to send approaching notification:', e);
    }
  };

  // Navigation stack: splash, dashboard, tracking, ringing, sounds, settings
  const [currentScreen, setCurrentScreen] = useState('splash');
  
  // Global Shared States
  const [radius, setRadius] = useState(1500); // meters
  const [activeTone, setActiveTone] = useState('bark'); // bark, radar, chimes, breeze, custom
  const [customAudioData, setCustomAudioData] = useState(null); // base64 string
  const [customAudioName, setCustomAudioName] = useState('');
  const [volume, setVolume] = useState(0.8);
  const [showMascotTips, setShowMascotTips] = useState(true);
  const [companionType, setCompanionType] = useState('dog');
  const [companionName, setCompanionName] = useState('Rum');
  
  // User Profile State
  const [userProfile, setUserProfile] = useState({
    name: '',
    username: '',
    email: '',
    phone: '',
    photoUri: null,
    isProfileSetup: false,
  });
  
  // Multiple alarms states
  const [alarms, setAlarms] = useState([]);
  const [triggeredAlarm, setTriggeredAlarm] = useState(null);
  const [editingAlarmId, setEditingAlarmId] = useState(null);
  const triggeredAlarmRef = useRef(null);
  const notifiedApproachingRef = useRef({});

  useEffect(() => {
    triggeredAlarmRef.current = triggeredAlarm;
  }, [triggeredAlarm]);
  
  // Coordinate values
  const [currentCoords, setCurrentCoords] = useState({ latitude: 8.5241, longitude: 76.9366 }); // Default Trivandrum
  const [destCoords, setDestCoords] = useState({ latitude: 9.9816, longitude: 76.2999 }); // Default Ernakulam
  const [destName, setDestName] = useState('Ernakulam Junction');

  // Load state on startup
  useEffect(() => {
    const loadState = async () => {
      try {
        const raw = await AsyncStorage.getItem('rum_app_state');
        if (raw) {
          const data = JSON.parse(raw);
          if (data.radius !== undefined) setRadius(data.radius);
          if (data.activeTone !== undefined) setActiveTone(data.activeTone);
          if (data.customAudioData !== undefined) setCustomAudioData(data.customAudioData);
          if (data.customAudioName !== undefined) setCustomAudioName(data.customAudioName);
          if (data.volume !== undefined) setVolume(data.volume);
          if (data.showMascotTips !== undefined) setShowMascotTips(data.showMascotTips);
          if (data.destCoords !== undefined) setDestCoords(data.destCoords);
          if (data.destName !== undefined) setDestName(data.destName);
          if (data.companionType !== undefined) setCompanionType(data.companionType);
          if (data.companionName !== undefined) setCompanionName(data.companionName);
        }
        
        const rawProfile = await AsyncStorage.getItem('rum_user_profile');
        if (rawProfile) {
          setUserProfile(JSON.parse(rawProfile));
        }

        const rawAlarms = await AsyncStorage.getItem('rum_active_alarms');
        if (rawAlarms) {
          const loadedAlarms = JSON.parse(rawAlarms);
          setAlarms(loadedAlarms);
          // Resume background task if there are active alarms
          const hasActiveAlarms = loadedAlarms.some(a => a.isActive);
          if (hasActiveAlarms) {
            startBackgroundGeofenceTask().catch(e => console.error('[BGTask] Resume error:', e));
          }
        }
      } catch (e) {
        console.error('Failed to load global state:', e);
      }
    };
    loadState();
  }, []);

  // Save state on change
  const saveState = async (updates = {}) => {
    try {
      const stateObj = {
        radius, activeTone, customAudioData, customAudioName, volume, showMascotTips, destCoords, destName, companionType, companionName,
        ...updates
      };
      await AsyncStorage.setItem('rum_app_state', JSON.stringify(stateObj));
    } catch(e) {
      console.error(e);
    }
  };

  const saveUserProfile = async (profileData) => {
    try {
      setUserProfile(profileData);
      await AsyncStorage.setItem('rum_user_profile', JSON.stringify(profileData));
    } catch (e) {
      console.error('Failed to save profile state:', e);
    }
  };

  // Splash timeout simulation
  useEffect(() => {
    if (currentScreen === 'splash') {
      const timer = setTimeout(() => {
        setCurrentScreen('home');
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [currentScreen]);

  const MAIN_TABS = ['profile', 'home', 'sounds', 'settings'];
  const scrollViewRef = useRef(null);
  const screenWidth = Dimensions.get('window').width;
  const initialTabIndex = MAIN_TABS.indexOf(currentScreen) !== -1 ? MAIN_TABS.indexOf(currentScreen) : 1;
  const scrollX = useRef(new Animated.Value(initialTabIndex * screenWidth)).current;

  // Sync scroll position whenever currentScreen changes
  useEffect(() => {
    const targetIndex = MAIN_TABS.indexOf(currentScreen);
    if (targetIndex !== -1) {
      if (scrollViewRef.current) {
        scrollViewRef.current.scrollTo({ x: targetIndex * screenWidth, animated: true });
      }
      scrollX.setValue(targetIndex * screenWidth);
    }
  }, [currentScreen]);

  // Navigate helper with smooth horizontal scrolling
  const navigateTo = (screen) => {
    const targetIndex = MAIN_TABS.indexOf(screen);
    if (targetIndex !== -1 && scrollViewRef.current) {
      setCurrentScreen(screen);
      scrollViewRef.current.scrollTo({ x: targetIndex * screenWidth, animated: true });
      scrollX.setValue(targetIndex * screenWidth);
    } else {
      setCurrentScreen(screen);
    }
  };

  const handleMomentumScrollEnd = (e) => {
    const offsetX = e.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / screenWidth);
    const targetScreen = MAIN_TABS[index];
    if (targetScreen && targetScreen !== currentScreen) {
      setCurrentScreen(targetScreen);
    }
  };

  // Haversine distance helper wrapper using geolib
  const calcDistance = (c1, c2) => {
    if (!c1 || !c2) return 0;
    return getDistance(
      { latitude: c1.latitude, longitude: c1.longitude },
      { latitude: c2.latitude, longitude: c2.longitude }
    );
  };

  const isArmed = alarms.some(a => a.isActive);

  // Real-time location tracking & geofence trigger checker
  useEffect(() => {
    let watchSubscription = null;

    const startWatching = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') return;

        watchSubscription = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.BestForNavigation,
            timeInterval: 1000,
            distanceInterval: 2
          },
          (location) => {
            // Ignore bad GPS readings (worse than 20m accuracy)
            if (location.coords.accuracy !== undefined && location.coords.accuracy !== null && location.coords.accuracy > 20) {
              return;
            }

            const coords = {
              latitude: location.coords.latitude,
              longitude: location.coords.longitude
            };
            setCurrentCoords(coords);

            // Verify if user is inside the geofence perimeter of ANY active alarm
            if (alarms && alarms.length > 0) {
              for (const alarm of alarms) {
                if (alarm.isActive) {
                  // Skip checking if alarm is currently snoozed
                  if (alarm.snoozedUntil && Date.now() < alarm.snoozedUntil) {
                    continue;
                  }

                  const dist = calcDistance(coords, alarm.coords);
                  
                  // Check 2km before perimeter warning
                  if (dist <= alarm.radius + 2000 && !notifiedApproachingRef.current[alarm.id]) {
                    notifiedApproachingRef.current[alarm.id] = true;
                    sendApproachingNotification(alarm.name, companionType, companionName);
                  }

                  // Check actual perimeter reached
                  if (dist <= alarm.radius && !triggeredAlarmRef.current) {
                    triggeredAlarmRef.current = alarm;
                    setTriggeredAlarm(alarm);
                    sendAlarmNotification(alarm.name, companionType, companionName);
                    navigateTo('ringing');
                    break; // stop checking others on trigger
                  }
                }
              }
            }
          }
        );
      } catch (err) {
        console.error("Failed to setup background location watcher:", err);
      }
    };

    startWatching();

    return () => {
      if (watchSubscription) {
        watchSubscription.remove();
      }
    };
  }, [alarms]);

  // CRUD Operations for Alarms List
  const armAlarm = async (dest, coords, r, sound) => {
    const newAlarm = {
      id: String(Date.now()),
      name: dest,
      coords: coords,
      radius: r,
      sound: sound || activeTone || 'bark',
      isActive: true
    };
    const updated = [...alarms, newAlarm];
    setAlarms(updated);
    await AsyncStorage.setItem('rum_active_alarms', JSON.stringify(updated));
    // Start background task whenever an alarm is armed
    await startBackgroundGeofenceTask().catch(() => {});
  };

  const disarmAlarm = async () => {
    const updated = alarms.map(a => ({ ...a, isActive: false, snoozedUntil: null }));
    setAlarms(updated);
    await AsyncStorage.setItem('rum_active_alarms', JSON.stringify(updated));
    try {
      await AsyncStorage.removeItem('rum_bg_notified');
    } catch (e) {}
    notifiedApproachingRef.current = {};
    triggeredAlarmRef.current = null;
    setTriggeredAlarm(null);
    await stopBackgroundGeofenceTask().catch(() => {});
    navigateTo('dashboard');
  };

  const deleteAlarm = async (id) => {
    const updated = alarms.filter(a => a.id !== id);
    setAlarms(updated);
    await AsyncStorage.setItem('rum_active_alarms', JSON.stringify(updated));
    // Clear approaching notified flag for this alarm
    if (notifiedApproachingRef.current) {
      delete notifiedApproachingRef.current[id];
    }
    // Also clear bg notified flag for this alarm
    try {
      const raw = await AsyncStorage.getItem('rum_bg_notified') || '{}';
      const notified = JSON.parse(raw);
      delete notified[`approach_${id}`];
      delete notified[`triggered_${id}`];
      await AsyncStorage.setItem('rum_bg_notified', JSON.stringify(notified));
    } catch (e) {}
    // Stop background task if no active alarms remain
    const remaining = updated.filter(a => a.isActive);
    if (remaining.length === 0) {
      await stopBackgroundGeofenceTask();
    }
  };

  const updateAlarm = (id, name, coords, r, sound, customName) => {
    const updated = alarms.map(a => {
      if (a.id === id) {
        return { 
          ...a, 
          name, 
          coords, 
          radius: r, 
          sound: sound || a.sound || activeTone || 'bark',
          customAudioName: customName !== undefined ? customName : (a.customAudioName || ''),
          isActive: true 
        };
      }
      return a;
    });
    setAlarms(updated);
    AsyncStorage.setItem('rum_active_alarms', JSON.stringify(updated));
  };

  const toggleAlarmActive = async (id) => {
    const updated = alarms.map(a => {
      if (a.id === id) {
        const nextActive = !a.isActive;
        return { 
          ...a, 
          isActive: nextActive, 
          snoozedUntil: nextActive ? a.snoozedUntil : null 
        };
      }
      return a;
    });
    setAlarms(updated);
    await AsyncStorage.setItem('rum_active_alarms', JSON.stringify(updated));

    const anyActive = updated.some(a => a.isActive);
    if (anyActive) {
      await startBackgroundGeofenceTask().catch(() => {});
    } else {
      await stopBackgroundGeofenceTask().catch(() => {});
    }
  };

  const toggleAlarmFavorite = async (id) => {
    const updated = alarms.map(a => {
      if (a.id === id) {
        return { ...a, isFavorite: !a.isFavorite };
      }
      return a;
    });
    setAlarms(updated);
    await AsyncStorage.setItem('rum_active_alarms', JSON.stringify(updated));
  };

  const selectAlarmOnMap = (alarm, isEditing = true) => {
    if (alarm) {
      if (alarm.coords) setDestCoords(alarm.coords);
      if (alarm.name) setDestName(alarm.name);
      if (alarm.radius) setRadius(alarm.radius);
      setEditingAlarmId(isEditing ? alarm.id : null);
    } else {
      setEditingAlarmId(null);
    }
  };

  const triggerAlarm = () => {
    const activeAlarm = alarms.find(a => a.isActive) || {
      id: 'mock',
      name: destName,
      coords: destCoords,
      radius: radius,
      isActive: true
    };
    if (!triggeredAlarmRef.current) {
      triggeredAlarmRef.current = activeAlarm;
      setTriggeredAlarm(activeAlarm);
      sendAlarmNotification(activeAlarm.name, companionType, companionName);
      navigateTo('ringing');
    }
  };

  const triggerApproachingAlarm = () => {
    const activeAlarm = alarms.find(a => a.isActive) || {
      id: 'mock',
      name: destName,
      coords: destCoords,
      radius: radius,
      isActive: true
    };
    if (!notifiedApproachingRef.current[activeAlarm.id]) {
      notifiedApproachingRef.current[activeAlarm.id] = true;
      sendApproachingNotification(activeAlarm.name, companionType, companionName);
    }
  };

  const dismissAlarm = async () => {
    let updated = alarms;
    if (triggeredAlarm) {
      // Toggle triggered alarm to inactive so it does not loop trigger
      updated = alarms.map(a => {
        if (a.id === triggeredAlarm.id) {
          return { ...a, isActive: false, snoozedUntil: null };
        }
        return a;
      });
      // If none matched (e.g. single/mock alarm), set all alarms inactive
      if (!alarms.some(a => a.id === triggeredAlarm.id)) {
        updated = alarms.map(a => ({ ...a, isActive: false, snoozedUntil: null }));
      }
      setAlarms(updated);
      await AsyncStorage.setItem('rum_active_alarms', JSON.stringify(updated));

      if (notifiedApproachingRef.current) {
        delete notifiedApproachingRef.current[triggeredAlarm.id];
      }

      try {
        const raw = await AsyncStorage.getItem('rum_bg_notified') || '{}';
        const notified = JSON.parse(raw);
        delete notified[`approach_${triggeredAlarm.id}`];
        delete notified[`triggered_${triggeredAlarm.id}`];
        await AsyncStorage.setItem('rum_bg_notified', JSON.stringify(notified));
      } catch (e) {}
    } else {
      updated = alarms.map(a => ({ ...a, isActive: false, snoozedUntil: null }));
      setAlarms(updated);
      await AsyncStorage.setItem('rum_active_alarms', JSON.stringify(updated));
    }

    triggeredAlarmRef.current = null;
    setTriggeredAlarm(null);

    // Stop background task if no active alarms remain
    const remaining = updated.filter(a => a.isActive);
    if (remaining.length === 0) {
      await stopBackgroundGeofenceTask();
    }

    navigateTo('dashboard');
  };

  const snoozeAlarm = async (newRadius) => {
    const snoozeDurationMs = 5 * 60 * 1000; // 5 minutes snooze
    const snoozedUntil = Date.now() + snoozeDurationMs;

    if (triggeredAlarm) {
      const updated = alarms.map(a => {
        if (a.id === triggeredAlarm.id) {
          return { ...a, radius: newRadius, snoozedUntil: snoozedUntil, isActive: true };
        }
        return a;
      });
      setAlarms(updated);
      await AsyncStorage.setItem('rum_active_alarms', JSON.stringify(updated));

      if (notifiedApproachingRef.current) {
        delete notifiedApproachingRef.current[triggeredAlarm.id];
      }

      try {
        const raw = await AsyncStorage.getItem('rum_bg_notified') || '{}';
        const notified = JSON.parse(raw);
        delete notified[`approach_${triggeredAlarm.id}`];
        delete notified[`triggered_${triggeredAlarm.id}`];
        await AsyncStorage.setItem('rum_bg_notified', JSON.stringify(notified));
      } catch (e) {}
    }

    triggeredAlarmRef.current = null;
    setTriggeredAlarm(null);
    navigateTo('dashboard');
  };

  // Render appropriate screen
  const renderScreen = () => {
    switch (currentScreen) {
      case 'splash':
        return (
          <View style={[styles.splashContainer, { backgroundColor: colors.background }]}>
            <View style={[styles.logoOutline, { borderColor: colors.accentRgba }]}>
              <View style={styles.logoInner}>
                <Text style={[styles.logoText, { color: colors.text }]}>🐾</Text>
              </View>
            </View>
            <Text style={[styles.appName, { color: colors.text }]}>{(companionName || 'RUM').toUpperCase()}</Text>
            <Text style={[styles.appSubtitle, { color: colors.accent }]}>
              {{ dog: 'BOW-BOW', cat: 'MEOW-MEOW', rabbit: 'THUMP-THUMP', bird: 'TWEET-TWEET', fish: 'GLUB-GLUB' }[companionType] || 'BOW-BOW'} ALARM
            </Text>
            
            <View style={styles.splashMascot}>
              <MascotRum state="sleeping" type={companionType} width={220} height={100} />
            </View>
            
            <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Waking up {companionName || 'Rum'}...</Text>
          </View>
        );
      
      case 'home':
        return (
          <HomeScreen
            alarms={alarms}
            currentCoords={currentCoords}
            onNavigate={navigateTo}
            onDeleteAlarm={deleteAlarm}
            onToggleAlarmActive={toggleAlarmActive}
            onToggleFavoriteAlarm={toggleAlarmFavorite}
            onUpdateAlarm={updateAlarm}
            onSelectAlarmOnMap={selectAlarmOnMap}
            companionType={companionType}
            companionName={companionName || 'Rum'}
            showMascotTips={showMascotTips}
          />
        );
      
      case 'dashboard':
        return (
          <DashboardScreen
            currentCoords={currentCoords}
            destCoords={destCoords}
            destName={destName}
            radius={radius}
            showMascotTips={showMascotTips}
            onArm={armAlarm}
            onNavigate={navigateTo}
            alarms={alarms}
            onDeleteAlarm={deleteAlarm}
            onUpdateAlarm={updateAlarm}
            editingAlarmId={editingAlarmId}
            onClearEditingAlarmId={() => setEditingAlarmId(null)}
            companionType={companionType}
            companionName={companionName || 'Rum'}
          />
        );

      case 'tracking':
        return (
          <TrackingScreen
            destCoords={destCoords}
            destName={destName}
            radius={radius}
            isArmed={isArmed}
            activeTone={activeTone}
            customAudioData={customAudioData}
            volume={volume}
            onDisarm={disarmAlarm}
            onTriggerAlarm={triggerAlarm}
            onApproachingAlarm={triggerApproachingAlarm}
            companionType={companionType}
          />
        );

      case 'ringing':
        return (
          <RingingScreen
            destName={triggeredAlarm ? triggeredAlarm.name : destName}
            radius={triggeredAlarm ? triggeredAlarm.radius : radius}
            activeTone={activeTone}
            customAudioData={customAudioData}
            volume={volume}
            onDismiss={dismissAlarm}
            onSnooze={snoozeAlarm}
            companionType={companionType}
            companionName={companionName || 'Rum'}
          />
        );

      case 'sounds':
        return (
          <SoundsScreen
            activeTone={activeTone}
            volume={volume}
            customAudioName={customAudioName}
            customAudioData={customAudioData}
            onSaveSound={(tone, fileData, name) => {
              setActiveTone(tone);
              if (fileData) setCustomAudioData(fileData);
              if (name) setCustomAudioName(name);
              saveState({ activeTone: tone, customAudioData: fileData, customAudioName: name });
            }}
            onSaveVolume={(vol) => {
              setVolume(vol);
              saveState({ volume: vol });
            }}
            onNavigate={navigateTo}
            companionName={companionName || 'Rum'}
          />
        );

      case 'settings':
        return (
          <SettingsScreen
            showMascotTips={showMascotTips}
            onSaveTips={(val) => {
              setShowMascotTips(val);
              saveState({ showMascotTips: val });
            }}
            onNavigate={navigateTo}
            companionType={companionType}
            companionName={companionName || 'Rum'}
            onSaveCompanion={(val) => {
              setCompanionType(val);
              saveState({ companionType: val });
            }}
            onSaveCompanionName={(val) => {
              setCompanionName(val);
              saveState({ companionName: val });
            }}
          />
        );

      case 'profile':
        return (
          <ProfileScreen
            userProfile={userProfile}
            onSaveProfile={saveUserProfile}
            onNavigate={navigateTo}
            companionType={companionType}
            companionName={companionName || 'Rum'}
            showMascotTips={showMascotTips}
          />
        );

      default:
        return null;
    }
  };

  if (lastCrash) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#1c1412', padding: 20, justifyContent: 'center' }}>
        <Text style={{ color: '#ff4d4d', fontSize: 24, fontWeight: 'bold', marginBottom: 10 }}>⚠️ Diagnostic Report</Text>
        <Text style={{ color: '#fff', fontSize: 16, marginBottom: 20 }}>
          The app crashed on the last launch. Here are the error details:
        </Text>
        <ScrollView style={{ backgroundColor: '#2d221e', padding: 10, borderRadius: 5, maxHeight: 400 }}>
          <Text style={{ color: '#ffcc00', fontFamily: 'monospace', fontSize: 14, fontWeight: 'bold' }}>
            Error: {lastCrash.message}
          </Text>
          <Text style={{ color: '#baa49d', fontFamily: 'monospace', fontSize: 12, marginTop: 10 }}>
            {lastCrash.stack}
          </Text>
          <Text style={{ color: '#baa49d', fontFamily: 'monospace', fontSize: 12, marginTop: 10 }}>
            {lastCrash.info}
          </Text>
        </ScrollView>
        <TouchableOpacity 
          style={{ marginTop: 20, backgroundColor: '#e09f67', padding: 15, borderRadius: 5, alignItems: 'center' }}
          onPress={async () => {
            try {
              await AsyncStorage.removeItem('rum_last_crash');
            } catch (e) {}
            setLastCrash(null);
          }}
        >
          <Text style={{ color: '#fff', fontWeight: 'bold' }}>Clear Log & Continue</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const isMainTabScreen = MAIN_TABS.includes(currentScreen);

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={theme === 'daylight' ? 'dark-content' : 'light-content'} backgroundColor={colors.background} />
      
      {isMainTabScreen ? (
        <ScrollView
          ref={scrollViewRef}
          horizontal={true}
          pagingEnabled={true}
          scrollEnabled={false}
          showsHorizontalScrollIndicator={false}
          scrollEventThrottle={16}
          contentOffset={{ x: (MAIN_TABS.indexOf(currentScreen) !== -1 ? MAIN_TABS.indexOf(currentScreen) : 1) * screenWidth, y: 0 }}
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { x: scrollX } } }],
            { useNativeDriver: false }
          )}
          style={{ flex: 1 }}
        >
          <View style={{ width: screenWidth, flex: 1 }}>
            <ProfileScreen
              userProfile={userProfile}
              onSaveProfile={saveUserProfile}
              onNavigate={navigateTo}
              companionType={companionType}
              companionName={companionName || 'Rum'}
              showMascotTips={showMascotTips}
            />
          </View>

          <View style={{ width: screenWidth, flex: 1 }}>
            <HomeScreen
              alarms={alarms}
              currentCoords={currentCoords}
              onNavigate={navigateTo}
              onDeleteAlarm={deleteAlarm}
              onToggleAlarmActive={toggleAlarmActive}
              onToggleFavoriteAlarm={toggleAlarmFavorite}
              onUpdateAlarm={updateAlarm}
              onSelectAlarmOnMap={selectAlarmOnMap}
              companionType={companionType}
              companionName={companionName || 'Rum'}
              showMascotTips={showMascotTips}
            />
          </View>

          <View style={{ width: screenWidth, flex: 1 }}>
            <SoundsScreen
              activeTone={activeTone}
              volume={volume}
              customAudioName={customAudioName}
              customAudioData={customAudioData}
              onSaveSound={(tone, fileData, name) => {
                setActiveTone(tone);
                if (fileData) setCustomAudioData(fileData);
                if (name) setCustomAudioName(name);
                saveState({ activeTone: tone, customAudioData: fileData, customAudioName: name });
              }}
              onSaveVolume={(vol) => {
                setVolume(vol);
                saveState({ volume: vol });
              }}
              onNavigate={navigateTo}
              companionName={companionName || 'Rum'}
            />
          </View>

          <View style={{ width: screenWidth, flex: 1 }}>
            <SettingsScreen
              showMascotTips={showMascotTips}
              onSaveTips={(val) => {
                setShowMascotTips(val);
                saveState({ showMascotTips: val });
              }}
              onNavigate={navigateTo}
              companionType={companionType}
              companionName={companionName || 'Rum'}
              onSaveCompanion={(val) => {
                setCompanionType(val);
                saveState({ companionType: val });
              }}
              onSaveCompanionName={(val) => {
                setCompanionName(val);
                saveState({ companionName: val });
              }}
            />
          </View>
        </ScrollView>
      ) : (
        renderScreen()
      )}

      {(isMainTabScreen || currentScreen === 'dashboard') && (
        <AnimatedTabBar 
          currentTab={currentScreen} 
          onTabPress={navigateTo}
          scrollX={scrollX}
        />
      )}

      {/* Mandatory Initial Profile Setup Modal Popup */}
      <ProfileSetupModal
        visible={currentScreen !== 'splash' && !userProfile.isProfileSetup}
        onSaveProfile={saveUserProfile}
        companionType={companionType}
        companionName={companionName || 'Rum'}
      />
    </SafeAreaView>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <MainAppShell />
      </ThemeProvider>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  splashContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
  },
  logoOutline: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 2,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  logoInner: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255,255,255,0.03)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoText: {
    fontSize: 48,
  },
  appName: {
    fontSize: 38,
    fontWeight: '900',
    letterSpacing: 3,
  },
  appSubtitle: {
    fontSize: 12,
    letterSpacing: 4,
    fontWeight: '700',
    marginTop: 5,
  },
  splashMascot: {
    marginVertical: 40,
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 13,
    letterSpacing: 1.5,
    marginTop: 10,
    fontWeight: '500',
  },
});
