import React, { useState, useRef } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Switch, ScrollView, TextInput, Animated, PanResponder, Modal } from 'react-native';
import { useTheme, THEMES } from '../components/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import MascotRum from '../components/MascotRum';
import * as Haptics from 'expo-haptics';

const GRID_COLORS = [
  // Row A: Yellow/Orange/Earth tones
  '#FFF59D', '#FFF176', '#FFEE58', '#FDD835', '#FBC02D', '#F9A825', '#F57F17', '#E65100', '#EF6C00', '#F57C00', '#B78A39', '#C19A44', '#AA8844', '#8E5A2A',
  // Row B: Peach/Red/Gray
  '#FFAB91', '#FF8A65', '#E53935', '#F4511E', '#E50914', '#D32F2F', '#C62828', '#8B2500', '#8B1A1A', '#5C1D1D', '#3D0A0A', '#90A4AE', '#78909C', '#607D8B',
  // Row C: Pink/Magenta/Purple
  '#F8BBD0', '#F48FB1', '#E91E63', '#D81B60', '#C2185B', '#AD1457', '#880E4F', '#6A1B9A', '#4A148C', '#5D4037', '#4E342E', '#3E2723', '#210F2B', '#455A64',
  // Row D: Lavendar/Blue/Teal
  '#D1C4E9', '#B39DDB', '#7986CB', '#5C6BC0', '#3F51B5', '#303F9F', '#1A237E', '#0288D1', '#0277BD', '#01579B', '#004D40', '#006064', '#00838F', '#37474F',
  // Row E: Cyan/Dark Blues
  '#80DEEA', '#4DD0E1', '#26C6DA', '#00ACC1', '#0097A7', '#00838F', '#006064', '#0D47A1', '#1565C0', '#1976D2', '#1E88E5', '#2196F3', '#64B5F6', '#90CAF9'
];

