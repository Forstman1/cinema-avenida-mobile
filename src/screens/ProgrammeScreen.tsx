import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { MaterialIcons } from '@expo/vector-icons';

import { createScreening, getMovies, getScreeningsByDate } from '../api/movies';
import ErrorState from '../components/ErrorState';
import PosterImage from '../components/PosterImage';
import type { Movie, Screening } from '../types';
import type { ProgrammeScreenProps } from '../types/navigation';

const TIME_SLOTS = ['18:00', '20:30', '22:30'];
const WEEKDAY_SHORT = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
const MONTH_NAMES = [
  'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
  'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre',
];

function toISODateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getStartOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  d.setHours(0, 0, 0, 0);
  return d;
}

function formatFullDate(date: Date): string {
  const weekday = date.toLocaleDateString('fr-FR', { weekday: 'long' });
  const capitalized = weekday.charAt(0).toUpperCase() + weekday.slice(1);
  return `${capitalized} ${date.getDate()} ${MONTH_NAMES[date.getMonth()]} ${date.getFullYear()}`;
}

export default function ProgrammeScreen() {
  const navigation = useNavigation<ProgrammeScreenProps['navigation']>();
  const insets = useSafeAreaInsets();

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [weekStart, setWeekStart] = useState<Date>(getStartOfWeek(today));
  const [selectedIndex, setSelectedIndex] = useState<number>((today.getDay() + 6) % 7);

  const selectedDate = useMemo(
    () => addDays(weekStart, selectedIndex),
    [weekStart, selectedIndex]
  );
  const selectedDateString = useMemo(
    () => toISODateString(selectedDate),
    [selectedDate]
  );

  const [schedule, setSchedule] = useState<Screening[]>([]);
  const [loadingSchedule, setLoadingSchedule] = useState(true);
  const [scheduleError, setScheduleError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const [movies, setMovies] = useState<Movie[]>([]);
  const [moviesMap, setMoviesMap] = useState<Record<number, Movie>>({});
  const [modalVisible, setModalVisible] = useState(false);
  const [pendingSlot, setPendingSlot] = useState<string | null>(null);
  const [loadingMovies, setLoadingMovies] = useState(false);
  const [assigning, setAssigning] = useState(false);

  const fetchMovies = useCallback(async () => {
    setLoadingMovies(true);
    try {
      const data = await getMovies();
      setMovies(data);
      const map: Record<number, Movie> = {};
      data.forEach((movie) => {
        map[movie.id] = movie;
      });
      setMoviesMap(map);
    } catch (err: any) {
      Alert.alert('Erreur', err?.message ?? 'Impossible de charger les films.');
    } finally {
      setLoadingMovies(false);
    }
  }, []);

  const fetchSchedule = useCallback(async () => {
    setLoadingSchedule(true);
    setScheduleError(null);
    try {
      const data = await getScreeningsByDate(selectedDateString);
      setSchedule(data);
    } catch (err: any) {
      const status = err?.response?.status;
      const isNetworkError =
        !err?.response ||
        err?.code === 'ECONNABORTED' ||
        err?.code === 'ERR_NETWORK' ||
        err?.code === 'ENOTFOUND' ||
        err?.code === 'ECONNREFUSED';
      const isServerError = status >= 500 || err?.code === 'ERR_BAD_RESPONSE';

      if (isNetworkError || isServerError) {
        setScheduleError(err?.message ?? 'Impossible de charger le programme.');
      } else {
        // Empty schedule or 4xx responses (e.g. 404 for this date) are not errors:
        // keep the three time-slot cards visible with "Ajouter".
        setSchedule([]);
      }
    } finally {
      setLoadingSchedule(false);
    }
  }, [selectedDateString]);

  useFocusEffect(
    useCallback(() => {
      fetchSchedule();
      fetchMovies();
    }, [fetchSchedule, fetchMovies]),
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([fetchSchedule(), fetchMovies()]);
    setRefreshing(false);
  }, [fetchSchedule, fetchMovies]);

  const slots = useMemo(() => {
    return TIME_SLOTS.map((time) => {
      const screening = schedule.find((s) => s.showTime === time);
      const movie = screening ? moviesMap[screening.movieId] : undefined;
      return { time, screening, movie };
    });
  }, [schedule, moviesMap]);

  const openMoviePicker = async (slot: string) => {
    setPendingSlot(slot);
    setModalVisible(true);
    if (movies.length === 0) {
      await fetchMovies();
    }
  };

  const closeModal = () => {
    setModalVisible(false);
    setPendingSlot(null);
  };

  const handleSelectMovie = async (movie: Movie) => {
    if (!pendingSlot) return;
    setAssigning(true);
    try {
      await createScreening({
        movieId: movie.id,
        date: selectedDateString,
        showTime: pendingSlot,
      });
      closeModal();
      await fetchSchedule();
    } catch (err: any) {
      if (err?.response?.status === 409) {
        closeModal();
        Alert.alert(
          'Créneau occupé',
          'Ce créneau est déjà occupé pour cette date.'
        );
        await fetchSchedule();
      } else {
        Alert.alert(
          'Erreur',
          err?.response?.data?.message ?? 'Impossible de créer la séance.'
        );
      }
    } finally {
      setAssigning(false);
    }
  };

  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  }, [weekStart]);

  const isSelectedDay = (index: number) => index === selectedIndex;

  const renderMovieItem = ({ item }: { item: Movie }) => (
    <TouchableOpacity
      style={styles.movieRow}
      onPress={() => handleSelectMovie(item)}
      activeOpacity={0.8}
      disabled={assigning}
    >
      <PosterImage
        uri={item.poster}
        title={item.title}
        style={styles.moviePoster}
        borderRadius={8}
      />
      <View style={styles.movieInfo}>
        <Text style={styles.movieTitle} numberOfLines={2}>{item.title}</Text>
        <Text style={styles.movieMeta} numberOfLines={1}>{item.genre}</Text>
        <View style={styles.movieMetaRow}>
          <MaterialIcons name="schedule" size={12} color="#aa8986" />
          <Text style={styles.movieMeta}>{item.duration}</Text>
        </View>
      </View>
      <MaterialIcons name="chevron-right" size={22} color="#aa8986" />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />

      <View style={[styles.topBar, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.8}
        >
          <MaterialIcons name="arrow-back" size={24} color="#e5e2e1" />
        </TouchableOpacity>
        <View style={styles.titleBlock}>
          <Text style={styles.topBarTitle} numberOfLines={1}>Programme</Text>
          <Text style={styles.topBarSubtitle} numberOfLines={1}>Planifier les séances</Text>
        </View>
        <View style={styles.topBarSpacer} />
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + 24 },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#b22222" />
        }
      >
        <View style={styles.weekStrip}>
          <TouchableOpacity
            style={styles.arrowButton}
            onPress={() => setWeekStart((prev) => addDays(prev, -7))}
            activeOpacity={0.8}
          >
            <MaterialIcons name="chevron-left" size={24} color="#e5e2e1" />
          </TouchableOpacity>

          <View style={styles.daysRow}>
            {weekDays.map((date, index) => {
              const selected = isSelectedDay(index);
              return (
                <TouchableOpacity
                  key={index}
                  style={[styles.dayButton, selected && styles.dayButtonSelected]}
                  onPress={() => setSelectedIndex(index)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.dayLabel, selected && styles.dayLabelSelected]}>
                    {WEEKDAY_SHORT[index]}
                  </Text>
                  <Text style={[styles.dayNumber, selected && styles.dayNumberSelected]}>
                    {date.getDate()}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <TouchableOpacity
            style={styles.arrowButton}
            onPress={() => setWeekStart((prev) => addDays(prev, 7))}
            activeOpacity={0.8}
          >
            <MaterialIcons name="chevron-right" size={24} color="#e5e2e1" />
          </TouchableOpacity>
        </View>

        <Text style={styles.dateTitle}>{formatFullDate(selectedDate)}</Text>

        {scheduleError ? (
          <ErrorState message={scheduleError} onRetry={fetchSchedule} />
        ) : (
          <View style={styles.cards}>
            {slots.map(({ time, screening, movie }) => {
              const assigned = !!screening && !!movie;
              return (
                <View
                  key={time}
                  style={[
                    styles.card,
                    assigned ? styles.cardAssigned : styles.cardEmpty,
                  ]}
                >
                  <View style={styles.timeBadge}>
                    <MaterialIcons name="access-time" size={12} color="#e2beba" />
                    <Text style={styles.timeText}>{time}</Text>
                  </View>

                  {assigned ? (
                    <View style={styles.assignedContent}>
                      <Text style={styles.assignedTitle} numberOfLines={2}>
                        {movie!.title}
                      </Text>
                      <View style={styles.assignedMetaRow}>
                        <MaterialIcons name="schedule" size={12} color="#aa8986" />
                        <Text style={styles.assignedMeta}>{movie!.duration}</Text>
                      </View>
                    </View>
                  ) : (
                    <TouchableOpacity
                      style={styles.addButton}
                      onPress={() => openMoviePicker(time)}
                      activeOpacity={0.8}
                    >
                      <MaterialIcons name="add" size={18} color="#ffb4ac" />
                      <Text style={styles.addButtonText}>Ajouter</Text>
                    </TouchableOpacity>
                  )}
                </View>
              );
            })}
          </View>
        )}

        {loadingSchedule && (
          <View style={styles.loader}>
            <ActivityIndicator size="small" color="#b22222" />
          </View>
        )}
      </ScrollView>

      <Modal
        animationType="slide"
        transparent
        visible={modalVisible}
        onRequestClose={closeModal}
        statusBarTranslucent
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { paddingBottom: insets.bottom + 16 }]}>
            <View style={[styles.modalHeader, { paddingTop: insets.top + 12 }]}>
              <View style={{ width: 40 }} />
              <View style={styles.modalTitleBlock}>
                <Text style={styles.modalTitle}>Choisir un film</Text>
                {pendingSlot && (
                  <Text style={styles.modalSubtitle}>
                    {pendingSlot} · {formatFullDate(selectedDate)}
                  </Text>
                )}
              </View>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={closeModal}
                activeOpacity={0.8}
                disabled={assigning}
              >
                <MaterialIcons name="close" size={24} color="#e5e2e1" />
              </TouchableOpacity>
            </View>

            {loadingMovies ? (
              <View style={styles.modalLoader}>
                <ActivityIndicator size="large" color="#b22222" />
              </View>
            ) : (
              <FlatList
                data={movies}
                keyExtractor={(item) => String(item.id)}
                renderItem={renderMovieItem}
                contentContainerStyle={styles.modalList}
                ItemSeparatorComponent={() => <View style={styles.separator} />}
                ListEmptyComponent={
                  <View style={styles.emptyState}>
                    <MaterialIcons name="local-movies" size={40} color="#aa8986" />
                    <Text style={styles.emptyText}>Aucun film disponible.</Text>
                  </View>
                }
                showsVerticalScrollIndicator={false}
              />
            )}
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
  topBarSubtitle: {
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
  weekStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  arrowButton: {
    width: 32,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  daysRow: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dayButton: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 38,
    height: 54,
    borderRadius: 12,
    backgroundColor: '#201f1f',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  dayButtonSelected: {
    backgroundColor: '#b22222',
    borderColor: '#b22222',
  },
  dayLabel: {
    fontFamily: 'Inter-Medium',
    fontSize: 11,
    color: '#aa8986',
    textTransform: 'uppercase',
  },
  dayLabelSelected: {
    color: '#ffb4ac',
  },
  dayNumber: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
    color: '#e5e2e1',
    marginTop: 4,
  },
  dayNumberSelected: {
    color: '#fff',
  },
  dateTitle: {
    fontFamily: 'EBGaramond-SemiBold',
    fontSize: 20,
    color: '#e5e2e1',
    marginTop: 20,
    marginBottom: 16,
  },
  cards: {
    gap: 12,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
  },
  cardAssigned: {
    backgroundColor: '#201f1f',
    borderColor: 'rgba(255,255,255,0.05)',
  },
  cardEmpty: {
    backgroundColor: '#1a1a1a',
    borderColor: 'rgba(255,255,255,0.05)',
  },
  timeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 8,
    paddingVertical: 4,
    paddingHorizontal: 8,
    marginBottom: 12,
  },
  timeText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 12,
    color: '#e2beba',
  },
  assignedContent: {
    gap: 6,
  },
  assignedTitle: {
    fontFamily: 'EBGaramond-SemiBold',
    fontSize: 19,
    color: '#e5e2e1',
  },
  assignedMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  assignedMeta: {
    fontFamily: 'Inter-Regular',
    fontSize: 13,
    color: '#aa8986',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  addButtonText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 15,
    color: '#ffb4ac',
  },
  loader: {
    alignItems: 'center',
    marginTop: 24,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#131313',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  modalTitleBlock: {
    flex: 1,
    alignItems: 'center',
  },
  modalTitle: {
    fontFamily: 'EBGaramond-SemiBold',
    fontSize: 20,
    color: '#e5e2e1',
  },
  modalSubtitle: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    color: '#aa8986',
    marginTop: 2,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalLoader: {
    paddingVertical: 60,
  },
  modalList: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
  },
  movieRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
  },
  moviePoster: {
    width: 48,
    height: 70,
    backgroundColor: '#201f1f',
  },
  movieInfo: {
    flex: 1,
    justifyContent: 'center',
    gap: 4,
  },
  movieTitle: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 15,
    color: '#e5e2e1',
  },
  movieMeta: {
    fontFamily: 'Inter-Regular',
    fontSize: 13,
    color: '#aa8986',
  },
  movieMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  separator: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: 60,
    gap: 12,
  },
  emptyText: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: '#aa8986',
  },
});
