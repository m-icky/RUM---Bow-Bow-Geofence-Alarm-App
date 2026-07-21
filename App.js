import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, SafeAreaView, StatusBar, Text, ScrollView, TouchableOpacity, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import { ThemeProvider, useTheme } from './src/components/ThemeContext';

// Configure notification behavior (show even when app is in foreground)
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// Import Screens
import DashboardScreen from './src/screens/DashboardScreen';
import TrackingScreen from './src/screens/TrackingScreen';
import RingingScreen from './src/screens/RingingScreen';
import SoundsScreen from './src/screens/SoundsScreen';
import SettingsScreen from './src/screens/SettingsScreen';

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
  const { colors } = useTheme();
  
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
  
  // Multiple alarms states
  const [alarms, setAlarms] = useState([]);
  const [triggeredAlarm, setTriggeredAlarm] = useState(null);
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
        
        const rawAlarms = await AsyncStorage.getItem('rum_active_alarms');
        if (rawAlarms) {
          setAlarms(JSON.parse(rawAlarms));
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

  // Splash timeout simulation
  useEffect(() => {
    if (currentScreen === 'splash') {
      const timer = setTimeout(() => {
        setCurrentScreen('dashboard');
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [currentScreen]);

  // Navigate helper
  const navigateTo = (screen) => {
    setCurrentScreen(screen);
  };

  // Haversine distance calculator
  const getDistance = (c1, c2) => {
    const R = 6371e3; // meters
    const lat1 = c1.latitude * Math.PI / 180;
    const lat2 = c2.latitude * Math.PI / 180;
    const dLat = (c2.latitude - c1.latitude) * Math.PI / 180;
    const dLng = (c2.longitude - c1.longitude) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1) * Math.cos(lat2) *
              Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

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
            timeInterval: 2000,
            distanceInterval: 5
          },
          (location) => {
            const coords = {
              latitude: location.coords.latitude,
              longitude: location.coords.longitude
            };
            setCurrentCoords(coords);

            // Verify if user is inside the geofence perimeter of ANY active alarm
            if (alarms && alarms.length > 0) {
              for (const alarm of alarms) {
                if (alarm.isActive) {
                  const dist = getDistance(coords, alarm.coords);
                  
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
  const armAlarm = (dest, coords, r) => {
    const newAlarm = {
      id: String(Date.now()),
      name: dest,
      coords: coords,
      radius: r,
      isActive: true
    };
    const updated = [...alarms, newAlarm];
    setAlarms(updated);
    AsyncStorage.setItem('rum_active_alarms', JSON.stringify(updated));
  };

  const deleteAlarm = (id) => {
    const updated = alarms.filter(a => a.id !== id);
    setAlarms(updated);
    AsyncStorage.setItem('rum_active_alarms', JSON.stringify(updated));
    if (notifiedApproachingRef.current) {
      delete notifiedApproachingRef.current[id];
    }
  };

  const updateAlarm = (id, name, coords, r) => {
    const updated = alarms.map(a => {
      if (a.id === id) {
        return { ...a, name, coords, radius: r, isActive: true };
      }
      return a;
    });
    setAlarms(updated);
    AsyncStorage.setItem('rum_active_alarms', JSON.stringify(updated));
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

  const dismissAlarm = () => {
    if (triggeredAlarm) {
      // Toggle triggered alarm to inactive so it does not loop trigger
      const updated = alarms.map(a => {
        if (a.id === triggeredAlarm.id) {
          return { ...a, isActive: false };
        }
        return a;
      });
      setAlarms(updated);
      AsyncStorage.setItem('rum_active_alarms', JSON.stringify(updated));
    }
    if (triggeredAlarm) {
      if (notifiedApproachingRef.current) {
        delete notifiedApproachingRef.current[triggeredAlarm.id];
      }
    }
    setTriggeredAlarm(null);
    navigateTo('dashboard');
  };

  const snoozeAlarm = (newRadius) => {
    if (triggeredAlarm) {
      const updated = alarms.map(a => {
        if (a.id === triggeredAlarm.id) {
          return { ...a, radius: newRadius };
        }
        return a;
      });
      setAlarms(updated);
      AsyncStorage.setItem('rum_active_alarms', JSON.stringify(updated));
    }
    if (triggeredAlarm) {
      if (notifiedApproachingRef.current) {
        delete notifiedApproachingRef.current[triggeredAlarm.id];
      }
    }
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
            destName={destName}
            radius={radius}
            activeTone={activeTone}
            customAudioData={customAudioData}
            volume={volume}
            onDismiss={dismissAlarm}
            onSnooze={snoozeAlarm}
            companionType={companionType}
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

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />
      {renderScreen()}
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
