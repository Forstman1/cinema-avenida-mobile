import React, { useState } from 'react';
import {
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

import { useAuth } from '../context/AuthContext';
import type { SignupScreenProps } from '../types/navigation';

export default function SignupScreen({ navigation }: SignupScreenProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [error, setError] = useState('');
  const { signup } = useAuth();

  const handleSignup = async () => {
    Keyboard.dismiss();
    if (!name.trim() || !email.trim() || !password) {
      setError('Veuillez remplir tous les champs.');
      return;
    }

    setError('');
    const result = await signup(email.trim(), password, name.trim());
    if (!result.success) {
      setError(result.message ?? 'Signup failed');
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

      {/* Header back button */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          hitSlop={16}
        >
          <MaterialIcons name="arrow-back" size={24} color="#e2beba" />
        </TouchableOpacity>
        <View style={styles.headerSpacer} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboard}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Branding / Hero */}
          <View style={styles.brand}>
            <Text style={styles.title}>Cinéma Avenida</Text>
            <Text style={styles.subtitle}>Rejoignez le club des cinéphiles.</Text>
          </View>

          {/* Glass form card */}
          <BlurView intensity={20} tint="dark" style={styles.card}>
            <View style={styles.cardHighlight} />

            <View style={styles.field}>
              <Text
                style={[
                  styles.label,
                  focusedField === 'name' && styles.labelFocused,
                ]}
              >
                Nom complet
              </Text>
              <View
                style={[
                  styles.inputRow,
                  focusedField === 'name' && styles.inputRowFocused,
                ]}
              >
                <MaterialIcons
                  name="person-outline"
                  size={20}
                  color="#aa8986"
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Jean Dupont"
                  placeholderTextColor="rgba(229,226,225,0.5)"
                  value={name}
                  onChangeText={setName}
                  onFocus={() => setFocusedField('name')}
                  onBlur={() => setFocusedField(null)}
                />
              </View>
            </View>

            <View style={styles.field}>
              <Text
                style={[
                  styles.label,
                  focusedField === 'email' && styles.labelFocused,
                ]}
              >
                Email
              </Text>
              <View
                style={[
                  styles.inputRow,
                  focusedField === 'email' && styles.inputRowFocused,
                ]}
              >
                <MaterialIcons
                  name="mail-outline"
                  size={20}
                  color="#aa8986"
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder="jean@exemple.com"
                  placeholderTextColor="rgba(229,226,225,0.5)"
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
              <Text
                style={[
                  styles.label,
                  focusedField === 'password' && styles.labelFocused,
                ]}
              >
                Mot de passe
              </Text>
              <View
                style={[
                  styles.inputRow,
                  focusedField === 'password' && styles.inputRowFocused,
                ]}
              >
                <MaterialIcons
                  name="lock-outline"
                  size={20}
                  color="#aa8986"
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder="••••••••"
                  placeholderTextColor="rgba(229,226,225,0.5)"
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

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <TouchableOpacity
              style={styles.button}
              onPress={handleSignup}
              activeOpacity={0.9}
            >
              <Text style={styles.buttonText}>S'inscrire</Text>
              <MaterialIcons name="arrow-forward" size={20} color="#fff" />
            </TouchableOpacity>

            <View style={styles.footer}>
              <Text style={styles.footerText}>Déjà membre ? </Text>
              <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                <Text style={styles.footerLink}>Se connecter</Text>
              </TouchableOpacity>
            </View>
          </BlurView>
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
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 48,
    zIndex: 10,
  },
  backButton: {
    padding: 8,
    borderRadius: 20,
  },
  headerSpacer: {
    width: 40,
  },
  keyboard: {
    flex: 1,
  },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingBottom: 40,
    paddingTop: 100,
  },
  brand: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontFamily: 'EBGaramond-SemiBold',
    fontSize: 36,
    color: '#e5e2e1',
    textAlign: 'center',
    marginBottom: 6,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  subtitle: {
    fontFamily: 'Inter-Regular',
    fontSize: 16,
    color: '#e2beba',
    textAlign: 'center',
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
  cardHighlight: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  field: {
    gap: 6,
  },
  label: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 12,
    letterSpacing: 0.6,
    color: '#e2beba',
  },
  labelFocused: {
    color: '#b22222',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(32,31,31,0.8)',
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
    fontSize: 14,
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
    marginTop: 4,
    shadowColor: 'rgba(178,34,34,0.3)',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 32,
    elevation: 8,
  },
  buttonText: {
    fontFamily: 'Inter-Bold',
    fontSize: 16,
    color: '#fff',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 8,
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
