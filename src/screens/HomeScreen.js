import React, { useState, useEffect, useRef } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  TouchableOpacity, 
  ScrollView, 
  FlatList, 
  Alert, 
  Animated, 
  Modal,
  TextInput,
  Platform 
} from 'react-native';
import Slider from '@react-native-community/slider';
import { Ionicons } from '@expo/vector-icons';
import { createAudioPlayer } from 'expo-audio';
import { getDistance as geolibGetDistance } from 'geolib';
import { useTheme } from '../components/ThemeContext';
import * as DocumentPicker from 'expo-document-picker';
import MascotRum from '../components/MascotRum';
import AppHeader from '../components/AppHeader';

const TONES_MAP = {
  bark: require('../../assets/sounds/bark.wav'),
  radar: require('../../assets/sounds/radar.wav'),
  chimes: require('../../assets/sounds/chimes.wav'),
  breeze: require('../../assets/sounds/breeze.wav'),
  alarm_clock: require('../../assets/sounds/alarm_clock.wav'),
  digital_beep: require('../../assets/sounds/digital_beep.wav'),
  rooster: require('../../assets/sounds/rooster.wav'),
  siren_loud: require('../../assets/sounds/siren_loud.wav'),
  train_horn: require('../../assets/sounds/train_horn.wav'),
  cat_meow: require('../../assets/sounds/cat_meow.wav'),
};

const ALL_SOUND_PRESETS = [
  { id: 'bark', name: "Companion's Bark", icon: 'paw', source: require('../../assets/sounds/bark.wav'), tag: 'dog' },
  { id: 'radar', name: 'Digital Radar', icon: 'radio', source: require('../../assets/sounds/radar.wav'), tag: 'beep' },
  { id: 'chimes', name: 'Melodic Chimes', icon: 'notifications', source: require('../../assets/sounds/chimes.wav'), tag: 'ring' },
  { id: 'breeze', name: 'Siren Pulse', icon: 'warning', source: require('../../assets/sounds/breeze.wav'), tag: 'siren' },
  { id: 'alarm_clock', name: 'Classic Alarm Clock', icon: 'alarm', source: require('../../assets/sounds/alarm_clock.wav'), tag: 'alarm' },
  { id: 'digital_beep', name: 'Digital Beep Alarm', icon: 'timer-outline', source: require('../../assets/sounds/digital_beep.wav'), tag: 'beep' },
  { id: 'rooster', name: 'Morning Rooster Crow', icon: 'sunny-outline', source: require('../../assets/sounds/rooster.wav'), tag: 'clock' },
  { id: 'siren_loud', name: 'Emergency Siren', icon: 'megaphone-outline', source: require('../../assets/sounds/siren_loud.wav'), tag: 'siren' },
  { id: 'train_horn', name: 'Locomotive Train Horn', icon: 'train-outline', source: require('../../assets/sounds/train_horn.wav'), tag: 'horn' },
  { id: 'cat_meow', name: 'Kitty Meow', icon: 'heart-outline', source: require('../../assets/sounds/cat_meow.wav'), tag: 'cat' },
];

