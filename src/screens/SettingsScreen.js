import React, { useState, useRef } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Switch, ScrollView, TextInput, Animated, PanResponder, Modal, Linking, Alert } from 'react-native';
import { useTheme, THEMES } from '../components/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import MascotRum from '../components/MascotRum';
import AppHeader from '../components/AppHeader';
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

  const handleFeedPay = (amount = 10) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    } catch (e) {}

    const name = encodeURIComponent(localCompanionName || 'Rum');
    const upiUrl = `upi://pay?pa=naveentmadhu-1@okicici&pn=Rum%20Companion&cu=INR&am=${amount}&tn=Feed%20${name}%20a%20treat`;

    Linking.openURL(upiUrl).catch(() => {
      Alert.alert(
        `Feed ${localCompanionName || 'Rum'} 🍖`,
        `Google Pay / UPI app could not open automatically.\n\nPlease send ₹${amount} to UPI ID:\nnaveentmadhu-1@okicici`,
        [{ text: "OK" }]
      );
    });
  };

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

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Theme Presets</Text>

        {/* Horizontal Animated Theme Carousel */}
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingVertical: 6, paddingRight: 15 }}
        >
          {Object.keys(THEMES).map(key => {
            const t = THEMES[key];
            const isSelected = theme === key;
            const isDefaultLight = key === 'daylight';

            return (
              <TouchableOpacity
                key={key}
                activeOpacity={0.8}
                style={[
                  styles.themeCarouselCard,
                  {
                    backgroundColor: colors.surfaceOpaque,
                    borderColor: isSelected ? colors.accent : colors.surface,
                    borderWidth: isSelected ? 2 : 1,
                  }
                ]}
                onPress={() => setTheme(key)}
              >
                <View style={styles.themeBadgeRow}>
                  {isDefaultLight && (
                    <View style={[styles.defaultBadge, { backgroundColor: colors.accentRgba }]}>
                      <Text style={[styles.defaultBadgeText, { color: colors.accent }]}>DEFAULT</Text>
                    </View>
                  )}
                  {isSelected && (
                    <Ionicons name="checkmark-circle" size={20} color={colors.accent} style={{ marginLeft: 'auto' }} />
                  )}
                </View>

                {/* Color Swatch Preview Area */}
                <View style={[styles.themePreviewArea, { backgroundColor: t.background }]}>
                  <View style={[styles.themePreviewDot, { backgroundColor: t.dogPrimary }]} />
                  <View style={[styles.themePreviewDot, { backgroundColor: t.accent }]} />
                  <View style={[styles.themePreviewDot, { backgroundColor: t.textSecondary }]} />
                </View>

                {/* Theme Title */}
                <Text style={[styles.themeCardTitle, { color: colors.text }]} numberOfLines={1}>
                  {t.name}
                </Text>
                
                <Text style={[styles.themeSubText, { color: colors.textSecondary }]}>
                  {key === 'daylight' ? 'Light Mode' : 'Dark Mode'}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

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

        {/* Feed Companion Section */}
        <View style={[styles.feedCard, { backgroundColor: colors.surface, borderColor: colors.surfaceOpaque }]}>
          <View style={styles.feedHeaderRow}>
            <Text style={styles.feedEmoji}>🍖</Text>
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={[styles.feedTitle, { color: colors.text }]}>
                Feed {localCompanionName || 'Rum'} a Treat! 🦴
              </Text>
              <Text style={[styles.feedSubtitle, { color: colors.textSecondary }]}>
                {companionType === 'cat' ? `Buy ${localCompanionName || 'Rum'} a juicy fish snack! 🐟`
                  : companionType === 'rabbit' ? `Buy ${localCompanionName || 'Rum'} a crunchy carrot! 🥕`
                  : companionType === 'bird' ? `Buy ${localCompanionName || 'Rum'} a bag of seeds! 🌾`
                  : companionType === 'fish' ? `Buy ${localCompanionName || 'Rum'} a bowl of flakes! 🫧`
                  : `Buy ${localCompanionName || 'Rum'} a big meaty bone! 🥩`}
              </Text>
            </View>
          </View>

          <View style={styles.feedButtonsRow}>
            <TouchableOpacity
              style={[styles.feedBtn, { backgroundColor: colors.accent }]}
              onPress={() => handleFeedPay(10)}
            >
              <Ionicons name="card-outline" size={16} color="#120a08" style={{ marginRight: 6 }} />
              <Text style={styles.feedBtnText}>Buy Snack (₹10)</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.feedBtn, { backgroundColor: colors.surfaceOpaque, borderWidth: 1, borderColor: colors.accent }]}
              onPress={() => handleFeedPay(50)}
            >
              <Ionicons name="restaurant-outline" size={16} color={colors.accent} style={{ marginRight: 6 }} />
              <Text style={[styles.feedBtnText, { color: colors.accent }]}>Buy Feast (₹50)</Text>
            </TouchableOpacity>
          </View>

          <Text style={[styles.upiInfoText, { color: colors.textSecondary }]}>
            Opens Google Pay / UPI • ID: naveentmadhu-1@okicici
          </Text>
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

        {/* GitHub Developer Profile Footer */}
        <View style={styles.githubFooterContainer}>
          <TouchableOpacity
            style={[styles.githubCard, { backgroundColor: colors.surfaceOpaque, borderColor: colors.surface }]}
            onPress={() => {
              try {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
              } catch (e) {}
              Linking.openURL('https://github.com/m-icky').catch((err) => {
                console.error("Failed to open GitHub profile:", err);
              });
            }}
            activeOpacity={0.8}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={[styles.githubIconBadge, { backgroundColor: colors.surface }]}>
                <Ionicons name="logo-github" size={24} color={colors.text} />
              </View>
              <View style={{ marginLeft: 12 }}>
                <Text style={[styles.githubTitle, { color: colors.text }]}>Designed & Developed by m-icky</Text>
                <Text style={[styles.githubSubtitle, { color: colors.textSecondary }]}>github.com/m-icky</Text>
              </View>
            </View>
            <View style={[styles.githubOpenBadge, { backgroundColor: colors.accentRgba || 'rgba(37, 99, 235, 0.15)' }]}>
              <Text style={[styles.githubOpenText, { color: colors.accent }]}>Visit Profile</Text>
              <Ionicons name="open-outline" size={14} color={colors.accent} style={{ marginLeft: 4 }} />
            </View>
          </TouchableOpacity>
          
          <Text style={[styles.appVersionText, { color: colors.textSecondary }]}>
            Rum Geofence Alarm • v1.0.0
          </Text>
        </View>

      </ScrollView>

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
  themeCarouselCard: {
    width: 140,
    borderRadius: 16,
    padding: 12,
    marginRight: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  themeBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 22,
    marginBottom: 8,
  },
  defaultBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  defaultBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  themePreviewArea: {
    height: 52,
    width: '100%',
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 10,
  },
  themePreviewDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  themeCardTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  themeSubText: {
    fontSize: 10,
    fontWeight: '500',
    marginTop: 2,
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
  feedCard: {
    marginTop: 12,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
  },
  feedHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  feedEmoji: {
    fontSize: 28,
  },
  feedTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  feedSubtitle: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 2,
  },
  feedButtonsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  feedBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 12,
  },
  feedBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#120a08',
  },
  upiInfoText: {
    fontSize: 10,
    fontWeight: '500',
    textAlign: 'center',
    marginTop: 10,
    opacity: 0.7,
  },
  githubFooterContainer: {
    marginTop: 25,
    marginBottom: 20,
    alignItems: 'center',
  },
  githubCard: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 4,
  },
  githubIconBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  githubTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  githubSubtitle: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 2,
  },
  githubOpenBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 10,
  },
  githubOpenText: {
    fontSize: 11,
    fontWeight: '700',
  },
  appVersionText: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 12,
    opacity: 0.6,
  },
});
