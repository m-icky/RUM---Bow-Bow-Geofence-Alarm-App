import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ScrollView, TextInput, FlatList, Share, Platform, StatusBar, Alert } from 'react-native';
import { WebView } from 'react-native-webview';
import Animated, { useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Slider from '@react-native-community/slider';
import { useTheme } from '../components/ThemeContext';
import MascotRum from '../components/MascotRum';

// Compact retro dark theme for the map layout
const mapDarkStyle = [
  { "elementType": "geometry", "stylers": [{ "color": "#212121" }] },
  { "elementType": "labels.icon", "stylers": [{ "visibility": "off" }] },
  { "elementType": "labels.text.fill", "stylers": [{ "color": "#757575" }] },
  { "elementType": "labels.text.stroke", "stylers": [{ "color": "#212121" }] },
  { "featureType": "administrative", "elementType": "geometry", "stylers": [{ "color": "#757575" }] },
  { "featureType": "poi", "elementType": "geometry", "stylers": [{ "color": "#181818" }] },
  { "featureType": "poi", "elementType": "labels.text.fill", "stylers": [{ "color": "#909090" }] },
  { "featureType": "road", "elementType": "geometry.fill", "stylers": [{ "color": "#2c2c2c" }] },
  { "featureType": "road", "elementType": "geometry.stroke", "stylers": [{ "color": "#212121" }] },
  { "featureType": "road.highway", "elementType": "geometry", "stylers": [{ "color": "#3c3c3c" }] },
  { "featureType": "transit", "elementType": "geometry", "stylers": [{ "color": "#2f2f2f" }] },
  { "featureType": "water", "elementType": "geometry", "stylers": [{ "color": "#0d0d0d" }] }
];

const PRESET_PLACES = [
  { name: 'Ernakulam Junction', latitude: 9.9816, longitude: 76.2999, desc: 'Kochi Central Stop' },
  { name: 'Cochin Intl Airport', latitude: 10.1518, longitude: 76.4019, desc: 'Nedumbassery Terminal' },
  { name: 'Bangalore City Station', latitude: 12.9784, longitude: 77.5694, desc: 'Majestic Hub, Bengaluru' },
  { name: 'Trivandrum Central', latitude: 8.4878, longitude: 76.9525, desc: 'Thampanoor Station' },
  { name: 'Calicut Railway Station', latitude: 11.2483, longitude: 75.7836, desc: 'Kozhikode Stop' }
];

export default function DashboardScreen({
  currentCoords,
  destCoords,
  destName,
  radius,
  showMascotTips,
  onArm,
  onNavigate,
  alarms = [],
  onDeleteAlarm,
  onUpdateAlarm,
  companionType = 'dog',
  companionName = 'Rum'
}) {
  const { colors } = useTheme();

  // Dynamic companion sound text
  const companionSound = {
    dog: 'Bow-Bow', cat: 'Meow-Meow', rabbit: 'Thump-Thump', bird: 'Tweet-Tweet', fish: 'Glub-Glub'
  }[companionType] || 'Bow-Bow';

  // Local state
  const [localRadius, setLocalRadius] = useState(radius);
  const [localFromCoords, setLocalFromCoords] = useState(currentCoords || { latitude: 8.5241, longitude: 76.9366 });
  const [localDestCoords, setLocalDestCoords] = useState(destCoords);
  const [routeDestCoords, setRouteDestCoords] = useState(null);
  const [localDestName, setLocalDestName] = useState(destName);
  const [editingAlarmId, setEditingAlarmId] = useState(null);

  const webViewRef = React.useRef(null);
  const [isMapReady, setIsMapReady] = useState(false);

  // Custom mock mapRef to replicate react-native-maps interface
  const mapRef = {
    animateToRegion: (region) => {
      if (webViewRef.current) {
        const msg = JSON.stringify({
          type: 'ANIMATE_TO_REGION',
          payload: region
        });
        webViewRef.current.injectJavaScript(`
          if (window.updateMapFromReactNative) {
            window.updateMapFromReactNative(${JSON.stringify(msg)});
          }
          true;
        `);
      }
    },
    fitToCoordinates: (coordinates) => {
      if (webViewRef.current) {
        const msg = JSON.stringify({
          type: 'FIT_TO_COORDINATES',
          payload: coordinates
        });
        webViewRef.current.injectJavaScript(`
          if (window.updateMapFromReactNative) {
            window.updateMapFromReactNative(${JSON.stringify(msg)});
          }
          true;
        `);
      }
    }
  };

  // Sync state changes with the Leaflet WebView map once it's loaded
  useEffect(() => {
    if (isMapReady && webViewRef.current) {
      const isRouteStale = !routeDestCoords || 
        localDestCoords.latitude !== routeDestCoords.latitude || 
        localDestCoords.longitude !== routeDestCoords.longitude;

      const payload = {
        localFromCoords,
        localDestCoords,
        localRadius,
        routePath,
        isRouteStale,
        alarms,
        editingAlarmId,
        colors
      };
      const msg = JSON.stringify({
        type: 'UPDATE_MAP',
        payload
      });
      webViewRef.current.injectJavaScript(`
        if (window.updateMapFromReactNative) {
          window.updateMapFromReactNative(${JSON.stringify(msg)});
        }
        true;
      `);
    }
  }, [isMapReady, localFromCoords, localDestCoords, routeDestCoords, localRadius, routePath, alarms, editingAlarmId, colors]);

  const handleMapMessage = (event) => {
    try {
      const message = JSON.parse(event.nativeEvent.data);
      if (message.type === 'MAP_READY') {
        setIsMapReady(true);
      } else if (message.type === 'MARKER_DRAG_END') {
        onMarkerDragEnd({
          nativeEvent: {
            coordinate: message.coordinate
          }
        });
      }
    } catch (e) {
      console.warn("Error parsing WebView Leaflet message:", e);
    }
  };

  // Local toast state
  const [toastMsg, setToastMsg] = useState(null);
  const [toastTimer, setToastTimer] = useState(null);

  const showToast = (msg) => {
    setToastMsg(msg);
    if (toastTimer) clearTimeout(toastTimer);
    const timer = setTimeout(() => {
      setToastMsg(null);
    }, 3000);
    setToastTimer(timer);
  };

  // Search, Share, Favorites
  const [fromQuery, setFromQuery] = useState(currentCoords ? 'Current Location' : 'Trivandrum Central');
  const [searchQuery, setSearchQuery] = useState(destName);
  const [suggestions, setSuggestions] = useState([]);
  const [activeInput, setActiveInput] = useState(null); // 'from' or 'to'
  const [favorites, setFavorites] = useState([]);

  // Route properties
  const [routePath, setRoutePath] = useState([]);
  const [routeDistance, setRouteDistance] = useState(0);
  const [routeDuration, setRouteDuration] = useState(0);
  const [searchTimer, setSearchTimer] = useState(null);
  
  // Collapse toggle
  const [isDeckMinimized, setIsDeckMinimized] = useState(false);

  const toggleDeck = () => {
    setIsDeckMinimized(!isDeckMinimized);
  };

  const cardAnimatedStyle = useAnimatedStyle(() => {
    return {
      height: withTiming(isDeckMinimized ? 0 : 120, { duration: 500 }),
      opacity: withTiming(isDeckMinimized ? 0 : 1, { duration: 500 }),
      marginBottom: withTiming(isDeckMinimized ? 0 : 10, { duration: 500 }),
      overflow: 'hidden',
    };
  });

  const arrowAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        {
          rotate: withTiming(isDeckMinimized ? '180deg' : '0deg', { duration: 300 }),
        },
      ],
    };
  });

  // Live GPS tracking subscription for moving commuters
  useEffect(() => {
    let watchSubscription = null;

    const startWatching = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') return;

        watchSubscription = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.BestForNavigation,
            timeInterval: 2000, // Query device every 2 seconds
            distanceInterval: 5  // or every 5 meters moved
          },
          (location) => {
            const coords = {
              latitude: location.coords.latitude,
              longitude: location.coords.longitude
            };
            setLocalFromCoords(coords);
          }
        );
      } catch (err) {
        console.error("Failed to setup real-time GPS tracker:", err);
      }
    };

    startWatching();

    return () => {
      if (watchSubscription) {
        watchSubscription.remove();
      }
    };
  }, []);

  useEffect(() => {
    // Load favorites
    const loadFavorites = async () => {
      try {
        const raw = await AsyncStorage.getItem('rum_favorites');
        if (raw) {
          setFavorites(JSON.parse(raw));
        }
      } catch (e) {
        console.error('Failed to load favorites:', e);
      }
    };
    loadFavorites();
  }, []);

  const toggleFavorite = async () => {
    try {
      let updated;
      const isFav = favorites.some(f => f.name === localDestName);
      if (isFav) {
        updated = favorites.filter(f => f.name !== localDestName);
      } else {
        updated = [...favorites, {
          name: localDestName,
          latitude: localDestCoords.latitude,
          longitude: localDestCoords.longitude
        }];
      }
      setFavorites(updated);
      await AsyncStorage.setItem('rum_favorites', JSON.stringify(updated));
    } catch (e) {
      console.error(e);
    }
  };

  const shareLocation = async () => {
    try {
      await Share.share({
        message: `${companionName} Geofence Alarm Location: ${localDestName} (https://maps.google.com/?q=${localDestCoords.latitude},${localDestCoords.longitude})`,
      });
    } catch (e) {
      console.error(e);
    }
  };

  const handleSearchFocus = (inputType) => {
    setActiveInput(inputType);
    setSuggestions([
      { name: 'Use Current Location', isCurrentLocation: true, desc: 'Set to your device GPS position' },
      ...PRESET_PLACES
    ]);
  };

  const handleSearchChange = (text, inputType) => {
    if (inputType === 'from') {
      setFromQuery(text);
    } else {
      setSearchQuery(text);
    }
    setActiveInput(inputType);

    const baseSuggestions = [
      { name: 'Use Current Location', isCurrentLocation: true, desc: 'Set to your device GPS position' }
    ];

    if (text.trim() === '') {
      setSuggestions([
        ...baseSuggestions,
        ...PRESET_PLACES
      ]);
      return;
    }

    if (searchTimer) {
      clearTimeout(searchTimer);
    }

    const timer = setTimeout(async () => {
      try {
        // Query OpenStreetMap Nominatim restricted strictly to India (countrycodes=in) with a larger limit to sort states
        const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(text)}&format=json&limit=15&countrycodes=in&addressdetails=1`;
        const res = await fetch(url, {
          headers: {
            'User-Agent': 'RumCommuterApp/1.0 (Mobile Alarm Application)'
          }
        });
        const data = await res.json();
        
        if (Array.isArray(data)) {
          const results = data.map(item => {
            const parts = item.display_name.split(',');
            const shortName = parts[0] + (parts[1] ? `, ${parts[1]}` : '');
            return {
              name: shortName,
              latitude: parseFloat(item.lat),
              longitude: parseFloat(item.lon),
              desc: item.display_name
            };
          });

          // State prioritization sort logic (Kerala -> Tamil Nadu -> Karnataka -> others)
          const statePriority = (displayName) => {
            const name = displayName.toLowerCase();
            if (name.includes('kerala')) return 3;
            if (name.includes('tamil nadu') || name.includes('tamilnadu')) return 2;
            if (name.includes('karnataka')) return 1;
            return 0;
          };

          results.sort((a, b) => statePriority(b.desc) - statePriority(a.desc));

          // Slice top results for cleaner dropdown display
          const slicedResults = results.slice(0, 6);

          setSuggestions([
            ...baseSuggestions,
            ...slicedResults
          ]);
        }
      } catch (e) {
        console.error("Nominatim search failed:", e);
        
        // Simple fuzzy match helper for local presets in case of spelling mistakes / offline fallback
        const filtered = PRESET_PLACES.filter(place => {
          const target = place.name.toLowerCase();
          const query = text.toLowerCase();
          // Match if query is inside target, target is inside query, or Levenshtein-like character intersection
          const queryLetters = query.split('');
          const commonCount = queryLetters.filter(char => target.includes(char)).length;
          return target.includes(query) || query.includes(target) || (commonCount >= Math.min(query.length, 4) && query.length >= 3);
        });

        setSuggestions([
          ...baseSuggestions,
          ...filtered
        ]);
      }
    }, 500);

    setSearchTimer(timer);
  };

  const selectSuggestion = async (place) => {
    if (place.isCurrentLocation) {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          showToast('Location permission denied.');
          return;
        }
        let location = await Location.getLastKnownPositionAsync();
        if (!location) {
          location = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          });
        }
        const coords = {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        };
        
        if (activeInput === 'from') {
          setLocalFromCoords(coords);
          setFromQuery('Current Location');
        } else {
          setLocalDestCoords(coords);
          setLocalDestName('Current Location');
          setSearchQuery('Current Location');
        }
      } catch (e) {
        console.error("Failed to get current location:", e);
        showToast("GPS location fetch failed.");
      }
    } else {
      const coords = { latitude: place.latitude, longitude: place.longitude };
      if (activeInput === 'from') {
        setLocalFromCoords(coords);
        setFromQuery(place.name);
      } else {
        setLocalDestCoords(coords);
        setLocalDestName(place.name);
        setSearchQuery(place.name);
      }
    }
    setSuggestions([]);
    setActiveInput(null);
  };

  const swapLocations = () => {
    const tempQuery = fromQuery;
    setFromQuery(searchQuery);
    setSearchQuery(tempQuery);

    const tempCoords = localFromCoords;
    setLocalFromCoords(localDestCoords);
    setLocalDestCoords(tempCoords);
  };

  const animateToUserLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        showToast('Location permission denied.');
        return;
      }
      let location = await Location.getLastKnownPositionAsync();
      if (!location) {
        location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
      }
      const coords = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      };
      setLocalFromCoords(coords);
      setFromQuery('Your Current Location');
      if (mapRef) {
        mapRef.animateToRegion({
          ...coords,
          latitudeDelta: 0.03,
          longitudeDelta: 0.03
        }, 1000);
      }
    } catch (e) {
      console.error('Failed to get user location:', e);
    }
  };

  // Sync prop changes
  useEffect(() => {
    setLocalRadius(radius);
  }, [radius]);

  useEffect(() => {
    if (currentCoords) {
      setLocalFromCoords(currentCoords);
      setFromQuery('Current Location');
    }
  }, [currentCoords]);

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

  // Dynamic route API fetcher (OSRM Open-Source Road Router)
  useEffect(() => {
    if (!localFromCoords || !localDestCoords) return;

    let active = true;

    // Check if points are identical (prevents fetching loops/zigzags on same location)
    const latDiff = Math.abs(localFromCoords.latitude - localDestCoords.latitude);
    const lngDiff = Math.abs(localFromCoords.longitude - localDestCoords.longitude);
    if (latDiff < 0.0001 && lngDiff < 0.0001) {
      setRoutePath([{ latitude: localFromCoords.latitude, longitude: localFromCoords.longitude }]);
      setRouteDestCoords(localDestCoords);
      setRouteDistance(0);
      setRouteDuration(0);
      return;
    }

    const fetchRoute = async () => {
      try {
        const url = `https://routing.openstreetmap.de/routed-car/route/v1/driving/${localFromCoords.longitude},${localFromCoords.latitude};${localDestCoords.longitude},${localDestCoords.latitude}?overview=full&geometries=geojson`;
        const res = await fetch(url);
        const data = await res.json();
        
        if (!active) return; // Ignore stale request
        
        if (data.routes && data.routes.length > 0) {
          const route = data.routes[0];
          const coords = route.geometry.coordinates.map(pt => ({
            latitude: pt[1],
            longitude: pt[0]
          }));
          setRoutePath(coords);
          setRouteDestCoords(localDestCoords);
          setRouteDistance(route.distance);
          setRouteDuration(route.duration);
        } else {
          // Fallback to straight line
          setRoutePath([localFromCoords, localDestCoords]);
          setRouteDestCoords(localDestCoords);
          setRouteDistance(getDistance(localFromCoords, localDestCoords));
          setRouteDuration((getDistance(localFromCoords, localDestCoords) / 1000 / 60) * 3600);
        }
      } catch (e) {
        if (!active) return;
        setRoutePath([localFromCoords, localDestCoords]);
        setRouteDestCoords(localDestCoords);
        setRouteDistance(getDistance(localFromCoords, localDestCoords));
        setRouteDuration((getDistance(localFromCoords, localDestCoords) / 1000 / 60) * 3600);
      }
    };

    fetchRoute();

    return () => {
      active = false;
    };
  }, [localFromCoords, localDestCoords]);

  // Auto-fit map boundaries
  useEffect(() => {
    if (isMapReady && mapRef && localFromCoords && localDestCoords) {
      const timer = setTimeout(() => {
        mapRef.fitToCoordinates([localFromCoords, localDestCoords], {
          edgePadding: { top: 90, right: 80, bottom: 90, left: 80 },
          animated: true
        });
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [localFromCoords, localDestCoords, mapRef, isMapReady]);

  const onMarkerDragEnd = async (e) => {
    const coords = e.nativeEvent.coordinate;
    setLocalDestCoords(coords);
    
    try {
      const address = await Location.reverseGeocodeAsync(coords);
      if (address && address.length > 0) {
        const first = address[0];
        // Create a human-friendly address label
        const placeParts = [];
        if (first.name) placeParts.push(first.name);
        else if (first.street) placeParts.push(first.street);
        
        if (first.district) placeParts.push(first.district);
        else if (first.city) placeParts.push(first.city);
        
        const placeName = placeParts.length > 0 
          ? placeParts.join(', ') 
          : `Coordinates: ${coords.latitude.toFixed(4)}, ${coords.longitude.toFixed(4)}`;
        
        setLocalDestName(placeName);
        setSearchQuery(placeName);
      } else {
        const fallback = `Coordinates: ${coords.latitude.toFixed(4)}, ${coords.longitude.toFixed(4)}`;
        setLocalDestName(fallback);
        setSearchQuery(fallback);
      }
    } catch (err) {
      console.error("Failed to reverse geocode drag:", err);
      const fallback = `Coordinates: ${coords.latitude.toFixed(4)}, ${coords.longitude.toFixed(4)}`;
      setLocalDestName(fallback);
      setSearchQuery(fallback);
    }
  };

  const zoomToDest = () => {
    if (mapRef && localDestCoords) {
      mapRef.animateToRegion({
        ...localDestCoords,
        latitudeDelta: 0.012,
        longitudeDelta: 0.012
      }, 600);
    }
  };

  const zoomToFrom = () => {
    if (mapRef && localFromCoords) {
      mapRef.animateToRegion({
        ...localFromCoords,
        latitudeDelta: 0.012,
        longitudeDelta: 0.012
      }, 600);
    }
  };

  const zoomToGPS = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      let location = await Location.getLastKnownPositionAsync();
      if (!location) {
        location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
      }
      if (mapRef && location) {
        mapRef.animateToRegion({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          latitudeDelta: 0.012,
          longitudeDelta: 0.012
        }, 600);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleAlarmPress = (alarm) => {
    setLocalDestCoords(alarm.coords);
    setLocalDestName(alarm.name);
    setSearchQuery(alarm.name);
    setLocalRadius(alarm.radius);
    
    if (mapRef) {
      mapRef.animateToRegion({
        ...alarm.coords,
        latitudeDelta: 0.015,
        longitudeDelta: 0.015
      }, 700);
    }
  };

  const handleEditPress = (alarm) => {
    setEditingAlarmId(alarm.id);
    setSearchQuery(alarm.name);
    setLocalDestName(alarm.name);
    setLocalDestCoords(alarm.coords);
    setLocalRadius(alarm.radius);
    
    if (mapRef) {
      mapRef.animateToRegion({
        ...alarm.coords,
        latitudeDelta: 0.02,
        longitudeDelta: 0.02
      }, 600);
    }
  };

  const handleMainBtnPress = () => {
    if (editingAlarmId) {
      onUpdateAlarm(editingAlarmId, localDestName, localDestCoords, localRadius);
      setEditingAlarmId(null);
      showToast('Alarm updated successfully!');
    } else {
      onArm(localDestName, localDestCoords, localRadius);
      showToast('New alarm armed successfully!');
    }
  };

  const confirmDelete = (id) => {
    Alert.alert(
      `Delete ${companionSound} Alarm`,
      `Are you sure you want to remove this active ${companionSound} alarm?`,
      [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: () => {
          onDeleteAlarm(id);
          showToast('Alarm deleted successfully.');
        } }
      ]
    );
  };

  const formatDistance = (m) => {
    return m < 1000 ? `${Math.round(m)} m` : `${(m / 1000).toFixed(1)} km`;
  };

  const formatRouteDuration = (distanceMeters) => {
    if (!distanceMeters) return '0 min';
    const distanceKm = distanceMeters / 1000;
    const hours = distanceKm / 60; // Estimated from average speed of 60 km/h
    
    if (hours < 1) {
      const minutes = Math.round(hours * 60);
      return `${minutes} min`;
    } else {
      const hrs = Math.floor(hours);
      const mins = Math.round((hours - hrs) * 60);
      if (mins === 0) {
        return `${hrs} hr`;
      }
      return `${hrs} hr ${mins} min`;
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      
      {/* Search Header Panel (Purple gradient-like design) */}
      <View style={[styles.searchPanel, { backgroundColor: colors.surfaceOpaque }]}>
        <View style={styles.searchHeaderTop}>
          <View style={styles.userSection}>
            <View style={styles.userAvatar}>
              <Ionicons name="person" size={14} color={colors.text} />
            </View>
            <Text style={[styles.userNameText, { color: colors.text }]}>{companionName} {companionSound}</Text>
          </View>
          <TouchableOpacity style={styles.departToggle}>
            <Text style={{ color: colors.accent, fontSize: 11, fontWeight: '700' }}>{companionSound} 🐾</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.searchInputsContainer}>
          <View style={styles.inputsColumn}>
            {/* From Input */}
            <View style={[styles.inputRow, { borderBottomColor: 'rgba(255,255,255,0.05)', borderBottomWidth: 1 }]}>
              <Ionicons name="radio-button-on" size={16} color="#2ecc71" style={{ marginRight: 10 }} />
              <TextInput
                style={[styles.searchInputText, { color: colors.text }]}
                value={fromQuery}
                onFocus={() => handleSearchFocus('from')}
                onChangeText={(text) => handleSearchChange(text, 'from')}
                placeholder="From: Start location..."
                placeholderTextColor="rgba(255,255,255,0.4)"
              />
              {activeInput === 'from' && fromQuery.length > 0 && (
                <TouchableOpacity 
                  onPress={() => {
                    setFromQuery('');
                    setSuggestions([
                      { name: 'Use Current Location', isCurrentLocation: true, desc: 'Set to your device GPS position' },
                      ...PRESET_PLACES
                    ]);
                  }} 
                  style={{ padding: 6 }}
                >
                  <Ionicons name="close-circle" size={16} color="rgba(255,255,255,0.4)" />
                </TouchableOpacity>
              )}
            </View>
            {/* To Input */}
            <View style={styles.inputRow}>
              <Ionicons name="location" size={16} color={colors.accent} style={{ marginRight: 10 }} />
              <TextInput
                style={[styles.searchInputText, { color: colors.text }]}
                value={searchQuery}
                onFocus={() => handleSearchFocus('to')}
                onChangeText={(text) => handleSearchChange(text, 'to')}
                placeholder="To: Search destination..."
                placeholderTextColor="rgba(255,255,255,0.4)"
              />
              {activeInput === 'to' && searchQuery.length > 0 && (
                <TouchableOpacity 
                  onPress={() => {
                    setSearchQuery('');
                    setSuggestions([
                      { name: 'Use Current Location', isCurrentLocation: true, desc: 'Set to your device GPS position' },
                      ...PRESET_PLACES
                    ]);
                  }} 
                  style={{ padding: 6 }}
                >
                  <Ionicons name="close-circle" size={16} color="rgba(255,255,255,0.4)" />
                </TouchableOpacity>
              )}
            </View>
          </View>
          {/* Swap button */}
          <TouchableOpacity style={[styles.swapBtn, { backgroundColor: colors.surface }]} onPress={swapLocations}>
            <Ionicons name="swap-vertical" size={20} color={colors.text} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Suggestion List Overlay rendered at root level to prevent parent clipping */}
      {suggestions.length > 0 && (
        <View style={[styles.suggestionsBox, { top: Platform.OS === 'android' ? (StatusBar.currentHeight || 24) + 148 : 192, backgroundColor: colors.surfaceOpaque, borderColor: colors.surface }]}>
          <FlatList
            data={suggestions}
            keyExtractor={(item, index) => item.isCurrentLocation ? "current-location" : `${item.name}-${item.latitude}-${item.longitude}-${index}`}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.suggestionItem} onPress={() => selectSuggestion(item)}>
                <Ionicons 
                  name={item.isCurrentLocation ? "locate" : "location-outline"} 
                  size={16} 
                  color={item.isCurrentLocation ? "#2ecc71" : colors.accent} 
                  style={{ marginRight: 10 }} 
                />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.suggestName, { color: item.isCurrentLocation ? "#2ecc71" : colors.text }]}>{item.name}</Text>
                  <Text style={styles.suggestDesc}>{item.desc}</Text>
                </View>
              </TouchableOpacity>
            )}
          />
        </View>
      )}

      {/* Map Module */}
      <View style={[styles.mapContainer, { flex: isDeckMinimized ? 1.8 : 1.1 }]}>
        <WebView
          ref={webViewRef}
          style={styles.map}
          originWhitelist={['*']}
          source={{ html: LEAFLET_HTML }}
          onMessage={handleMapMessage}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          showsVerticalScrollIndicator={false}
          showsHorizontalScrollIndicator={false}
        />
        
        {/* Floating Actions Overlay (Share, Favorite) */}
        <View style={styles.mapFloatStack}>
          {/* Favorite heart button */}
          <TouchableOpacity 
            style={[styles.mapFloatBtn, { backgroundColor: colors.surfaceOpaque }]} 
            onPress={toggleFavorite}
          >
            <Ionicons 
              name={favorites.some(f => f.name === localDestName) ? "heart" : "heart-outline"} 
              size={20} 
              color={favorites.some(f => f.name === localDestName) ? "#e74c3c" : colors.textSecondary} 
            />
          </TouchableOpacity>

          {/* Share button */}
          <TouchableOpacity 
            style={[styles.mapFloatBtn, { backgroundColor: colors.surfaceOpaque }]} 
            onPress={shareLocation}
          >
            <Ionicons name="share-social" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Top-Right Quick Zoom Overlay (Destination, Start, Live GPS) */}
        <View style={styles.mapTopRightStack}>
          <TouchableOpacity 
            style={[styles.mapFloatBtn, { backgroundColor: colors.surfaceOpaque }]} 
            onPress={zoomToDest}
          >
            <Ionicons name="location" size={18} color={colors.accent} />
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.mapFloatBtn, { backgroundColor: colors.surfaceOpaque }]} 
            onPress={zoomToFrom}
          >
            <Ionicons name="radio-button-on" size={18} color="#2ecc71" />
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.mapFloatBtn, { backgroundColor: colors.surfaceOpaque }]} 
            onPress={zoomToGPS}
          >
            <Ionicons name="locate" size={18} color="#3498db" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Control panel deck (Suggested Routes & Radius Boundary) */}
      <View style={[styles.deck, { backgroundColor: colors.surface }]}>
        
        {/* Collapsible details header */}
        <View style={[styles.deckHeader, {display:"flex", flexDirection:"row", alignItems:"center"} ]}>
          <Text style={[styles.sectionHeading, { color: colors.textSecondary, marginBottom: 0 }]}>Route Details</Text>
          <TouchableOpacity onPress={toggleDeck} style={{ padding: 4 }}>
            <Animated.View style={arrowAnimatedStyle}>
              <Ionicons name="chevron-down" size={20} color={colors.accent} />
            </Animated.View>
          </TouchableOpacity>
        </View>
        
        <Animated.View style={[styles.routeDetailsCard, { backgroundColor: colors.surfaceOpaque }, cardAnimatedStyle]}>
          <View style={styles.detailsRow}>
            <View style={styles.detailsCell}>
              <Ionicons name="resize-outline" size={16} color={colors.accent} style={{ marginRight: 6 }} />
              <Text style={[styles.detailsLabel, { color: colors.textSecondary }]}>Total Distance</Text>
            </View>
            <Text style={[styles.detailsVal, { color: colors.text }]}>{formatDistance(routeDistance)}</Text>
          </View>
          <View style={[styles.divider, { backgroundColor: 'rgba(255,255,255,0.04)' }]} />
          
          <View style={styles.detailsRow}>
            <View style={styles.detailsCell}>
              <Ionicons name="time-outline" size={16} color={colors.accent} style={{ marginRight: 6 }} />
              <Text style={[styles.detailsLabel, { color: colors.textSecondary }]}>Est. Commute Time</Text>
            </View>
            <Text style={[styles.detailsVal, { color: colors.text }]}>{formatRouteDuration(routeDistance)}</Text>
          </View>
          <View style={[styles.divider, { backgroundColor: 'rgba(255,255,255,0.04)' }]} />
          
          <View style={styles.detailsRow}>
            <View style={styles.detailsCell}>
              <Ionicons name="speedometer-outline" size={16} color={colors.accent} style={{ marginRight: 6 }} />
              <Text style={[styles.detailsLabel, { color: colors.textSecondary }]}>Average Speed</Text>
            </View>
            <Text style={[styles.detailsVal, { color: colors.text }]}>60 km/h</Text>
          </View>
        </Animated.View>

        {/* Configurations inputs */}
        <View style={styles.column}>
          <View style={styles.sliderHeader}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Alarm Perimeter Boundary:</Text>
            <Text style={[styles.sliderValue, { color: colors.accent }]}>{formatDistance(localRadius)}</Text>
          </View>
          
          <View style={styles.sliderTrackWrapper}>
            <Slider
              minimumValue={100}
              maximumValue={5000}
              step={50}
              value={localRadius}
              onValueChange={(val) => setLocalRadius(Math.round(val))}
              minimumTrackTintColor={colors.accent}
              maximumTrackTintColor={colors.surfaceOpaque}
              thumbTintColor={colors.accent}
              style={{ width: '100%', height: 40 }}
            />
          </View>
        </View>
        {showMascotTips && (
          <View style={styles.mascotTipRow}>
            <MascotRum state="idle" type={companionType} width={60} height={30} />
            <View style={[styles.mascotTipBubble, { backgroundColor: colors.surfaceOpaque, borderColor: colors.surface }]}>
              <Text style={[styles.mascotTipText, { color: colors.text }]}>
                {(() => {
                  const tips = {
                    dog: {
                      tight: "That's a tight perimeter! I'll bark extra loud so you don't miss it! 🔊",
                      wide: "Whoa, big radius! Plenty of time to stretch before we arrive! 🐾",
                      normal: "Looking good! I'll keep my nose on the route for you! 👃",
                    },
                    cat: {
                      tight: "Tiny zone? I'll pounce on that alarm the second we're close! 🐾",
                      wide: "Such a wide area… perfect for a catnap on the way! 😸",
                      normal: "I've got my whiskers tuned to this route. Purr-fect! 🐱",
                    },
                    rabbit: {
                      tight: "Small hop zone! I'll thump my feet the moment we arrive! 🐰",
                      wide: "Lots of room to hop around before we get there! 🥕",
                      normal: "Ears up and listening! We'll hop there in no time! 🐇",
                    },
                    bird: {
                      tight: "Narrow landing zone! I'll chirp loud when it's time! 🐦",
                      wide: "Wide airspace! I can circle around for a while! 🪶",
                      normal: "Wings spread and gliding along the route! Tweet tweet! 🎶",
                    },
                    fish: {
                      tight: "Shallow waters ahead! I'll splash when we're close! 🐠",
                      wide: "Deep ocean of distance! Time to swim at ease! 🌊",
                      normal: "Swimming smoothly along the current! Glub glub! 💧",
                    },
                  };
                  const t = tips[companionType] || tips.dog;
                  return localRadius < 500 ? t.tight : localRadius > 3000 ? t.wide : t.normal;
                })()}
              </Text>
            </View>
          </View>
        )}

        <TouchableOpacity style={[styles.armBtn, { backgroundColor: colors.accent }]} onPress={handleMainBtnPress}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Ionicons name={editingAlarmId ? "checkmark-circle" : "notifications"} size={18} color="#120a08" style={{ marginRight: 6 }} />
            <Text style={styles.armBtnText}>{editingAlarmId ? "Update Geofence Alarm" : "Arm Location Alarm"}</Text>
          </View>
        </TouchableOpacity>

        {alarms && alarms.length > 0 && (
          <View style={{ marginTop: 15 }}>
            <Text style={[styles.sectionHeading, { color: colors.textSecondary, marginBottom: 8 }]}>
              Armed Alarms ({alarms.length})
            </Text>
            <ScrollView style={{ maxHeight: 120 }} nestedScrollEnabled={true}>
              {alarms.map(alarm => (
                <View key={alarm.id} style={[styles.alarmListItem, { backgroundColor: colors.surfaceOpaque, borderColor: colors.surface, borderLeftColor: alarm.isActive ? '#2ecc71' : 'rgba(255,255,255,0.1)' }]}>
                  <TouchableOpacity onPress={() => handleAlarmPress(alarm)} style={{ flex: 1, paddingRight: 10 }}>
                    <Text style={[styles.alarmListName, { color: alarm.isActive ? colors.text : colors.textSecondary }]} numberOfLines={1}>
                      {alarm.name}
                    </Text>
                    <Text style={styles.alarmListSub}>
                      Radius: {formatDistance(alarm.radius)} | {alarm.isActive ? 'Active 📡' : 'Triggered / Off'}
                    </Text>
                  </TouchableOpacity>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <TouchableOpacity onPress={() => handleEditPress(alarm)} style={styles.alarmActionBtn}>
                      <Ionicons name="create-outline" size={16} color={colors.accent} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => confirmDelete(alarm.id)} style={[styles.alarmActionBtn, { marginLeft: 8 }]}>
                      <Ionicons name="trash-outline" size={16} color="#e74c3c" />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </ScrollView>
          </View>
        )}
      </View>

      {/* Tabs navigation */}
      <View style={[styles.nav, { backgroundColor: colors.surfaceOpaque, borderTopColor: colors.surface }]}>
        <TouchableOpacity style={styles.navItem}>
          <Ionicons name="map" size={20} color={colors.accent} />
          <Text style={[styles.navText, { color: colors.accent }]}>Map</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => onNavigate('sounds')}>
          <Ionicons name="musical-notes" size={20} color={colors.textSecondary} />
          <Text style={[styles.navText, { color: colors.textSecondary }]}>Sounds</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => onNavigate('settings')}>
          <Ionicons name="settings" size={20} color={colors.textSecondary} />
          <Text style={[styles.navText, { color: colors.textSecondary }]}>Settings</Text>
        </TouchableOpacity>
      </View>

      {/* Dynamic Animated Glassmorphic Toast Notification Overlay */}
      {toastMsg && (
        <View style={[styles.toastContainer, { backgroundColor: colors.surfaceOpaque, borderColor: colors.accent }]}>
          <Ionicons name="checkmark-circle" size={16} color={colors.accent} style={{ marginRight: 8 }} />
          <Text style={[styles.toastText, { color: colors.text }]}>{toastMsg}</Text>
        </View>
      )}

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'space-between',
  },
  searchPanel: {
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 24) + 15 : 50,
    paddingBottom: 15,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    zIndex: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 5,
    elevation: 5,
  },
  searchHeaderTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  userSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  userNameText: {
    fontSize: 13,
    fontWeight: '700',
  },
  departToggle: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  searchInputsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.15)',
    borderRadius: 12,
    padding: 6,
  },
  inputsColumn: {
    flex: 1,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 38,
    paddingHorizontal: 10,
  },
  searchInputText: {
    flex: 1,
    fontSize: 13,
    height: '100%',
    padding: 0,
  },
  swapBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 6,
  },
  suggestionsBox: {
    position: 'absolute',
    top: 124,
    left: 20,
    right: 20,
    borderRadius: 12,
    borderWidth: 1,
    maxHeight: 200,
    zIndex: 100,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.03)',
  },
  suggestName: {
    fontSize: 12,
    fontWeight: '700',
  },
  suggestDesc: {
    fontSize: 10,
    color: '#888',
    marginTop: 2,
  },
  mapContainer: {
    flex: 1.1,
    position: 'relative',
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  mapFloatStack: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    gap: 10,
    zIndex: 10,
    elevation: 10,
  },
  mapTopRightStack: {
    position: 'absolute',
    top: 16,
    right: 16,
    gap: 10,
    zIndex: 10,
    elevation: 10,
  },
  mapFloatBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  startMarkerOuter: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: 'rgba(46, 204, 113, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2ecc71',
  },
  startMarkerInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#2ecc71',
  },
  deck: {
    paddingHorizontal: 20,
    paddingTop: 15,
    paddingBottom: 15,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  sectionHeading: {
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  routeDetailsCard: {
    borderRadius: 12,
    padding: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.02)',
  },
  detailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    height: 24,
  },
  detailsCell: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailsLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  detailsVal: {
    fontSize: 12,
    fontWeight: '800',
  },
  divider: {
    height: 1,
    marginVertical: 4,
  },
  column: {
    flexDirection: 'column',
    marginBottom: 15,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
  },
  sliderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  sliderValue: {
    fontSize: 13,
    fontWeight: '800',
  },
  sliderTrackWrapper: {
    width: '100%',
    height: 30,
    justifyContent: 'center',
  },
  sliderTrackTap: {
    height: 16,
    justifyContent: 'center',
    position: 'relative',
  },
  sliderLine: {
    height: 4,
    borderRadius: 2,
    width: '100%',
  },
  sliderFill: {
    height: 4,
    borderRadius: 2,
    position: 'absolute',
  },
  sliderThumb: {
    width: 18,
    height: 18,
    borderRadius: 9,
    position: 'absolute',
    top: -1,
    marginLeft: -9,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 3,
  },
  armBtn: {
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 5,
    elevation: 4,
  },
  armBtnText: {
    color: '#120a08',
    fontWeight: '700',
    fontSize: 14,
  },
  nav: {
    height: 56,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    borderTopWidth: 1,
    paddingBottom: 3,
  },
  navItem: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 60,
  },
  navText: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
  },
  alarmListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderLeftWidth: 4,
    marginBottom: 8,
  },
  alarmListName: {
    fontSize: 12,
    fontWeight: '700',
  },
  alarmListSub: {
    fontSize: 10,
    color: '#888',
    marginTop: 2,
  },
  alarmActionBtn: {
    padding: 6,
    borderRadius: 6,
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  toastContainer: {
    position: 'absolute',
    bottom: 80,
    left: 20,
    right: 20,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 10,
    zIndex: 10000,
  },
  toastText: {
    fontSize: 12,
    fontWeight: '700',
  },
  mascotTipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    paddingHorizontal: 4,
  },
  mascotTipBubble: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  mascotTipText: {
    fontSize: 10,
    fontWeight: '500',
    lineHeight: 16,
  },
});

