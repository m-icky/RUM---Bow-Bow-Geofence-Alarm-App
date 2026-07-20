import React, { useState, useEffect } from 'react';
import { StyleSheet, View, SafeAreaView, StatusBar, Text } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import { ThemeProvider, useTheme } from './src/components/ThemeContext';

// Import Screens
import DashboardScreen from './src/screens/DashboardScreen';
import TrackingScreen from './src/screens/TrackingScreen';
import RingingScreen from './src/screens/RingingScreen';
import SoundsScreen from './src/screens/SoundsScreen';
import SettingsScreen from './src/screens/SettingsScreen';

// Splash Screen
import MascotRum from './src/components/MascotRum';

function MainAppShell() {
  const { colors } = useTheme();
  
  // Navigation stack: splash, dashboard, tracking, ringing, sounds, settings
  const [currentScreen, setCurrentScreen] = useState('splash');
  
  // Global Shared States
  const [radius, setRadius] = useState(1500); // meters
  const [activeTone, setActiveTone] = useState('bark'); // bark, radar, chimes, breeze, custom
  const [customAudioData, setCustomAudioData] = useState(null); // base64 string
  const [customAudioName, setCustomAudioName] = useState('');
  const [volume, setVolume] = useState(0.8);
  const [showMascotTips, setShowMascotTips] = useState(true);
  
  // Multiple alarms states
  const [alarms, setAlarms] = useState([]);
  const [triggeredAlarm, setTriggeredAlarm] = useState(null);
  
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
        radius, activeTone, customAudioData, customAudioName, volume, showMascotTips, destCoords, destName,
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
                  if (dist <= alarm.radius) {
                    setTriggeredAlarm(alarm);
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
            <Text style={[styles.appName, { color: colors.text }]}>RUM</Text>
            <Text style={[styles.appSubtitle, { color: colors.accent }]}>BOW-BOW ALARM</Text>
            
            <View style={styles.splashMascot}>
              <MascotRum state="sleeping" width={220} height={100} />
            </View>
            
            <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Waking up Rum...</Text>
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
          />
        );

      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />
      {renderScreen()}
    </SafeAreaView>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <MainAppShell />
    </ThemeProvider>
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
