import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { MaterialIcons } from '@expo/vector-icons';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { createMovie, createScreening, getRawMovieById, updateMovie } from '../api/movies';
import type { RootStackParamList } from '../types/navigation';
import type { AddMovieScreenProps } from '../types/navigation';

type AddMovieNavigationProp = NativeStackNavigationProp<RootStackParamList, 'AddMovie'>;

const TIME_SLOTS = ['18:00', '20:30', '22:30'];

function toISODateString(date: Date): string {
  return date.toISOString().split('T')[0];
}

export default function AddMovieScreen({ route }: AddMovieScreenProps) {
  const navigation = useNavigation<AddMovieNavigationProp>();
  const insets = useSafeAreaInsets();
  const editMovie = route.params?.movie;
  const isEdit = Boolean(editMovie);

  const [title, setTitle] = useState('');
  const [duration, setDuration] = useState('');
  const [genre, setGenre] = useState('');
  const [synopsis, setSynopsis] = useState('');
  const [poster, setPoster] = useState('');
  const [screeningDate, setScreeningDate] = useState(toISODateString(new Date()));
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // In edit mode, fetch the raw movie to avoid the internet poster placeholder.
  useEffect(() => {
    if (!editMovie?.id) return;
    let cancelled = false;
    getRawMovieById(editMovie.id)
      .then((movie) => {
        if (cancelled) return;
        setTitle(movie.title);
        setDuration(String(movie.duration));
        setGenre(movie.genre);
        setSynopsis(movie.synopsis);
        setPoster(movie.poster ?? '');
      })
      .catch(() => {
        Alert.alert('Erreur', 'Impossible de charger les détails du film.');
      });
    return () => {
      cancelled = true;
    };
  }, [editMovie?.id]);

  const isFormValid = useMemo(() => {
    if (!title.trim() || !genre.trim() || !synopsis.trim()) return false;
    const durationNum = Number(duration);
    if (Number.isNaN(durationNum) || durationNum <= 0) return false;
    return true;
  }, [title, genre, synopsis, duration]);

  const handleSave = async () => {
    if (!isFormValid) {
      Alert.alert('Champs invalides', 'Veuillez remplir tous les champs avec une durée valide.');
      return;
    }

    const payload = {
      title: title.trim(),
      synopsis: synopsis.trim(),
      duration: Number(duration),
      genre: genre.trim(),
      poster: poster.trim() || undefined,
    };

    setLoading(true);
    try {
      if (isEdit && editMovie) {
        await updateMovie(editMovie.id, payload);
        Alert.alert('Film mis à jour', '', [{ text: 'OK', onPress: () => navigation.goBack() }]);
      } else {
        const created = await createMovie(payload);
        if (selectedSlot) {
          try {
            await createScreening({
              movieId: created.id,
              date: screeningDate,
              showTime: selectedSlot,
            });
          } catch (screeningErr: any) {
            Alert.alert(
              'Séance non créée',
              screeningErr?.response?.data?.message ?? 'La séance n\'a pas pu être créée.'
            );
          }
        }
        Alert.alert('Film créé', '', [{ text: 'OK', onPress: () => navigation.goBack() }]);
      }
    } catch (err: any) {
      Alert.alert('Erreur', err?.response?.data?.message ?? 'Impossible d\'enregistrer le film.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />

      <View style={[styles.topBar, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()} activeOpacity={0.8}>
          <MaterialIcons name="arrow-back" size={24} color="#e5e2e1" />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>{isEdit ? 'Modifier le film' : 'Ajouter un film'}</Text>
        <View style={styles.topBarSpacer} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.sectionTitle}>Informations</Text>

        <View style={styles.field}>
          <Text style={styles.label}>Titre</Text>
          <TextInput
            style={styles.input}
            value={title}
            onChangeText={setTitle}
            placeholder="Titre du film"
            placeholderTextColor="#666"
            autoCapitalize="sentences"
          />
        </View>

        <View style={styles.fieldRow}>
          <View style={[styles.field, styles.fieldHalf]}>
            <Text style={styles.label}>Durée (min)</Text>
            <TextInput
              style={styles.input}
              value={duration}
              onChangeText={setDuration}
              placeholder="120"
              placeholderTextColor="#666"
              keyboardType="number-pad"
            />
          </View>
          <View style={[styles.field, styles.fieldHalf]}>
            <Text style={styles.label}>Genre</Text>
            <TextInput
              style={styles.input}
              value={genre}
              onChangeText={setGenre}
              placeholder="Science-Fiction"
              placeholderTextColor="#666"
            />
          </View>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Affiche (URL)</Text>
          <TextInput
            style={styles.input}
            value={poster}
            onChangeText={setPoster}
            placeholder="https://..."
            placeholderTextColor="#666"
            autoCapitalize="none"
            keyboardType="url"
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Synopsis</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={synopsis}
            onChangeText={setSynopsis}
            placeholder="Synopsis du film"
            placeholderTextColor="#666"
            multiline
            numberOfLines={5}
            textAlignVertical="top"
          />
        </View>

        {!isEdit && (
          <>
            <Text style={styles.sectionTitle}>Séances</Text>

            <View style={styles.field}>
              <Text style={styles.label}>Date</Text>
              <TextInput
                style={styles.input}
                value={screeningDate}
                onChangeText={setScreeningDate}
                placeholder="YYYY-MM-DD"
                placeholderTextColor="#666"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Créneau</Text>
              <View style={styles.slots}>
                {TIME_SLOTS.map((slot) => (
                  <TouchableOpacity
                    key={slot}
                    style={[styles.slot, selectedSlot === slot && styles.slotSelected]}
                    onPress={() => setSelectedSlot((prev) => (prev === slot ? null : slot))}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.slotText, selectedSlot === slot && styles.slotTextSelected]}>
                      {slot}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </>
        )}

        <TouchableOpacity
          style={[styles.saveButton, (!isFormValid || loading) && styles.saveButtonDisabled]}
          onPress={handleSave}
          activeOpacity={0.9}
          disabled={!isFormValid || loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.saveButtonText}>Enregistrer le film</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
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
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 120,
  },
  sectionTitle: {
    fontFamily: 'EBGaramond-SemiBold',
    fontSize: 22,
    color: '#e5e2e1',
    marginTop: 24,
    marginBottom: 16,
  },
  field: {
    marginBottom: 16,
  },
  fieldRow: {
    flexDirection: 'row',
    gap: 16,
  },
  fieldHalf: {
    flex: 1,
  },
  label: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 13,
    color: '#aa8986',
    marginBottom: 8,
    letterSpacing: 0.4,
  },
  input: {
    backgroundColor: '#201f1f',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontFamily: 'Inter-Regular',
    fontSize: 15,
    color: '#e5e2e1',
  },
  textArea: {
    minHeight: 120,
    paddingTop: 14,
    lineHeight: 22,
  },
  slots: {
    flexDirection: 'row',
    gap: 12,
  },
  slot: {
    flex: 1,
    backgroundColor: '#201f1f',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    paddingVertical: 14,
    alignItems: 'center',
  },
  slotSelected: {
    backgroundColor: '#b22222',
    borderColor: '#b22222',
  },
  slotText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 15,
    color: '#e5e2e1',
  },
  slotTextSelected: {
    color: '#fff',
  },
  saveButton: {
    backgroundColor: '#b22222',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
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
});
