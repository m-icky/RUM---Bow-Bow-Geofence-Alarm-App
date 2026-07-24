import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Image,
  Alert,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../components/ThemeContext';
import AppHeader from '../components/AppHeader';
import MascotRum from '../components/MascotRum';

export default function ProfileScreen({
  userProfile = {},
  onSaveProfile,
  onNavigate,
  companionType = 'dog',
  companionName = 'Rum',
  showMascotTips = true
}) {
  const { colors } = useTheme();

  const [name, setName] = useState(userProfile.name || '');
  const [username, setUsername] = useState(userProfile.username || '');
  const [email, setEmail] = useState(userProfile.email || '');
  const [phone, setPhone] = useState(userProfile.phone || '');
  const [photoUri, setPhotoUri] = useState(userProfile.photoUri || null);

  const [errors, setErrors] = useState({});
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    setName(userProfile.name || '');
    setUsername(userProfile.username || '');
    setEmail(userProfile.email || '');
    setPhone(userProfile.phone || '');
    setPhotoUri(userProfile.photoUri || null);
  }, [userProfile]);

  const handlePickPhoto = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      const result = await DocumentPicker.getDocumentAsync({
        type: 'image/*',
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const pickedUri = result.assets[0].uri;
        setPhotoUri(pickedUri);
      }
    } catch (err) {
      console.error('Failed to pick profile image:', err);
      Alert.alert('Error', 'Failed to pick image from device storage.');
    }
  };

  const handleRemovePhoto = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    } catch (e) {}
    setPhotoUri(null);
  };

  const validate = () => {
    const errs = {};
    if (!name.trim()) errs.name = 'Name is required';
    if (!username.trim()) errs.username = 'Username is required';
    if (!email.trim()) {
      errs.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      errs.email = 'Invalid email address';
    }
    if (!phone.trim()) {
      errs.phone = 'Phone number is required';
    } else if (phone.trim().length < 7) {
      errs.phone = 'Enter a valid phone number';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = () => {
    if (!validate()) {
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      } catch (e) {}
      return;
    }

    const updatedProfile = {
      ...userProfile,
      name: name.trim(),
      username: username.trim().startsWith('@') ? username.trim() : `@${username.trim()}`,
      email: email.trim(),
      phone: phone.trim(),
      photoUri: photoUri,
      isProfileSetup: true,
    };

    onSaveProfile(updatedProfile);

    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    } catch (e) {}

    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
    }, 3000);
  };

  const getInitials = () => {
    if (!name) return 'U';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <AppHeader title="USER PROFILE" onNavigate={onNavigate} />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Profile Photo Header */}
          <View style={[styles.photoCard, { backgroundColor: colors.surface, borderColor: colors.surface }]}>
            <View style={styles.avatarWrapper}>
              {photoUri ? (
                <Image source={{ uri: photoUri }} style={styles.avatarImage} />
              ) : (
                <View style={[styles.avatarPlaceholder, { backgroundColor: colors.accentRgba }]}>
                  <Text style={[styles.avatarInitials, { color: colors.accent }]}>
                    {getInitials()}
                  </Text>
                </View>
              )}
              <TouchableOpacity
                activeOpacity={0.8}
                style={[styles.badgeEditBtn, { backgroundColor: colors.accent }]}
                onPress={handlePickPhoto}
              >
                <Ionicons name="camera" size={16} color="#fff" />
              </TouchableOpacity>
            </View>

            <Text style={[styles.userNameTitle, { color: colors.text }]}>
              {name || 'User Name'}
            </Text>
            <Text style={[styles.userHandleText, { color: colors.accent }]}>
              {username || '@username'}
            </Text>

            <View style={styles.photoActionRow}>
              <TouchableOpacity
                activeOpacity={0.7}
                style={[styles.photoActionBtn, { backgroundColor: colors.background, borderColor: colors.accent }]}
                onPress={handlePickPhoto}
              >
                <Ionicons name="image-outline" size={16} color={colors.accent} style={{ marginRight: 6 }} />
                <Text style={[styles.photoActionText, { color: colors.accent }]}>Change Photo</Text>
              </TouchableOpacity>

              {photoUri && (
                <TouchableOpacity
                  activeOpacity={0.7}
                  style={[styles.photoActionBtn, { backgroundColor: 'rgba(255, 77, 77, 0.1)', borderColor: '#ff4d4d' }]}
                  onPress={handleRemovePhoto}
                >
                  <Ionicons name="trash-outline" size={16} color="#ff4d4d" style={{ marginRight: 6 }} />
                  <Text style={[styles.photoActionText, { color: '#ff4d4d' }]}>Remove</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Form Card */}
          <View style={[styles.formCard, { backgroundColor: colors.surface, borderColor: colors.surface }]}>
            <Text style={[styles.sectionHeading, { color: colors.text }]}>
              Profile Information
            </Text>

            {/* Name */}
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Full Name</Text>
              <View style={[
                styles.inputContainer,
                { backgroundColor: colors.background, borderColor: errors.name ? '#ff4d4d' : colors.surface }
              ]}>
                <Ionicons name="person-outline" size={18} color={colors.accent} style={styles.inputIcon} />
                <TextInput
                  style={[styles.textInput, { color: colors.text }]}
                  placeholder="Enter full name"
                  placeholderTextColor={colors.textSecondary}
                  value={name}
                  onChangeText={(text) => {
                    setName(text);
                    if (errors.name) setErrors(prev => ({ ...prev, name: null }));
                  }}
                />
              </View>
              {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}
            </View>

            {/* Username */}
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Username</Text>
              <View style={[
                styles.inputContainer,
                { backgroundColor: colors.background, borderColor: errors.username ? '#ff4d4d' : colors.surface }
              ]}>
                <Ionicons name="at-outline" size={18} color={colors.accent} style={styles.inputIcon} />
                <TextInput
                  style={[styles.textInput, { color: colors.text }]}
                  placeholder="Enter username"
                  placeholderTextColor={colors.textSecondary}
                  autoCapitalize="none"
                  value={username}
                  onChangeText={(text) => {
                    setUsername(text);
                    if (errors.username) setErrors(prev => ({ ...prev, username: null }));
                  }}
                />
              </View>
              {errors.username && <Text style={styles.errorText}>{errors.username}</Text>}
            </View>

            {/* Email */}
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Email Address</Text>
              <View style={[
                styles.inputContainer,
                { backgroundColor: colors.background, borderColor: errors.email ? '#ff4d4d' : colors.surface }
              ]}>
                <Ionicons name="mail-outline" size={18} color={colors.accent} style={styles.inputIcon} />
                <TextInput
                  style={[styles.textInput, { color: colors.text }]}
                  placeholder="Enter email address"
                  placeholderTextColor={colors.textSecondary}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  value={email}
                  onChangeText={(text) => {
                    setEmail(text);
                    if (errors.email) setErrors(prev => ({ ...prev, email: null }));
                  }}
                />
              </View>
              {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
            </View>

            {/* Phone */}
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Phone Number</Text>
              <View style={[
                styles.inputContainer,
                { backgroundColor: colors.background, borderColor: errors.phone ? '#ff4d4d' : colors.surface }
              ]}>
                <Ionicons name="call-outline" size={18} color={colors.accent} style={styles.inputIcon} />
                <TextInput
                  style={[styles.textInput, { color: colors.text }]}
                  placeholder="Enter phone number"
                  placeholderTextColor={colors.textSecondary}
                  keyboardType="phone-pad"
                  value={phone}
                  onChangeText={(text) => {
                    setPhone(text);
                    if (errors.phone) setErrors(prev => ({ ...prev, phone: null }));
                  }}
                />
              </View>
              {errors.phone && <Text style={styles.errorText}>{errors.phone}</Text>}
            </View>

            {/* Success Toast banner */}
            {savedSuccess && (
              <View style={styles.successBanner}>
                <Ionicons name="checkmark-circle" size={18} color="#4cd964" style={{ marginRight: 8 }} />
                <Text style={styles.successBannerText}>Profile updated successfully!</Text>
              </View>
            )}

            {/* Save Button */}
            <TouchableOpacity
              activeOpacity={0.8}
              style={[styles.saveBtn, { backgroundColor: colors.accent }]}
              onPress={handleSave}
            >
              <Ionicons name="save-outline" size={20} color="#fff" style={{ marginRight: 8 }} />
              <Text style={styles.saveBtnText}>Save Profile Changes</Text>
            </TouchableOpacity>
          </View>

          {/* Mascot Banner at bottom */}
          {showMascotTips && (
            <View style={[styles.mascotCard, { backgroundColor: colors.surface }]}>
              <MascotRum state="happy" type={companionType} width={100} height={60} />
              <Text style={[styles.mascotText, { color: colors.textSecondary }]}>
                “Woof! Looking good, <Text style={{ color: colors.accent, fontWeight: '700' }}>{name || 'friend'}</Text>! {companionName} is happy to accompany you!” 🐾
              </Text>
            </View>
          )}

          <View style={{ height: 90 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  photoCard: {
    alignItems: 'center',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 3,
  },
  avatarWrapper: {
    position: 'relative',
    marginBottom: 12,
  },
  avatarImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitials: {
    fontSize: 34,
    fontWeight: '900',
  },
  badgeEditBtn: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2.5,
    borderColor: '#fff',
    elevation: 4,
  },
  userNameTitle: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  userHandleText: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 2,
    marginBottom: 14,
  },
  photoActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  photoActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  photoActionText: {
    fontSize: 13,
    fontWeight: '700',
  },
  formCard: {
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 3,
  },
  sectionHeading: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 16,
    letterSpacing: 0.5,
  },
  inputGroup: {
    marginBottom: 14,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    height: 48,
  },
  inputIcon: {
    marginRight: 10,
  },
  textInput: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
  },
  errorText: {
    color: '#ff4d4d',
    fontSize: 11,
    marginTop: 4,
    marginLeft: 4,
    fontWeight: '600',
  },
  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(76, 217, 100, 0.15)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
  },
  successBannerText: {
    color: '#4cd964',
    fontSize: 13,
    fontWeight: '700',
  },
  saveBtn: {
    width: '100%',
    height: 50,
    borderRadius: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 6,
    elevation: 4,
  },
  saveBtnText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  mascotCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 18,
    padding: 16,
    gap: 12,
  },
  mascotText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
  },
});
