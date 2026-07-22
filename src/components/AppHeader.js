import React from 'react';
import { StyleSheet, View, Text, Platform, StatusBar } from 'react-native';
import { useTheme } from './ThemeContext';

export default function AppHeader({ title, rightComponent }) {
  const { colors } = useTheme();

  return (
    <View 
      style={[
        styles.headerContainer, 
        { 
          backgroundColor: colors.surfaceOpaque, 
          borderBottomColor: colors.surface 
        }
      ]}
    >
      <View style={styles.headerContent}>
        <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>
          {title}
        </Text>
        {rightComponent && (
          <View style={styles.rightContainer}>
            {rightComponent}
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  headerContainer: {
    height: 56,
    width: '100%',
    justifyContent: 'center',
    borderBottomWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 3,
    zIndex: 20,
  },
  headerContent: {
    height: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    position: 'relative',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 0.3,
    textAlign: 'center',
  },
  rightContainer: {
    position: 'absolute',
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
});
