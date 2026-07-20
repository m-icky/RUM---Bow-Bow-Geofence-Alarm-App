import React, { useEffect, useRef } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Vibration } from 'react-native';
import { Audio } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing
} from 'react-native-reanimated';
import { useTheme } from '../components/ThemeContext';
import MascotRum from '../components/MascotRum';

const TONES_MAP = {
  bark: require('../../assets/sounds/bark.wav'),
  radar: require('../../assets/sounds/radar.wav'),
  chimes: require('../../assets/sounds/chimes.wav'),
  breeze: require('../../assets/sounds/breeze.wav'),
};

export default function RingingScreen({
  destName,
  radius,
  activeTone,
  customAudioData,
  volume,
  onDismiss,
  onSnooze
}) {
  const { colors } = useTheme();
  const soundRef = useRef(null);

  // Concentric circle scale animations
  const pulseScale1 = useSharedValue(0.7);
  const pulseAlpha1 = useSharedValue(0.6);
  const pulseScale2 = useSharedValue(0.7);
  const pulseAlpha2 = useSharedValue(0.6);

  useEffect(() => {
    // Pulse animation config
    pulseScale1.value = withRepeat(
      withTiming(1.6, { duration: 2000, easing: Easing.bezier(0.2, 0.8, 0.2, 1) }),
      -1,
      false
    );
    pulseAlpha1.value = withRepeat(
      withTiming(0, { duration: 2000, easing: Easing.bezier(0.2, 0.8, 0.2, 1) }),
      -1,
      false
    );

    setTimeout(() => {
      pulseScale2.value = withRepeat(
        withTiming(1.6, { duration: 2000, easing: Easing.bezier(0.2, 0.8, 0.2, 1) }),
        -1,
        false
      );
      pulseAlpha2.value = withRepeat(
        withTiming(0, { duration: 2000, easing: Easing.bezier(0.2, 0.8, 0.2, 1) }),
        -1,
        false
      );
    }, 900);

    // Trigger phone vibration loops (vibrate 500ms, pause 250ms)
    Vibration.vibrate([0, 500, 250, 500], true);

    // Audio Playback
    const startAudio = async () => {
      try {
        const soundSource = activeTone === 'custom' && customAudioData
          ? { uri: customAudioData }
          : (TONES_MAP[activeTone] || TONES_MAP.bark);

        const { sound } = await Audio.Sound.createAsync(
          soundSource,
          { shouldPlay: true, isLooping: true, volume }
        );
        soundRef.current = sound;
      } catch (e) {
        console.error('Failed to initialize alarm audio:', e);
      }
    };
    startAudio();

    return () => {
      // Cleanup audio and vibrations
      Vibration.cancel();
      if (soundRef.current) {
        soundRef.current.stopAsync();
        soundRef.current.unloadAsync();
      }
    };
  }, [activeTone, customAudioData, volume]);

  const handleDismiss = () => {
    onDismiss();
  };

  const handleSnooze = () => {
    // Snooze silences the alarm and increases geofence size by 20%
    const expandedRadius = Math.round(radius * 1.2);
    onSnooze(expandedRadius);
  };

  const animPulse1 = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale1.value }],
    opacity: pulseAlpha1.value
  }));

  const animPulse2 = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale2.value }],
    opacity: pulseAlpha2.value
  }));

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      
      {/* Pulse background effects */}
      <View style={styles.pulseArea}>
        <Animated.View style={[styles.pulseCircle, { borderColor: colors.accent }, animPulse1]} />
        <Animated.View style={[styles.pulseCircle, { borderColor: colors.accent }, animPulse2]} />
        
        {/* Barking mascot avatar */}
        <View style={styles.mascotWrapper}>
          <MascotRum state="barking" width={240} height={120} />
          <View style={styles.speechBubble}>
            <Text style={styles.speechBubbleText}>WOOF! WAKE UP!</Text>
          </View>
        </View>
      </View>

      {/* Alarm labels */}
      <View style={styles.labelsCard}>
        <Text style={[styles.title, { color: colors.text }]}>Arrived at Stop!</Text>
        <Text style={[styles.subtitle, { color: colors.accent }]}>{destName}</Text>
      </View>

      {/* Snooze & Dismiss buttons */}
      <View style={styles.actionsBox}>
        <TouchableOpacity style={[styles.actionBtn, styles.snoozeBtn, { borderColor: colors.surface }]} onPress={handleSnooze}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Ionicons name="alarm" size={18} color={colors.text} style={{ marginRight: 6 }} />
            <Text style={[styles.btnText, { color: colors.text }]}>Snooze (5m)</Text>
          </View>
        </TouchableOpacity>
        
        <TouchableOpacity style={[styles.actionBtn, styles.dismissBtn, { backgroundColor: colors.text }]} onPress={handleDismiss}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Ionicons name="checkmark-circle" size={18} color={colors.background} style={{ marginRight: 6 }} />
            <Text style={[styles.btnText, { color: colors.background }]}>Dismiss</Text>
          </View>
        </TouchableOpacity>
      </View>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: 30,
    paddingVertical: 40,
  },
  pulseArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    marginVertical: 40,
  },
  pulseCircle: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    borderWidth: 2,
  },
  mascotWrapper: {
    width: 240,
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  speechBubble: {
    position: 'absolute',
    top: -24,
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 5,
  },
  speechBubbleText: {
    color: '#000',
    fontWeight: '900',
    fontSize: 13,
  },
  labelsCard: {
    alignItems: 'center',
    marginVertical: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '700',
    marginTop: 8,
    textAlign: 'center',
  },
  actionsBox: {
    width: '100%',
    gap: 12,
  },
  actionBtn: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  snoozeBtn: {
    borderWidth: 1,
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  dismissBtn: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  btnText: {
    fontWeight: '700',
    fontSize: 15,
  },
});
