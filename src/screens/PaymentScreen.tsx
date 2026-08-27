import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { MaterialIcons } from '@expo/vector-icons';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { getApiErrorDetails, getApiErrorMessage } from '../api/errors';
import { useAuthStore } from '../store/authStore';
import { useBookingsStore } from '../store/bookingsStore';
import { useReservationStore } from '../store/reservationStore';
import { parseLocalDate, toISODate } from '../utils/date';
import type {
  Movie,
  MovieReference,
  MovieSummary,
  Reservation,
  ReservationScreening,
  Screening,
  Seat,
} from '../types';
import type { RootStackParamList } from '../types/navigation';
import type { PaymentScreenProps } from '../types/navigation';

type PaymentNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Payment'>;

function getRemainingSeconds(lockedUntil: string | null): number {
  if (!lockedUntil) return 0;
  const now = Date.now();
  const expiresAt = new Date(lockedUntil).getTime();
  if (!Number.isFinite(expiresAt)) return 0;
  const remaining = Math.floor((expiresAt - now) / 1000);
  return Math.max(0, remaining);
}

function formatCountdown(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function formatFullDate(dateString: string): string {
  const date = parseLocalDate(toISODate(dateString));
  if (!date) return dateString;
  return date.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

const EMPTY_SEATS: Seat[] = [];

function getReservationLockedUntil(reservation: Reservation | null): string | null {
  const values = (reservation?.reservationSeats ?? [])
    .map((reservationSeat) => reservationSeat.lockedUntil)
    .filter(
      (value): value is string =>
        typeof value === 'string' && value.length > 0 && !Number.isNaN(Date.parse(value))
    );

  if (values.length === 0) return null;
  return values.reduce((latest, value) =>
    Date.parse(value) > Date.parse(latest) ? value : latest
  );
}

function isCompleteMovie(movie: MovieReference): movie is Movie {
  return 'synopsis' in movie;
}

function toMovieSummary(movie: MovieReference): MovieSummary {
  return { id: movie.id, title: movie.title };
}

function normalizeReservationScreeningForPayment(
  source: ReservationScreening | Screening | undefined,
  movie: MovieReference | undefined
): ReservationScreening | undefined {
  if (!source) return undefined;

  const movieSummary = 'movie' in source
    ? source.movie
    : movie
      ? toMovieSummary(movie)
      : undefined;
  if (!movieSummary) return undefined;

  return {
    id: source.id,
    date: toISODate(source.date),
    showTime: source.showTime,
    movieId: source.movieId,
    movie: toMovieSummary(movieSummary),
  };
}

function normalizeReservation(
  source: Reservation | null | undefined,
  movie: MovieReference | undefined,
  screening: Screening | undefined,
  seats: Seat[] | undefined
): Reservation | null {
  if (!source || !Number.isInteger(source.id)) return null;

  const baseScreening = source.screening ?? screening;
  const normalizedScreening = normalizeReservationScreeningForPayment(baseScreening, movie);

  const reservationSeats = source.reservationSeats.length > 0
    ? source.reservationSeats
    : (seats ?? []).map((seat) => ({
        id: seat.id,
        seatId: seat.id,
        seat,
        reservationId: source.id,
        lockedUntil: null,
      }));

  return {
    ...source,
    screening: normalizedScreening ?? source.screening,
    reservationSeats,
  };
}

export default function PaymentScreen({ route }: PaymentScreenProps) {
  const navigation = useNavigation<PaymentNavigationProp>();
  const insets = useSafeAreaInsets();
  const { movie, screening, reservation: routeReservation, seats: routeSeats } = route.params ?? {};
  const userId = useAuthStore((state) => state.user?.id ?? null);

  const setLastCompletedBooking = useBookingsStore((state) => state.setLastCompletedBooking);
  const storeReservation = useReservationStore((state) => state.pendingReservation);
  const currentScreeningId = useReservationStore((state) => state.currentScreeningId);
  const lockedUntil = useReservationStore((state) => state.lockedUntil);
  const isPaying = useReservationStore((state) => state.isPaying);
  const payReservation = useReservationStore((state) => state.payReservation);
  const clearReservationDraft = useReservationStore((state) => state.clearReservationDraft);
  const loadSeats = useReservationStore((state) => state.loadSeats);
  const hydrateReservation = useReservationStore((state) => state.hydrateReservation);

  const reservation = useMemo(() => {
    const source = routeReservation && Number.isInteger(routeReservation.id)
      ? routeReservation
      : storeReservation;
    return normalizeReservation(source, movie, screening, routeSeats);
  }, [movie, routeReservation, routeSeats, screening, storeReservation]);

  const seats = useMemo(
    () => reservation?.reservationSeats?.map((reservationSeat) => reservationSeat.seat) ?? EMPTY_SEATS,
    [reservation]
  );

  const reservationLockedUntil = useMemo(
    () => getReservationLockedUntil(reservation),
    [reservation]
  );
  const effectiveLockedUntil = reservationLockedUntil ??
    (storeReservation?.id === reservation?.id ? lockedUntil : null);

  useEffect(() => {
    if (!reservation) return;
    if (
      storeReservation?.id !== reservation.id ||
      currentScreeningId !== reservation.screening?.id ||
      lockedUntil !== reservationLockedUntil
    ) {
      hydrateReservation(reservation, seats);
    }
  }, [
    currentScreeningId,
    hydrateReservation,
    lockedUntil,
    reservation,
    reservationLockedUntil,
    seats,
    storeReservation?.id,
  ]);

  const [remainingSeconds, setRemainingSeconds] = useState(() =>
    getRemainingSeconds(effectiveLockedUntil)
  );
  const [expired, setExpired] = useState(false);

  const seatLabels = useMemo(() => seats.map((s) => `${s.row}${s.number}`).join(', '), [seats]);

  useEffect(() => {
    const remaining = getRemainingSeconds(effectiveLockedUntil);
    setExpired(remaining <= 0);
    setRemainingSeconds(remaining);
  }, [effectiveLockedUntil]);

  const handleReturnToSeats = useCallback(() => {
    if (movie && isCompleteMovie(movie) && screening) {
      navigation.navigate('SeatMap', { movie, screening });
    } else {
      navigation.goBack();
    }
  }, [movie, navigation, screening]);

  const handleExpiration = useCallback(() => {
    setExpired(true);
    setRemainingSeconds(0);
    clearReservationDraft();
    if (screening?.id) {
      void loadSeats(screening.id, { showLoading: false });
    }
    Alert.alert(
      'Réservation expirée',
      'Veuillez sélectionner vos sièges à nouveau.',
      [{ text: 'Choisir des sièges', onPress: handleReturnToSeats }]
    );
  }, [clearReservationDraft, handleReturnToSeats, loadSeats, screening?.id]);

  useEffect(() => {
    if (!effectiveLockedUntil || expired) return;

    const updateRemaining = () => {
      const remaining = getRemainingSeconds(effectiveLockedUntil);
      setRemainingSeconds(remaining);
      if (remaining <= 0) handleExpiration();
    };

    updateRemaining();
    const interval = setInterval(updateRemaining, 1000);

    return () => clearInterval(interval);
  }, [effectiveLockedUntil, expired, handleExpiration]);

  const isExpired = expired || remainingSeconds <= 0;
  const isUrgent = remainingSeconds < 120;

  const handlePay = async () => {
    if (isExpired) {
      handleExpiration();
      return;
    }
    if (!reservation?.id) {
      Alert.alert('Erreur', 'Aucune réservation à payer.');
      return;
    }
    try {
      const result = await payReservation();
      if (!result.ticket) {
        throw new Error('Le paiement a réussi, mais aucun billet n’a été retourné.');
      }
      if (movie && screening) {
        setLastCompletedBooking({
          userId,
          reservation: result,
          ticket: result.ticket,
          movie,
          screening,
          seats,
        });
      }
      navigation.navigate('Ticket', {
        movie,
        screening,
        reservation: result,
        ticket: result.ticket,
        seats,
      });
      // Keep confirmedReservation/paymentResult/ticket in the store while
      // clearing only the temporary selection and lock after the bookings
      // store has received the completed booking.
      clearReservationDraft();
    } catch (error: unknown) {
      const message = getApiErrorMessage(error, 'Le paiement a échoué.');
      const status = getApiErrorDetails(error).status;
      const isExpiredError = (status === 410 || status === 409) || /expir/i.test(message);
      Alert.alert('Erreur de paiement', message, [
        {
          text: isExpiredError ? 'Choisir des sièges' : 'OK',
          onPress: () => {
            if (isExpiredError) {
              setExpired(true);
              clearReservationDraft();
              if (screening?.id) {
                void loadSeats(screening.id, { showLoading: false });
              }
              handleReturnToSeats();
            }
          },
        },
      ]);
    }
  };

  const renderExpiredState = () => (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <View style={styles.fallback}>
        <Text style={styles.fallbackText}>Réservation expirée</Text>
        <Text style={styles.fallbackText}>Veuillez sélectionner vos sièges à nouveau.</Text>
        <TouchableOpacity style={styles.fallbackButton} onPress={handleReturnToSeats} activeOpacity={0.9}>
          <Text style={styles.fallbackButtonText}>Choisir des sièges</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );

  if (expired) return renderExpiredState();

  if (!reservation || !movie || !screening || seats.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" />
        <View style={styles.fallback}>
          <Text style={styles.fallbackText}>Données de réservation manquantes.</Text>
          <TouchableOpacity style={styles.fallbackButton} onPress={() => navigation.goBack()} activeOpacity={0.9}>
            <Text style={styles.fallbackButtonText}>Retour</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <View style={[styles.topBar, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()} activeOpacity={0.8}>
          <MaterialIcons name="arrow-back" size={24} color="#e5e2e1" />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>Paiement</Text>
        <View style={styles.topBarSpacer} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Countdown banner */}
        <View style={[styles.countdownBanner, isUrgent && styles.countdownBannerUrgent]}>
          <MaterialIcons name="timer" size={20} color={isUrgent ? '#fff' : '#e2beba'} />
          <Text style={[styles.countdownText, isUrgent && styles.countdownTextUrgent]}>
            Il vous reste {formatCountdown(remainingSeconds)} pour confirmer
          </Text>
        </View>

        {/* Booking summary */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            {isCompleteMovie(movie) && movie.poster ? (
              <Image
                source={{ uri: movie.poster }}
                style={styles.posterThumbnail}
              />
            ) : (
              <View style={styles.posterPlaceholder}>
                <Text style={styles.posterPlaceholderText}>Cinéma Avenida</Text>
              </View>
            )}
            <View style={styles.summaryInfo}>
              <Text style={styles.movieTitle} numberOfLines={2}>{movie.title}</Text>
              <View style={styles.summaryLine}>
                <MaterialIcons name="calendar-today" size={16} color="#e2beba" />
                <Text style={styles.summaryLineText}>{formatFullDate(screening.date)}</Text>
              </View>
              <View style={styles.summaryLine}>
                <MaterialIcons name="schedule" size={16} color="#e2beba" />
                <Text style={styles.summaryLineText}>{screening.showTime}</Text>
              </View>
              <View style={styles.summaryLine}>
                <MaterialIcons name="event-seat" size={16} color="#e2beba" />
                <Text style={styles.summaryLineText}>Sièges: {seatLabels}</Text>
              </View>
            </View>
          </View>
          <View style={styles.divider} />
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total à payer</Text>
            <Text style={styles.totalAmount}>{reservation.totalAmount} DH</Text>
          </View>
        </View>

        {/* Simulated card details */}
        <Text style={styles.sectionTitle}>Détails de la carte</Text>

        <View style={styles.cardField}>
          <MaterialIcons name="credit-card" size={20} color="#e2beba" />
          <Text style={styles.cardFieldText}>**** **** **** 4242</Text>
        </View>

        <View style={styles.cardRow}>
          <View style={[styles.cardField, styles.cardFieldHalf]}>
            <MaterialIcons name="calendar-today" size={20} color="#e2beba" />
            <Text style={styles.cardFieldText}>12/25</Text>
          </View>
          <View style={[styles.cardField, styles.cardFieldHalf]}>
            <MaterialIcons name="lock" size={20} color="#e2beba" />
            <Text style={styles.cardFieldText}>***</Text>
          </View>
        </View>

        <View style={styles.cardField}>
          <MaterialIcons name="person" size={20} color="#e2beba" />
          <Text style={styles.cardFieldText}>Jean Dupont</Text>
        </View>

        <Text style={styles.simulatedNote}>ⓘ PAIEMENT SIMULÉ</Text>
      </ScrollView>

      {/* Bottom pay button */}
      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 16 }]}>
        <TouchableOpacity
          style={[styles.payButton, (isExpired || isPaying) && styles.payButtonDisabled]}
          onPress={handlePay}
          activeOpacity={0.9}
          disabled={isExpired || isPaying}
        >
          {isPaying ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.payButtonText}>Payer {reservation.totalAmount} DH</Text>
          )}
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
  countdownBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#201f1f',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    paddingVertical: 12,
    marginBottom: 20,
  },
  countdownBannerUrgent: {
    backgroundColor: 'rgba(178,34,34,0.15)',
    borderColor: 'rgba(178,34,34,0.3)',
  },
  countdownText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
    color: '#e2beba',
  },
  countdownTextUrgent: {
    color: '#ff6b6b',
  },
  summaryCard: {
    backgroundColor: '#201f1f',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    padding: 20,
    marginBottom: 28,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 16,
  },
  posterThumbnail: {
    width: 90,
    height: 130,
    borderRadius: 10,
    backgroundColor: '#1a1a1a',
  },
  posterPlaceholder: {
    width: 90,
    height: 130,
    borderRadius: 10,
    backgroundColor: '#1a1a1a',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
  },
  posterPlaceholderText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 10,
    color: '#888',
    textAlign: 'center',
  },
  summaryInfo: {
    flex: 1,
    justifyContent: 'center',
    gap: 10,
  },
  movieTitle: {
    fontFamily: 'EBGaramond-SemiBold',
    fontSize: 22,
    color: '#e5e2e1',
    marginBottom: 4,
  },
  summaryLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  summaryLineText: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: '#e2beba',
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
    marginVertical: 16,
  },
  totalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  totalLabel: {
    fontFamily: 'EBGaramond-SemiBold',
    fontSize: 20,
    color: '#e5e2e1',
  },
  totalAmount: {
    fontFamily: 'EBGaramond-SemiBold',
    fontSize: 28,
    color: '#b22222',
  },
  sectionTitle: {
    fontFamily: 'EBGaramond-SemiBold',
    fontSize: 22,
    color: '#e5e2e1',
    marginBottom: 16,
  },
  cardField: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    paddingHorizontal: 16,
    paddingVertical: 16,
    marginBottom: 14,
  },
  cardFieldHalf: {
    flex: 1,
  },
  cardFieldText: {
    fontFamily: 'Inter-Regular',
    fontSize: 16,
    color: '#e5e2e1',
    letterSpacing: 0.5,
  },
  cardRow: {
    flexDirection: 'row',
    gap: 14,
  },
  simulatedNote: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    color: '#888',
    textAlign: 'center',
    marginTop: 24,
    letterSpacing: 0.5,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(19,19,19,0.95)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  payButton: {
    backgroundColor: '#b22222',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: 'rgba(0,0,0,0.5)',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 8,
  },
  payButtonDisabled: {
    backgroundColor: '#555',
  },
  payButtonText: {
    fontFamily: 'Inter-Bold',
    fontSize: 16,
    color: '#fff',
  },
  fallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  fallbackText: {
    fontFamily: 'Inter-Regular',
    fontSize: 16,
    color: '#e5e2e1',
    textAlign: 'center',
    marginBottom: 20,
  },
  fallbackButton: {
    backgroundColor: '#b22222',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 32,
  },
  fallbackButtonText: {
    fontFamily: 'Inter-Bold',
    fontSize: 16,
    color: '#fff',
  },
});
