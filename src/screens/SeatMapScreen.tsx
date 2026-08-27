import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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

import { getApiErrorDetails, getApiErrorMessage } from '../api/errors';
import ErrorState from '../components/ErrorState';
import { useReservationStore } from '../store/reservationStore';
import type { Seat, SeatCategory, SeatStatus } from '../types';
import type { RootStackParamList } from '../types/navigation';
import type { SeatMapScreenProps } from '../types/navigation';

type SeatMapNavigationProp = NativeStackNavigationProp<RootStackParamList, 'SeatMap'>;

const ROWS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];
const SEATS_PER_ROW = 12;

const CATEGORY_CONFIG: Record<
  SeatCategory,
  { color: string; borderColor: string; price: number; label: string }
> = {
  CLUB: { color: '#c9a227', borderColor: 'rgba(201,162,39,0.6)', price: 45, label: 'Club' },
  NORMAL: { color: '#5a8bbf', borderColor: 'rgba(90,139,191,0.6)', price: 60, label: 'Normal' },
  VIP: { color: '#8b5cf6', borderColor: 'rgba(139,92,246,0.6)', price: 90, label: 'VIP' },
};

function getCategoryByRow(row: string): SeatCategory {
  if (['A', 'B', 'C'].includes(row)) return 'CLUB';
  if (['D', 'E', 'F', 'G'].includes(row)) return 'NORMAL';
  return 'VIP';
}

function isSeatTappable(status: SeatStatus): boolean {
  return status === 'LIBRE';
}

function getRemainingSeconds(lockedUntil: string | null): number {
  if (!lockedUntil) return 0;
  const now = Date.now();
  const expiresAt = new Date(lockedUntil).getTime();
  if (!Number.isFinite(expiresAt)) return 0;
  return Math.max(0, Math.floor((expiresAt - now) / 1000));
}

