import React, { useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Switch, ScrollView, TextInput } from 'react-native';
import { useTheme, THEMES } from '../components/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import MascotRum from '../components/MascotRum';

export default function SettingsScreen({
  showMascotTips,
  onSaveTips,
  onNavigate
}) {
  const { theme, colors, setTheme, customColors, applyCustomColors } = useTheme();

  // Local state for custom color text inputs
  const [primaryColor, setPrimaryColor] = useState(
    theme === 'custom' && customColors ? customColors.primary : '#8D5B4C'
  );
  const [accentColor, setAccentColor] = useState(
    theme === 'custom' && customColors ? customColors.accent : '#E09F67'
  );

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
              <View style={[styles.colorIndicator, { backgroundColor: primaryColor }]} />
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
              <View style={[styles.colorIndicator, { backgroundColor: accentColor }]} />
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

          <TouchableOpacity 
            style={[styles.applyBtn, { borderColor: colors.accent }]} 
            onPress={handleApplyCustom}
          >
            <Text style={[styles.applyBtnText, { color: colors.accent }]}>Apply Custom Palette</Text>
          </TouchableOpacity>
        </View>

        {/* Mascot Tips settings */}
        <Text style={[styles.sectionTitle, { color: colors.textSecondary, marginTop: 25 }]}>
          Mascot Options
        </Text>
        
        <View style={[styles.toggleRow, { backgroundColor: colors.surface }]}>
          <View style={styles.toggleInfo}>
            <Text style={[styles.toggleName, { color: colors.text }]}>Show Mascot Tips</Text>
            <Text style={[styles.toggleDesc, { color: colors.textSecondary }]}>
              Rum will provide helpful commute updates.
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
              “Thanks for coloring me! Woof!”
            </Text>
          </View>
          <MascotRum state="idle" width={75} height={60} />
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
          <Ionicons name="color-palette" size={20} color={colors.accent} />
          <Text style={[styles.navText, { color: colors.accent }]}>Themes</Text>
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 25,
    marginBottom: 40,
    width: '100%',
  },
  miniSpeechBubble: {
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  miniSpeechBubbleText: {
    fontSize: 10,
    fontWeight: '700',
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
});
