import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../components/ThemeContext';
import MascotRum from '../components/MascotRum';

export default function TrackingScreen({
  destCoords,
  destName,
  radius,
  isArmed,
  activeTone,
  customAudioData,
  volume,
  onDisarm,
  onTriggerAlarm
}) {
  const { colors } = useTheme();

  // Coordinates simulation state
  const [currentCoords, setCurrentCoords] = useState({ latitude: 8.5241, longitude: 76.9366 }); // Start Trivandrum
  const [distanceToBoundary, setDistanceToBoundary] = useState(0);
  const [simSpeed, setSimSpeed] = useState(1); // multiplier
  const simInterval = useRef(null);

  // Constants for distance calculations (Trivandrum to Ernakulam is ~200km)
  const startCoords = useRef({ latitude: 8.5241, longitude: 76.9366 });
  const totalSteps = 150;
  const stepIndex = useRef(0);

  // Haversine formula to compute distance in meters
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

  useEffect(() => {
    // Initial distance computation
    const d = getDistance(currentCoords, destCoords);
    setDistanceToBoundary(Math.max(0, d - radius));

    // Start coordinate simulation loops
    simInterval.current = setInterval(() => {
      if (stepIndex.current >= totalSteps) {
        clearInterval(simInterval.current);
        return;
      }

      // Progress along route path
      stepIndex.current += simSpeed;
      if (stepIndex.current > totalSteps) {
        stepIndex.current = totalSteps;
      }

      const ratio = stepIndex.current / totalSteps;
      const nextLat = startCoords.current.latitude + (destCoords.latitude - startCoords.current.latitude) * ratio;
      const nextLng = startCoords.current.longitude + (destCoords.longitude - startCoords.current.longitude) * ratio;
      
      const newCoords = { latitude: nextLat, longitude: nextLng };
      setCurrentCoords(newCoords);

      const nextDist = getDistance(newCoords, destCoords);
      const boundaryDist = Math.max(0, nextDist - radius);
      setDistanceToBoundary(boundaryDist);

      // Trigger boundary cross
      if (nextDist <= radius) {
        clearInterval(simInterval.current);
        onTriggerAlarm();
      }
    }, 1000);

    return () => {
      if (simInterval.current) clearInterval(simInterval.current);
    };
  }, [simSpeed]);

  const jumpIntoGeofence = () => {
    if (simInterval.current) clearInterval(simInterval.current);
    // Move coordinate offset slightly within geofence center
    const insideCoords = {
      latitude: destCoords.latitude + 0.0001,
      longitude: destCoords.longitude - 0.0001
    };
    setCurrentCoords(insideCoords);
    setDistanceToBoundary(0);
    onTriggerAlarm();
  };

  const formatDistance = (m) => {
    return m < 1000 ? `${Math.round(m)} m` : `${(m / 1000).toFixed(1)} km`;
  };

  // SVG parameters for progress ring
  const strokeWidth = 10;
  const radiusRing = 80;
  const circumference = 2 * Math.PI * radiusRing;
  
  // Progress calculations
  const totalDistanceToBoundary = getDistance(startCoords.current, destCoords) - radius;
  const progressRatio = totalDistanceToBoundary > 0 ? (totalDistanceToBoundary - distanceToBoundary) / totalDistanceToBoundary : 0;
  const clampedProgress = Math.max(0, Math.min(1, progressRatio));
  const strokeDashoffset = circumference - (clampedProgress * circumference);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Tracking Active</Text>
      </View>

      <View style={styles.content}>
        
        {/* SVG Progress Circle */}
        <View style={styles.progressContainer}>
          <Svg width="180" height="180" viewBox="0 0 180 180">
            <Circle
              cx="90"
              cy="90"
              r={radiusRing}
              stroke="rgba(255,255,255,0.03)"
              strokeWidth={strokeWidth}
              fill="none"
            />
            <Circle
              cx="90"
              cy="90"
              r={radiusRing}
              stroke={colors.accent}
              strokeWidth={strokeWidth}
              strokeDasharray={`${circumference} ${circumference}`}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              fill="none"
              transform="rotate(-90 90 90)"
            />
          </Svg>
          <View style={styles.progressOverlay}>
            <Text style={[styles.distanceText, { color: colors.text }]}>
              {formatDistance(distanceToBoundary)}
            </Text>
            <Text style={[styles.distanceLabel, { color: colors.textSecondary }]}>to boundary</Text>
          </View>
        </View>

        {/* Info Box */}
        <View style={[styles.infoCard, { backgroundColor: colors.surface, borderColor: colors.surfaceOpaque }]}>
          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Destination</Text>
            <Text style={[styles.infoVal, { color: colors.text }]} numberOfLines={1}>{destName}</Text>
          </View>
          <View style={[styles.divider, { backgroundColor: colors.surfaceOpaque }]} />
          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Boundary Set</Text>
            <Text style={[styles.infoVal, { color: colors.text }]}>{formatDistance(radius)}</Text>
          </View>
        </View>

        {/* Jogging Mascot Companion */}
        <View style={styles.mascotArea}>
          <MascotRum state="running" width={220} height={100} />
          <View style={[styles.speechBubble, { backgroundColor: colors.accent }]}>
            <Text style={styles.speechBubbleText}>
              {`“Sniffing out the route... we're ${formatDistance(distanceToBoundary)} away!”`}
            </Text>
          </View>
        </View>



        {/* Disarm Call to Action */}
        <TouchableOpacity style={styles.disarmBtn} onPress={onDisarm}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="stop-circle" size={18} color="#fff" style={{ marginRight: 6 }} />
            <Text style={styles.disarmBtnText}>Disarm & Cancel Alarm</Text>
          </View>
        </TouchableOpacity>

      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 15,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  content: {
    flex: 1,
    paddingHorizontal: 25,
    paddingVertical: 20,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  progressContainer: {
    position: 'relative',
    width: 180,
    height: 180,
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressOverlay: {
    position: 'absolute',
    alignItems: 'center',
  },
  distanceText: {
    fontSize: 26,
    fontWeight: '900',
  },
  distanceLabel: {
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: 2,
  },
  infoCard: {
    width: '100%',
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  infoLabel: {
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  infoVal: {
    fontSize: 13,
    fontWeight: '700',
    maxWidth: '65%',
  },
  divider: {
    height: 1,
    marginVertical: 12,
  },
  mascotArea: {
    height: 110,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    width: '100%',
  },
  speechBubble: {
    position: 'absolute',
    top: -20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  speechBubbleText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#120a08',
  },
  simulatorBox: {
    width: '100%',
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: 16,
    padding: 14,
  },
  simTitle: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 4,
  },
  simDesc: {
    fontSize: 11,
    lineHeight: 15,
    marginBottom: 12,
  },
  simButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  simBtn: {
    flex: 0.48,
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center',
  },
  simBtnText: {
    fontSize: 11,
    fontWeight: '700',
  },
  disarmBtn: {
    width: '100%',
    backgroundColor: '#e74c3c',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disarmBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
});