function formatCountdown(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export default function SeatMapScreen({ route }: SeatMapScreenProps) {
  const navigation = useNavigation<SeatMapNavigationProp>();
  const insets = useSafeAreaInsets();
  const { movie, screening } = route.params ?? {};

  const [refreshing, setRefreshing] = useState(false);
  const [pendingRemaining, setPendingRemaining] = useState(0);

  const seats = useReservationStore((state) => state.seats);
  const selectedSeatIds = useReservationStore((state) => state.selectedSeatIds);
  const isLoadingSeats = useReservationStore((state) => state.isLoadingSeats);
  const seatError = useReservationStore((state) => state.seatError);
  const reservationError = useReservationStore((state) => state.reservationError);
  const pendingReservation = useReservationStore((state) => state.pendingReservation);
  const lockedUntil = useReservationStore((state) => state.lockedUntil);
  const isLocking = useReservationStore((state) => state.isLocking);
  const loadSeats = useReservationStore((state) => state.loadSeats);
  const loadPendingReservation = useReservationStore((state) => state.loadPendingReservation);
  const toggleSeatInStore = useReservationStore((state) => state.toggleSeat);
  const deselectSeats = useReservationStore((state) => state.deselectSeats);
  const lockSelectedSeats = useReservationStore((state) => state.lockSelectedSeats);
  const clearReservationDraft = useReservationStore((state) => state.clearReservationDraft);

  const selectedIds = useMemo(() => new Set(selectedSeatIds), [selectedSeatIds]);

  useFocusEffect(
    useCallback(() => {
      if (screening?.id) {
        void loadPendingReservation(screening.id);
      }
    }, [loadPendingReservation, screening?.id])
  );

  useEffect(() => {
    if (!lockedUntil) {
      setPendingRemaining(0);
      return;
    }

    const updateRemaining = () => {
      const remaining = getRemainingSeconds(lockedUntil);
      setPendingRemaining(remaining);
      if (remaining <= 0) {
        clearReservationDraft();
        if (screening?.id) {
          void loadSeats(screening.id, { showLoading: false });
        }
      }
    };

    updateRemaining();
    const interval = setInterval(updateRemaining, 1000);
    return () => clearInterval(interval);
  }, [clearReservationDraft, loadSeats, lockedUntil, screening?.id]);

  const handleContinuePayment = () => {
    if (!pendingReservation || !movie || !screening) return;
    const seatsForPayment = pendingReservation.reservationSeats?.map((rs) => rs.seat) ?? [];
    navigation.navigate('Payment', {
      movie,
      screening,
      reservation: pendingReservation,
      seats: seatsForPayment,
    });
  };

  const fetchSeats = useCallback(async (showLoading = true) => {
    if (!screening?.id) return;
    await loadSeats(screening.id, { showLoading });
    await loadPendingReservation(screening.id);
  }, [loadPendingReservation, loadSeats, screening?.id]);

  useEffect(() => {
    fetchSeats();
  }, [fetchSeats]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await fetchSeats(false);
    } finally {
      setRefreshing(false);
    }
  }, [fetchSeats]);

  const hasPendingReservation = Boolean(pendingReservation && pendingRemaining > 0);

  const toggleSeat = (seat: Seat) => {
    if (hasPendingReservation) return;
    if (!isSeatTappable(seat.status)) return;

    toggleSeatInStore(seat.id);
  };

  const selectedSeats = useMemo(
    () => seats.filter((seat) => selectedIds.has(seat.id)),
    [seats, selectedIds]
  );

  const totalPrice = useMemo(() => {
    return selectedSeats.reduce((sum, seat) => sum + CATEGORY_CONFIG[seat.category].price, 0);
  }, [selectedSeats]);

  const selectedLabel = useMemo(() => {
    if (selectedSeats.length === 0) return '';
    const labels = selectedSeats.map((s) => `${s.row}${s.number}`).join(', ');
    const category = selectedSeats[0].category;
    return `${labels} (${CATEGORY_CONFIG[category].label})`;
  }, [selectedSeats]);

  const handleConfirm = async () => {
    if (!screening?.id || selectedSeatIds.length === 0 || hasPendingReservation) return;
    try {
      const reservation = await lockSelectedSeats(screening.id);
      navigation.navigate('Payment', {
        movie,
        screening,
        reservation,
        seats: selectedSeats,
      });
    } catch (error: unknown) {
      const details = getApiErrorDetails(error);
      if (details.status === 409) {
        const errorData = details.body;

        // Case 1: user already has an active pending reservation.
        if (errorData?.pendingReservationId) {
          Alert.alert(
            'Réservation en cours',
            details.message || 'Vous avez déjà une réservation en cours.',
            [
              { text: 'OK' },
              {
                text: 'Voir ma réservation en cours',
                onPress: () => navigation.navigate('Main', { screen: 'Mes Billets' }),
              },
            ]
          );
          return;
        }

        // Case 2: some selected seats were taken by someone else.
        const unavailable = errorData?.seats ?? [];
        const unavailableIds = unavailable.map((s) => s.id);
        deselectSeats(unavailableIds);
        await fetchSeats(false);
        Alert.alert(
          'Sièges indisponibles',
          'Certains sièges viennent d\'être pris. Ils ont été désélectionnés et la liste a été rafraîchie.',
          [
            { text: 'OK' },
          ]
        );
      } else {
        Alert.alert(
          'Erreur',
          getApiErrorMessage(error, reservationError ?? 'Impossible de verrouiller les sièges.')
        );
      }
    }
  };

  const renderSeat = (seat: Seat) => {
    const isSelected = seat.status === 'LIBRE' && selectedIds.has(seat.id);
    const tappable = !hasPendingReservation && isSeatTappable(seat.status);
    const category = seat.category;
    const config = CATEGORY_CONFIG[category];

    let seatStyle;
    if (isSelected) {
      seatStyle = [styles.seat, styles.seatSelected];
    } else if (!tappable) {
      seatStyle = [
        styles.seat,
        seat.status === 'VERROUILLE' ? styles.seatLocked : styles.seatOccupied,
      ];
    } else {
      seatStyle = [
        styles.seat,
        { borderColor: config.borderColor },
      ];
    }

    return (
      <TouchableOpacity
        key={seat.id}
        activeOpacity={tappable ? 0.7 : 1}
        onPress={() => toggleSeat(seat)}
        disabled={!tappable}
        style={seatStyle}
      >
        {isSelected && <Text style={styles.seatNumber}>{seat.number}</Text>}
      </TouchableOpacity>
    );
  };

  const renderRow = (row: string) => {
    const rowSeats = seats.filter((seat) => seat.row === row);
    // If backend doesn't return seats sorted, sort by number
    const sorted = rowSeats.sort((a, b) => a.number - b.number);

    return (
      <View key={row} style={styles.row}>
        <Text style={styles.rowLabel}>{row}</Text>
        <View style={styles.rowSeats}>
          {sorted.map(renderSeat)}
        </View>
      </View>
    );
  };

  if (!screening || !movie) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" />
        <View style={styles.backWrapper}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()} activeOpacity={0.8}>
            <MaterialIcons name="arrow-back" size={24} color="#e5e2e1" />
          </TouchableOpacity>
        </View>
        <ErrorState
          message="Aucune séance sélectionnée. Veuillez choisir une séance."
          onRetry={() => navigation.goBack()}
        />
      </SafeAreaView>
    );
  }

  if (isLoadingSeats) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" />
        <View style={styles.skeleton}>
          <ActivityIndicator size="large" color="#b22222" />
        </View>
      </SafeAreaView>
    );
  }

  if (seatError) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" />
        <View style={styles.backWrapper}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()} activeOpacity={0.8}>
            <MaterialIcons name="arrow-back" size={24} color="#e5e2e1" />
          </TouchableOpacity>
        </View>
        <ErrorState message={seatError} onRetry={() => void fetchSeats()} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Top bar */}
      <View style={[styles.topBar, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()} activeOpacity={0.8}>
          <MaterialIcons name="arrow-back" size={24} color="#e5e2e1" />
        </TouchableOpacity>
        <View style={styles.titleGroup}>
          <Text style={styles.topBarTitle} numberOfLines={1}>{movie?.title}</Text>
          <Text style={styles.topBarSubtitle}>Séance {String(screening.id).slice(-4)}</Text>
        </View>
        <View style={styles.topBarSpacer} />
      </View>

      {/* Pending reservation banner */}
      {pendingReservation && pendingRemaining > 0 && (
        <View style={styles.pendingBanner}>
          <View style={styles.pendingBannerInfo}>
            <MaterialIcons name="timer" size={16} color="#ffb4ac" />
            <Text style={styles.pendingBannerText} numberOfLines={1}>
              ⏱ Réservation en cours · {formatCountdown(pendingRemaining)}
            </Text>
          </View>
          <Text style={styles.pendingBannerMovie} numberOfLines={1}>
            {pendingReservation.screening?.movie?.title}
          </Text>
          <Text style={styles.pendingBannerSeats}>
            {(pendingReservation.reservationSeats ?? []).map((rs) => `${rs.seat.row}${rs.seat.number}`).join(', ')}
          </Text>
          <TouchableOpacity style={styles.pendingBannerButton} onPress={handleContinuePayment} activeOpacity={0.9}>
            <Text style={styles.pendingBannerButtonText}>Continuer le paiement</Text>
          </TouchableOpacity>
          <Text style={styles.pendingBannerReadOnly}>La grille est en lecture seule jusqu'au paiement.</Text>
        </View>
      )}

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#b22222" />
        }
      >
        {/* Écran */}
        <View style={styles.screenWrapper}>
          <View style={styles.screenCurve} />
          <Text style={styles.screenLabel}>ÉCRAN</Text>
        </View>

        {/* Seat grid */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.gridScrollContent}
        >
          <View style={styles.grid}>{ROWS.map(renderRow)}</View>
        </ScrollView>

        {/* Legend */}
        <View style={styles.legendCard}>
          <Text style={styles.legendTitle}>Légende & Tarifs</Text>
          <View style={styles.legendGrid}>
            {(Object.keys(CATEGORY_CONFIG) as SeatCategory[]).map((cat) => (
              <View key={cat} style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: CATEGORY_CONFIG[cat].color }]} />
                <View>
                  <Text style={styles.legendName}>{CATEGORY_CONFIG[cat].label}</Text>
                  <Text style={styles.legendPrice}>{CATEGORY_CONFIG[cat].price} DH</Text>
                </View>
              </View>
            ))}
            <View style={styles.legendItem}>
              <View style={[styles.legendSeat, styles.seatSelected]} />
              <Text style={styles.legendName}>Sélectionné</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendSeat, styles.seatOccupied]} />
              <Text style={styles.legendName}>Occupé</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendSeat, styles.seatLocked]} />
              <Text style={styles.legendName}>Verrouillé</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Bottom bar */}
      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 16 }]}>
        <View style={styles.bottomBarInfo}>
          <Text style={styles.bottomBarLabel}>Sièges sélectionnés</Text>
          <Text style={styles.bottomBarSeats}>
            {selectedSeats.length > 0 ? selectedLabel : 'Aucun siège sélectionné'}
          </Text>
          <Text style={styles.bottomBarTotal}>
            {totalPrice} <Text style={styles.bottomBarCurrency}>DH</Text>{' '}
            <Text style={styles.bottomBarTotalLabel}>Total</Text>
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.confirmButton, (selectedSeatIds.length === 0 || isLocking || hasPendingReservation) && styles.confirmButtonDisabled]}
          onPress={handleConfirm}
          activeOpacity={0.9}
          disabled={selectedSeatIds.length === 0 || isLocking || hasPendingReservation}
        >
          {isLocking ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.confirmButtonText}>Confirmer</Text>
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
  skeleton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
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
  titleGroup: {
    alignItems: 'center',
  },
  topBarTitle: {
    fontFamily: 'EBGaramond-SemiBold',
    fontSize: 18,
    color: '#e5e2e1',
    maxWidth: 220,
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
  backWrapper: {
    paddingHorizontal: 16,
    paddingTop: 48,
  },
  scrollContent: {
    paddingHorizontal: 0,
    paddingBottom: 160,
  },
  pendingBanner: {
    backgroundColor: '#201f1f',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#b22222',
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 16,
    padding: 16,
  },
  pendingBannerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  pendingBannerText: {
    flex: 1,
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
    color: '#ffb4ac',
  },
  pendingBannerButton: {
    backgroundColor: '#b22222',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  pendingBannerButtonText: {
    fontFamily: 'Inter-Bold',
    fontSize: 14,
    color: '#fff',
  },
  pendingBannerMovie: {
    fontFamily: 'EBGaramond-SemiBold',
    fontSize: 18,
    color: '#e5e2e1',
    marginBottom: 4,
  },
  pendingBannerSeats: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: '#aa8986',
    marginBottom: 12,
  },
  pendingBannerReadOnly: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    color: '#888',
    textAlign: 'center',
    marginTop: 10,
  },
  screenWrapper: {
    alignItems: 'center',
    marginBottom: 24,
  },
  screenCurve: {
    width: 280,
    height: 12,
    borderTopWidth: 2,
    borderLeftWidth: 2,
    borderRightWidth: 2,
    borderColor: 'rgba(229,226,225,0.3)',
    borderTopLeftRadius: 140,
    borderTopRightRadius: 140,
    shadowColor: '#fff',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  screenLabel: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 10,
    color: 'rgba(229,226,225,0.5)',
    letterSpacing: 2,
    marginTop: 8,
  },
  gridScrollContent: {
    paddingHorizontal: 16,
  },
  grid: {
    gap: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  rowLabel: {
    width: 20,
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
    color: '#e2beba',
    textAlign: 'center',
  },
  rowSeats: {
    flexDirection: 'row',
    gap: 8,
  },
  seat: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: '#555',
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  seatSelected: {
    backgroundColor: '#b22222',
    borderColor: '#b22222',
  },
  seatOccupied: {
    backgroundColor: '#3a3a3a',
    borderColor: '#666',
  },
  seatLocked: {
    backgroundColor: '#553030',
    borderColor: '#b45b5b',
    borderStyle: 'dashed',
  },
  seatNumber: {
    fontFamily: 'Inter-Bold',
    fontSize: 10,
    color: '#fff',
  },
  legendCard: {
    marginHorizontal: 20,
    marginTop: 32,
    backgroundColor: '#201f1f',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    padding: 20,
  },
  legendTitle: {
    fontFamily: 'EBGaramond-SemiBold',
    fontSize: 20,
    color: '#e5e2e1',
    marginBottom: 16,
  },
  legendGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minWidth: 130,
  },
  legendDot: {
    width: 14,
    height: 14,
    borderRadius: 4,
  },
  legendSeat: {
    width: 18,
    height: 18,
    borderRadius: 4,
  },
  legendName: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: '#e5e2e1',
  },
  legendPrice: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 13,
    color: '#e2beba',
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
    paddingBottom: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  bottomBarInfo: {
    flex: 1,
  },
  bottomBarLabel: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 11,
    color: '#aa8986',
    letterSpacing: 0.6,
    marginBottom: 4,
  },
  bottomBarSeats: {
    fontFamily: 'EBGaramond-SemiBold',
    fontSize: 18,
    color: '#e5e2e1',
    marginBottom: 4,
  },
  bottomBarTotal: {
    fontFamily: 'EBGaramond-SemiBold',
    fontSize: 28,
    color: '#fff',
  },
  bottomBarCurrency: {
    fontFamily: 'Inter-Bold',
    fontSize: 20,
  },
  bottomBarTotalLabel: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: '#aa8986',
  },
  confirmButton: {
    backgroundColor: '#b22222',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 28,
    minWidth: 140,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: 'rgba(0,0,0,0.5)',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 8,
  },
  confirmButtonDisabled: {
    backgroundColor: '#555',
  },
  confirmButtonText: {
    fontFamily: 'Inter-Bold',
    fontSize: 16,
    color: '#fff',
  },
});
