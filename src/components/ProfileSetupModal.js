import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from './ThemeContext';
import MascotRum from './MascotRum';
import * as Haptics from 'expo-haptics';

export default function ProfileSetupModal({
  visible,
  onSaveProfile,
  companionType = 'dog',
  companionName = 'Rum'
}) {
  const { colors } = useTheme();

  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [errors, setErrors] = useState({});

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

    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    } catch (e) {}

    onSaveProfile({
      name: name.trim(),
      username: username.trim().startsWith('@') ? username.trim() : `@${username.trim()}`,
      email: email.trim(),
      phone: phone.trim(),
      photoUri: null,
      isProfileSetup: true,
    });
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={() => {
        // Prevent closing without saving on initial mandatory setup
      }}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.modalOverlay}
      >
        <View style={[styles.modalCard, { backgroundColor: colors.surface, borderColor: colors.accentRgba }]}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            {/* Header Badge & Mascot */}
            <View style={styles.headerArea}>
              <View style={styles.mascotWrapper}>
                <MascotRum state="happy" type={companionType} width={120} height={70} />
              </View>
              <Text style={[styles.title, { color: colors.text }]}>Welcome to RUM! 🐾</Text>
              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                {companionName || 'Rum'} needs a few details to personalize your profile before we get started.
              </Text>
            </View>

            {/* Input Fields */}
            <View style={styles.formArea}>
              {/* Full Name */}
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
                  Full Name <Text style={{ color: colors.accent }}>*</Text>
                </Text>
                <View style={[
                  styles.inputContainer,
                  { backgroundColor: colors.background, borderColor: errors.name ? '#ff4d4d' : colors.surface }
                ]}>
                  <Ionicons name="person-outline" size={18} color={colors.accent} style={styles.inputIcon} />
                  <TextInput
                    style={[styles.textInput, { color: colors.text }]}
                    placeholder="e.g. John Doe"
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
                <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
                  Username <Text style={{ color: colors.accent }}>*</Text>
                </Text>
                <View style={[
                  styles.inputContainer,
                  { backgroundColor: colors.background, borderColor: errors.username ? '#ff4d4d' : colors.surface }
                ]}>
                  <Ionicons name="at-outline" size={18} color={colors.accent} style={styles.inputIcon} />
                  <TextInput
                    style={[styles.textInput, { color: colors.text }]}
                    placeholder="e.g. johndoe"
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
                <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
                  Email Address <Text style={{ color: colors.accent }}>*</Text>
                </Text>
                <View style={[
                  styles.inputContainer,
                  { backgroundColor: colors.background, borderColor: errors.email ? '#ff4d4d' : colors.surface }
                ]}>
                  <Ionicons name="mail-outline" size={18} color={colors.accent} style={styles.inputIcon} />
                  <TextInput
                    style={[styles.textInput, { color: colors.text }]}
                    placeholder="john@example.com"
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
                <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
                  Phone Number <Text style={{ color: colors.accent }}>*</Text>
                </Text>
                <View style={[
                  styles.inputContainer,
                  { backgroundColor: colors.background, borderColor: errors.phone ? '#ff4d4d' : colors.surface }
                ]}>
                  <Ionicons name="call-outline" size={18} color={colors.accent} style={styles.inputIcon} />
                  <TextInput
                    style={[styles.textInput, { color: colors.text }]}
                    placeholder="+1 234 567 8900"
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
            </View>

            {/* Save Button */}
            <TouchableOpacity
              activeOpacity={0.8}
              style={[styles.saveBtn, { backgroundColor: colors.accent }]}
              onPress={handleSave}
            >
              <Ionicons name="checkmark-circle-outline" size={22} color="#fff" style={{ marginRight: 8 }} />
              <Text style={styles.saveBtnText}>Save Profile & Continue</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxHeight: '90%',
    borderRadius: 24,
    borderWidth: 1.5,
    paddingHorizontal: 22,
    paddingTop: 20,
    paddingBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 20,
  },
  scrollContent: {
    alignItems: 'center',
  },
  headerArea: {
    alignItems: 'center',
    marginBottom: 20,
  },
  mascotWrapper: {
    height: 75,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 13,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
    paddingHorizontal: 10,
  },
  formArea: {
    width: '100%',
    marginBottom: 20,
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
  saveBtn: {
    width: '100%',
    height: 52,
    borderRadius: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  saveBtnText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
});