export default function SettingsScreen({
  showMascotTips,
  onSaveTips,
  onNavigate,
  companionType = 'dog',
  companionName = 'Rum',
  onSaveCompanion,
  onSaveCompanionName
}) {
  const { theme, colors, setTheme, customColors, applyCustomColors } = useTheme();

  // Local state for custom color text inputs
  const [primaryColor, setPrimaryColor] = useState(
    theme === 'custom' && customColors ? customColors.primary : '#8D5B4C'
  );
  const [accentColor, setAccentColor] = useState(
    theme === 'custom' && customColors ? customColors.accent : '#E09F67'
  );

  const [activePicker, setActivePicker] = useState(null); // 'primary' | 'accent' | null

  // Local state for companion name input (saves on blur only)
  const [localCompanionName, setLocalCompanionName] = useState(companionName);

  const MASCOT_PHRASES = [
    "Woof! That tickles! 🐾",
    "Backflip! Wheee! 🐕",
    "Bark! I love this theme! 🎨",
    "Wag wag wag! You are awesome! ❤️",
    "Thanks for coloring me! Woof! 🐶",
    "You're pawsome! 🐾✨",
    "That color looks fur-tastic! 🎨🐶",
    "Sniff sniff... I love it! 👃🐾",
    "Zoomies activated! 💨🐕",
    "Tail wagging at maximum speed! 🐕💛",
    "Can we play fetch next? 🎾",
    "You picked my favorite color! 🌈",
    "Happy barks incoming! 🗣️🐶",
    "I feel so fancy now! 😎",
    "You're my best human! ❤️",
    "Another masterpiece! 🎨✨",
    "High paw! 🐾",
    "I'm looking adorable already! 🥰",
    "This is so much fun! 🎉",
    "You're making me sparkle! ✨",
    "Bark-tastic job! 🐶",
    "My tail can't stop wagging! 💛",
    "You deserve a puppy hug! 🤗🐕",
    "Paws up for creativity! 🎨🐾",
    "Looking good! Ruff ruff! 😄",
    "Color me happy! 🌈",
    "I'm one happy pup! 🐶💕",
    "You're a coloring superstar! ⭐",
    "Bone-appetit... for colors! 🦴🎨",
    "This shade is pawfect! 🐾",
    "Woof! You're so creative! 🎨",
    "Every color makes me smile! 😊",
    "You're filling my world with color! 🌎🌈",
    "I can't stop smiling! 😁🐶",
    "Let's add even more colors! 🌈",
    "Tail wag level: 100%! 💯🐕",
    "You make every day brighter! ☀️",
    "That color pops! ✨",
    "Paw-sitively amazing! 🐾",
    "Keep going, artist! 🎨",
    "I look incredible! 😍",
    "Bark! That's my favorite! 🐶",
    "I'm dancing with joy! 💃🐕",
    "Can I get a treat now? 🦴",
    "This is pawsitively beautiful! 🌟",
    "You're the best color buddy! 🎨❤️",
    "Woof! My heart is full! 💖",
    "Every brush makes me happier! 🖌️",
    "You have amazing taste! 😄",
    "Let's make this colorful together! 🌈🐾",
    "Puppy approved! ✅🐶",
    "That looks amazing! 🎉",
    "You're a true artist! 🖍️",
    "So colorful, so fun! 🌈",
    "Best day ever! 🐕🎊",
  ];

  const [mascotSpeech, setMascotSpeech] = useState("“Thanks for coloring me! Woof! 🐾”");
  const [phraseIndex, setPhraseIndex] = useState(0);

  const handleMascotTap = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => { });
    } catch (e) { }

    const nextIndex = (phraseIndex + 1) % MASCOT_PHRASES.length;
    setPhraseIndex(nextIndex);
    setMascotSpeech(`“${MASCOT_PHRASES[nextIndex]}”`);
  };

  const pan = useRef(new Animated.ValueXY()).current;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        // Intercept touch only if dragging exceeds 4px (allows clicking to trigger barks)
        return Math.abs(gestureState.dx) > 4 || Math.abs(gestureState.dy) > 4;
      },
      onPanResponderGrant: () => {
        pan.setOffset({
          x: pan.x._value,
          y: pan.y._value
        });
        pan.setValue({ x: 0, y: 0 });
      },
      onPanResponderMove: Animated.event(
        [null, { dx: pan.x, dy: pan.y }],
        { useNativeDriver: false }
      ),
      onPanResponderRelease: () => {
        pan.flattenOffset();
      }
    })
  ).current;

  const handleApplyCustom = () => {
    // Basic hex validate regex check
    const hexRegex = /^#([A-Fa-f0-9]{3}){1,2}$/;
    if (hexRegex.test(primaryColor) && hexRegex.test(accentColor)) {
      applyCustomColors(primaryColor, accentColor);
    } else {
      alert("Please enter valid hex color codes (e.g., #8D5B4C)");
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>

      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Visual Settings</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Theme Presets</Text>

        {/* Themes 2x2 Grid */}
        <View style={styles.grid}>
          {Object.keys(THEMES).map(key => {
            const t = THEMES[key];
            return (
              <TouchableOpacity
                key={key}
                style={[
                  styles.themeCard,
                  {
                    backgroundColor: colors.surface,
                    borderColor: theme === key ? colors.accent : colors.surfaceOpaque
                  }
                ]}
                onPress={() => setTheme(key)}
              >
                <View style={[styles.previewArea, { backgroundColor: t.background }]}>
                  <View style={[styles.dot, { backgroundColor: t.dogPrimary }]} />
                  <View style={[styles.dot, { backgroundColor: t.accent }]} />
                </View>
                <Text style={[styles.themeName, { color: colors.text }]}>{t.name}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Custom Colors panel */}
        <Text style={[styles.sectionTitle, { color: colors.textSecondary, marginTop: 25 }]}>
          Custom Color Palette
        </Text>

        <View style={[styles.customColorsCard, { backgroundColor: colors.surface }]}>
          <View style={styles.colorRow}>
            <Text style={[styles.colorLabel, { color: colors.text }]}>Primary Color:</Text>
            <View style={styles.inputWrapper}>
              <TouchableOpacity
                onPress={() => setActivePicker('primary')}
                onLongPress={() => setActivePicker('primary')}
                delayLongPress={200}
                style={[styles.colorIndicator, { backgroundColor: primaryColor }]}
              />
              <TextInput
                style={[styles.input, { color: colors.text, borderBottomColor: colors.surfaceOpaque }]}
                value={primaryColor}
                onChangeText={setPrimaryColor}
                placeholder="#8D5B4C"
                placeholderTextColor="#666"
                autoCapitalize="characters"
                maxLength={7}
              />
            </View>
          </View>

          <View style={[styles.colorRow, { marginTop: 15 }]}>
            <Text style={[styles.colorLabel, { color: colors.text }]}>Accent Color:</Text>
            <View style={styles.inputWrapper}>
              <TouchableOpacity
                onPress={() => setActivePicker('accent')}
                onLongPress={() => setActivePicker('accent')}
                delayLongPress={200}
                style={[styles.colorIndicator, { backgroundColor: accentColor }]}
              />
              <TextInput
                style={[styles.input, { color: colors.text, borderBottomColor: colors.surfaceOpaque }]}
                value={accentColor}
                onChangeText={setAccentColor}
                placeholder="#E09F67"
                placeholderTextColor="#666"
                autoCapitalize="characters"
                maxLength={7}
              />
            </View>
          </View>

          <Text style={{ fontSize: 10, color: colors.textSecondary, fontStyle: 'italic', textAlign: 'center', marginTop: 12, marginBottom: 12 }}>
            💡 Hold or tap the color circles to pick from a palette!
          </Text>

          <TouchableOpacity
            style={[styles.applyBtn, { borderColor: colors.accent }]}
            onPress={handleApplyCustom}
          >
            <Text style={[styles.applyBtnText, { color: colors.accent }]}>Apply Custom Palette</Text>
          </TouchableOpacity>
        </View>

        {/* Companion Selector Panel */}
        <Text style={[styles.sectionTitle, { color: colors.textSecondary, marginTop: 25 }]}>
          Choose Companion Mascot
        </Text>

        <View style={[styles.customColorsCard, { backgroundColor: colors.surface, paddingVertical: 15 }]}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.companionGrid}>
            {[
              { type: 'dog', name: 'Dog', icon: '🐶' },
              { type: 'cat', name: 'Cat', icon: '🐱' },
              { type: 'rabbit', name: 'Rabbit', icon: '🐰' },
              { type: 'bird', name: 'Bird', icon: '🐦' },
              { type: 'fish', name: 'Fish', icon: '🐠' }
            ].map(item => (
              <TouchableOpacity
                key={item.type}
                style={[
                  styles.companionCard,
                  {
                    backgroundColor: colors.surfaceOpaque,
                    borderColor: companionType === item.type ? colors.accent : 'transparent',
                    borderWidth: companionType === item.type ? 2 : 0
                  }
                ]}
                onPress={() => {
                  try {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                  } catch (e) {}
                  if (onSaveCompanion) onSaveCompanion(item.type);
                }}
              >
                <Text style={styles.companionIcon}>{item.icon}</Text>
                <Text style={[styles.companionName, { color: colors.text }]}>{item.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Companion Name Input */}
        <View style={[styles.toggleRow, { backgroundColor: colors.surface, marginTop: 12 }]}>
          <View style={styles.toggleInfo}>
            <Text style={[styles.toggleName, { color: colors.text }]}>Companion Name</Text>
            <Text style={[styles.toggleDesc, { color: colors.textSecondary }]}>
              Give your buddy a custom name
            </Text>
          </View>
          <TextInput
            style={[styles.nameInput, { color: colors.text, borderColor: colors.surface, backgroundColor: colors.surfaceOpaque }]}
            value={localCompanionName}
            onChangeText={setLocalCompanionName}
            onBlur={() => {
              const finalName = localCompanionName.trim() || 'Rum';
              setLocalCompanionName(finalName);
              if (onSaveCompanionName) onSaveCompanionName(finalName);
            }}
            placeholder="Rum"
            placeholderTextColor={colors.textSecondary}
            maxLength={15}
          />
        </View>

        {/* Mascot Tips settings */}
        <Text style={[styles.sectionTitle, { color: colors.textSecondary, marginTop: 25 }]}>
          Mascot Options
        </Text>

        <View style={[styles.toggleRow, { backgroundColor: colors.surface }]}>
          <View style={styles.toggleInfo}>
            <Text style={[styles.toggleName, { color: colors.text }]}>Show Mascot Tips</Text>
            <Text style={[styles.toggleDesc, { color: colors.textSecondary }]}>
              {companionName || 'Rum'} will provide helpful commute updates.
            </Text>
          </View>
          <Switch
            trackColor={{ false: '#3a2212', true: colors.accentRgba }}
            thumbColor={showMascotTips ? colors.accent : '#aaa'}
            ios_backgroundColor="#3e3e3e"
            onValueChange={onSaveTips}
            value={showMascotTips}
          />
        </View>

        {/* Sitting mini companion */}
        <View style={styles.mascotArea}>
          <View style={[styles.miniSpeechBubble, { backgroundColor: colors.surfaceOpaque, borderColor: colors.surface }]}>
            <Text style={[styles.miniSpeechBubbleText, { color: colors.text }]}>
              {mascotSpeech}
            </Text>
          </View>
          <Animated.View
            style={{
              transform: [{ translateX: pan.x }, { translateY: pan.y }]
            }}
            {...panResponder.panHandlers}
          >
            <MascotRum
              state="idle"
              type={companionType}
              width={340}
              height={100}
              onBarkComplete={handleMascotTap}
            />
          </Animated.View>
        </View>

      </ScrollView>

      {/* Tabs navigation */}
      <View style={[styles.nav, { backgroundColor: colors.surfaceOpaque, borderTopColor: colors.surface }]}>
        <TouchableOpacity style={styles.navItem} onPress={() => onNavigate('dashboard')}>
          <Ionicons name="map" size={20} color={colors.textSecondary} />
          <Text style={[styles.navText, { color: colors.textSecondary }]}>Map</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => onNavigate('sounds')}>
          <Ionicons name="musical-notes" size={20} color={colors.textSecondary} />
          <Text style={[styles.navText, { color: colors.textSecondary }]}>Sounds</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem}>
          <Ionicons name="settings" size={20} color={colors.accent} />
          <Text style={[styles.navText, { color: colors.accent }]}>Settings</Text>
        </TouchableOpacity>
      </View>

      {/* Color Picker Modal */}
      <Modal
        visible={activePicker !== null}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setActivePicker(null)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setActivePicker(null)}
        >
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              Choose {activePicker === 'primary' ? 'Primary' : 'Accent'} Color
            </Text>
            
            <ScrollView contentContainerStyle={styles.colorGrid} style={{ maxHeight: 220, width: '100%' }}>
              {GRID_COLORS.map((c, i) => (
                <TouchableOpacity
                  key={i}
                  style={[styles.gridColorSquare, { backgroundColor: c }]}
                  onPress={() => {
                    try {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                    } catch (e) {}
                    if (activePicker === 'primary') {
                      setPrimaryColor(c);
                    } else {
                      setAccentColor(c);
                    }
                    setActivePicker(null);
                  }}
                />
              ))}
            </ScrollView>
            
            <TouchableOpacity
              style={[styles.closeBtn, { backgroundColor: colors.surfaceOpaque, marginTop: 15 }]}
              onPress={() => setActivePicker(null)}
            >
              <Text style={[styles.closeBtnText, { color: colors.accent }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

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
    paddingVertical: 20,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 12,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  themeCard: {
    flex: 0.485,
    borderWidth: 1,
    borderRadius: 14,
    padding: 10,
    alignItems: 'center',
  },
  previewArea: {
    width: '100%',
    height: 46,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 8,
  },
  dot: {
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  themeName: {
    fontSize: 11,
    fontWeight: '700',
  },
  customColorsCard: {
    borderRadius: 14,
    padding: 16,
  },
  colorRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  colorLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '60%',
  },
  colorIndicator: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    marginRight: 10,
  },
  input: {
    flex: 1,
    height: 36,
    borderBottomWidth: 1,
    padding: 5,
    fontSize: 13,
    fontWeight: '600',
  },
  applyBtn: {
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },
  applyBtnText: {
    fontWeight: '700',
    fontSize: 12,
  },
  toggleRow: {
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  toggleInfo: {
    flex: 0.8,
  },
  toggleName: {
    fontSize: 13,
    fontWeight: '600',
  },
  toggleDesc: {
    fontSize: 10,
    marginTop: 3,
    lineHeight: 14,
  },
  mascotArea: {
    // flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    // gap: 12,
    marginTop: 25,
    marginBottom: 40,
    width: '100%',
    paddingHorizontal: 20,
  },
  miniSpeechBubble: {
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 6,
    paddingHorizontal: 12,
    flexShrink: 1,
  },
  miniSpeechBubbleText: {
    fontSize: 14,
    fontWeight: '300',
    fontStyle: 'italic',
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    maxHeight: '75%',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  modalTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 16,
    textAlign: 'center',
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    paddingBottom: 10,
  },
  gridColorSquare: {
    width: 32,
    height: 32,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  closeBtn: {
    paddingVertical: 10,
    paddingHorizontal: 30,
    borderRadius: 10,
  },
  closeBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
  companionGrid: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 5,
  },
  companionCard: {
    width: 70,
    height: 75,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
  },
  companionIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  companionName: {
    fontSize: 11,
    fontWeight: '700',
  },
  nameInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 6,
    paddingHorizontal: 12,
    fontSize: 14,
    fontWeight: '600',
    width: 110,
    textAlign: 'center',
  },
});
