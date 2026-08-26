import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  FlatList,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { getMovies } from '../api/movies';
import VerticalMovieCard from '../components/VerticalMovieCard';
import HomeSkeleton from '../components/HomeSkeleton';
import ErrorState from '../components/ErrorState';
import AdminDashboard from '../components/AdminDashboard';
import { useAuth } from '../context/AuthContext';
import {
  compareShowTimes,
  getRemainingDaysOfWeek,
  getTodayDateString,
  parseLocalDate,
  toISODate,
  toISODateString,
} from '../utils/date';
import type { Movie, Screening } from '../types';
import type { RootStackParamList } from '../types/navigation';

type HomeNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Main'>;
type ProgrammeMovie = { movie: Movie; screenings: Screening[] };

const FRENCH_WEEKDAYS = ['DIM', 'LUN', 'MAR', 'MER', 'JEU', 'VEN', 'SAM'];
const FRENCH_MONTHS = [
  'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
  'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre',
];

function formatSelectedDate(dateString: string): string {
  const date = parseLocalDate(dateString);
  if (!date) return dateString;

  const weekday = date.toLocaleDateString('fr-FR', { weekday: 'long' });
  return `${weekday} ${date.getDate()} ${FRENCH_MONTHS[date.getMonth()]}`;
}

function getUniqueScreeningsForDate(movie: Movie, dateString: string): Screening[] {
  const seenIds = new Set<number>();
  const seenTimes = new Set<string>();

  return (movie.screenings ?? [])
    .filter((screening) => toISODate(screening.date) === dateString)
    .sort((a, b) => compareShowTimes(a.showTime, b.showTime))
    .filter((screening) => {
      if (seenIds.has(screening.id) || seenTimes.has(screening.showTime)) return false;
      seenIds.add(screening.id);
      seenTimes.add(screening.showTime);
      return true;
    });
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
  const [movies, setMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const today = useMemo(() => getTodayDateString(), []);
  const weekDays = useMemo(() => getRemainingDaysOfWeek(), []);
  const weekDateStrings = useMemo(
    () => weekDays.map((date) => toISODateString(date)),
    [weekDays]
  );
  const [selectedDate, setSelectedDate] = useState(today);

  const fetchMovies = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getMovies({ current: true });
      setMovies(data);
    } catch (err: any) {
      setError(err?.message ?? 'Impossible de charger le programme.');
    } finally {
      setLoading(false);
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
    return movies.reduce<ProgrammeMovie[]>((result, movie) => {
      const screenings = getUniqueScreeningsForDate(movie, selectedDate);
      if (screenings.length > 0) result.push({ movie, screenings });
      return result;
    }, []);
  }, [movies, selectedDate]);

  const hasScreeningsThisWeek = useMemo(
    () => movies.some((movie) =>
      (movie.screenings ?? []).some((screening) => weekDateStrings.includes(toISODate(screening.date)))
    ),
    [movies, weekDateStrings]
  );

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
              >
                <Text style={[styles.dayLabel, selected && styles.dayLabelSelected]}>
                  {FRENCH_WEEKDAYS[date.getDay()]} {date.getDate()}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <Text style={styles.selectedDateTitle}>Séances du {formatSelectedDate(selectedDate)}</Text>
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
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <FlatList
        data={programmeMovies}
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
          <Text style={styles.emptyText}>
            {hasScreeningsThisWeek ? 'Aucune séance ce jour' : 'Aucune séance prévue cette semaine'}
          </Text>
        }
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
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
    paddingTop: 16,
    paddingBottom: 100,
    flexGrow: 1,
  },
  header: {
    marginBottom: 28,
  },
  logo: {
    fontFamily: 'EBGaramond-SemiBold',
    fontSize: 28,
    color: '#e5e2e1',
  },
  programmeHeader: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontFamily: 'EBGaramond-SemiBold',
    fontSize: 24,
    color: '#e5e2e1',
    marginBottom: 16,
  },
  daysRow: {
    gap: 8,
    paddingRight: 4,
  },
  dayButton: {
    minWidth: 64,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
    borderRadius: 10,
    backgroundColor: '#201f1f',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  dayButtonSelected: {
    backgroundColor: '#b22222',
    borderColor: '#b22222',
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
  selectedDateTitle: {
    fontFamily: 'EBGaramond-SemiBold',
    fontSize: 22,
    color: '#e5e2e1',
    marginBottom: 16,
  },
  separator: {
    height: 16,
  },
  emptyText: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: '#aa8986',
    textAlign: 'center',
    marginTop: 8,
    paddingVertical: 16,
  },
});
