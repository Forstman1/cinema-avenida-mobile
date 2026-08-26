import React, { useCallback, useMemo, useState } from 'react';
import {
  FlatList,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { MaterialIcons } from '@expo/vector-icons';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { getMovies } from '../api/movies';
import SearchBar from '../components/SearchBar';
import HorizontalMovieCard from '../components/HorizontalMovieCard';
import VerticalMovieCard from '../components/VerticalMovieCard';
import HomeSkeleton from '../components/HomeSkeleton';
import ErrorState from '../components/ErrorState';
import AdminDashboard from '../components/AdminDashboard';
import { useAuth } from '../context/AuthContext';
import { getNextScreening, getTodayDateString, toISODate } from '../utils/date';
import type { Movie, Screening } from '../types';
import type { RootStackParamList } from '../types/navigation';

type HomeNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Main'>;

export default function HomeScreen() {
  const navigation = useNavigation<HomeNavigationProp>();
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  const [movies, setMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  if (isAdmin) {
    return <AdminDashboard />;
  }

  const getMovieNextScreening = useCallback((movie: Movie) => {
    return getNextScreening(movie.screenings ?? []);
  }, []);

  const fetchMovies = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getMovies({ current: true });
      setMovies(data);
    } catch (err: any) {
      setError(err?.message ?? 'Impossible de charger les films.');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchMovies();
    }, [fetchMovies])
  );

  const filteredMovies = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return movies;
    return movies.filter((movie) => movie.title.toLowerCase().includes(query));
  }, [movies, searchQuery]);

  const today = getTodayDateString();

  const featuredMovies = useMemo(() => {
    return filteredMovies.filter((movie) =>
      movie.screenings?.some((screening) => toISODate(screening.date) === today)
    );
  }, [filteredMovies, today]);

  const handleMoviePress = (movie: Movie, screening?: Screening) => {
    navigation.navigate('MovieDetails', { movieId: movie.id, screening });
  };

  const handleTimePress = (movie: Movie, _time: string) => {
    navigation.navigate('Screenings', { movie });
  };

  const renderHeader = () => (
    <>
      <View style={styles.header}>
        <Text style={styles.logo}>Cinéma Avenida</Text>
        <TouchableOpacity style={styles.profileButton} activeOpacity={0.8}>
          <MaterialIcons name="person" size={22} color="#e5e2e1" />
        </TouchableOpacity>
      </View>

      <View style={styles.searchWrapper}>
        <SearchBar value={searchQuery} onChangeText={setSearchQuery} />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>À l'affiche</Text>
        {featuredMovies.length > 0 ? (
          <FlatList
            data={featuredMovies}
            keyExtractor={(item) => String(item.id)}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.horizontalList}
            renderItem={({ item, index }) => (
              <HorizontalMovieCard
                movie={item}
                onPress={handleMoviePress}
                isNew={index === 0}
              />
            )}
          />
        ) : (
          <Text style={styles.emptyText}>Aucune séance aujourd’hui</Text>
        )}
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Cette semaine</Text>
        {filteredMovies.length > 0 && (
          <TouchableOpacity activeOpacity={0.8}>
            <Text style={styles.seeAll}>TOUT VOIR</Text>
          </TouchableOpacity>
        )}
      </View>
    </>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <HomeSkeleton />
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <ErrorState message={error} onRetry={fetchMovies} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <FlatList
        data={filteredMovies}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => (
          <VerticalMovieCard
            movie={item}
            onPress={handleMoviePress}
            onTimePress={handleTimePress}
          />
        )}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={
          <Text style={styles.emptyText}>Aucun film trouvé.</Text>
        }
        ItemSeparatorComponent={() => <View style={{ height: 16 }} />}
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
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  logo: {
    fontFamily: 'EBGaramond-SemiBold',
    fontSize: 28,
    color: '#e5e2e1',
  },
  profileButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#201f1f',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchWrapper: {
    marginBottom: 24,
  },
  section: {
    marginBottom: 28,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontFamily: 'EBGaramond-SemiBold',
    fontSize: 24,
    color: '#e5e2e1',
  },
  seeAll: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 12,
    color: '#ffb4ac',
    letterSpacing: 0.6,
  },
  horizontalList: {
    paddingRight: 20,
    paddingVertical: 4,
  },
  emptyText: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: '#aa8986',
    marginTop: 8,
  },
});
