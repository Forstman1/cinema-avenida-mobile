import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  ImageBackground,
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

import { cancelReservation, getMyReservations } from '../api/reservations';
import ErrorState from '../components/ErrorState';
import { formatScreeningDate } from '../utils/date';
import type { Reservation, Seat } from '../types';
import type { MainTabParamList, RootStackParamList } from '../types/navigation';

type BookingsNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Main'>;

type TabType = 'upcoming' | 'history';

function isUpcoming(reservation: Reservation): boolean {
  if (reservation.status === 'CANCELLED') return false;
  const screeningDate = new Date(reservation.screening?.date ?? 0);
  return screeningDate.getTime() > Date.now();
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

export default function MyBookingsScreen() {
  const navigation = useNavigation<BookingsNavigationProp>();
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<TabType>('upcoming');
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState(0);

  const pendingReservation = useMemo(() => getPendingReservation(reservations), [reservations]);

  const fetchReservations = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);
    setError(null);
    try {
      const data = await getMyReservations();
      setReservations(data);
    } catch (err: any) {
      setError(err?.message ?? 'Impossible de charger vos réservations.');
    } finally {
      if (showLoading) setLoading(false);
    }
  }, []);

  useEffect(() => {
    setRemainingSeconds(getRemainingSeconds(pendingReservation));
  }, [pendingReservation]);

  useEffect(() => {
    if (!pendingReservation || remainingSeconds <= 0) return;
    const interval = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          fetchReservations(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [pendingReservation, remainingSeconds, fetchReservations]);

  useFocusEffect(
    useCallback(() => {
      fetchReservations();
    }, [fetchReservations])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchReservations(false);
    setRefreshing(false);
  }, [fetchReservations]);

  const upcoming = useMemo(() => reservations.filter(isUpcoming), [reservations]);
  const history = useMemo(
    () => reservations.filter((r) => !isUpcoming(r)),
    [reservations]
  );

  const handleCancel = (reservation: Reservation) => {
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
              fetchReservations(false);
            } catch (err: any) {
              Alert.alert('Erreur', err?.response?.data?.message ?? 'Impossible d\'annuler.');
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
    } as never);
  };

  const renderCard = (reservation: Reservation, dimmed: boolean) => {
    const screening = reservation.screening;
    const movie = screening?.movie;
    const seats = reservation.reservationSeats?.map((rs) => rs.seat) ?? [];
    const dateLabel = screening ? formatScreeningDate(screening.date) : '-';
    const isHistory = dimmed || reservation.status === 'CANCELLED';

    return (
      <View key={reservation.id} style={[styles.card, isHistory && styles.cardDimmed]}>
        {movie?.poster ? (
          <ImageBackground
            source={{ uri: movie.poster }}
            style={styles.cardBanner}
            imageStyle={styles.cardBannerImage}
            resizeMode="cover"
          >
            <View style={styles.cardBannerOverlay} />
          </ImageBackground>
        ) : (
          <View style={styles.cardBannerPlaceholder}>
            <Text style={styles.cardBannerPlaceholderText}>Cinéma Avenida</Text>
          </View>
        )}

        <View style={styles.cardContent}>
          <View style={styles.cardHeader}>
            <Text style={[styles.cardTitle, isHistory && styles.cardTextDimmed]} numberOfLines={2}>
              {movie?.title ?? 'Film'}
            </Text>
            <Text style={styles.cardRoom}>Salle 1</Text>
          </View>

          <View style={styles.cardMeta}>
            <View style={styles.metaItem}>
              <MaterialIcons name="calendar-today" size={16} color={isHistory ? '#666' : '#e2beba'} />
              <Text style={[styles.metaText, isHistory && styles.cardTextDimmed]}>{dateLabel}</Text>
            </View>
            <View style={styles.metaItem}>
              <MaterialIcons name="schedule" size={16} color={isHistory ? '#666' : '#e2beba'} />
              <Text style={[styles.metaText, isHistory && styles.cardTextDimmed]}>{screening?.showTime ?? '-'}</Text>
            </View>
            <View style={[styles.metaItem, styles.metaItemWide]}>
              <MaterialIcons name="event-seat" size={16} color={isHistory ? '#666' : '#e2beba'} />
              <Text style={[styles.metaText, isHistory && styles.cardTextDimmed]} numberOfLines={1}>
                {formatSeatsLabel(seats)}
              </Text>
            </View>
          </View>

          <View style={styles.cardActions}>
            <TouchableOpacity
              style={[styles.viewTicketButton, isHistory && styles.viewTicketButtonDimmed]}
              onPress={() => handleViewTicket(reservation)}
              activeOpacity={0.9}
            >
              <Text style={styles.viewTicketButtonText}>Voir le billet</Text>
            </TouchableOpacity>
            {!isHistory && (
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => handleCancel(reservation)}
                activeOpacity={0.8}
              >
                <Text style={styles.cancelButtonText}>Annuler</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyState}>
      <MaterialIcons name="confirmation-number" size={64} color="#555" />
      <Text style={styles.emptyTitle}>Aucune réservation</Text>
      <Text style={styles.emptySubtitle}>
        Découvrez nos films à l'affiche et réservez vos places.
      </Text>
      <TouchableOpacity
        style={styles.emptyButton}
        onPress={() => navigation.navigate('Main', { screen: 'Accueil' } as never)}
        activeOpacity={0.9}
      >
        <Text style={styles.emptyButtonText}>Explorer les films</Text>
      </TouchableOpacity>
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
        <ErrorState message={error} onRetry={() => fetchReservations(false)} />
      </SafeAreaView>
    );
  }

  const list = activeTab === 'upcoming' ? upcoming : history;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Text style={styles.headerTitle}>Cinéma Avenida</Text>
      </View>

      {/* Pending reservation card */}
      {pendingReservation && (
        <View style={styles.pendingCard}>
          <View style={styles.pendingHeader}>
            <MaterialIcons name="timer" size={18} color="#ffb4ac" />
            <Text style={styles.pendingTitle}>Réservation en cours</Text>
            <Text style={styles.pendingCountdown}>{formatCountdown(remainingSeconds)}</Text>
          </View>
          <Text style={styles.pendingMovie} numberOfLines={1}>
            {pendingReservation.screening?.movie?.title}
          </Text>
          <Text style={styles.pendingDetails}>
            {formatSeatsLabel(pendingReservation.reservationSeats?.map((rs) => rs.seat) ?? [])} · {pendingReservation.totalAmount} DH
          </Text>
          <TouchableOpacity
            style={styles.pendingButton}
            onPress={() => handleContinuePayment(pendingReservation)}
            activeOpacity={0.9}
          >
            <Text style={styles.pendingButtonText}>Continuer le paiement</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'upcoming' && styles.tabActive]}
          onPress={() => setActiveTab('upcoming')}
          activeOpacity={0.8}
        >
          <Text style={[styles.tabText, activeTab === 'upcoming' && styles.tabTextActive]}>
            À VENIR
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'history' && styles.tabActive]}
          onPress={() => setActiveTab('history')}
          activeOpacity={0.8}
        >
          <Text style={[styles.tabText, activeTab === 'history' && styles.tabTextActive]}>
            HISTORIQUE
          </Text>
        </TouchableOpacity>
      </View>

      {list.length === 0 ? (
        <ScrollView
          contentContainerStyle={styles.emptyScroll}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#b22222" />}
        >
          {renderEmpty()}
        </ScrollView>
      ) : (
        <FlatList
          data={list}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => renderCard(item, activeTab === 'history')}
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={() => <View style={{ height: 20 }} />}
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
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingBottom: 16,
  },
  headerTitle: {
    fontFamily: 'EBGaramond-SemiBold',
    fontSize: 24,
    color: '#e5e2e1',
  },
  tabs: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    marginBottom: 20,
    gap: 24,
  },
  tab: {
    paddingBottom: 8,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: '#b22222',
  },
  tabText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 13,
    color: '#888',
    letterSpacing: 0.8,
  },
  tabTextActive: {
    color: '#e5e2e1',
  },
  pendingCard: {
    backgroundColor: '#201f1f',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#b22222',
    marginHorizontal: 24,
    marginBottom: 20,
    padding: 18,
  },
  pendingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  pendingTitle: {
    flex: 1,
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
    color: '#ffb4ac',
    letterSpacing: 0.4,
  },
  pendingCountdown: {
    fontFamily: 'Inter-Bold',
    fontSize: 16,
    color: '#ffb4ac',
  },
  pendingMovie: {
    fontFamily: 'EBGaramond-SemiBold',
    fontSize: 20,
    color: '#e5e2e1',
    marginBottom: 4,
  },
  pendingDetails: {
    fontFamily: 'Inter-Regular',
    fontSize: 13,
    color: '#aa8986',
    marginBottom: 14,
  },
  pendingButton: {
    backgroundColor: '#b22222',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  pendingButtonText: {
    fontFamily: 'Inter-Bold',
    fontSize: 14,
    color: '#fff',
  },
  listContent: {
    paddingHorizontal: 24,
    paddingBottom: 120,
  },
  emptyScroll: {
    flexGrow: 1,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontFamily: 'EBGaramond-SemiBold',
    fontSize: 22,
    color: '#e5e2e1',
    marginTop: 20,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: '#aa8986',
    textAlign: 'center',
    marginBottom: 24,
  },
  emptyButton: {
    backgroundColor: '#b22222',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 28,
  },
  emptyButtonText: {
    fontFamily: 'Inter-Bold',
    fontSize: 15,
    color: '#fff',
  },
  card: {
    backgroundColor: '#201f1f',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  cardDimmed: {
    opacity: 0.65,
  },
  cardBanner: {
    height: 160,
    width: '100%',
  },
  cardBannerImage: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  cardBannerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  cardBannerPlaceholder: {
    height: 160,
    backgroundColor: '#1a1a1a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBannerPlaceholderText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 12,
    color: '#555',
  },
  cardContent: {
    padding: 18,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  cardTitle: {
    fontFamily: 'EBGaramond-SemiBold',
    fontSize: 22,
    color: '#e5e2e1',
    flex: 1,
    marginRight: 12,
  },
  cardTextDimmed: {
    color: '#999',
  },
  cardRoom: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 13,
    color: '#e2beba',
  },
  cardMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 18,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  metaItemWide: {
    flexBasis: '100%',
  },
  metaText: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: '#e2beba',
  },
  cardActions: {
    flexDirection: 'row',
    gap: 12,
  },
  viewTicketButton: {
    flex: 1,
    backgroundColor: '#b22222',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewTicketButtonDimmed: {
    backgroundColor: 'rgba(178,34,34,0.25)',
  },
  viewTicketButtonText: {
    fontFamily: 'Inter-Bold',
    fontSize: 14,
    color: '#fff',
  },
  cancelButton: {
    flex: 1,
    backgroundColor: 'transparent',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  cancelButtonText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
    color: '#e5e2e1',
  },
});
