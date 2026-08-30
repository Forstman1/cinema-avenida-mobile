import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';

import { getApiErrorMessage } from '../api/errors';
import { useAuthStore } from '../store/authStore';
import type { EditProfileScreenProps } from '../types/navigation';

export default function EditProfileScreen({ navigation }: EditProfileScreenProps) {
  const insets = useSafeAreaInsets();
  const user = useAuthStore((state) => state.user);
  const updateProfile = useAuthStore((state) => state.updateProfile);
  const [name, setName] = useState(user?.name ?? '');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSave = async () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError('Veuillez saisir votre nom complet.');
      return;
    }

    setError(null);
    setIsSubmitting(true);
    try {
      await updateProfile(trimmedName);
      Alert.alert(
        'Profil mis à jour',
        'Votre nom complet a été enregistré.',
        [{ text: 'OK', onPress: () => navigation.goBack() }],
      );
    } catch (requestError: unknown) {
      setError(getApiErrorMessage(requestError, 'Impossible de mettre à jour le profil.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />

      <View style={[styles.topBar, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.8}
          accessibilityLabel="Retour"
        >
          <MaterialIcons name="arrow-back" size={24} color="#e5e2e1" />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>Modifier le profil</Text>
        <View style={styles.topBarSpacer} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboard}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.intro}>
            Modifiez les informations affichées sur votre profil.
          </Text>

          <View style={styles.field}>
            <Text style={styles.label}>Nom complet</Text>
            <View style={styles.inputRow}>
              <MaterialIcons name="person-outline" size={20} color="#e2beba" />
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={(value) => {
                  setName(value);
                  if (error) setError(null);
                }}
                placeholder="Votre nom complet"
                placeholderTextColor="#666"
                autoCapitalize="words"
                autoCorrect={false}
                editable={!isSubmitting}
                accessibilityLabel="Nom complet"
              />
            </View>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Adresse e-mail</Text>
            <View style={[styles.inputRow, styles.readOnlyInputRow]}>
              <MaterialIcons name="mail-outline" size={20} color="#777" />
              <TextInput
                style={[styles.input, styles.readOnlyInput]}
                value={user?.email ?? ''}
                editable={false}
                selectTextOnFocus={false}
                accessibilityLabel="Adresse e-mail"
              />
              <MaterialIcons name="lock-outline" size={18} color="#777" />
            </View>
          </View>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <TouchableOpacity
            style={[styles.saveButton, isSubmitting && styles.saveButtonDisabled]}
            onPress={() => void handleSave()}
            activeOpacity={0.9}
            disabled={isSubmitting}
            accessibilityState={{ disabled: isSubmitting, busy: isSubmitting }}
          >
            {isSubmitting ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.saveButtonText}>Enregistrer</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => navigation.goBack()}
            activeOpacity={0.8}
            disabled={isSubmitting}
          >
            <Text style={styles.cancelButtonText}>Annuler</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#131313',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBarTitle: {
    fontFamily: 'EBGaramond-SemiBold',
    fontSize: 20,
    color: '#e5e2e1',
  },
  topBarSpacer: {
    width: 40,
  },
  keyboard: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 48,
  },
  intro: {
    fontFamily: 'Inter-Regular',
    fontSize: 15,
    lineHeight: 22,
    color: '#aa8986',
    marginBottom: 32,
  },
  field: {
    marginBottom: 20,
  },
  label: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 13,
    color: '#e2beba',
    marginBottom: 8,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#201f1f',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    paddingHorizontal: 14,
  },
  readOnlyInputRow: {
    opacity: 0.72,
  },
  input: {
    flex: 1,
    fontFamily: 'Inter-Regular',
    fontSize: 15,
    color: '#e5e2e1',
    paddingVertical: 14,
    paddingHorizontal: 10,
  },
  readOnlyInput: {
    color: '#aa8986',
  },
  error: {
    fontFamily: 'Inter-Regular',
    fontSize: 13,
    lineHeight: 19,
    color: '#ffb4ac',
    marginTop: -4,
  },
  saveButton: {
    backgroundColor: '#b22222',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 28,
    shadowColor: 'rgba(0,0,0,0.5)',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 8,
  },
  saveButtonDisabled: {
    backgroundColor: '#555',
  },
  saveButtonText: {
    fontFamily: 'Inter-Bold',
    fontSize: 16,
    color: '#fff',
  },
  cancelButton: {
    alignItems: 'center',
    paddingVertical: 16,
    marginTop: 4,
  },
  cancelButtonText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 15,
    color: '#aa8986',
  },
});