export default function HomeScreen({
  alarms = [],
  currentCoords,
  onNavigate,
  onDeleteAlarm,
  onToggleAlarmActive,
  onToggleFavoriteAlarm,
  onUpdateAlarm,
  onSelectAlarmOnMap,
  companionType = 'dog',
  companionName = 'Rum',
  showMascotTips = true
}) {
  const { colors } = useTheme();

  // Dynamic companion sound text
  const companionSound = {
    dog: 'Bow-Bow', cat: 'Meow-Meow', rabbit: 'Thump-Thump', bird: 'Tweet-Tweet', fish: 'Glub-Glub'
  }[companionType] || 'Bow-Bow';

  // Entry animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Edit alarm modal state
  const [editingAlarm, setEditingAlarm] = useState(null);
  const [editName, setEditName] = useState('');
  const [editRadius, setEditRadius] = useState(1500);
  const [editSound, setEditSound] = useState('bark');
  const [editCustomName, setEditCustomName] = useState('');
  const [selectedTag, setSelectedTag] = useState('all');
  const previewPlayerRef = useRef(null);

  const stopSoundPreview = () => {
    if (previewPlayerRef.current) {
      try {
        previewPlayerRef.current.pause();
        previewPlayerRef.current.remove();
      } catch (e) {}
      previewPlayerRef.current = null;
    }
  };

  const playSoundPreview = (soundKeyOrUri) => {
    try {
      stopSoundPreview();
      let source;
      if (soundKeyOrUri && (soundKeyOrUri.startsWith('http://') || soundKeyOrUri.startsWith('https://') || soundKeyOrUri.startsWith('file://') || soundKeyOrUri.startsWith('content://'))) {
        source = { uri: soundKeyOrUri };
      } else if (TONES_MAP[soundKeyOrUri]) {
        source = TONES_MAP[soundKeyOrUri];
      } else {
        const found = ALL_SOUND_PRESETS.find(s => s.id === soundKeyOrUri);
        source = (found && found.uri) ? { uri: found.uri } : TONES_MAP.bark;
      }
      const player = createAudioPlayer(source);
      player.volume = 0.85;
      player.play();
      previewPlayerRef.current = player;
    } catch (e) {
      console.warn("Could not play sound preview:", e);
    }
  };

  useEffect(() => {
    if (!editingAlarm) {
      stopSoundPreview();
    }
  }, [editingAlarm]);

  useEffect(() => {
    // Smooth page entrance
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();

    // Infinite gentle pulse animation for active badges
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.2,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();

    return () => {
      stopSoundPreview();
    };
  }, []);

  // Distance calculator using geolib
  const getDistance = (c1, c2) => {
    if (!c1 || !c2) return 0;
    return geolibGetDistance(
      { latitude: c1.latitude, longitude: c1.longitude },
      { latitude: c2.latitude, longitude: c2.longitude }
    );
  };

  const formatDistance = (m) => {
    if (!m && m !== 0) return '0 m';
    return m < 1000 ? `${Math.round(m)} m` : `${(m / 1000).toFixed(1)} km`;
  };

  const activeAlarmsCount = alarms.filter(a => a.isActive).length;

  const handleDelete = (alarm) => {
    Alert.alert(
      `Delete Alarm`,
      `Are you sure you want to delete the alarm for "${alarm.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive', 
          onPress: () => onDeleteAlarm && onDeleteAlarm(alarm.id) 
        }
      ]
    );
  };

  const handleViewOnMap = (alarm) => {
    if (onSelectAlarmOnMap) {
      onSelectAlarmOnMap(alarm, true);
    }
    onNavigate('dashboard');
  };

  const openEditModal = (alarm) => {
    setEditingAlarm(alarm);
    setEditName(alarm.name);
    setEditRadius(alarm.radius || 1500);
    setEditSound(alarm.sound || 'bark');
    setEditCustomName(alarm.customAudioName || '');
  };

  const handlePickCustomSoundInModal = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['audio/*', 'video/*', 'application/ogg'],
        copyToCacheDirectory: true
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const file = result.assets[0];
        setEditSound(file.uri);
        setEditCustomName(file.name);
        playSoundPreview(file.uri);
      }
    } catch (e) {
      console.error('Failed to pick custom audio/video file:', e);
    }
  };

  const saveEdit = () => {
    if (previewPlayerRef.current) {
      try { previewPlayerRef.current.remove(); } catch (e) {}
    }
    if (editingAlarm && onUpdateAlarm) {
      onUpdateAlarm(editingAlarm.id, editName, editingAlarm.coords, editRadius, editSound, editCustomName);
    }
    setEditingAlarm(null);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      
      <Animated.View 
        style={[
          styles.content, 
          { 
            opacity: fadeAnim, 
            transform: [{ translateY: slideAnim }] 
          }
        ]}
      >
        <ScrollView 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 100 }}
        >
          {/* Top User Greeting & Companion Widget */}
          <View style={[styles.headerCard, { backgroundColor: colors.surfaceOpaque }]}>
            <View style={styles.headerTop}>
              <View style={styles.userInfo}>
                <Text style={[styles.greetingText, { color: colors.textSecondary }]}>Welcome Back! 👋</Text>
                <Text style={[styles.companionTitle, { color: colors.text }]}>
                  {companionName} Companion
                </Text>
              </View>
              <View style={[styles.gpsBadge, { backgroundColor: colors.accentRgba }]}>
                <Ionicons name="radio-button-on" size={12} color="#2ecc71" style={{ marginRight: 5 }} />
                <Text style={[styles.gpsText, { color: colors.accent }]}>GPS Active</Text>
              </View>
            </View>

            {/* Mascot Banner */}
            {showMascotTips && (
              <View style={styles.mascotBanner}>
                <MascotRum 
                  state={activeAlarmsCount > 0 ? "running" : "idle"} 
                  type={companionType} 
                  width={100} 
                  height={60} 
                />
                <View style={[styles.speechBubble, { backgroundColor: colors.surface }]}>
                  <Text style={[styles.speechText, { color: colors.text }]}>
                    {activeAlarmsCount > 0 
                      ? `I'm watching ${activeAlarmsCount} active ${activeAlarmsCount === 1 ? 'alarm' : 'alarms'}! I'll alert you with a "${companionSound}!" when close!`
                      : `No active alarms right now. Set one on the map so I can guard your trip! 🐾`}
                  </Text>
                </View>
              </View>
            )}
          </View>

          {/* Quick Stats Grid */}
          <View style={styles.statsRow}>
            <View style={[styles.statCard, { backgroundColor: colors.surfaceOpaque }]}>
              <Ionicons name="alarm-outline" size={22} color={colors.accent} />
              <Text style={[styles.statValue, { color: colors.text }]}>{activeAlarmsCount}</Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Active Alarms</Text>
            </View>

            <View style={[styles.statCard, { backgroundColor: colors.surfaceOpaque }]}>
              <Ionicons name="list-outline" size={22} color="#3498db" />
              <Text style={[styles.statValue, { color: colors.text }]}>{alarms.length}</Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Total Saved</Text>
            </View>

            <View style={[styles.statCard, { backgroundColor: colors.surfaceOpaque }]}>
              <Ionicons name="shield-checkmark-outline" size={22} color="#2ecc71" />
              <Text style={[styles.statValue, { color: colors.text }]}>
                {activeAlarmsCount > 0 ? 'Guarding' : 'Idle'}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Companion</Text>
            </View>
          </View>

          {/* Section Header & Add Alarm Call to Action */}
          <View style={styles.sectionHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name="location" size={20} color={colors.accent} style={{ marginRight: 8 }} />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Geofence Alarms</Text>
            </View>

            <TouchableOpacity 
              style={[styles.addBtn, { backgroundColor: colors.accent }]}
              onPress={() => {
                if (onSelectAlarmOnMap) onSelectAlarmOnMap(null, false);
                onNavigate('dashboard');
              }}
            >
              <Ionicons name="add" size={18} color="#fff" style={{ marginRight: 4 }} />
              <Text style={styles.addBtnText}>Add Alarm</Text>
            </TouchableOpacity>
          </View>

          {/* Alarms List */}
          {alarms.length === 0 ? (
            <View style={[styles.emptyCard, { backgroundColor: colors.surfaceOpaque }]}>
              <MascotRum state="sleeping" type={companionType} width={140} height={70} />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>No Geofence Alarms Set</Text>
              <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                Tap below to pick your destination on the map and set a radius alarm!
              </Text>
              <TouchableOpacity 
                style={[styles.emptyBtn, { backgroundColor: colors.accent }]}
                onPress={() => {
                  if (onSelectAlarmOnMap) onSelectAlarmOnMap(null, false);
                  onNavigate('dashboard');
                }}
              >
                <Ionicons name="map-outline" size={18} color="#fff" style={{ marginRight: 8 }} />
                <Text style={styles.emptyBtnText}>Open Map & Pick Destination</Text>
              </TouchableOpacity>
            </View>
          ) : (
            [...alarms].sort((a, b) => (b.isFavorite ? 1 : 0) - (a.isFavorite ? 1 : 0)).map((alarm) => {
              const distanceMeters = currentCoords ? getDistance(currentCoords, alarm.coords) : 0;
              const isWithinPerimeter = distanceMeters <= alarm.radius;

              return (
                <View 
                  key={alarm.id} 
                  style={[
                    styles.alarmCard, 
                    { 
                      backgroundColor: colors.surfaceOpaque,
                      borderColor: alarm.isFavorite ? '#ff4757' : (alarm.isActive ? colors.accentRgba : 'transparent'),
                      borderWidth: alarm.isFavorite || alarm.isActive ? 1 : 0
                    }
                  ]}
                >
                  <View style={styles.alarmCardHeader}>
                    <View style={{ flex: 1, paddingRight: 10 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <TouchableOpacity
                          onPress={() => onToggleFavoriteAlarm && onToggleFavoriteAlarm(alarm.id)}
                          style={{ paddingRight: 6 }}
                        >
                          <Ionicons 
                            name={alarm.isFavorite ? "heart" : "heart-outline"} 
                            size={18} 
                            color={alarm.isFavorite ? "#ff4757" : colors.textSecondary} 
                          />
                        </TouchableOpacity>
                        <Ionicons 
                          name={alarm.isActive ? "location-sharp" : "location-outline"} 
                          size={18} 
                          color={alarm.isActive ? colors.accent : colors.textSecondary} 
                          style={{ marginRight: 6 }} 
                        />
                        <Text style={[styles.alarmName, { color: colors.text, flex: 1 }]} numberOfLines={1}>
                          {alarm.name}
                        </Text>
                      </View>
                      <Text style={[styles.alarmCoords, { color: colors.textSecondary, marginLeft: 24 }]}>
                        {alarm.coords ? `${alarm.coords.latitude.toFixed(4)}, ${alarm.coords.longitude.toFixed(4)}` : ''}
                      </Text>
                    </View>

                    {/* Active Status Badge Toggle */}
                    <TouchableOpacity 
                      style={[
                        styles.statusBadge, 
                        { 
                          backgroundColor: alarm.isActive ? 'rgba(46, 204, 113, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                          borderColor: alarm.isActive ? '#2ecc71' : colors.textSecondary,
                        }
                      ]}
                      onPress={() => onToggleAlarmActive && onToggleAlarmActive(alarm.id)}
                    >
                      {alarm.isActive && (
                        <Animated.View 
                          style={[
                            styles.pulseDot, 
                            { transform: [{ scale: pulseAnim }] }
                          ]} 
                        />
                      )}
                      <Text style={[
                        styles.statusText, 
                        { color: alarm.isActive ? '#2ecc71' : colors.textSecondary }
                      ]}>
                        {alarm.isActive ? 'ACTIVE' : 'PAUSED'}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  <View style={[styles.cardDivider, { backgroundColor: 'rgba(255, 255, 255, 0.06)' }]} />

                  {/* Alarm Metric Details */}
                  <View style={styles.alarmDetailsRow}>
                    <View style={styles.detailItem}>
                      <Ionicons name="expand-outline" size={14} color={colors.accent} style={{ marginRight: 5 }} />
                      <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Perimeter: </Text>
                      <Text style={[styles.detailValue, { color: colors.text }]}>{formatDistance(alarm.radius)}</Text>
                    </View>

                    <View style={styles.detailItem}>
                      <Ionicons name="musical-notes-outline" size={14} color="#9b59b6" style={{ marginRight: 5 }} />
                      <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Sound: </Text>
                      <Text style={[styles.detailValue, { color: colors.text }]}>
                        {alarm.sound === 'radar' ? 'Digital Radar' : alarm.sound === 'chimes' ? 'Melodic Chimes' : alarm.sound === 'breeze' ? 'Siren Pulse' : `${companionName}'s Bark`}
                      </Text>
                    </View>
                  </View>

                  {/* Action buttons */}
                  <View style={styles.alarmActionsRow}>
                    <TouchableOpacity 
                      style={[styles.actionBtn, { backgroundColor: colors.surface }]}
                      onPress={() => openEditModal(alarm)}
                    >
                      <Ionicons name="create-outline" size={14} color={colors.accent} style={{ marginRight: 5 }} />
                      <Text style={[styles.actionBtnText, { color: colors.text }]}>Edit</Text>
                    </TouchableOpacity>

                    <TouchableOpacity 
                      style={[styles.actionBtn, { backgroundColor: colors.surface }]}
                      onPress={() => handleViewOnMap(alarm)}
                    >
                      <Ionicons name="map-outline" size={14} color="#3498db" style={{ marginRight: 5 }} />
                      <Text style={[styles.actionBtnText, { color: colors.text }]}>Map</Text>
                    </TouchableOpacity>

                    <TouchableOpacity 
                      style={[
                        styles.actionBtn, 
                        { backgroundColor: alarm.isActive ? 'rgba(231, 76, 60, 0.1)' : 'rgba(46, 204, 113, 0.1)' }
                      ]}
                      onPress={() => onToggleAlarmActive && onToggleAlarmActive(alarm.id)}
                    >
                      <Ionicons 
                        name={alarm.isActive ? "pause-circle" : "play-circle"} 
                        size={14} 
                        color={alarm.isActive ? "#e74c3c" : "#2ecc71"} 
                        style={{ marginRight: 5 }} 
                      />
                      <Text style={[
                        styles.actionBtnText, 
                        { color: alarm.isActive ? "#e74c3c" : "#2ecc71" }
                      ]}>
                        {alarm.isActive ? "Pause" : "Activate"}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity 
                      style={[styles.deleteBtn, { backgroundColor: 'rgba(231, 76, 60, 0.15)' }]}
                      onPress={() => handleDelete(alarm)}
                    >
                      <Ionicons name="trash-outline" size={16} color="#e74c3c" />
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>
      </Animated.View>

      {/* Edit Alarm Popup Modal */}
      <Modal
        visible={editingAlarm !== null}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setEditingAlarm(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.surfaceOpaque }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Edit Geofence Alarm</Text>
              <TouchableOpacity onPress={() => setEditingAlarm(null)}>
                <Ionicons name="close" size={22} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>Alarm Name / Destination Label:</Text>
            <TextInput
              style={[styles.modalInput, { color: colors.text, backgroundColor: colors.surface, borderColor: colors.surface }]}
              value={editName}
              onChangeText={setEditName}
              placeholder="e.g. Work Stop, Station, Home..."
              placeholderTextColor={colors.textSecondary}
            />

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 16 }}>
              <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>Alarm Perimeter Radius:</Text>
              <Text style={{ color: colors.accent, fontWeight: '700' }}>{formatDistance(editRadius)}</Text>
            </View>

            <Slider
              minimumValue={100}
              maximumValue={5000}
              step={50}
              value={editRadius}
              onValueChange={(val) => setEditRadius(Math.round(val))}
              minimumTrackTintColor={colors.accent}
              maximumTrackTintColor={colors.surface}
              thumbTintColor={colors.accent}
              style={{ width: '100%', height: 40, marginTop: 5 }}
            />

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
              <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>
                Alarm Alert Sound:
              </Text>
              <TouchableOpacity onPress={handlePickCustomSoundInModal}>
                <Text style={{ fontSize: 11, fontWeight: '700', color: colors.accent }}>+ Custom MP3/MP4</Text>
              </TouchableOpacity>
            </View>

            {/* Pixabay Sound Categories / Tag Filter */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: 6 }}>
              {['all', 'alarm', 'clock', 'ring', 'beep', 'horn', 'dog', 'cat'].map((tag) => {
                const isTagSelected = selectedTag === tag;
                return (
                  <TouchableOpacity
                    key={tag}
                    style={{
                      paddingVertical: 4,
                      paddingHorizontal: 10,
                      borderRadius: 12,
                      backgroundColor: isTagSelected ? colors.accent : colors.surface,
                      marginRight: 6,
                      borderWidth: 1,
                      borderColor: isTagSelected ? colors.accent : 'rgba(255,255,255,0.08)'
                    }}
                    onPress={() => setSelectedTag(tag)}
                  >
                    <Text style={{ fontSize: 10, fontWeight: '700', color: isTagSelected ? '#fff' : colors.textSecondary }}>
                      {tag.toUpperCase()}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Sound Presets Options Grid */}
            <ScrollView style={{ maxHeight: 110, marginVertical: 4 }} nestedScrollEnabled={true}>
              <View style={styles.soundOptionsRow}>
                {ALL_SOUND_PRESETS
                  .filter(snd => selectedTag === 'all' || snd.tag === selectedTag)
                  .map((snd) => {
                    const isSelected = editSound === snd.id;
                    const displayName = snd.id === 'bark' ? `${companionName}'s Bark` : snd.name;
                    return (
                      <TouchableOpacity
                        key={snd.id}
                        style={[
                          styles.soundOptionChip,
                          {
                            backgroundColor: isSelected ? colors.accent : colors.surface,
                            borderColor: isSelected ? colors.accent : 'rgba(255,255,255,0.08)',
                          }
                        ]}
                        onPress={() => {
                          setEditSound(snd.id);
                          playSoundPreview(snd.id);
                        }}
                      >
                        <Ionicons 
                          name={snd.icon} 
                          size={13} 
                          color={isSelected ? '#fff' : colors.textSecondary} 
                          style={{ marginRight: 5 }} 
                        />
                        <Text style={[styles.soundOptionText, { color: isSelected ? '#fff' : colors.text }]}>
                          {displayName}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
              </View>
            </ScrollView>

            {/* Custom Sound Selection Indicator & Uploader */}
            {editSound && (editSound.startsWith('file://') || editSound.startsWith('content://')) ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'rgba(37, 99, 235, 0.12)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, borderWidth: 1, borderColor: colors.accent, marginVertical: 4 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', flex: 0.85 }}>
                  <Ionicons name="musical-notes" size={14} color={colors.accent} style={{ marginRight: 6 }} />
                  <Text style={{ fontSize: 11, fontWeight: '700', color: colors.text }} numberOfLines={1}>
                    {editCustomName || 'Custom Audio File'}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => playSoundPreview(editSound)}>
                  <Ionicons name="play-circle" size={20} color={colors.accent} />
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface, paddingVertical: 7, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', marginVertical: 4 }}
                onPress={handlePickCustomSoundInModal}
              >
                <Ionicons name="cloud-upload-outline" size={14} color={colors.accent} style={{ marginRight: 6 }} />
                <Text style={{ fontSize: 11, fontWeight: '700', color: colors.text }}>
                  Upload Custom MP3 / MP4 Sound File
                </Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity 
              style={[styles.modalPickMapBtn, { borderColor: colors.accent }]}
              onPress={() => {
                const target = editingAlarm;
                setEditingAlarm(null);
                if (target) handleViewOnMap(target);
              }}
            >
              <Ionicons name="map-outline" size={16} color={colors.accent} style={{ marginRight: 6 }} />
              <Text style={[styles.modalPickMapText, { color: colors.accent }]}>Pick New Location on Map</Text>
            </TouchableOpacity>

            <View style={styles.modalActionsRow}>
              <TouchableOpacity 
                style={[styles.modalBtnCancel, { backgroundColor: colors.surface }]}
                onPress={() => setEditingAlarm(null)}
              >
                <Text style={{ color: colors.textSecondary, fontWeight: '600' }}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.modalBtnSave, { backgroundColor: colors.accent }]}
                onPress={saveEdit}
              >
                <Text style={{ color: '#fff', fontWeight: '700' }}>Save Alarm</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  headerCard: {
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  userInfo: {
    flex: 1,
  },
  greetingText: {
    fontSize: 13,
    fontWeight: '500',
  },
  companionTitle: {
    fontSize: 22,
    fontWeight: '800',
    marginTop: 2,
  },
  gpsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  gpsText: {
    fontSize: 11,
    fontWeight: '700',
  },
  mascotBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
  },
  speechBubble: {
    flex: 1,
    marginLeft: 10,
    padding: 12,
    borderRadius: 12,
  },
  speechText: {
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '500',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    marginHorizontal: 4,
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '800',
    marginTop: 6,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  addBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  emptyCard: {
    borderRadius: 16,
    padding: 30,
    alignItems: 'center',
    marginTop: 10,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 14,
  },
  emptySubtitle: {
    fontSize: 13,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
  },
  emptyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    marginTop: 20,
  },
  emptyBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  alarmCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
  },
  alarmCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  alarmName: {
    fontSize: 16,
    fontWeight: '700',
  },
  alarmCoords: {
    fontSize: 11,
    marginTop: 4,
    marginLeft: 28,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  pulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#2ecc71',
    marginRight: 6,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  cardDivider: {
    height: 1,
    marginVertical: 12,
  },
  alarmDetailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 12,
    fontWeight: '700',
  },
  alarmActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 10,
    marginRight: 6,
  },
  actionBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },
  deleteBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 'auto',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    borderRadius: 20,
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  modalLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
  },
  modalInput: {
    height: 44,
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 14,
    borderWidth: 1,
  },
  modalPickMapBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 15,
  },
  modalPickMapText: {
    fontSize: 13,
    fontWeight: '700',
  },
  modalActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  modalBtnCancel: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    marginRight: 8,
  },
  modalBtnSave: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    marginLeft: 8,
  },
  nav: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    height: 60,
    borderTopWidth: 1,
    alignItems: 'center',
    justifyContent: 'space-around',
    elevation: 8,
  },
  navItem: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  navText: {
    fontSize: 10,
    marginTop: 2,
    fontWeight: '600',
  },
  soundOptionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 6,
    marginBottom: 8,
  },
  soundOptionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
  },
  soundOptionText: {
    fontSize: 12,
    fontWeight: '600',
  },
});
