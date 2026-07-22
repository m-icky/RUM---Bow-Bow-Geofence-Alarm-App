import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { createAudioPlayer } from 'expo-audio';
import * as DocumentPicker from 'expo-document-picker';
import { Ionicons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import { useTheme } from '../components/ThemeContext';
import AppHeader from '../components/AppHeader';

const TONES_MAP = {
  bark: require('../../assets/sounds/bark.wav'),
  radar: require('../../assets/sounds/radar.wav'),
  chimes: require('../../assets/sounds/chimes.wav'),
  breeze: require('../../assets/sounds/breeze.wav'),
};

const TONES_BASE = [
  { id: 'bark', name: "'s Playful Bark", desc: 'Synthesized dog bark alert' },
  { id: 'radar', name: 'Digital Radar', desc: 'Rapid synth notification beeps' },
  { id: 'chimes', name: 'Melodic Chimes', desc: 'Sweet, gentle crystal sweeps' },
  { id: 'breeze', name: 'Siren Pulse', desc: 'Alternating frequency wake-up call' },
];

export default function SoundsScreen({
  activeTone,
  volume,
  customAudioName,
  customAudioData,
  onSaveSound,
  onSaveVolume,
  onNavigate,
  companionName = 'Rum'
}) {
  const { colors } = useTheme();

  const TONES = TONES_BASE.map(t => t.id === 'bark' ? { ...t, name: `${companionName}'s Playful Bark` } : t);
  const [localTone, setLocalTone] = useState(activeTone);
  const [localVolume, setLocalVolume] = useState(volume);
  const [previewSound, setPreviewSound] = useState(null);

  useEffect(() => {
    return () => {
      // Unload sound on screen unmount
      if (previewSound) {
        try {
          previewSound.remove();
        } catch (e) {}
      }
    };
  }, [previewSound]);

  const selectTone = (id) => {
    setLocalTone(id);
    onSaveSound(id, id === 'custom' ? customAudioData : null, id === 'custom' ? customAudioName : '');
    playPreview(id, id === 'custom' ? customAudioData : null);
  };

  const playPreview = async (toneId, customUri) => {
    try {
      if (previewSound) {
        try {
          previewSound.remove();
        } catch (e) {}
      }
      
      const source = toneId === 'custom' && customUri
        ? { uri: customUri }
        : (TONES_MAP[toneId] || TONES_MAP.bark);

      const player = createAudioPlayer(source);
      player.volume = localVolume;
      player.play();
      setPreviewSound(player);
    } catch (e) {
      console.error('Failed to play preview tone:', e);
    }
  };

  const handlePickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'audio/*',
        copyToCacheDirectory: true
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const file = result.assets[0];
        setLocalTone('custom');
        onSaveSound('custom', file.uri, file.name);
        playPreview('custom', file.uri);
      }
    } catch (e) {
      console.error('Failed to pick document:', e);
    }
  };

  const deleteCustomSound = () => {
    if (localTone === 'custom') {
      setLocalTone('bark');
      onSaveSound('bark', null, '');
    } else {
      onSaveSound(localTone, null, '');
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Select Alarm Tone</Text>
        
        {/* Built-in sound cards list */}
        <View style={styles.list}>
          {TONES.map(t => (
            <TouchableOpacity
              key={t.id}
              style={[
                styles.item,
                { 
                  backgroundColor: colors.surface, 
                  borderColor: localTone === t.id ? colors.accent : colors.surfaceOpaque 
                }
              ]}
              onPress={() => selectTone(t.id)}
            >
              <View>
                <Text style={[styles.itemName, { color: colors.text }]}>{t.name}</Text>
                <Text style={[styles.itemDesc, { color: colors.textSecondary }]}>{t.desc}</Text>
              </View>
              <View style={[
                styles.radio, 
                { 
                  borderColor: localTone === t.id ? colors.accent : colors.textSecondary,
                  backgroundColor: localTone === t.id ? colors.accent : 'transparent' 
                }
              ]}>
                {localTone === t.id && <View style={styles.radioDot} />}
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Custom sound file uploader */}
        <Text style={[styles.sectionTitle, { color: colors.textSecondary, marginTop: 25 }]}>
          Upload Custom Sound
        </Text>
        
        <TouchableOpacity 
          style={[styles.uploadBox, { borderColor: colors.surfaceOpaque }]} 
          onPress={handlePickDocument}
        >
          <Ionicons name="folder-open" size={32} color={colors.accent} style={{ marginBottom: 6 }} />
          <Text style={[styles.uploadText, { color: colors.text }]}>Tap to browse audio file</Text>
          <Text style={styles.uploadLimits}>MP3, WAV or AAC (Max 5MB)</Text>
        </TouchableOpacity>

        {customAudioData && (
          <View style={[styles.customFileCard, { borderColor: colors.accent, backgroundColor: colors.surface }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 0.9 }}>
              <Ionicons name="musical-note-sharp" size={16} color={colors.accent} style={{ marginRight: 6 }} />
              <Text style={[styles.customFileName, { color: colors.text }]} numberOfLines={1}>
                {customAudioName || 'custom_sound.mp3'}
              </Text>
            </View>
            <TouchableOpacity style={styles.deleteBtn} onPress={deleteCustomSound}>
              <Ionicons name="trash-outline" size={18} color="#e74c3c" />
            </TouchableOpacity>
          </View>
        )}

        {/* Volume slider */}
        <Text style={[styles.sectionTitle, { color: colors.textSecondary, marginTop: 25 }]}>
          Alarm Volume ({Math.round(localVolume * 100)}%)
        </Text>
        
        <View style={[styles.volumeBox, { backgroundColor: colors.surface }]}>
          <Ionicons name="volume-medium" size={22} color={colors.text} />
          
          <View style={styles.sliderWrapper}>
            <Slider
              minimumValue={0}
              maximumValue={1}
              step={0.05}
              value={localVolume}
              onValueChange={(val) => {
                setLocalVolume(val);
                onSaveVolume(val);
              }}
              minimumTrackTintColor={colors.accent}
              maximumTrackTintColor={colors.surfaceOpaque}
              thumbTintColor={colors.accent}
              style={{ width: '100%', height: 40 }}
            />
          </View>
        </View>

        <TouchableOpacity 
          style={[styles.testBtn, { backgroundColor: colors.accent }]}
          onPress={() => playPreview(localTone, customAudioData)}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Ionicons name="play" size={18} color="#120a08" style={{ marginRight: 6 }} />
            <Text style={styles.testBtnText}>Play Selected Tone</Text>
          </View>
        </TouchableOpacity>

      </ScrollView>
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
    paddingHorizontal: 25,
    paddingTop: 20,
    paddingBottom: 90,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 12,
  },
  list: {
    gap: 10,
  },
  item: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemName: {
    fontSize: 14,
    fontWeight: '700',
  },
  itemDesc: {
    fontSize: 11,
    marginTop: 3,
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#120a08',
  },
  uploadBox: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderRadius: 14,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.01)',
  },
  uploadText: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: 6,
  },
  uploadLimits: {
    fontSize: 10,
    color: '#666',
    marginTop: 3,
  },
  customFileCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    marginTop: 10,
  },
  customFileName: {
    fontSize: 12,
    fontWeight: '600',
    maxWidth: '85%',
  },
  deleteBtn: {
    padding: 5,
  },
  deleteBtnText: {
    color: '#e74c3c',
    fontSize: 22,
    lineHeight: 22,
  },
  volumeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 20,
    gap: 15,
  },
  sliderWrapper: {
    flex: 1,
    height: 20,
    justifyContent: 'center',
  },
  sliderTrack: {
    height: 20,
    justifyContent: 'center',
    position: 'relative',
    width: 200,
  },
  line: {
    height: 4,
    borderRadius: 2,
    width: '100%',
  },
  fill: {
    height: 4,
    borderRadius: 2,
    position: 'absolute',
  },
  thumb: {
    width: 18,
    height: 18,
    borderRadius: 9,
    position: 'absolute',
    top: 1,
    marginLeft: -9,
  },
  testBtn: {
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 25,
    marginBottom: 40,
  },
  testBtnText: {
    color: '#120a08',
    fontWeight: '700',
    fontSize: 15,
  },
  nav: {
    height: 60,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    borderTopWidth: 1,
    paddingBottom: 5,
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
});
