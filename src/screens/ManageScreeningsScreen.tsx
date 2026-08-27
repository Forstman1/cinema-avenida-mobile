import React, { useCallback, useEffect, useMemo, useState } from 'react';
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

import { getApiErrorMessage } from '../api/errors';
import ErrorState from '../components/ErrorState';
import { useCinemaConfigStore } from '../store/cinemaConfigStore';
import { useAdminScreeningsStore } from '../store/adminScreeningsStore';
import { compareShowTimes, parseLocalDate, toHHMM, toISODate, toISODateString } from '../utils/date';
import type { Movie, Screening } from '../types';
import type { ManageScreeningsScreenProps } from '../types/navigation';

function groupScreeningsByDate(screenings: Screening[]): Record<string, Screening[]> {
  return screenings.reduce((acc, screening) => {
    const date = toISODate(screening.date);
    if (!acc[date]) acc[date] = [];
    acc[date].push(screening);
    return acc;
  }, {} as Record<string, Screening[]>);
}

export default function ManageScreeningsScreen({
  route,
}: ManageScreeningsScreenProps) {
  const navigation = useNavigation<ManageScreeningsScreenProps['navigation']>();
  const insets = useSafeAreaInsets();
  const { movie } = route.params;
  const config = useCinemaConfigStore((state) => state.config);
  const configLoading = useCinemaConfigStore((state) => state.isLoading);
  const configError = useCinemaConfigStore((state) => state.error);
  const fetchConfig = useCinemaConfigStore((state) => state.fetchConfig);
  const configAvailable = Boolean(config && !configLoading && !configError);

  const screeningIds = useAdminScreeningsStore(
    (state) => state.screeningIdsByMovieId[movie.id] ?? []
  );
  const screeningsById = useAdminScreeningsStore((state) => state.screeningsById);
  const loading = useAdminScreeningsStore(
    (state) => state.isLoadingByMovieId[movie.id] ?? false
  );
  const error = useAdminScreeningsStore(
    (state) => state.movieErrors[movie.id] ?? null
  );
  const fetchScreeningsByMovieId = useAdminScreeningsStore(
    (state) => state.fetchScreeningsByMovieId
  );
  const createAdminScreening = useAdminScreeningsStore((state) => state.createScreening);
  const isCreatingScreening = useAdminScreeningsStore((state) => state.isCreatingScreening);
  const createScreeningError = useAdminScreeningsStore((state) => state.createScreeningError);

  const [date, setDate] = useState<string>(toISODateString(new Date()));
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const screenings = useMemo(
    () => screeningIds
      .map((id) => screeningsById[id])
      .filter((screening): screening is Screening => Boolean(screening))
      .sort((a, b) => {
        const dateComparison = toISODate(a.date).localeCompare(toISODate(b.date));
        return dateComparison !== 0
          ? dateComparison
          : compareShowTimes(a.showTime, b.showTime);
      }),
    [screeningIds, screeningsById]
  );

  const fetchScreenings = useCallback(async () => {
    await fetchScreeningsByMovieId(movie.id);
  }, [fetchScreeningsByMovieId, movie.id]);

  useEffect(() => {
    fetchScreenings();
  }, [fetchScreenings]);

  const grouped = useMemo(() => groupScreeningsByDate(screenings), [screenings]);
  const sortedDates = useMemo(
    () => Object.keys(grouped).sort((a, b) => a.localeCompare(b)),
    [grouped]
  );

  const isValidDate = Boolean(parseLocalDate(date.trim()));
  const isValidTime = Boolean(
    config && selectedSlot && config.screeningSlots.includes(toHHMM(selectedSlot))
  );
  const canSubmit = configAvailable && Number.isInteger(movie.id) && movie.id > 0 && isValidDate && isValidTime;

  const handleAdd = async () => {
    if (!configAvailable) return;
    if (!Number.isInteger(movie.id) || movie.id <= 0) {
      Alert.alert('Champs invalides', 'L’identifiant du film est invalide.');
      return;
    }
    if (!isValidDate) {
      Alert.alert('Champs invalides', 'Veuillez saisir une date valide au format AAAA-MM-JJ.');
      return;
    }
    if (!isValidTime || !selectedSlot) {
      Alert.alert('Champs invalides', 'Veuillez choisir un créneau au format HH:mm.');
      return;
    }

    try {
      const createdScreening = await createAdminScreening({
        movieId: movie.id,
        date: toISODate(date.trim()),
        showTime: toHHMM(selectedSlot),
      });
      if (!createdScreening) return;
      setSelectedSlot(null);
      setDate(toISODateString(new Date()));
      await fetchScreenings();
    } catch (error: unknown) {
      Alert.alert(
        'Erreur',
        getApiErrorMessage(error, createScreeningError ?? 'Impossible de créer la séance.')
      );
    }
  };

  if (configError) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" />
        <View style={[styles.topBar, { paddingTop: insets.top + 12 }]}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()} activeOpacity={0.8}>
            <MaterialIcons name="arrow-back" size={24} color="#e5e2e1" />
          </TouchableOpacity>
          <Text style={styles.topBarTitle} numberOfLines={1}>Séances</Text>
          <View style={styles.topBarSpacer} />
        </View>
        <ErrorState message={configError} onRetry={() => { void fetchConfig(); }} />
      </SafeAreaView>
    );
  }

  if (configLoading || !config || loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" />
        <View style={styles.skeleton}>
          <ActivityIndicator size="large" color="#b22222" />
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" />
        <View style={[styles.topBar, { paddingTop: insets.top + 12 }]}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()} activeOpacity={0.8}>
            <MaterialIcons name="arrow-back" size={24} color="#e5e2e1" />
          </TouchableOpacity>
          <Text style={styles.topBarTitle} numberOfLines={1}>Séances</Text>
          <View style={styles.topBarSpacer} />
        </View>
        <ErrorState message={error} onRetry={() => void fetchScreenings()} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />

      <View style={[styles.topBar, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()} activeOpacity={0.8}>
          <MaterialIcons name="arrow-back" size={24} color="#e5e2e1" />
        </TouchableOpacity>
        <View style={styles.titleBlock}>
          <Text style={styles.topBarTitle} numberOfLines={1}>Séances</Text>
          <Text style={styles.movieTitle} numberOfLines={1}>{movie.title}</Text>
        </View>
        <View style={styles.topBarSpacer} />
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + 24 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.sectionTitle}>Nouvelle séance</Text>

        <View style={styles.field}>
          <Text style={styles.label}>Date</Text>
          <TextInput
            style={styles.input}
            value={date}
            onChangeText={setDate}
            placeholder="YYYY-MM-DD"
            placeholderTextColor="#666"
            autoCapitalize="none"
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Créneau</Text>
          <View style={styles.slots}>
            {(config?.screeningSlots ?? []).map((slot) => (
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

        <TouchableOpacity
          style={[styles.addButton, (!canSubmit || isCreatingScreening) && styles.addButtonDisabled]}
          onPress={handleAdd}
          activeOpacity={0.9}
          disabled={!canSubmit || isCreatingScreening}
        >
          {isCreatingScreening ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <MaterialIcons name="add" size={20} color="#fff" />
              <Text style={styles.addButtonText}>Ajouter la séance</Text>
            </>
          )}
        </TouchableOpacity>

        <Text style={styles.sectionTitle}>Séances existantes</Text>

        {sortedDates.length === 0 ? (
          <Text style={styles.emptyText}>Aucune séance pour ce film.</Text>
        ) : (
          sortedDates.map((dateKey) => (
            <View key={dateKey} style={styles.dateGroup}>
              <Text style={styles.dateLabel}>
                {new Date(dateKey + 'T00:00:00').toLocaleDateString('fr-FR', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                })}
              </Text>
              <View style={styles.timesRow}>
                {grouped[dateKey]
                  .sort((a, b) => a.showTime.localeCompare(b.showTime))
                  .map((screening) => (
                    <View key={screening.id} style={styles.timeChip}>
                      <MaterialIcons name="access-time" size={14} color="#e2beba" />
                      <Text style={styles.timeChipText}>{screening.showTime}</Text>
                    </View>
                  ))}
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#131313',
  },
  skeleton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
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
  titleBlock: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  topBarTitle: {
    fontFamily: 'EBGaramond-SemiBold',
    fontSize: 20,
    color: '#e5e2e1',
  },
  movieTitle: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    color: '#aa8986',
    marginTop: 2,
  },
  topBarSpacer: {
    width: 40,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  sectionTitle: {
    fontFamily: 'EBGaramond-SemiBold',
    fontSize: 20,
    color: '#e5e2e1',
    marginBottom: 14,
    marginTop: 16,
  },
  field: {
    marginBottom: 16,
  },
  label: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 13,
    color: '#aa8986',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
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
  slots: {
    flexDirection: 'row',
    gap: 10,
  },
  slot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#201f1f',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  slotSelected: {
    backgroundColor: '#b22222',
    borderColor: '#b22222',
  },
  slotText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
    color: '#e5e2e1',
  },
  slotTextSelected: {
    color: '#fff',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#b22222',
    borderRadius: 14,
    paddingVertical: 16,
    marginTop: 8,
    marginBottom: 8,
  },
  addButtonDisabled: {
    opacity: 0.5,
  },
  addButtonText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 15,
    color: '#fff',
  },
  emptyText: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: '#aa8986',
    marginTop: 4,
  },
  dateGroup: {
    backgroundColor: '#201f1f',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    padding: 16,
    marginBottom: 12,
  },
  dateLabel: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 13,
    color: '#aa8986',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  timesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  timeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  timeChipText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
    color: '#e5e2e1',
  },
});
