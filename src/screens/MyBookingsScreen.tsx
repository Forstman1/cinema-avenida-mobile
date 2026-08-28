import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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
import { LinearGradient } from 'expo-linear-gradient';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { getApiErrorDetails, getApiErrorMessage } from '../api/errors';
import ErrorState from '../components/ErrorState';
import PosterImage from '../components/PosterImage';
import { useAuthStore } from '../store/authStore';
import { useBookingsStore } from '../store/bookingsStore';
import { useCinemaConfigStore } from '../store/cinemaConfigStore';
import { formatScreeningDate, getScreeningDateTime } from '../utils/date';
import type { Reservation, Seat } from '../types';
import type { RootStackParamList } from '../types/navigation';

type BookingsNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Main'>;

type TabType = 'upcoming' | 'history';
const TWO_HOURS_MS = 2 * 60 * 60 * 1000;
const CANCELLATION_WINDOW_MESSAGE = 'Annulation impossible moins de 2 heures avant la séance';

interface CancellationState {
  allowed: boolean;
  windowClosed: boolean;
}

function isUpcoming(reservation: Reservation, timezone: string | undefined, nowMs: number): boolean {
  if (reservation.status !== 'CONFIRMED') return false;
  const screeningDateTime = getScreeningDateTime(reservation, timezone);
  return !!screeningDateTime && screeningDateTime.getTime() > nowMs;
}

function getCancellationState(
  reservation: Reservation,
  timezone: string | undefined,
  nowMs: number
): CancellationState {
  if (reservation.status !== 'CONFIRMED') {
    return { allowed: false, windowClosed: false };
  }

  const screeningStart = getScreeningDateTime(reservation, timezone);
  if (!screeningStart) return { allowed: false, windowClosed: false };

  const remainingMs = screeningStart.getTime() - nowMs;
  return {
    allowed: remainingMs > TWO_HOURS_MS,
    windowClosed: remainingMs > 0 && remainingMs <= TWO_HOURS_MS,
  };
}

function getPendingReservation(reservations: Reservation[]): Reservation | null {
  const now = Date.now();
  for (const r of reservations) {
    if (r.status !== 'EN_ATTENTE' || !r.reservationSeats?.length) continue;
    const lockedUntils = r.reservationSeats
      .map((rs) => (rs.lockedUntil ? new Date(rs.lockedUntil).getTime() : 0))
      .filter((t) => t > 0);
    if (lockedUntils.length > 0 && Math.max(...lockedUntils) > now) {
      return r;
    }
  }
  return null;
}

function getRemainingSeconds(reservation: Reservation | null | undefined): number {
  if (!reservation?.reservationSeats?.length) return 0;
  const now = Date.now();
  const lockedUntils = reservation.reservationSeats
    .map((rs) => (rs.lockedUntil ? new Date(rs.lockedUntil).getTime() : 0))
    .filter((t) => t > 0);
  if (lockedUntils.length === 0) return 0;
  return Math.max(0, Math.floor((Math.max(...lockedUntils) - now) / 1000));
}

