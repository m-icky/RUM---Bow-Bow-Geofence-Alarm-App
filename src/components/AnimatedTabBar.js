import React, { useEffect, useRef } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  TouchableOpacity, 
  Animated, 
  Dimensions, 
  Platform 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from './ThemeContext';

const TABS = [
  { id: 'home', label: 'Home', activeIcon: 'home', inactiveIcon: 'home-outline' },
  { id: 'sounds', label: 'Sounds', activeIcon: 'musical-notes', inactiveIcon: 'musical-notes-outline' },
  { id: 'settings', label: 'Settings', activeIcon: 'settings', inactiveIcon: 'settings-outline' },
];

export default function AnimatedTabBar({ currentTab, onTabPress, scrollX }) {
  const { colors } = useTheme();

  // Find index of active tab
  const activeIndex = Math.max(0, TABS.findIndex(t => t.id === currentTab));
  
  const screenWidth = Dimensions.get('window').width;
  const tabWidth = screenWidth / TABS.length;

  // Fallback animation value if scrollX is not passed
  const fallbackAnim = useRef(new Animated.Value(activeIndex >= 0 ? activeIndex : 0)).current;

  useEffect(() => {
    if (!scrollX) {
      Animated.spring(fallbackAnim, {
        toValue: activeIndex >= 0 ? activeIndex : 0,
        useNativeDriver: false,
        friction: 8,
        tension: 70,
      }).start();
    }
  }, [activeIndex, scrollX]);

  // Interpolate position from real-time scrollX or fallbackAnim
  const translateX = scrollX
    ? scrollX.interpolate({
        inputRange: [0, screenWidth, screenWidth * 2],
        outputRange: [0, tabWidth, tabWidth * 2],
        extrapolate: 'clamp',
      })
    : fallbackAnim.interpolate({
        inputRange: [0, 1, 2],
        outputRange: [0, tabWidth, tabWidth * 2],
      });

  return (
    <View style={[styles.barContainer, { backgroundColor: colors.surfaceOpaque, borderTopColor: colors.surface }]}>
      {/* Sliding Active Pill Background */}
      <Animated.View
        style={[
          styles.activePill,
          {
            width: tabWidth - 24,
            left: 12,
            backgroundColor: colors.accentRgba,
            transform: [{ translateX }],
          }
        ]}
      />

      {/* Tab Buttons */}
      <View style={styles.tabsRow}>
        {TABS.map((tab, i) => {
          const isSelected = activeIndex === i;

          return (
            <TouchableOpacity
              key={tab.id}
              activeOpacity={0.7}
              style={styles.tabButton}
              onPress={() => onTabPress(tab.id)}
            >
              <View style={styles.iconWrapper}>
                <Ionicons
                  name={isSelected ? tab.activeIcon : tab.inactiveIcon}
                  size={20}
                  color={isSelected ? colors.accent : colors.textSecondary}
                />
              </View>

              <Text 
                style={[
                  styles.tabLabel, 
                  { 
                    color: isSelected ? colors.accent : colors.textSecondary,
                    fontWeight: isSelected ? '800' : '500',
                  }
                ]}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  barContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 64,
    borderTopWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 12,
    zIndex: 100,
  },
  tabsRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  tabButton: {
    flex: 1,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  activePill: {
    position: 'absolute',
    top: 8,
    bottom: 8,
    borderRadius: 20,
  },
  iconWrapper: {
    marginBottom: 3,
  },
  tabLabel: {
    fontSize: 11,
    letterSpacing: 0.2,
  },
});
