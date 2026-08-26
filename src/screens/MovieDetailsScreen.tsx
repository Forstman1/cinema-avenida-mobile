import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  ImageBackground,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { getMovieById, getScreeningsByMovieId } from '../api/movies';
import ErrorState from '../components/ErrorState';
import { formatDuration, formatScreeningDate, getNextScreening } from '../utils/date';
import { useAuth } from '../context/AuthContext';
import type { Movie, Screening } from '../types';
import type { RootStackParamList } from '../types/navigation';
import type { MovieDetailsScreenProps } from '../types/navigation';

type DetailsNavigationProp = NativeStackNavigationProp<RootStackParamList, 'MovieDetails'>;

export default function MovieDetailsScreen({ route }: MovieDetailsScreenProps) {
  const navigation = useNavigation<DetailsNavigationProp>();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { movieId, initialDate, screening: suggestedScreening } = route.params;

  const [movie, setMovie] = useState<Movie | null>(null);
  const [screenings, setScreenings] = useState<Screening[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [movieData, screeningsData] = await Promise.all([
        getMovieById(movieId),
        getScreeningsByMovieId(movieId),
      ]);
      setMovie(movieData);
      setScreenings(screeningsData);
    } catch (err: any) {
      setError(err?.message ?? 'Impossible de charger les détails du film.');
    } finally {
      setLoading(false);
    }
  }, [movieId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const nextScreening = useMemo(() => {
    if (suggestedScreening) {
      const matchingScreening = screenings.find((screening) => screening.id === suggestedScreening.id);
      if (matchingScreening) return matchingScreening;
    }
    return getNextScreening(screenings);
  }, [screenings, suggestedScreening]);

  const handleReserve = () => {
    if (!movie || !nextScreening) return;
    navigation.navigate('Screenings', { movie, initialDate });
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" />
        <View style={styles.skeleton}>
          <ActivityIndicator size="large" color="#b22222" />
        </View>
      </SafeAreaView>
    );
  }

  if (error || !movie) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" />
        <View style={styles.backWrapper}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()} activeOpacity={0.8}>
            <MaterialIcons name="arrow-back" size={24} color="#e5e2e1" />
          </TouchableOpacity>
        </View>
        <ErrorState message={error ?? 'Film introuvable.'} onRetry={fetchData} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Fixed top bar */}
      <View style={[styles.topBar, { top: insets.top }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()} activeOpacity={0.8}>
          <MaterialIcons name="arrow-back" size={24} color="#e5e2e1" />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>Détails du Film</Text>
        <View style={styles.topBarSpacer} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Hero poster */}
        <View style={styles.hero}>
          {movie.poster ? (
            <ImageBackground
              source={{ uri: movie.poster }}
              style={styles.heroImage}
              imageStyle={styles.heroImageStyle}
              resizeMode="cover"
            >
              <LinearGradient
                colors={['rgba(0,0,0,0)', 'rgba(19,19,19,0.5)', 'rgba(19,19,19,0.95)']}
                locations={[0.3, 0.6, 1]}
                style={styles.heroGradient}
              >
                <Text style={styles.title}>{movie.title}</Text>
                <View style={styles.metaRow}>
                  <View style={styles.genreBadge}>
                    <Text style={styles.genreText}>{movie.genre}</Text>
                  </View>
                  <MaterialIcons name="schedule" size={16} color="#aa8986" />
                  <Text style={styles.duration}>{formatDuration(movie.duration)}</Text>
                </View>
              </LinearGradient>
            </ImageBackground>
          ) : (
            <View style={styles.heroPlaceholder}>
              <Text style={styles.heroPlaceholderTitle} numberOfLines={2}>
                {movie.title}
              </Text>
              <View style={styles.metaRow}>
                <View style={styles.genreBadge}>
                  <Text style={styles.genreText}>{movie.genre}</Text>
                </View>
                <MaterialIcons name="schedule" size={16} color="#aa8986" />
                <Text style={styles.duration}>{formatDuration(movie.duration)}</Text>
              </View>
            </View>
          )}
        </View>

        {/* Content */}
        <View style={styles.content}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Synopsis</Text>
            <Text style={styles.synopsis}>{movie.synopsis}</Text>
          </View>
        </View>
      </ScrollView>

      {/* Fixed bottom action bar */}
      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 16 }]}>
        <View style={styles.bottomBarInfo}>
          <Text style={styles.bottomBarLabel}>PROCHAINE SÉANCE</Text>
          <Text style={styles.bottomBarTime}>
            {nextScreening
              ? `${formatScreeningDate(nextScreening.date)}, ${nextScreening.showTime}`
              : 'Aucune séance prévue'}
          </Text>
        </View>
        {user?.role === 'ADMIN' ? (
          <View style={styles.adminBadge}>
            <MaterialIcons name="admin-panel-settings" size={18} color="#aa8986" />
            <Text style={styles.adminBadgeText}>Connecté en tant qu'administrateur</Text>
          </View>
        ) : (
          <TouchableOpacity
            style={[styles.reserveButton, !nextScreening && styles.reserveButtonDisabled]}
            onPress={handleReserve}
            activeOpacity={0.9}
            disabled={!nextScreening}
          >
            <Text style={styles.reserveButtonText}>Réserver</Text>
            <MaterialIcons name="confirmation-number" size={20} color="#fff" />
          </TouchableOpacity>
        )}
      </View>
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
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 48,
    zIndex: 10,
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
    fontSize: 18,
    color: '#e5e2e1',
  },
  topBarSpacer: {
    width: 40,
  },
  backWrapper: {
    paddingHorizontal: 16,
    paddingTop: 48,
  },
  scrollContent: {
    paddingBottom: 120,
  },
  hero: {
    height: '55%',
    minHeight: 420,
    maxHeight: 520,
  },
  heroImage: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  heroImageStyle: {
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  heroGradient: {
    paddingHorizontal: 24,
    paddingBottom: 28,
    paddingTop: 120,
    justifyContent: 'flex-end',
  },
  heroPlaceholder: {
    flex: 1,
    backgroundColor: '#201f1f',
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    paddingHorizontal: 24,
    paddingBottom: 28,
    paddingTop: 120,
    justifyContent: 'flex-end',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  heroPlaceholderTitle: {
    fontFamily: 'EBGaramond-SemiBold',
    fontSize: 36,
    color: '#e5e2e1',
    marginBottom: 12,
  },
  title: {
    fontFamily: 'EBGaramond-SemiBold',
    fontSize: 36,
    color: '#fff',
    marginBottom: 12,
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  genreBadge: {
    backgroundColor: '#353534',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  genreText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 12,
    color: '#e5e2e1',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  duration: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: '#aa8986',
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 28,
  },
  section: {
    marginBottom: 28,
  },
  sectionTitle: {
    fontFamily: 'EBGaramond-SemiBold',
    fontSize: 22,
    color: '#e5e2e1',
    marginBottom: 12,
  },
  synopsis: {
    fontFamily: 'Inter-Regular',
    fontSize: 16,
    color: '#aa8986',
    lineHeight: 26,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(19,19,19,0.85)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 24,
  },
  bottomBarInfo: {
    flex: 1,
  },
  bottomBarLabel: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 11,
    color: '#aa8986',
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  bottomBarTime: {
    fontFamily: 'EBGaramond-SemiBold',
    fontSize: 18,
    color: '#fff',
  },
  reserveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#b22222',
    borderRadius: 999,
    paddingVertical: 12,
    paddingHorizontal: 24,
    gap: 8,
    shadowColor: 'rgba(0,0,0,0.5)',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 8,
  },
  reserveButtonDisabled: {
    backgroundColor: '#555',
  },
  reserveButtonText: {
    fontFamily: 'Inter-Bold',
    fontSize: 15,
    color: '#fff',
  },
  adminBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  adminBadgeText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 13,
    color: '#aa8986',
  },
});