const LEAFLET_HTML = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    html, body, #map {
      height: 100%;
      margin: 0;
      padding: 0;
      background-color: #f8f9fa;
    }
    .custom-div-icon {
      background: none;
      border: none;
    }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    var map = L.map('map', {
      zoomControl: false,
      attributionControl: false
    }).setView([8.5241, 76.9366], 12);

    // Standard OpenStreetMap Tile Layer (Light Colored Street Maps!)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    var startMarker = null;
    var destMarker = null;
    var destCircle = null;
    var routePolyline = null;
    var otherAlarmMarkers = [];
    var otherAlarmCircles = [];
    var currentData = null;

    function sendToReactNative(data) {
      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(JSON.stringify(data));
      }
    }

    window.updateMapFromReactNative = function(messageString) {
      try {
        const message = JSON.parse(messageString);
        if (message.type === 'UPDATE_MAP') {
          updateMap(message.payload);
        } else if (message.type === 'ANIMATE_TO_REGION') {
          const region = message.payload;
          map.setView([region.latitude, region.longitude], 14, { animate: true });
        } else if (message.type === 'FIT_TO_COORDINATES') {
          const coords = message.payload;
          if (coords.length > 0) {
            const bounds = L.latLngBounds(coords.map(c => [c.latitude, c.longitude]));
            map.fitBounds(bounds, { padding: [50, 50] });
          }
        }
      } catch (err) {
        console.error("Leaflet update error:", err);
      }
    };

    var isFirstLoad = true;

    function updateMap(data) {
      currentData = data;
      const colors = data.colors || {};
      const accentColor = colors.accent || '#3498db';

      // 0. Clean up existing layers from the map before redrawing
      if (startMarker) { map.removeLayer(startMarker); startMarker = null; }
      if (destMarker) { map.removeLayer(destMarker); destMarker = null; }
      if (destCircle) { map.removeLayer(destCircle); destCircle = null; }
      if (routePolyline) { map.removeLayer(routePolyline); routePolyline = null; }
      otherAlarmMarkers.forEach(m => map.removeLayer(m));
      otherAlarmCircles.forEach(c => map.removeLayer(c));
      otherAlarmMarkers = [];
      otherAlarmCircles = [];

      // If it is the first load and we have destination coordinates, center the map there!
      if (isFirstLoad && data.localDestCoords) {
        map.setView([data.localDestCoords.latitude, data.localDestCoords.longitude], 12);
        isFirstLoad = false;
      }

      // 1. Start Marker (Green Pin)
      if (data.localFromCoords) {
        const fromLat = data.localFromCoords.latitude;
        const fromLng = data.localFromCoords.longitude;
        var greenIcon = L.divIcon({
          className: 'custom-div-icon',
          html: '<svg width="30" height="42" viewBox="0 0 30 42" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M15 0C6.72 0 0 6.72 0 15C0 26.25 15 42 15 42C15 42 30 26.25 30 15C30 6.72 23.28 0 15 0Z" fill="#2ecc71"/><circle cx="15" cy="15" r="5" fill="white"/></svg>',
          iconSize: [30, 42],
          iconAnchor: [15, 42]
        });
        startMarker = L.marker([fromLat, fromLng], { icon: greenIcon }).addTo(map);
      }

      // 2. Stop Marker (Blue Draggable Pin) & Geofence Circle
      if (data.localDestCoords) {
        const destLat = data.localDestCoords.latitude;
        const destLng = data.localDestCoords.longitude;
        
        var destIcon = L.divIcon({
          className: 'custom-div-icon',
          html: '<svg width="30" height="42" viewBox="0 0 30 42" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M15 0C6.72 0 0 6.72 0 15C0 26.25 15 42 15 42C15 42 30 26.25 30 15C30 6.72 23.28 0 15 0Z" fill="#3498db"/><circle cx="15" cy="15" r="5" fill="white"/></svg>',
          iconSize: [30, 42],
          iconAnchor: [15, 42]
        });

        destMarker = L.marker([destLat, destLng], { 
          icon: destIcon,
          draggable: true 
        }).addTo(map);

        destMarker.on('drag', function(e) {
          const latlng = destMarker.getLatLng();
          if (destCircle) {
            destCircle.setLatLng(latlng);
          }
        });

        destMarker.on('dragend', function(e) {
          const latlng = destMarker.getLatLng();
          sendToReactNative({
            type: 'MARKER_DRAG_END',
            coordinate: {
              latitude: latlng.lat,
              longitude: latlng.lng
            }
          });
        });

        // Draw Circle Geofence
        if (data.localRadius !== undefined) {
          destCircle = L.circle([destLat, destLng], {
            radius: data.localRadius,
            color: accentColor,
            fillColor: accentColor,
            fillOpacity: 0.15,
            weight: 2
          }).addTo(map);
        }
      }

      // 3. Route Polyline
      if (!data.isRouteStale && data.routePath && data.routePath.length > 0) {
        const latlngs = data.routePath.map(pt => [pt.latitude, pt.longitude]);
        routePolyline = L.polyline(latlngs, {
          color: '#3897f0',
          weight: 4
        }).addTo(map);
      }

      // 4. Other Armed Alarms (Purple Pins)
      if (data.alarms && data.alarms.length > 0) {
        data.alarms.filter(a => a.id !== data.editingAlarmId).forEach(alarm => {
          if (alarm.coords) {
            var armedIcon = L.divIcon({
              className: 'custom-div-icon',
              html: '<svg width="30" height="42" viewBox="0 0 30 42" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M15 0C6.72 0 0 6.72 0 15C0 26.25 15 42 15 42C15 42 30 26.25 30 15C30 6.72 23.28 0 15 0Z" fill="#9b59b6"/><circle cx="15" cy="15" r="5" fill="white"/></svg>',
              iconSize: [30, 42],
              iconAnchor: [15, 42]
            });
            var m = L.marker([alarm.coords.latitude, alarm.coords.longitude], { icon: armedIcon }).addTo(map);
            otherAlarmMarkers.push(m);

            var c = L.circle([alarm.coords.latitude, alarm.coords.longitude], {
              radius: alarm.radius,
              color: 'rgba(155, 89, 182, 0.6)',
              fillColor: 'rgba(155, 89, 182, 0.1)',
              fillOpacity: 0.1,
              weight: 1.5
            }).addTo(map);
            otherAlarmCircles.push(c);
          }
        });
      }
    }

    // Handshake waiting for ReactNativeWebView to be injected
    function initHandshake() {
      if (window.ReactNativeWebView) {
        sendToReactNative({ type: 'MAP_READY' });
      } else {
        setTimeout(initHandshake, 50);
      }
    }
    initHandshake();
  </script>
</body>
</html>
`;
