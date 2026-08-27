import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  FlatList,
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
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { getMovies } from '../api/movies';
import FeaturedMovieCard from '../components/FeaturedMovieCard';
import VerticalMovieCard from '../components/VerticalMovieCard';
import HomeSkeleton from '../components/HomeSkeleton';
import ErrorState from '../components/ErrorState';
import AdminDashboard from '../components/AdminDashboard';
import { useAuth } from '../context/AuthContext';
import {
  getRemainingDaysOfWeek,
  getTodayDateString,
  parseLocalDate,
  toISODate,
  toISODateString,
} from '../utils/date';
import {
  getFeaturedProgrammeMovie,
  getProgrammeMovies,
  type ProgrammeMovie,
} from '../utils/programme';
import type { Movie, Screening } from '../types';
import type { RootStackParamList } from '../types/navigation';

type HomeNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Main'>;

const FRENCH_WEEKDAYS = ['DIM', 'LUN', 'MAR', 'MER', 'JEU', 'VEN', 'SAM'];
const FRENCH_MONTHS = [
  'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
  'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre',
];

function formatSelectedDate(dateString: string): string {
  const date = parseLocalDate(dateString);
  if (!date) return dateString;

  const weekday = date.toLocaleDateString('fr-FR', { weekday: 'long' });
  return `${weekday.charAt(0).toUpperCase()}${weekday.slice(1)} ${date.getDate()} ${FRENCH_MONTHS[date.getMonth()]}`;
}

export default function HomeScreen() {
  const { user } = useAuth();

  if (user?.role === 'ADMIN') {
    return <AdminDashboard />;
  }

  return <CustomerHomeScreen />;
}

