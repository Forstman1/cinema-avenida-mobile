import React, { useCallback, useEffect, useState } from 'react';
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

import { getScreeningsByMovieId } from '../api/movies';
import ErrorState from '../components/ErrorState';
import type { Screening } from '../types';
import type { RootStackParamList } from '../types/navigation';
import type { ScreeningsScreenProps } from '../types/navigation';

type ScreeningsNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Screenings'>;

export default function ScreeningsScreen({ route }: ScreeningsScreenProps) {
  const navigation = useNavigation<ScreeningsNavigationProp>();
  const insets = useSafeAreaInsets();
  const { movie } = route.params;

  const [screenings, setScreenings] = useState<Screening[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const fetchScreenings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getScreeningsByMovieId(movie.id);
      setScreenings(data);
      if (data.length > 0) {
        setSelectedId(data[0].id);
      }
    } catch (err: any) {
      setError(err?.message ?? 'Impossible de charger les séances.');
    } finally {
      setLoading(false);
    }
  }, [movie.id]);

  useEffect(() => {
    fetchScreenings();
  }, [fetchScreenings]);

  const handleContinue = () => {
    if (!selectedId) return;
    const screening = screenings.find((s) => s.id === selectedId);
    if (!screening) return;
    navigation.navigate('SeatMap', { movie, screening });
  };

  const renderCard = (screening: Screening) => {
    const isSelected = screening.id === selectedId;
    const availableSeats =
      typeof screening.availableSeats === 'number'
        ? screening.availableSeats
        : 120;

    return (
      <TouchableOpacity
        key={screening.id}
        activeOpacity={0.9}
        onPress={() => setSelectedId(screening.id)}
        style={[styles.card, isSelected && styles.cardSelected]}
      >
        <View style={styles.cardInfo}>
          <Text style={[styles.showTime, isSelected && styles.showTimeSelected]}>
            {screening.showTime}
          </Text>
          <Text
            style={[
              styles.seatsText,
              isSelected && styles.seatsTextSelected,
            ]}
          >
            {availableSeats} places disponibles
          </Text>
        </View>
        <View style={[styles.radio, isSelected && styles.radioSelected]}>
          {isSelected && <MaterialIcons name="check" size={18} color="#fff" />}
        </View>
      </TouchableOpacity>
    );
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

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" />
        <View style={styles.backWrapper}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()} activeOpacity={0.8}>
            <MaterialIcons name="arrow-back" size={24} color="#e5e2e1" />
          </TouchableOpacity>
        </View>
        <ErrorState message={error} onRetry={fetchScreenings} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Top bar */}
      <View style={[styles.topBar, { top: insets.top }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()} activeOpacity={0.8}>
          <MaterialIcons name="arrow-back" size={24} color="#e5e2e1" />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>Cinéma Avenida</Text>
        <View style={styles.topBarSpacer} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Banner */}
        <View style={styles.banner}>
          {movie.poster ? (
            <ImageBackground
              source={{ uri: movie.poster }}
              style={styles.bannerImage}
              imageStyle={styles.bannerImageStyle}
              resizeMode="cover"
            >
              <LinearGradient
                colors={['rgba(0,0,0,0.2)', 'rgba(19,19,19,0.85)']}
                locations={[0.3, 1]}
                style={styles.bannerGradient}
              >
                <Text style={styles.bannerTitle}>{movie.title}</Text>
                <Text style={styles.bannerSubtitle}>
                  Sélectionnez une séance pour aujourd'hui
                </Text>
              </LinearGradient>
            </ImageBackground>
          ) : (
            <View style={styles.bannerPlaceholder}>
              <Text style={styles.bannerTitle}>{movie.title}</Text>
              <Text style={styles.bannerSubtitle}>
                Sélectionnez une séance pour aujourd'hui
              </Text>
            </View>
          )}
        </View>

        {/* Screening cards */}
        <View style={styles.cards}>
          {screenings.length > 0 ? (
            screenings.map(renderCard)
          ) : (
            <Text style={styles.emptyText}>Aucune séance disponible.</Text>
          )}
        </View>
      </ScrollView>

      {/* Continue button */}
      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 16 }]}>
        <TouchableOpacity
          style={[styles.continueButton, !selectedId && styles.continueButtonDisabled]}
          onPress={handleContinue}
          activeOpacity={0.9}
          disabled={!selectedId}
        >
          <Text style={styles.continueButtonText}>Continuer</Text>
          <MaterialIcons name="arrow-forward" size={20} color="#fff" />
        </TouchableOpacity>
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
    paddingTop: 12,
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
  banner: {
    height: 240,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    overflow: 'hidden',
  },
  bannerImage: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  bannerImageStyle: {
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  bannerGradient: {
    paddingHorizontal: 24,
    paddingBottom: 28,
    paddingTop: 80,
    justifyContent: 'flex-end',
  },
  bannerPlaceholder: {
    flex: 1,
    backgroundColor: '#201f1f',
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    paddingHorizontal: 24,
    paddingBottom: 28,
    justifyContent: 'flex-end',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  bannerTitle: {
    fontFamily: 'EBGaramond-SemiBold',
    fontSize: 28,
    color: '#fff',
    marginBottom: 6,
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  bannerSubtitle: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: '#e2beba',
  },
  cards: {
    paddingHorizontal: 24,
    paddingTop: 32,
    gap: 16,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#201f1f',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    padding: 20,
  },
  cardSelected: {
    backgroundColor: 'rgba(178,34,34,0.08)',
    borderColor: '#b22222',
  },
  cardInfo: {
    gap: 6,
  },
  showTime: {
    fontFamily: 'EBGaramond-SemiBold',
    fontSize: 28,
    color: '#e5e2e1',
  },
  showTimeSelected: {
    color: '#fff',
  },
  seatsText: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: '#aa8986',
  },
  seatsTextSelected: {
    color: '#b22222',
  },
  radio: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#555',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: {
    backgroundColor: '#b22222',
    borderColor: '#b22222',
  },
  emptyText: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: '#aa8986',
    textAlign: 'center',
    marginTop: 24,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(19,19,19,0.85)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 24,
  },
  continueButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#b22222',
    borderRadius: 12,
    paddingVertical: 14,
    gap: 8,
    shadowColor: 'rgba(0,0,0,0.5)',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 8,
  },
  continueButtonDisabled: {
    backgroundColor: '#555',
  },
  continueButtonText: {
    fontFamily: 'Inter-Bold',
    fontSize: 16,
    color: '#fff',
  },
});