function formatCountdown(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function formatSeatsLabel(seats: Seat[]): string {
  if (seats.length === 0) return '-';
  const sorted = [...seats].sort((a, b) => {
    if (a.row !== b.row) return a.row.localeCompare(b.row);
    return a.number - b.number;
  });
  const rows = Array.from(new Set(sorted.map((s) => s.row)));
  if (rows.length === 1) {
    const numbers = sorted.map((s) => s.number).join(', ');
    return `Rangée ${rows[0]}, ${numbers}`;
  }
  return sorted.map((s) => `${s.row}${s.number}`).join(', ');
}

function getStatusLabel(reservation: Reservation, isHistory: boolean): string {
  if (reservation.status === 'CANCELLED') return 'ANNULÉE';
  if (reservation.status === 'EN_ATTENTE') return 'EN ATTENTE';
  return isHistory ? 'TERMINÉE' : 'CONFIRMÉE';
}

export default function MyBookingsScreen() {
  const navigation = useNavigation<BookingsNavigationProp>();
  const insets = useSafeAreaInsets();
  const userId = useAuthStore((state) => state.user?.id ?? null);
  const cinemaTimezone = useCinemaConfigStore((state) => state.config?.timezone);
  const reservations = useBookingsStore((state) => state.reservations);
  const loading = useBookingsStore((state) => state.isLoadingReservations);
  const refreshing = useBookingsStore((state) => state.isRefreshingReservations);
  const error = useBookingsStore((state) => state.reservationsError);
  const cancellingReservationId = useBookingsStore((state) => state.cancellingReservationId);
  const fetchMyReservations = useBookingsStore((state) => state.fetchMyReservations);
  const refreshMyReservations = useBookingsStore((state) => state.refreshMyReservations);
  const cancelReservation = useBookingsStore((state) => state.cancelReservation);
  const selectBooking = useBookingsStore((state) => state.selectBooking);
  const [activeTab, setActiveTab] = useState<TabType>('upcoming');
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [currentTimeMs, setCurrentTimeMs] = useState(() => Date.now());

  useEffect(() => {
    const interval = setInterval(() => setCurrentTimeMs(Date.now()), 30_000);
    return () => clearInterval(interval);
  }, []);

  const pendingReservation = useMemo(() => getPendingReservation(reservations), [reservations]);

  useEffect(() => {
    setRemainingSeconds(getRemainingSeconds(pendingReservation));
  }, [pendingReservation]);

  useEffect(() => {
    if (!pendingReservation || remainingSeconds <= 0) return;
    const interval = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          void refreshMyReservations();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [pendingReservation, remainingSeconds, refreshMyReservations]);

  useFocusEffect(
    useCallback(() => {
      void fetchMyReservations();
    }, [fetchMyReservations, userId])
  );

  const onRefresh = useCallback(async () => {
    await refreshMyReservations();
  }, [refreshMyReservations]);

  const upcoming = useMemo(
    () => reservations
      .filter((reservation) => isUpcoming(reservation, cinemaTimezone, currentTimeMs))
      .sort((a, b) => {
        const dateA = getScreeningDateTime(a, cinemaTimezone)?.getTime() ?? Number.MAX_SAFE_INTEGER;
        const dateB = getScreeningDateTime(b, cinemaTimezone)?.getTime() ?? Number.MAX_SAFE_INTEGER;
        return dateA - dateB;
      }),
    [cinemaTimezone, currentTimeMs, reservations]
  );
  const history = useMemo(
    () => reservations
      .filter(
        (reservation) =>
          reservation.status !== 'EN_ATTENTE' &&
          !isUpcoming(reservation, cinemaTimezone, currentTimeMs)
      )
      .sort((a, b) => {
        const dateA = getScreeningDateTime(a, cinemaTimezone)?.getTime() ?? 0;
        const dateB = getScreeningDateTime(b, cinemaTimezone)?.getTime() ?? 0;
        return dateB - dateA;
      }),
    [cinemaTimezone, currentTimeMs, pendingReservation?.id, reservations]
  );

  const handleCancel = (reservation: Reservation) => {
    const cancellation = getCancellationState(reservation, cinemaTimezone, Date.now());
    if (!cancellation.allowed) {
      if (cancellation.windowClosed) {
        Alert.alert('Annulation impossible', CANCELLATION_WINDOW_MESSAGE);
      }
      return;
    }

    Alert.alert(
      'Annuler cette réservation ?',
      'Cette action est définitive.',
      [
        { text: 'Retour', style: 'cancel' },
        {
          text: 'Annuler',
          style: 'destructive',
          onPress: async () => {
            try {
              await cancelReservation(reservation.id);
              Alert.alert('Annulée', 'Votre réservation a été annulée.');
            } catch (error: unknown) {
              const details = getApiErrorDetails(error);
              const message = details.code === 'CANCELLATION_WINDOW_CLOSED'
                ? CANCELLATION_WINDOW_MESSAGE
                : getApiErrorMessage(error, 'Impossible d\'annuler.');
              Alert.alert('Erreur', message);
            }
          },
        },
      ]
    );
  };

  const handleViewTicket = (reservation: Reservation) => {
    const screening = reservation.screening;
    const ticket = reservation.ticket;
    const seats = reservation.reservationSeats?.map((rs) => rs.seat) ?? [];
    if (!screening?.movie || !ticket || seats.length === 0) return;

    selectBooking({
      userId,
      reservation,
      ticket,
      movie: screening.movie,
      screening,
      seats,
    });

    navigation.navigate('Ticket', {
      movie: screening.movie,
      screening,
      reservation,
      ticket,
      seats,
    });
  };

  const handleContinuePayment = (reservation: Reservation) => {
    const screening = reservation.screening;
    const seats = reservation.reservationSeats?.map((rs) => rs.seat) ?? [];
    if (!screening?.movie || seats.length === 0) return;

    navigation.navigate('Payment', {
      movie: screening.movie,
      screening,
      reservation,
      seats,
    });
  };

  const renderCard = (reservation: Reservation, dimmed: boolean) => {
    const screening = reservation.screening;
    const movie = screening?.movie;
    const seats = reservation.reservationSeats?.map((rs) => rs.seat) ?? [];
    const dateLabel = screening ? formatScreeningDate(screening.date) : '-';
    const isCancelled = reservation.status === 'CANCELLED';
    const isHistory = dimmed || isCancelled;
    const cancellation = getCancellationState(reservation, cinemaTimezone, currentTimeMs);
    const canViewTicket = Boolean(
      !isCancelled && movie && screening && reservation.ticket && seats.length > 0
    );
    const isCancelling = cancellingReservationId === reservation.id;
    const cancellationInProgress = cancellingReservationId !== null;

    return (
      <View key={reservation.id} style={[styles.card, isHistory && styles.cardDimmed]}>
        <PosterImage
          uri={null}
          title={movie?.title}
          style={styles.poster}
          borderRadius={12}
        />

        <View style={styles.cardBody}>
          <View style={styles.cardTopRow}>
            <View style={[styles.statusBadge, isHistory && styles.statusBadgeMuted, isCancelled && styles.statusBadgeCancelled]}>
              <View style={[styles.statusDot, isHistory && styles.statusDotMuted, isCancelled && styles.statusDotCancelled]} />
              <Text style={[styles.statusText, isHistory && styles.statusTextMuted, isCancelled && styles.statusTextCancelled]}>
                {getStatusLabel(reservation, isHistory)}
              </Text>
            </View>
            <Text style={styles.reference}>#{reservation.id}</Text>
          </View>

          <Text style={[styles.cardTitle, isHistory && styles.cardTitleMuted]} numberOfLines={2}>
            {movie?.title ?? 'Film'}
          </Text>

          <View style={styles.scheduleRow}>
            <View style={styles.dateBlock}>
              <Text style={[styles.dateText, isHistory && styles.infoTextMuted]} numberOfLines={1}>
                {dateLabel}
              </Text>
              <Text style={styles.roomText}>Salle 1</Text>
            </View>
            <View style={[styles.timeChip, isHistory && styles.timeChipMuted]}>
              <Text style={[styles.timeText, isHistory && styles.timeTextMuted]}>
                {screening?.showTime ?? '-'}
              </Text>
            </View>
          </View>

          <View style={styles.seatRow}>
            <MaterialIcons name="event-seat" size={16} color={isHistory ? '#777' : '#e2beba'} />
            <Text style={[styles.seatText, isHistory && styles.infoTextMuted]} numberOfLines={1}>
              {formatSeatsLabel(seats)}
            </Text>
            <Text style={[styles.amountText, isHistory && styles.infoTextMuted]}>
              {reservation.totalAmount} DH
            </Text>
          </View>

          <View style={styles.cardActions}>
            {canViewTicket && (
              <TouchableOpacity
                style={[styles.viewTicketButton, isHistory && styles.viewTicketButtonDimmed]}
                onPress={() => handleViewTicket(reservation)}
                activeOpacity={0.9}
                accessibilityRole="button"
                accessibilityLabel={`Voir le billet pour ${movie?.title ?? 'ce film'}`}
              >
                <MaterialIcons name="confirmation-number" size={17} color="#fff" />
                <Text style={styles.viewTicketButtonText}>Voir le billet</Text>
              </TouchableOpacity>
            )}
            {cancellation.windowClosed && !isHistory ? (
              <Text style={styles.cancellationUnavailableText}>
                {CANCELLATION_WINDOW_MESSAGE}
              </Text>
            ) : cancellation.allowed && !isHistory ? (
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => handleCancel(reservation)}
                activeOpacity={0.8}
                disabled={cancellationInProgress}
                accessibilityRole="button"
                accessibilityLabel={`Annuler la réservation pour ${movie?.title ?? 'ce film'}`}
              >
                {isCancelling ? (
                  <ActivityIndicator size="small" color="#ffb4ac" />
                ) : (
                  <Text style={styles.cancelButtonText}>Annuler</Text>
                )}
              </TouchableOpacity>
            ) : null}
          </View>
        </View>
      </View>
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyState}>
      <View style={styles.emptyIcon}>
        <MaterialIcons
          name={activeTab === 'upcoming' ? 'confirmation-number' : 'history'}
          size={30}
          color="#ffb4ac"
        />
      </View>
      <Text style={styles.emptyTitle}>
        {activeTab === 'upcoming' ? 'Aucun billet à venir' : 'Historique vide'}
      </Text>
      <Text style={styles.emptySubtitle}>
        {activeTab === 'upcoming'
          ? 'Découvrez les films à l’affiche et choisissez votre prochaine séance.'
          : 'Vos anciennes réservations apparaîtront ici.'}
      </Text>
      {activeTab === 'upcoming' ? (
        <TouchableOpacity
          style={styles.emptyButton}
          onPress={() => navigation.navigate('Main', { screen: 'Accueil' })}
          activeOpacity={0.9}
          accessibilityRole="button"
        >
          <Text style={styles.emptyButtonText}>Explorer les films</Text>
          <MaterialIcons name="arrow-forward" size={18} color="#fff" />
        </TouchableOpacity>
      ) : null}
    </View>
  );

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
        <ErrorState message={error} onRetry={() => void fetchMyReservations()} />
      </SafeAreaView>
    );
  }

  const list = activeTab === 'upcoming' ? upcoming : history;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.eyebrow}>CINÉMA AVENIDA</Text>
        <View style={styles.headerTitleRow}>
          <Text style={styles.headerTitle}>Mes billets</Text>
          {upcoming.length > 0 ? (
            <View style={styles.upcomingCount}>
              <Text style={styles.upcomingCountText}>{upcoming.length}</Text>
            </View>
          ) : null}
        </View>
        <Text style={styles.headerSubtitle}>Vos réservations et prochaines séances</Text>
      </View>

      {/* Pending reservation card */}
      {pendingReservation && remainingSeconds > 0 && (
        <LinearGradient
          colors={['#371818', '#211a1a']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.pendingCard}
        >
          <PosterImage
            uri={null}
            title={pendingReservation.screening?.movie?.title}
            style={styles.pendingPoster}
            borderRadius={10}
          />
          <View style={styles.pendingContent}>
            <View style={styles.pendingHeader}>
              <View style={styles.pendingLabel}>
                <MaterialIcons name="timer" size={14} color="#ffb4ac" />
                <Text style={styles.pendingTitle}>PAIEMENT EN COURS</Text>
              </View>
              <Text style={styles.pendingCountdown}>{formatCountdown(remainingSeconds)}</Text>
            </View>
            <Text style={styles.pendingMovie} numberOfLines={1}>
              {pendingReservation.screening?.movie?.title}
            </Text>
            <Text style={styles.pendingDetails} numberOfLines={1}>
              {formatSeatsLabel(pendingReservation.reservationSeats?.map((rs) => rs.seat) ?? [])}
              {' · '}{pendingReservation.totalAmount} DH
            </Text>
            <TouchableOpacity
              style={styles.pendingButton}
              onPress={() => handleContinuePayment(pendingReservation)}
              activeOpacity={0.9}
              accessibilityRole="button"
              accessibilityLabel="Continuer le paiement de la réservation en cours"
            >
              <Text style={styles.pendingButtonText}>Continuer le paiement</Text>
              <MaterialIcons name="arrow-forward" size={17} color="#fff" />
            </TouchableOpacity>
          </View>
        </LinearGradient>
      )}

      {/* Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'upcoming' && styles.tabActive]}
          onPress={() => setActiveTab('upcoming')}
          activeOpacity={0.8}
          accessibilityRole="tab"
          accessibilityState={{ selected: activeTab === 'upcoming' }}
        >
          <Text style={[styles.tabText, activeTab === 'upcoming' && styles.tabTextActive]}>
            À venir
          </Text>
          <View style={[styles.tabCount, activeTab === 'upcoming' && styles.tabCountActive]}>
            <Text style={[styles.tabCountText, activeTab === 'upcoming' && styles.tabCountTextActive]}>
              {upcoming.length}
            </Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'history' && styles.tabActive]}
          onPress={() => setActiveTab('history')}
          activeOpacity={0.8}
          accessibilityRole="tab"
          accessibilityState={{ selected: activeTab === 'history' }}
        >
          <Text style={[styles.tabText, activeTab === 'history' && styles.tabTextActive]}>
            Historique
          </Text>
          <View style={[styles.tabCount, activeTab === 'history' && styles.tabCountActive]}>
            <Text style={[styles.tabCountText, activeTab === 'history' && styles.tabCountTextActive]}>
              {history.length}
            </Text>
          </View>
        </TouchableOpacity>
      </View>

      {list.length === 0 ? (
        <ScrollView
          contentContainerStyle={[
            styles.emptyScroll,
            { paddingBottom: Math.max(insets.bottom, 16) + 92 },
          ]}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#b22222" />}
        >
          {renderEmpty()}
        </ScrollView>
      ) : (
        <FlatList
          data={list}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => renderCard(item, activeTab === 'history')}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: Math.max(insets.bottom, 16) + 92 },
          ]}
          ItemSeparatorComponent={() => <View style={styles.cardSeparator} />}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#b22222" />}
          showsVerticalScrollIndicator={false}
        />
      )}
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
  header: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 18,
  },
  eyebrow: {
    fontFamily: 'Inter-Bold',
    fontSize: 10,
    letterSpacing: 1.8,
    color: '#b22222',
    marginBottom: 5,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerTitle: {
    fontFamily: 'EBGaramond-SemiBold',
    fontSize: 30,
    lineHeight: 34,
    color: '#e5e2e1',
  },
  upcomingCount: {
    minWidth: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 7,
    borderRadius: 12,
    backgroundColor: '#b22222',
  },
  upcomingCountText: {
    fontFamily: 'Inter-Bold',
    fontSize: 11,
    color: '#fff',
  },
  headerSubtitle: {
    fontFamily: 'Inter-Regular',
    fontSize: 13,
    color: '#aa8986',
    marginTop: 2,
  },
  tabs: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginBottom: 16,
    padding: 4,
    gap: 4,
    borderRadius: 14,
    backgroundColor: '#1b1a1a',
    borderWidth: 1,
    borderColor: 'rgba(229,226,225,0.06)',
  },
  tab: {
    flex: 1,
    height: 42,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 10,
  },
  tabActive: {
    backgroundColor: '#2a2424',
  },
  tabText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 13,
    color: '#777',
  },
  tabTextActive: {
    color: '#e5e2e1',
  },
  tabCount: {
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
    borderRadius: 10,
    backgroundColor: '#292828',
  },
  tabCountActive: {
    backgroundColor: '#b22222',
  },
  tabCountText: {
    fontFamily: 'Inter-Bold',
    fontSize: 10,
    color: '#888',
  },
  tabCountTextActive: {
    color: '#fff',
  },
  pendingCard: {
    flexDirection: 'row',
    gap: 12,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,180,172,0.28)',
    marginHorizontal: 20,
    marginBottom: 16,
    padding: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.24,
    shadowRadius: 12,
    elevation: 5,
  },
  pendingPoster: {
    width: 66,
    height: 100,
    flexShrink: 0,
  },
  pendingContent: {
    flex: 1,
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  pendingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
  },
  pendingLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    flexShrink: 1,
  },
  pendingTitle: {
    fontFamily: 'Inter-Bold',
    fontSize: 9,
    color: '#ffb4ac',
    letterSpacing: 0.8,
  },
  pendingCountdown: {
    fontFamily: 'Inter-Bold',
    fontSize: 15,
    color: '#fff',
  },
  pendingMovie: {
    fontFamily: 'EBGaramond-SemiBold',
    fontSize: 18,
    color: '#e5e2e1',
  },
  pendingDetails: {
    fontFamily: 'Inter-Regular',
    fontSize: 11,
    color: '#aa8986',
  },
  pendingButton: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: '#b22222',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 11,
  },
  pendingButtonText: {
    fontFamily: 'Inter-Bold',
    fontSize: 11,
    color: '#fff',
  },
  listContent: {
    paddingHorizontal: 20,
    paddingTop: 2,
  },
  cardSeparator: {
    height: 12,
  },
  emptyScroll: {
    flexGrow: 1,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 36,
    paddingBottom: 30,
  },
  emptyIcon: {
    width: 58,
    height: 58,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 29,
    backgroundColor: 'rgba(178,34,34,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(255,180,172,0.16)',
  },
  emptyTitle: {
    fontFamily: 'EBGaramond-SemiBold',
    fontSize: 24,
    color: '#e5e2e1',
    marginTop: 16,
    marginBottom: 6,
  },
  emptySubtitle: {
    fontFamily: 'Inter-Regular',
    fontSize: 13,
    lineHeight: 20,
    color: '#aa8986',
    textAlign: 'center',
    marginBottom: 20,
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#b22222',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 18,
  },
  emptyButtonText: {
    fontFamily: 'Inter-Bold',
    fontSize: 14,
    color: '#fff',
  },
  card: {
    flexDirection: 'row',
    gap: 13,
    backgroundColor: '#201f1f',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(229,226,225,0.08)',
    padding: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.16,
    shadowRadius: 10,
    elevation: 3,
  },
  cardDimmed: {
    backgroundColor: '#191919',
    borderColor: 'rgba(229,226,225,0.04)',
  },
  poster: {
    width: 92,
    minHeight: 176,
    flexShrink: 0,
  },
  cardBody: {
    flex: 1,
    paddingVertical: 2,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
    marginBottom: 7,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(178,34,34,0.14)',
  },
  statusBadgeMuted: {
    backgroundColor: '#292929',
  },
  statusBadgeCancelled: {
    backgroundColor: 'rgba(178,34,34,0.14)',
  },
  statusDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#ffb4ac',
  },
  statusDotMuted: {
    backgroundColor: '#777',
  },
  statusDotCancelled: {
    backgroundColor: '#b22222',
  },
  statusText: {
    fontFamily: 'Inter-Bold',
    fontSize: 8,
    letterSpacing: 0.55,
    color: '#ffb4ac',
  },
  statusTextMuted: {
    color: '#888',
  },
  statusTextCancelled: {
    color: '#d88680',
  },
  reference: {
    fontFamily: 'Inter-Medium',
    fontSize: 10,
    color: '#666',
  },
  cardTitle: {
    fontFamily: 'EBGaramond-SemiBold',
    fontSize: 20,
    lineHeight: 21,
    color: '#e5e2e1',
    marginBottom: 9,
  },
  cardTitleMuted: {
    color: '#aaa4a2',
  },
  scheduleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 9,
  },
  dateBlock: {
    flex: 1,
  },
  dateText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 12,
    color: '#e2beba',
  },
  roomText: {
    fontFamily: 'Inter-Regular',
    fontSize: 10,
    color: '#777',
    marginTop: 2,
  },
  timeChip: {
    minWidth: 57,
    alignItems: 'center',
    paddingHorizontal: 9,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: '#b22222',
  },
  timeChipMuted: {
    backgroundColor: '#292929',
  },
  timeText: {
    fontFamily: 'Inter-Bold',
    fontSize: 13,
    color: '#fff',
  },
  timeTextMuted: {
    color: '#888',
  },
  seatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 11,
  },
  seatText: {
    flex: 1,
    fontFamily: 'Inter-Regular',
    fontSize: 11,
    color: '#e2beba',
  },
  amountText: {
    fontFamily: 'Inter-Bold',
    fontSize: 11,
    color: '#e5e2e1',
  },
  infoTextMuted: {
    color: '#777',
  },
  cardActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 'auto',
  },
  viewTicketButton: {
    flex: 1,
    flexDirection: 'row',
    gap: 6,
    backgroundColor: '#b22222',
    borderRadius: 8,
    paddingVertical: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewTicketButtonDimmed: {
    backgroundColor: '#383030',
  },
  viewTicketButtonText: {
    fontFamily: 'Inter-Bold',
    fontSize: 11,
    color: '#fff',
  },
  cancelButton: {
    backgroundColor: 'transparent',
    borderRadius: 8,
    paddingVertical: 9,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(229,226,225,0.12)',
  },
  cancelButtonText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 11,
    color: '#c7c0be',
  },
  cancellationUnavailableText: {
    flex: 1,
    fontFamily: 'Inter-Regular',
    fontSize: 10,
    color: '#777',
    textAlign: 'right',
  },
});