function CustomerHomeScreen() {
  const navigation = useNavigation<HomeNavigationProp>();
  const insets = useSafeAreaInsets();
  const [movies, setMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const today = useMemo(() => getTodayDateString(), []);
  const weekDays = useMemo(() => getRemainingDaysOfWeek(), []);
  const weekDateStrings = useMemo(
    () => weekDays.map((date) => toISODateString(date)),
    [weekDays]
  );
  const [selectedDate, setSelectedDate] = useState(today);

  const fetchMovies = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);
    setError(null);
    try {
      const data = await getMovies({ current: true });
      setMovies(data);
    } catch (err: any) {
      setError(err?.message ?? 'Impossible de charger le programme.');
    } finally {
      if (showLoading) setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchMovies();
    }, [fetchMovies])
  );

  useEffect(() => {
    const duplicateGroups = new Map<string, number[]>();

    movies.forEach((movie) => {
      (movie.screenings ?? []).forEach((screening) => {
        const date = toISODate(screening.date);
        if (!weekDateStrings.includes(date)) return;

        const key = `${movie.id}|${date}|${screening.showTime}`;
        const ids = duplicateGroups.get(key) ?? [];
        ids.push(screening.id);
        duplicateGroups.set(key, ids);
      });
    });

    duplicateGroups.forEach((ids, key) => {
      if (ids.length > 1) {
        console.warn('[Programme] Données dupliquées : même film/date/heure', { key, screeningIds: ids });
      }
    });
  }, [movies, weekDateStrings]);

  const programmeMovies = useMemo<ProgrammeMovie[]>(() => {
    return getProgrammeMovies(movies, selectedDate);
  }, [movies, selectedDate]);

  const hasScreeningsThisWeek = useMemo(
    () => movies.some((movie) =>
      (movie.screenings ?? []).some((screening) => weekDateStrings.includes(toISODate(screening.date)))
    ),
    [movies, weekDateStrings]
  );

  const featuredProgrammeMovie = useMemo<ProgrammeMovie | undefined>(() => {
    return getFeaturedProgrammeMovie(programmeMovies);
  }, [programmeMovies]);

  const remainingProgrammeMovies = useMemo(
    () => programmeMovies.filter(({ movie }) => movie.id !== featuredProgrammeMovie?.movie.id),
    [featuredProgrammeMovie?.movie.id, programmeMovies]
  );

  const screeningCount = useMemo(
    () => programmeMovies.reduce((total, item) => total + item.screenings.length, 0),
    [programmeMovies]
  );

  const selectedDateSummary = `${formatSelectedDate(selectedDate)} · ${programmeMovies.length} ${
    programmeMovies.length === 1 ? 'film' : 'films'
  } · ${screeningCount} ${screeningCount === 1 ? 'séance' : 'séances'}`;

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchMovies(false);
    setRefreshing(false);
  }, [fetchMovies]);

  const handleMoviePress = (movie: Movie, screening?: Screening) => {
    navigation.navigate('MovieDetails', {
      movieId: movie.id,
      screening,
      initialDate: selectedDate,
    });
  };

  const handleTimePress = (movie: Movie, screening: Screening) => {
    navigation.navigate('Screenings', {
      movie,
      initialDate: toISODate(screening.date),
    });
  };

  const renderHeader = () => (
    <>
      <View style={styles.header}>
        <Text style={styles.logo}>Cinéma Avenida</Text>
        <View style={styles.logoRule} />
      </View>

      <View style={styles.programmeHeader}>
        <Text style={styles.sectionTitle}>Programme de la semaine</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.daysRow}
        >
          {weekDays.map((date, index) => {
            const dateString = weekDateStrings[index];
            const selected = dateString === selectedDate;

            return (
              <TouchableOpacity
                key={dateString}
                style={[styles.dayButton, selected && styles.dayButtonSelected]}
                onPress={() => setSelectedDate(dateString)}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                accessibilityLabel={formatSelectedDate(dateString)}
              >
                <Text style={[styles.dayLabel, selected && styles.dayLabelSelected]}>
                  {FRENCH_WEEKDAYS[date.getDay()]} {date.getDate()}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <Text style={styles.selectedDateSummary}>{selectedDateSummary}</Text>

      {featuredProgrammeMovie ? (
        <FeaturedMovieCard
          movie={featuredProgrammeMovie.movie}
          screenings={featuredProgrammeMovie.screenings}
          onPress={handleMoviePress}
          onTimePress={handleTimePress}
        />
      ) : null}

      {remainingProgrammeMovies.length > 0 ? (
        <Text style={styles.remainingTitle}>Également à l’affiche</Text>
      ) : null}
    </>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" />
        <HomeSkeleton />
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" />
        <ErrorState message={error} onRetry={fetchMovies} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="light-content" />
      <FlatList
        data={remainingProgrammeMovies}
        keyExtractor={({ movie }) => String(movie.id)}
        renderItem={({ item }) => (
          <VerticalMovieCard
            movie={item.movie}
            screenings={item.screenings}
            onPress={handleMoviePress}
            onTimePress={handleTimePress}
          />
        )}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={
          featuredProgrammeMovie ? null : (
            <View style={styles.emptyState}>
              <View style={styles.emptyIcon}>
                <MaterialIcons name="event-busy" size={28} color="#ffb4ac" />
              </View>
              <Text style={styles.emptyText}>
                {hasScreeningsThisWeek ? 'Aucune séance ce jour' : 'Aucune séance prévue cette semaine'}
              </Text>
              <Text style={styles.emptyHint}>
                {hasScreeningsThisWeek
                  ? 'Choisissez une autre date du programme.'
                  : 'Revenez bientôt pour découvrir la prochaine programmation.'}
              </Text>
            </View>
          )
        }
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: Math.max(insets.bottom, 16) + 92 },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#b22222" />
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#131313',
  },
  listContent: {
    paddingHorizontal: 20,
    paddingTop: 10,
    flexGrow: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 18,
  },
  logo: {
    fontFamily: 'EBGaramond-SemiBold',
    fontSize: 27,
    color: '#e5e2e1',
  },
  logoRule: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(178,34,34,0.42)',
  },
  programmeHeader: {
    marginBottom: 15,
  },
  sectionTitle: {
    fontFamily: 'EBGaramond-SemiBold',
    fontSize: 23,
    color: '#e5e2e1',
    marginBottom: 13,
  },
  daysRow: {
    gap: 8,
    paddingRight: 4,
  },
  dayButton: {
    minWidth: 62,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
    borderRadius: 12,
    backgroundColor: '#1d1c1c',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  dayButtonSelected: {
    backgroundColor: '#b22222',
    borderColor: '#b22222',
    shadowColor: '#b22222',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.28,
    shadowRadius: 8,
    elevation: 3,
  },
  dayLabel: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 12,
    color: '#aa8986',
    letterSpacing: 0.3,
  },
  dayLabelSelected: {
    color: '#fff',
  },
  selectedDateSummary: {
    fontFamily: 'Inter-Medium',
    fontSize: 13,
    lineHeight: 19,
    color: '#e2beba',
    marginBottom: 13,
  },
  remainingTitle: {
    fontFamily: 'EBGaramond-SemiBold',
    fontSize: 21,
    color: '#e5e2e1',
    marginTop: 24,
    marginBottom: 12,
  },
  separator: {
    height: 12,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 14,
    paddingHorizontal: 24,
    paddingVertical: 24,
    borderRadius: 18,
    backgroundColor: '#1b1a1a',
    borderWidth: 1,
    borderColor: 'rgba(229,226,225,0.07)',
  },
  emptyIcon: {
    width: 52,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 26,
    backgroundColor: 'rgba(178,34,34,0.14)',
  },
  emptyText: {
    fontFamily: 'EBGaramond-SemiBold',
    fontSize: 21,
    color: '#e5e2e1',
    textAlign: 'center',
    marginTop: 12,
  },
  emptyHint: {
    fontFamily: 'Inter-Regular',
    fontSize: 13,
    lineHeight: 19,
    color: '#aa8986',
    textAlign: 'center',
    marginTop: 5,
  },
});
