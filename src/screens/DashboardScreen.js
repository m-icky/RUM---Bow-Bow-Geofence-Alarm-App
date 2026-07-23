import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ScrollView, TextInput, FlatList, Share, Platform, StatusBar, Alert } from 'react-native';
import { WebView } from 'react-native-webview';
import Animated, { useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Slider from '@react-native-community/slider';
import { getDistance as geolibGetDistance } from 'geolib';
import { useTheme } from '../components/ThemeContext';
import MascotRum from '../components/MascotRum';
import AppHeader from '../components/AppHeader';

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
  editingAlarmId: externalEditingAlarmId,
  onClearEditingAlarmId,
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
  const [editingAlarmId, setEditingAlarmId] = useState(externalEditingAlarmId || null);

  useEffect(() => {
    setEditingAlarmId(externalEditingAlarmId || null);
  }, [externalEditingAlarmId]);

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
      const payload = {
        localFromCoords,
        localDestCoords,
        localRadius,
        routePath,
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
  }, [isMapReady, localFromCoords, localDestCoords, localRadius, routePath, alarms, editingAlarmId, colors]);

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

  // Live Speed Tracking State & Refs
  const [currentSpeed, setCurrentSpeed] = useState(0);
  const [detectedAvgSpeed, setDetectedAvgSpeed] = useState(null);
  const speedHistoryRef = useRef([]);
  const lastLocationRef = useRef(null);

  // Collapse toggle
  const [isDeckMinimized, setIsDeckMinimized] = useState(false);

  const toggleDeck = () => {
    setIsDeckMinimized(!isDeckMinimized);
  };

  const cardAnimatedStyle = useAnimatedStyle(() => {
    return {
      height: withTiming(isDeckMinimized ? 0 : 60, { duration: 300 }),
      opacity: withTiming(isDeckMinimized ? 0 : 1, { duration: 300 }),
      marginBottom: withTiming(isDeckMinimized ? 0 : 4, { duration: 300 }),
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
            timeInterval: 1000, // Query device every 1 second
            distanceInterval: 2  // or every 2 meters moved
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
            setLocalFromCoords(coords);

            const now = location.timestamp || Date.now();
            let detectedKmH = null;

            // 1. Direct hardware GPS speed (in m/s -> convert to km/h)
            if (location.coords.speed !== undefined && location.coords.speed !== null && location.coords.speed >= 0) {
              detectedKmH = location.coords.speed * 3.6;
            }

            // 2. Fallback / verification using coordinate delta and timestamp
            if (lastLocationRef.current) {
              const prev = lastLocationRef.current;
              const timeDiffSec = (now - prev.timestamp) / 1000;
              if (timeDiffSec > 0.5) {
                const distMeters = getDistance(prev.coords, coords);
                const calcKmH = (distMeters / timeDiffSec) * 3.6;

                // Use calculated speed if hardware speed is unavailable or 0 while moving
                if (detectedKmH === null || (detectedKmH < 1 && calcKmH > 2)) {
                  detectedKmH = calcKmH;
                }
              }
            }

            lastLocationRef.current = { coords, timestamp: now };

            if (detectedKmH !== null) {
              // Maintain rolling average for smooth speed (store last 5–10 speed readings)
              speedHistoryRef.current.push(detectedKmH);
              if (speedHistoryRef.current.length > 8) {
                speedHistoryRef.current.shift();
              }
              const sum = speedHistoryRef.current.reduce((a, b) => a + b, 0);
              const smoothedSpeed = Math.round(sum / speedHistoryRef.current.length);
              setCurrentSpeed(smoothedSpeed);

              if (detectedKmH > 2 && detectedKmH < 250) {
                setDetectedAvgSpeed(smoothedSpeed);
              }
            }
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
        lastSyncedDestRef.current = `${coords.latitude.toFixed(5)},${coords.longitude.toFixed(5)}`;
        lastSyncedNameRef.current = place.name;
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

  // Sync prop changes safely without overwriting user map selections
  const lastSyncedDestRef = useRef(null);
  const lastSyncedNameRef = useRef(null);

  useEffect(() => {
    if (radius) setLocalRadius(radius);
  }, [radius]);

  useEffect(() => {
    if (destCoords && destCoords.latitude && destCoords.longitude) {
      const key = `${destCoords.latitude.toFixed(5)},${destCoords.longitude.toFixed(5)}`;
      if (lastSyncedDestRef.current !== key) {
        lastSyncedDestRef.current = key;
        setLocalDestCoords(destCoords);
      }
    }
  }, [destCoords?.latitude, destCoords?.longitude]);

  useEffect(() => {
    if (destName && lastSyncedNameRef.current !== destName) {
      lastSyncedNameRef.current = destName;
      setLocalDestName(destName);
      setSearchQuery(destName);
    }
  }, [destName]);

  useEffect(() => {
    if (currentCoords) {
      setLocalFromCoords(currentCoords);
      setFromQuery('Current Location');
    }
  }, [currentCoords]);

  // Distance calculator using geolib
  const getDistance = (c1, c2) => {
    if (!c1 || !c2) return 0;
    return geolibGetDistance(
      { latitude: c1.latitude, longitude: c1.longitude },
      { latitude: c2.latitude, longitude: c2.longitude }
    );
  };

  // Dynamic route API fetcher (OSRM Open-Source Road Router)
  useEffect(() => {
    if (!localFromCoords || !localDestCoords) return;

    let active = true;

    setRouteDestCoords(localDestCoords);

    // Clear previous route immediately on coordinate change
    setRoutePath([]);

    // Check if points are identical (prevents fetching loops/zigzags on same location)
    const latDiff = Math.abs(localFromCoords.latitude - localDestCoords.latitude);
    const lngDiff = Math.abs(localFromCoords.longitude - localDestCoords.longitude);
    if (latDiff < 0.0001 && lngDiff < 0.0001) {
      setRoutePath([{ latitude: localFromCoords.latitude, longitude: localFromCoords.longitude }]);
      setRouteDistance(0);
      setRouteDuration(0);
      return;
    }

    const fetchRoute = async () => {
      const endpoints = [
        `https://routing.openstreetmap.de/routed-car/route/v1/driving/${localFromCoords.longitude},${localFromCoords.latitude};${localDestCoords.longitude},${localDestCoords.latitude}?overview=full&geometries=geojson`,
        `https://router.project-osrm.org/route/v1/driving/${localFromCoords.longitude},${localFromCoords.latitude};${localDestCoords.longitude},${localDestCoords.latitude}?overview=full&geometries=geojson`,
        `https://routing.openstreetmap.de/routed-bike/route/v1/biking/${localFromCoords.longitude},${localFromCoords.latitude};${localDestCoords.longitude},${localDestCoords.latitude}?overview=full&geometries=geojson`
      ];

      for (const url of endpoints) {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 2500);
          const res = await fetch(url, { signal: controller.signal });
          clearTimeout(timeoutId);

          if (res.ok) {
            const data = await res.json();
            if (data.routes && data.routes.length > 0 && data.routes[0].geometry && data.routes[0].geometry.coordinates) {
              const route = data.routes[0];
              const coords = route.geometry.coordinates.map(pt => ({
                latitude: pt[1],
                longitude: pt[0]
              }));

              if (active && coords.length > 1) {
                // Ensure polyline connects strictly from localFromCoords to localDestCoords
                const firstPt = coords[0];
                const distFromStart = getDistance(firstPt, localFromCoords);
                if (distFromStart > 5) {
                  coords.unshift({
                    latitude: localFromCoords.latitude,
                    longitude: localFromCoords.longitude
                  });
                }

                const lastPt = coords[coords.length - 1];
                const distToDest = getDistance(lastPt, localDestCoords);
                if (distToDest > 5) {
                  coords.push({
                    latitude: localDestCoords.latitude,
                    longitude: localDestCoords.longitude
                  });
                }

                setRoutePath(coords);
                setRouteDistance(route.distance);
                setRouteDuration(route.duration);
                return; // Successfully loaded road route!
              }
            }
          }
        } catch (e) {
          // Try next road routing endpoint
        }
      }

      if (active) {
        const dist = getDistance(localFromCoords, localDestCoords);
        setRouteDistance(dist);
        setRouteDuration((dist / 1000 / 50) * 3600);
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
    if (coords && coords.latitude && coords.longitude) {
      lastSyncedDestRef.current = `${coords.latitude.toFixed(5)},${coords.longitude.toFixed(5)}`;
    }
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
      if (onClearEditingAlarmId) onClearEditingAlarmId();
      showToast('Alarm updated successfully!');
    } else {
      onArm(localDestName, localDestCoords, localRadius);
      showToast('New alarm armed successfully!');
    }
    if (onNavigate) {
      onNavigate('home');
    }
  };

  const confirmDelete = (id) => {
    Alert.alert(
      `Delete ${companionSound} Alarm`,
      `Are you sure you want to remove this active ${companionSound} alarm?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete", style: "destructive", onPress: () => {
            onDeleteAlarm(id);
            showToast('Alarm deleted successfully.');
          }
        }
      ]
    );
  };

  // Derive effective average speed dynamically
  const getEffectiveAvgSpeed = () => {
    if (detectedAvgSpeed !== null && detectedAvgSpeed > 0) {
      return detectedAvgSpeed;
    }
    if (routeDistance > 0 && routeDuration > 0) {
      const osrmSpeed = Math.round((routeDistance / 1000) / (routeDuration / 3600));
      if (osrmSpeed > 5 && osrmSpeed < 200) {
        return osrmSpeed;
      }
    }
    return 60;
  };

  const effectiveAvgSpeed = getEffectiveAvgSpeed();

  const formatDistance = (m) => {
    return m < 1000 ? `${Math.round(m)} m` : `${(m / 1000).toFixed(1)} km`;
  };

  const formatRouteDuration = (distanceMeters, speedKmH) => {
    if (!distanceMeters) return '0 min';
    const speed = speedKmH && speedKmH > 0 ? speedKmH : 60;
    const distanceKm = distanceMeters / 1000;
    const hours = distanceKm / speed;

    if (hours < 1) {
      const minutes = Math.max(1, Math.round(hours * 60));
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

      {/* Map — fills entire container */}
      <WebView
        ref={webViewRef}
        style={StyleSheet.absoluteFill}
        originWhitelist={['*']}
        source={{ html: LEAFLET_HTML }}
        onMessage={handleMapMessage}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        showsVerticalScrollIndicator={false}
        showsHorizontalScrollIndicator={false}
      />

      {/* Search Panel — floats at top */}
      <View style={[styles.searchPanel, { backgroundColor: colors.surfaceOpaque }]}>
        <View style={styles.mapTopHeader}>
          <TouchableOpacity
            style={[styles.mapBackBtn, { backgroundColor: colors.surface }]}
            onPress={() => onNavigate && onNavigate('home')}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={18} color={colors.text} />
            <Text style={[styles.mapBackBtnText, { color: colors.text }]}>Back to Home</Text>
          </TouchableOpacity>
          <Text style={[styles.mapHeaderTitle, { color: colors.text }]}>Geofence Map</Text>
        </View>

        <View style={styles.searchInputsContainer}>
          <View style={styles.inputsColumn}>
            {/* From Input */}
            <View style={[styles.inputRow, { borderBottomColor: colors.surface, borderBottomWidth: 1 }]}>
              <Ionicons name="radio-button-on" size={14} color="#2ecc71" style={{ marginRight: 8 }} />
              <TextInput
                style={[styles.searchInputText, { color: colors.text }]}
                value={fromQuery}
                onFocus={() => handleSearchFocus('from')}
                onChangeText={(text) => handleSearchChange(text, 'from')}
                placeholder="From: Start location..."
                placeholderTextColor={colors.textSecondary}
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
                  style={{ padding: 4 }}
                >
                  <Ionicons name="close-circle" size={14} color={colors.textSecondary} />
                </TouchableOpacity>
              )}
            </View>
            {/* To Input */}
            <View style={styles.inputRow}>
              <Ionicons name="location" size={14} color={colors.accent} style={{ marginRight: 8 }} />
              <TextInput
                style={[styles.searchInputText, { color: colors.text }]}
                value={searchQuery}
                onFocus={() => handleSearchFocus('to')}
                onChangeText={(text) => handleSearchChange(text, 'to')}
                placeholder="To: Search destination..."
                placeholderTextColor={colors.textSecondary}
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
                  style={{ padding: 4 }}
                >
                  <Ionicons name="close-circle" size={14} color={colors.textSecondary} />
                </TouchableOpacity>
              )}
            </View>
          </View>
          {/* Swap button */}
          <TouchableOpacity style={[styles.swapBtn, { backgroundColor: colors.surface }]} onPress={swapLocations}>
            <Ionicons name="swap-vertical" size={18} color={colors.text} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Suggestion list — floats below search */}
      {suggestions.length > 0 && (
        <View style={[styles.suggestionsBox, { backgroundColor: colors.surfaceOpaque, borderColor: colors.surface }]}>
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

      {/* Right-side floating buttons: Zoom + Favorite + Share */}
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
        <TouchableOpacity
          style={[styles.mapFloatBtn, { backgroundColor: colors.surfaceOpaque }]}
          onPress={toggleFavorite}
        >
          <Ionicons
            name={favorites.some(f => f.name === localDestName) ? "heart" : "heart-outline"}
            size={18}
            color={favorites.some(f => f.name === localDestName) ? "#e74c3c" : colors.textSecondary}
          />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.mapFloatBtn, { backgroundColor: colors.surfaceOpaque }]}
          onPress={shareLocation}
        >
          <Ionicons name="share-social" size={18} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* Floating Bottom Deck */}
      <View style={[styles.deck, { backgroundColor: colors.surfaceOpaque }]}>

        {/* Stats strip */}
        <Animated.View style={[styles.routeDetailsCard, { backgroundColor: colors.surface }, cardAnimatedStyle]}>
          <View style={styles.statsStrip}>
            <View style={styles.statCell}>
              <Ionicons name="resize-outline" size={13} color={colors.accent} />
              <Text style={[styles.statVal, { color: colors.text }]}>{formatDistance(routeDistance)}</Text>
              <Text style={[styles.statLbl, { color: colors.textSecondary }]}>Distance</Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: colors.surface }]} />
            <View style={styles.statCell}>
              <Ionicons name="time-outline" size={13} color={colors.accent} />
              <Text style={[styles.statVal, { color: colors.text }]}>{formatRouteDuration(routeDistance, effectiveAvgSpeed)}</Text>
              <Text style={[styles.statLbl, { color: colors.textSecondary }]}>Time</Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: colors.surface }]} />
            <View style={styles.statCell}>
              <Ionicons name="speedometer-outline" size={13} color={colors.accent} />
              <Text style={[styles.statVal, { color: colors.text }]}>~{effectiveAvgSpeed} km/h</Text>
              <Text style={[styles.statLbl, { color: colors.textSecondary }]}>{currentSpeed > 0 ? `Live ${currentSpeed}` : 'Avg Speed'}</Text>
            </View>
          </View>
        </Animated.View>

        {/* Perimeter row */}
        <View style={styles.sliderRow}>
          <Text style={[styles.sliderLabel, { color: colors.textSecondary }]}>Perimeter</Text>
          <Slider
            minimumValue={100}
            maximumValue={5000}
            step={50}
            value={localRadius}
            onValueChange={(val) => setLocalRadius(Math.round(val))}
            minimumTrackTintColor={colors.accent}
            maximumTrackTintColor={colors.surface}
            thumbTintColor={colors.accent}
            style={{ flex: 1, height: 34, marginHorizontal: 8 }}
          />
          <Text style={[styles.sliderValue, { color: colors.accent }]}>{formatDistance(localRadius)}</Text>
        </View>

        <TouchableOpacity style={[styles.armBtn, { backgroundColor: colors.accent }]} onPress={handleMainBtnPress}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Ionicons name={editingAlarmId ? "checkmark-circle" : "notifications"} size={16} color="#120a08" style={{ marginRight: 6 }} />
            <Text style={styles.armBtnText}>{editingAlarmId ? "Update Geofence Alarm" : "Add Location Alarm"}</Text>
          </View>
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
    position: 'relative',
  },
  header: {
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  searchPanel: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 12,
    paddingVertical: 8,
    zIndex: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 10,
    margin: 10,
    borderRadius: 14,
  },
  mapTopHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  mapBackBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  mapBackBtnText: {
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 6,
  },
  mapHeaderTitle: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.3,
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
    backgroundColor: 'rgba(167, 167, 167, 0.15)',
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
    top: 100,
    left: 10,
    right: 10,
    borderRadius: 12,
    borderWidth: 1,
    maxHeight: 220,
    zIndex: 100,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 30,
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
    flex: 1,
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
    top: 165,
    right: 14,
    gap: 8,
    zIndex: 15,
    elevation: 15,
  },
  mapFloatBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
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
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: Platform.OS === 'ios' ? 76 : 68,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 20,
    zIndex: 20,
  },
  statsStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: 4,
  },
  statCell: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  statVal: {
    fontSize: 13,
    fontWeight: '700',
    marginTop: 2,
  },
  statLbl: {
    fontSize: 10,
    fontWeight: '500',
  },
  statDivider: {
    width: 1,
    height: 36,
    marginHorizontal: 4,
  },
  deckHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  sliderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 6,
  },
  sliderLabel: {
    fontSize: 11,
    fontWeight: '700',
    width: 68,
  },
  sectionHeading: {
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  routeDetailsCard: {
    borderRadius: 10,
    paddingVertical: 2,
    paddingHorizontal: 6,
    marginBottom: 4,
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
            // paddingTopLeft: [left, top], paddingBottomRight: [right, bottom]
            map.fitBounds(bounds, { paddingTopLeft: [40, 135], paddingBottomRight: [65, 210] });
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

      // If it is the first load and we have destination coordinates, fit both markers in view
      if (isFirstLoad && data.localDestCoords) {
        if (data.localFromCoords) {
          const bounds = L.latLngBounds([
            [data.localFromCoords.latitude, data.localFromCoords.longitude],
            [data.localDestCoords.latitude, data.localDestCoords.longitude]
          ]);
          map.fitBounds(bounds, { paddingTopLeft: [40, 135], paddingBottomRight: [65, 210] });
        } else {
          map.setView([data.localDestCoords.latitude, data.localDestCoords.longitude], 12);
        }
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
          html: '<svg width="30" height="42" viewBox="0 0 30 42" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M15 0C6.72 0 0 6.72 0 15C0 26.25 15 42 15 42C15 42 30 26.25 30 15C30 6.72 23.28 0 15 0Z" fill="#e74c3c"/><circle cx="15" cy="15" r="5" fill="white"/></svg>',
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
          if (startMarker) {
            const startLatLng = startMarker.getLatLng();
            fetchRouteInLeaflet(startLatLng.lat, startLatLng.lng, latlng.lat, latlng.lng);
          }
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

      // 3. Road Polyline (Strictly via roads)
      if (data.routePath && data.routePath.length > 1) {
        if (routePolyline) { map.removeLayer(routePolyline); routePolyline = null; }
        const latlngs = data.routePath.map(pt => [pt.latitude, pt.longitude]);
        routePolyline = L.polyline(latlngs, {
          color: '#2563eb',
          weight: 5,
          opacity: 0.85,
          lineJoin: 'round',
          lineCap: 'round'
        }).addTo(map);
        try {
          map.fitBounds(routePolyline.getBounds(), { paddingTopLeft: [40, 135], paddingBottomRight: [65, 210] });
        } catch (err) {}
      }
    }

    function fetchRouteInLeaflet(fromLat, fromLng, destLat, destLng) {
      if (!fromLat || !fromLng || !destLat || !destLng) return;
      var url = 'https://routing.openstreetmap.de/routed-car/route/v1/driving/' + fromLng + ',' + fromLat + ';' + destLng + ',' + destLat + '?overview=full&geometries=geojson';
      fetch(url)
        .then(function(res) { return res.json(); })
        .then(function(data) {
          if (data && data.routes && data.routes.length > 0 && data.routes[0].geometry && data.routes[0].geometry.coordinates) {
            var coords = data.routes[0].geometry.coordinates.map(function(pt) {
              return [pt[1], pt[0]];
            });
            if (coords.length > 1) {
              coords.unshift([fromLat, fromLng]);
              coords.push([destLat, destLng]);
              if (routePolyline) { map.removeLayer(routePolyline); }
              routePolyline = L.polyline(coords, {
                color: '#2563eb',
                weight: 5,
                opacity: 0.85,
                lineJoin: 'round',
                lineCap: 'round'
              }).addTo(map);
            }
          }
        }).catch(function(err) {});
    }

    // Listen for map taps to place or move the destination pin anywhere on the map
    map.on('click', function(e) {
      if (e && e.latlng) {
        if (destMarker) {
          destMarker.setLatLng(e.latlng);
          if (destCircle) {
            destCircle.setLatLng(e.latlng);
          }
        }
        if (startMarker) {
          const startLatLng = startMarker.getLatLng();
          fetchRouteInLeaflet(startLatLng.lat, startLatLng.lng, e.latlng.lat, e.latlng.lng);
        }
        sendToReactNative({
          type: 'MARKER_DRAG_END',
          coordinate: {
            latitude: e.latlng.lat,
            longitude: e.latlng.lng
          }
        });
      }
    });

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
