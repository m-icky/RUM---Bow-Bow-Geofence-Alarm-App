import React, { createContext, useState, useEffect, useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const THEMES = {
  classic: {
    name: 'Classic Cocoa',
    background: '#1c1412',
    surface: 'rgba(45, 34, 30, 0.75)',
    surfaceOpaque: '#2d221e',
    text: '#f7ebe7',
    textSecondary: '#baa49d',
    accent: '#e09f67',
    accentHover: '#f0b583',
    accentRgba: 'rgba(224, 159, 103, 0.2)',
    dogPrimary: '#8D5B4C',
    dogSecondary: '#5E3C32',
  },
  midnight: {
    name: 'Midnight Cyber',
    background: '#07070d',
    surface: 'rgba(20, 20, 38, 0.75)',
    surfaceOpaque: '#1b1b2d',
    text: '#e6e6fa',
    textSecondary: '#8e8eb2',
    accent: '#00f0ff',
    accentHover: '#66f5ff',
    accentRgba: 'rgba(0, 240, 255, 0.2)',
    dogPrimary: '#4e5f80',
    dogSecondary: '#2f3d59',
  },
  emerald: {
    name: 'Emerald Forest',
    background: '#0b1410',
    surface: 'rgba(24, 38, 32, 0.75)',
    surfaceOpaque: '#213029',
    text: '#edf7f3',
    textSecondary: '#a3baa8',
    accent: '#2ecc71',
    accentHover: '#58d68d',
    accentRgba: 'rgba(46, 204, 113, 0.2)',
    dogPrimary: '#946951',
    dogSecondary: '#634330',
  },
  sunset: {
    name: 'Sunset Violet',
    background: '#150d1f',
    surface: 'rgba(38, 24, 45, 0.75)',
    surfaceOpaque: '#2f1d35',
    text: '#f3ebf7',
    textSecondary: '#b6a2c2',
    accent: '#9b59b6',
    accentHover: '#af7ac5',
    accentRgba: 'rgba(155, 89, 182, 0.2)',
    dogPrimary: '#aa6849',
    dogSecondary: '#74432c',
  }
};

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  const [themeKey, setThemeKey] = useState('classic');
  const [customColors, setCustomColors] = useState(null);

  useEffect(() => {
    // Load saved theme configuration from storage
    const loadTheme = async () => {
      try {
        const savedTheme = await AsyncStorage.getItem('rum_theme_key');
        if (savedTheme) {
          setThemeKey(savedTheme);
        }
        const savedCustom = await AsyncStorage.getItem('rum_custom_colors');
        if (savedCustom) {
          setCustomColors(JSON.parse(savedCustom));
        }
      } catch (e) {
        console.error('Failed to load theme configuration:', e);
      }
    };
    loadTheme();
  }, []);

  const changeTheme = async (key) => {
    try {
      setThemeKey(key);
      await AsyncStorage.setItem('rum_theme_key', key);
    } catch (e) {
      console.error(e);
    }
  };

  const applyCustomColors = async (primary, accent) => {
    try {
      const colors = { primary, accent };
      setCustomColors(colors);
      setThemeKey('custom');
      await AsyncStorage.setItem('rum_theme_key', 'custom');
      await AsyncStorage.setItem('rum_custom_colors', JSON.stringify(colors));
    } catch (e) {
      console.error(e);
    }
  };

  // Resolve current active color properties
  const getActiveColors = () => {
    if (themeKey === 'custom' && customColors) {
      // Helper function to generate RGBA values from Custom Hex
      const hexToRgba = (hex, alpha) => {
        let r = 0, g = 0, b = 0;
        if (hex.length === 4) {
          r = parseInt(hex[1] + hex[1], 16);
          g = parseInt(hex[2] + hex[2], 16);
          b = parseInt(hex[3] + hex[3], 16);
        } else if (hex.length === 7) {
          r = parseInt(hex.substring(1, 3), 16);
          g = parseInt(hex.substring(3, 5), 16);
          b = parseInt(hex.substring(5, 7), 16);
        }
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
      };
      
      return {
        name: 'Custom Palette',
        background: '#120c0a',
        surface: 'rgba(30, 24, 22, 0.75)',
        surfaceOpaque: '#241d1a',
        text: '#f7ebe7',
        textSecondary: '#baa49d',
        accent: customColors.accent,
        accentHover: customColors.accent,
        accentRgba: hexToRgba(customColors.accent, 0.2),
        dogPrimary: customColors.primary,
        dogSecondary: hexToRgba(customColors.primary, 0.7),
      };
    }
    return THEMES[themeKey] || THEMES.classic;
  };

  return (
    <ThemeContext.Provider value={{
      theme: themeKey,
      colors: getActiveColors(),
      setTheme: changeTheme,
      customColors,
      applyCustomColors
    }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
