import React, { useState } from 'react';
import {
  ActivityIndicator,
  ImageBackground,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { MaterialIcons } from '@expo/vector-icons';

import { useAuthStore } from '../store/authStore';
import type { LoginScreenProps } from '../types/navigation';

export default function LoginScreen({ navigation }: LoginScreenProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const login = useAuthStore((state) => state.login);

  const handleLogin = async () => {
    Keyboard.dismiss();
    if (!email.trim() || !password) {
      setError('Veuillez remplir tous les champs.');
      return;
    }

    setError('');
    setIsLoading(true);
    const result = await login(email.trim(), password);
    setIsLoading(false);
    if (!result.success) {
      setError(result.message ?? 'Échec de la connexion.');
    }
  };

  return (
    <ImageBackground
      source={require('../../assets/auth-background.png')}
      style={styles.background}
      resizeMode="cover"
    >
      <LinearGradient
        colors={['rgba(0,0,0,0.4)', 'rgba(19,19,19,0.8)', '#131313']}
        locations={[0, 0.45, 0.75]}
        style={styles.gradient}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboard}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Logo / Branding */}
          <View style={styles.brand}>
            <Text style={styles.logo}>Cinéma Avenida</Text>
            <Text style={styles.tagline}>Votre salle, vos séances.</Text>
          </View>

          {/* Glass form card */}
          <BlurView intensity={20} tint="dark" style={styles.card}>
            <View style={styles.cardBorder} />

            <View style={styles.field}>
              <Text style={styles.label}>EMAIL</Text>
              <View
                style={[
                  styles.inputRow,
                  focusedField === 'email' && styles.inputRowFocused,
                ]}
              >
                <MaterialIcons
                  name="mail-outline"
                  size={20}
                  color="rgba(178,34,34,0.8)"
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder="votre@email.com"
                  placeholderTextColor="rgba(229,226,225,0.4)"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  value={email}
                  onChangeText={setEmail}
                  onFocus={() => setFocusedField('email')}
                  onBlur={() => setFocusedField(null)}
                />
              </View>
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>MOT DE PASSE</Text>
              <View
                style={[
                  styles.inputRow,
                  focusedField === 'password' && styles.inputRowFocused,
                ]}
              >
                <MaterialIcons
                  name="lock-outline"
                  size={20}
                  color="rgba(178,34,34,0.8)"
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder="••••••••"
                  placeholderTextColor="rgba(229,226,225,0.4)"
                  secureTextEntry={!showPassword}
                  value={password}
                  onChangeText={setPassword}
                  onFocus={() => setFocusedField('password')}
                  onBlur={() => setFocusedField(null)}
                />
                <Pressable
                  onPress={() => setShowPassword((prev) => !prev)}
                  hitSlop={8}
                >
                  <MaterialIcons
                    name={showPassword ? 'visibility' : 'visibility-off'}
                    size={20}
                    color="#aa8986"
                  />
                </Pressable>
              </View>
            </View>

            {error ? (
              <Text
                accessibilityRole="alert"
                numberOfLines={2}
                ellipsizeMode="tail"
                style={styles.error}
              >
                {error}
              </Text>
            ) : null}

            <TouchableOpacity
              style={[styles.button, isLoading && styles.buttonDisabled]}
              onPress={handleLogin}
              activeOpacity={0.9}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Text style={styles.buttonText}>Se connecter</Text>
                  <MaterialIcons name="arrow-forward" size={20} color="#fff" />
                </>
              )}
            </TouchableOpacity>
          </BlurView>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>Pas encore de compte ? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Signup')}>
              <Text style={styles.footerLink}>S'inscrire</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
    backgroundColor: '#131313',
  },
  gradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  keyboard: {
    flex: 1,
  },
  scroll: {
    flexGrow: 1,
    justifyContent: 'flex-end',
    paddingHorizontal: 24,
    paddingBottom: 40,
    paddingTop: 80,
  },
  brand: {
    alignItems: 'center',
    marginBottom: 48,
  },
  logo: {
    fontFamily: 'EBGaramond-SemiBold',
    fontSize: 36,
    color: '#e5e2e1',
    textAlign: 'center',
    marginBottom: 8,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  tagline: {
    fontFamily: 'Inter-Regular',
    fontSize: 16,
    color: '#e2beba',
    textAlign: 'center',
    opacity: 0.9,
  },
  card: {
    backgroundColor: 'rgba(19,19,19,0.6)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    padding: 24,
    gap: 20,
    overflow: 'hidden',
  },
  cardBorder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  field: {
    gap: 6,
  },
  label: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 12,
    letterSpacing: 0.6,
    color: '#e2beba',
    textTransform: 'uppercase',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(42,42,42,0.8)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'transparent',
    paddingHorizontal: 14,
    paddingVertical: 4,
  },
  inputRowFocused: {
    borderColor: '#b22222',
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontFamily: 'Inter-Regular',
    fontSize: 16,
    color: '#e5e2e1',
    paddingVertical: 12,
  },
  error: {
    fontFamily: 'Inter-Medium',
    fontSize: 13,
    lineHeight: 18,
    color: '#ffb4ab',
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#b22222',
    borderRadius: 10,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    fontFamily: 'Inter-Bold',
    fontSize: 16,
    color: '#fff',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 32,
  },
  footerText: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: '#e2beba',
  },
  footerLink: {
    fontFamily: 'Inter-Medium',
    fontSize: 14,
    color: '#ffb4ac',
    textDecorationLine: 'underline',
    textDecorationColor: 'rgba(255,180,172,0.3)',
  },
});
