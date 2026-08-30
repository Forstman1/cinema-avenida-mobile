import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
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

import {
  getApiErrorDetails,
  getApiErrorMessage,
  getScreeningMutationErrorMessage,
} from '../api/errors';
import ErrorState from '../components/ErrorState';
import Toast from '../components/Toast';
import { useAdminScreeningActions } from '../hooks/useAdminScreeningActions';
import { useCinemaConfigStore } from '../store/cinemaConfigStore';
import { useAdminScreeningsStore } from '../store/adminScreeningsStore';
import {
  compareShowTimes,
  formatCalendarDate,
  getTodayDateString,
  isScreeningDateTimeInPast,
  parseLocalDate,
  toHHMM,
  toISODate,
} from '../utils/date';
import { useCinemaDateContext } from '../hooks/useCinemaDateContext';
import type { Movie, Screening } from '../types';
import type { ManageScreeningsScreenProps } from '../types/navigation';

function groupScreeningsByDate(screenings: Screening[]): Record<string, Screening[]> {
  return screenings.reduce<Record<string, Screening[]>>((acc, screening) => {
    const date = toISODate(screening.date);
    if (!acc[date]) acc[date] = [];
    acc[date].push(screening);
    return acc;
  }, {});
}

const EMPTY_SCREENING_IDS: number[] = [];

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
  const cinemaTimezone = config?.timezone;
  const dateContextNow = useCinemaDateContext(cinemaTimezone);
  const todayDate = useMemo(
    () => getTodayDateString(cinemaTimezone, dateContextNow),
    [cinemaTimezone, dateContextNow]
  );

  const screeningIds = useAdminScreeningsStore(
    (state) => state.screeningIdsByMovieId[movie.id] ?? EMPTY_SCREENING_IDS
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
  const {
    createScreening: createAdminScreening,
    isCreatingScreening,
    createScreeningError,
    updateScreening: updateAdminScreening,
    isUpdatingScreening,
    updatingScreeningId,
    updateScreeningError,
    deleteScreening: deleteAdminScreening,
    isDeletingScreening,
    deletingScreeningId,
    deleteScreeningError,
    clearUpdateError,
    clearDeleteError,
    isScreeningReadOnly,
  } = useAdminScreeningActions(cinemaTimezone);

  const [date, setDate] = useState<string>('');
  const hasEditedDate = useRef(false);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [editScreening, setEditScreening] = useState<Screening | null>(null);
  const [editDate, setEditDate] = useState<string>('');
  const [editSlot, setEditSlot] = useState<string | null>(null);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const dismissToast = useCallback(() => setToastMessage(null), []);

  useEffect(() => {
    if (!hasEditedDate.current) setDate(todayDate);
  }, [todayDate]);
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
  const isSelectedDateTimePast = Boolean(
    isValidDate
    && isValidTime
    && selectedSlot
    && isScreeningDateTimeInPast(
      date.trim(),
      toHHMM(selectedSlot),
      cinemaTimezone,
      dateContextNow
    )
  );
  const canSubmit = configAvailable
    && Number.isInteger(movie.id)
    && movie.id > 0
    && isValidDate
    && isValidTime
    && !isSelectedDateTimePast;
  const isEditDateValid = Boolean(parseLocalDate(editDate.trim()));
  const isEditTimeValid = Boolean(
    config && editSlot && config.screeningSlots.includes(toHHMM(editSlot))
  );
  const isEditDateTimePast = Boolean(
    isEditDateValid
    && isEditTimeValid
    && editSlot
    && isScreeningDateTimeInPast(
      editDate.trim(),
      toHHMM(editSlot),
      cinemaTimezone,
      dateContextNow
    )
  );
  const canSaveEdit = configAvailable
    && editScreening !== null
    && isEditDateValid
    && isEditTimeValid
    && !isEditDateTimePast;

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
    if (isScreeningDateTimeInPast(date.trim(), toHHMM(selectedSlot), cinemaTimezone, new Date())) {
      Alert.alert(
        'Séance dans le passé',
        'Impossible de programmer une séance dans le passé.'
      );
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
      hasEditedDate.current = false;
      setDate(todayDate);
      await fetchScreenings();
    } catch (error: unknown) {
      Alert.alert(
        'Erreur',
        getApiErrorMessage(error, createScreeningError ?? 'Impossible de créer la séance.')
      );
    }
  };

  const openEditModal = (screening: Screening) => {
    if (isScreeningReadOnly(screening)) return;

    clearUpdateError();
    clearDeleteError();
    setEditScreening(screening);
    setEditDate(toISODate(screening.date));
    setEditSlot(toHHMM(screening.showTime));
    setEditModalVisible(true);
  };

  const closeEditModal = () => {
    if (isUpdatingScreening) return;
    setEditModalVisible(false);
    setEditScreening(null);
    clearUpdateError();
  };

  const handleEdit = async () => {
    if (!editScreening || !configAvailable) return;
    if (isScreeningReadOnly(editScreening)) {
      Alert.alert('Modification impossible', 'Cette séance est passée et ne peut plus être modifiée.');
      return;
    }
    if (!isEditDateValid) {
      Alert.alert('Champs invalides', 'Veuillez saisir une date valide au format AAAA-MM-JJ.');
      return;
    }
    if (!isEditTimeValid || !editSlot) {
      Alert.alert('Champs invalides', 'Veuillez choisir un créneau au format HH:mm.');
      return;
    }
    if (isScreeningDateTimeInPast(editDate.trim(), toHHMM(editSlot), cinemaTimezone, new Date())) {
      Alert.alert(
        'Séance dans le passé',
        'Impossible de modifier une séance dans le passé.'
      );
      return;
    }

    try {
      const updatedScreening = await updateAdminScreening(editScreening.id, {
        movieId: movie.id,
        date: toISODate(editDate.trim()),
        showTime: toHHMM(editSlot),
      });
      if (!updatedScreening) return;
      closeEditModal();
      await fetchScreenings();
    } catch (error: unknown) {
      Alert.alert(
        'Modification impossible',
        getScreeningMutationErrorMessage(error, 'update') ||
          updateScreeningError ||
          'Impossible de modifier la séance.',
      );
    }
  };

  const performDelete = async (screening: Screening) => {
    if (isScreeningReadOnly(screening)) return;

    try {
      const deleted = await deleteAdminScreening(screening.id);
      if (!deleted) return;
      await fetchScreenings();
    } catch (error: unknown) {
      const details = getApiErrorDetails(error);
      if (details.code === 'SCREENING_HAS_RESERVATIONS') {
        setToastMessage(getScreeningMutationErrorMessage(error, 'delete'));
        return;
      }
      Alert.alert(
        'Suppression impossible',
        getScreeningMutationErrorMessage(error, 'delete') ||
          deleteScreeningError ||
          'Impossible de supprimer la séance.',
      );
    }
  };

  const confirmDelete = (screening: Screening) => {
    if (isScreeningReadOnly(screening)) return;

    Alert.alert(
      'Supprimer la séance ?',
      `Voulez-vous supprimer la séance du ${toISODate(screening.date)} à ${toHHMM(screening.showTime)} ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: () => {
            void performDelete(screening);
          },
        },
      ],
    );
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
            onChangeText={(value) => {
              hasEditedDate.current = true;
              setDate(value);
            }}
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

        {isSelectedDateTimePast ? (
          <Text style={styles.pastWarning}>
            Impossible de programmer une séance dans le passé.
          </Text>
        ) : null}

        <Text style={styles.sectionTitle}>Séances existantes</Text>

        {sortedDates.length === 0 ? (
          <Text style={styles.emptyText}>Aucune séance pour ce film.</Text>
        ) : (
          sortedDates.map((dateKey) => (
            <View key={dateKey} style={styles.dateGroup}>
              <Text style={styles.dateLabel}>
                {formatCalendarDate(dateKey, cinemaTimezone)}
              </Text>
              <View style={styles.timesRow}>
                {grouped[dateKey]
                  .slice()
                  .sort((a, b) => compareShowTimes(a.showTime, b.showTime))
                  .map((screening) => {
                    const screeningIsPast = isScreeningReadOnly(
                      screening,
                      dateContextNow
                    );
                    return (
                      <View key={screening.id} style={styles.screeningRow}>
                        <View style={styles.screeningDetails}>
                          <View style={styles.timeChip}>
                            <MaterialIcons name="access-time" size={14} color="#e2beba" />
                            <Text style={styles.timeChipText}>{screening.showTime}</Text>
                          </View>
                          {screeningIsPast ? (
                            <View style={styles.readOnlyState}>
                              <MaterialIcons name="lock-outline" size={15} color="#aa8986" />
                              <Text style={styles.readOnlyText}>
                                Lecture seule — les séances passées restent visibles.
                              </Text>
                            </View>
                          ) : null}
                        </View>
                        <View style={styles.screeningActions}>
                          <TouchableOpacity
                            style={[
                              styles.actionButton,
                              screeningIsPast && styles.actionButtonDisabled,
                            ]}
                            onPress={() => openEditModal(screening)}
                            activeOpacity={0.8}
                            disabled={screeningIsPast || isUpdatingScreening || isDeletingScreening}
                            accessibilityState={{ disabled: screeningIsPast }}
                          >
                            {isUpdatingScreening && updatingScreeningId === screening.id ? (
                              <ActivityIndicator size="small" color="#ffb4ac" />
                            ) : (
                              <MaterialIcons name="edit" size={16} color="#ffb4ac" />
                            )}
                            <Text style={styles.actionButtonText}>Modifier</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[
                              styles.actionButton,
                              styles.deleteActionButton,
                              screeningIsPast && styles.actionButtonDisabled,
                            ]}
                            onPress={() => confirmDelete(screening)}
                            activeOpacity={0.8}
                            disabled={screeningIsPast || isUpdatingScreening || isDeletingScreening}
                            accessibilityState={{ disabled: screeningIsPast }}
                          >
                            {isDeletingScreening && deletingScreeningId === screening.id ? (
                              <ActivityIndicator size="small" color="#ffb4ac" />
                            ) : (
                              <MaterialIcons name="delete-outline" size={16} color="#ffb4ac" />
                            )}
                            <Text style={styles.actionButtonText}>Supprimer</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    );
                  })}
              </View>
            </View>
          ))
        )}
      </ScrollView>

      <Toast message={toastMessage} onDismiss={dismissToast} />

      <Modal
        animationType="slide"
        transparent
        visible={editModalVisible && editScreening !== null}
        onRequestClose={closeEditModal}
        statusBarTranslucent
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { paddingBottom: insets.bottom + 16 }]}>
            <View
              style={[styles.modalHeader, { paddingTop: insets.top + 12 }]}
            >
              <View style={styles.topBarSpacer} />
              <View style={styles.modalTitleBlock}>
                <Text style={styles.modalTitle}>Modifier la séance</Text>
                <Text style={styles.modalSubtitle} numberOfLines={1}>{movie.title}</Text>
              </View>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={closeEditModal}
                activeOpacity={0.8}
                disabled={isUpdatingScreening}
              >
                <MaterialIcons name="close" size={24} color="#e5e2e1" />
              </TouchableOpacity>
            </View>

            <ScrollView
              contentContainerStyle={styles.editModalContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.field}>
                <Text style={styles.label}>Date</Text>
                <TextInput
                  style={styles.input}
                  value={editDate}
                  onChangeText={setEditDate}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor="#666"
                  autoCapitalize="none"
                  editable={!isUpdatingScreening}
                />
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>Créneau officiel</Text>
                <View style={styles.slots}>
                  {(config?.screeningSlots ?? []).map((slot) => (
                    <TouchableOpacity
                      key={slot}
                      style={[styles.slot, editSlot === slot && styles.slotSelected]}
                      onPress={() => setEditSlot((previous) => (previous === slot ? null : slot))}
                      activeOpacity={0.8}
                      disabled={isUpdatingScreening}
                    >
                      <Text style={[styles.slotText, editSlot === slot && styles.slotTextSelected]}>
                        {slot}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {updateScreeningError ? (
                <Text style={styles.serverError}>{updateScreeningError}</Text>
              ) : null}
              {isEditDateTimePast ? (
                <Text style={styles.pastWarning}>
                  Impossible de modifier une séance dans le passé.
                </Text>
              ) : null}

              <TouchableOpacity
                style={[styles.addButton, (!canSaveEdit || isUpdatingScreening) && styles.addButtonDisabled]}
                onPress={handleEdit}
                activeOpacity={0.9}
                disabled={!canSaveEdit || isUpdatingScreening}
              >
                {isUpdatingScreening ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <MaterialIcons name="save" size={20} color="#fff" />
                    <Text style={styles.addButtonText}>Enregistrer les modifications</Text>
                  </>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
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
  screeningRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  screeningDetails: {
    flex: 1,
    gap: 8,
  },
  screeningActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,180,172,0.25)',
    paddingVertical: 7,
    paddingHorizontal: 8,
  },
  deleteActionButton: {
    borderColor: 'rgba(255,180,172,0.18)',
  },
  actionButtonDisabled: {
    opacity: 0.45,
  },
  actionButtonText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 11,
    color: '#ffb4ac',
  },
  readOnlyState: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  readOnlyText: {
    flex: 1,
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    lineHeight: 17,
    color: '#aa8986',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.65)',
  },
  modalSheet: {
    maxHeight: '90%',
    backgroundColor: '#171616',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  modalTitleBlock: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  modalTitle: {
    fontFamily: 'EBGaramond-SemiBold',
    fontSize: 22,
    color: '#e5e2e1',
  },
  modalSubtitle: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    color: '#aa8986',
    marginTop: 3,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  editModalContent: {
    padding: 20,
    paddingBottom: 8,
  },
  serverError: {
    fontFamily: 'Inter-Regular',
    fontSize: 13,
    lineHeight: 19,
    color: '#ffb4ac',
    marginBottom: 12,
  },
  pastWarning: {
    fontFamily: 'Inter-Regular',
    fontSize: 13,
    lineHeight: 19,
    color: '#d8aaa4',
    marginTop: 2,
    marginBottom: 8,
  },
});
