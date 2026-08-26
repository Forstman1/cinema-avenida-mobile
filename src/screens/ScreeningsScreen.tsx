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

import { getScreeningsByMovieId } from '../api/movies';
import ErrorState from '../components/ErrorState';
import type { Screening } from '../types';
import type { RootStackParamList } from '../types/navigation';
import type { ScreeningsScreenProps } from '../types/navigation';
import {
  compareShowTimes,
  getRemainingDaysOfWeek,
  getTodayDateString,
  isScreeningInFuture,
  parseLocalDate,
  toISODate,
  toISODateString,
} from '../utils/date';

type ScreeningsNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Screenings'>;

const WEEKDAY_SHORT = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
const MONTH_NAMES = [
  'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
  'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre',
];

function formatSelectedDate(date: Date): string {
  const weekday = date.toLocaleDateString('fr-FR', { weekday: 'long' });
  const capitalized = weekday.charAt(0).toUpperCase() + weekday.slice(1);
  return `${capitalized} ${date.getDate()} ${MONTH_NAMES[date.getMonth()]}`;
}

export default function ScreeningsScreen({ route }: ScreeningsScreenProps) {
  const navigation = useNavigation<ScreeningsNavigationProp>();
  const insets = useSafeAreaInsets();
  const { movie, initialDate } = route.params;

  const today = useMemo(() => getTodayDateString(), []);
  const weekDays = useMemo(
    () => getRemainingDaysOfWeek(parseLocalDate(today) ?? new Date()),
    [today]
  );
  const weekDateStrings = useMemo(
    () => weekDays.map((date) => toISODateString(date)),
    [weekDays]
  );

  const [screenings, setScreenings] = useState<Screening[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const groupedScreenings = useMemo(() => {
    const map: Record<string, Screening[]> = {};
    const allowedDates = new Set(weekDateStrings);
    const seenScreeningIds = new Set<number>();

    screenings.forEach((screening) => {
      if (seenScreeningIds.has(screening.id)) return;

      const key = toISODate(screening.date);
      if (!allowedDates.has(key) || !isScreeningInFuture(screening)) return;

      seenScreeningIds.add(screening.id);
      if (!map[key]) {
        map[key] = [];
      }
      map[key].push(screening);
    });
    Object.values(map).forEach((list) => {
      list.sort((a, b) => compareShowTimes(a.showTime, b.showTime));
    });
    return map;
  }, [screenings, weekDateStrings]);

  const daysWithScreenings = useMemo(
    () => weekDateStrings.filter((date) => groupedScreenings[date]?.length > 0),
    [weekDateStrings, groupedScreenings]
  );

  const currentDayScreenings = useMemo(() => {
    if (!selectedDate) return [];
    return groupedScreenings[selectedDate] ?? [];
  }, [selectedDate, groupedScreenings]);

  useEffect(() => {
    if (selectedId !== null && !currentDayScreenings.some((screening) => screening.id === selectedId)) {
      setSelectedId(null);
    }
  }, [currentDayScreenings, selectedId]);

  const fetchScreenings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getScreeningsByMovieId(movie.id);
      setScreenings(data);
    } catch (err: any) {
      setError(err?.message ?? 'Impossible de charger les séances.');
    } finally {
      setLoading(false);
    }
  }, [movie.id]);

  useEffect(() => {
    fetchScreenings();
  }, [fetchScreenings]);

  useEffect(() => {
    if (loading) return;
    if (selectedDate) return;

    setSelectedDate(
      initialDate && weekDateStrings.includes(initialDate)
        ? initialDate
        : today
    );
  }, [groupedScreenings, initialDate, loading, selectedDate, today, weekDateStrings]);

  const handleDayPress = useCallback((dateString: string) => {
    setSelectedDate(dateString);
    setSelectedId(null);
  }, []);

  const handleContinue = () => {
    if (selectedId === null) return;
    const screening = currentDayScreenings.find((s) => s.id === selectedId);
    if (!screening) return;
    navigation.navigate('SeatMap', { movie, screening });
  };

  const renderCard = (screening: Screening) => {
    const isSelected = screening.id === selectedId;
    const availableSeatsLabel =
      typeof screening.availableSeats === 'number'
        ? `${screening.availableSeats} places disponibles`
        : 'Places disponibles non communiquées';

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
            {availableSeatsLabel}
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
                  {selectedDate
                    ? `Sélectionnez une séance — ${formatSelectedDate(parseLocalDate(selectedDate) ?? new Date())}`
                    : 'Sélectionnez une séance'}
                </Text>
              </LinearGradient>
            </ImageBackground>
          ) : (
            <View style={styles.bannerPlaceholder}>
              <Text style={styles.bannerTitle}>{movie.title}</Text>
              <Text style={styles.bannerSubtitle}>
                {selectedDate
                  ? `Sélectionnez une séance — ${formatSelectedDate(parseLocalDate(selectedDate) ?? new Date())}`
                  : 'Sélectionnez une séance'}
              </Text>
            </View>
          )}
        </View>

        {/* Day strip */}
        <View style={styles.weekStrip}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.daysRow}
          >
            {weekDateStrings.map((dateString) => {
              const date = parseLocalDate(dateString);
              if (!date) return null;

              const selected = dateString === selectedDate;
              const weekdayIndex = date.getDay();

              return (
                <TouchableOpacity
                  key={dateString}
                  style={[styles.dayButton, selected && styles.dayButtonSelected]}
                  onPress={() => handleDayPress(dateString)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.dayLabel, selected && styles.dayLabelSelected]}>
                    {WEEKDAY_SHORT[weekdayIndex]} {date.getDate()}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Screening cards */}
        <View style={styles.cards}>
          {daysWithScreenings.length === 0 ? (
            <Text style={styles.emptyText}>Aucune séance prévue</Text>
          ) : currentDayScreenings.length > 0 ? (
            currentDayScreenings.map(renderCard)
          ) : (
            <Text style={styles.emptyText}>Aucune séance ce jour</Text>
          )}
        </View>
      </ScrollView>

      {/* Continue button */}
      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 16 }]}>
        <TouchableOpacity
          style={[styles.continueButton, selectedId === null && styles.continueButtonDisabled]}
          onPress={handleContinue}
          activeOpacity={0.9}
          disabled={selectedId === null}
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
  weekStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    marginTop: 24,
  },
  daysRow: {
    flexDirection: 'row',
    gap: 8,
    paddingRight: 8,
  },
  dayButton: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 64,
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
