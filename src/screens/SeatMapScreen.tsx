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
import { useNavigation } from '@react-navigation/native';
import { MaterialIcons } from '@expo/vector-icons';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { getSeatsByScreeningId, lockSeats } from '../api/seats';
import ErrorState from '../components/ErrorState';
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

export default function SeatMapScreen({ route }: SeatMapScreenProps) {
  const navigation = useNavigation<SeatMapNavigationProp>();
  const insets = useSafeAreaInsets();
  const { movie, screening } = route.params ?? {};

  console.log('[DEBUG SeatMap] route.params:', route.params);
  console.log('[DEBUG SeatMap] movie:', movie);
  console.log('[DEBUG SeatMap] screening:', screening);

  const [seats, setSeats] = useState<Seat[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [locking, setLocking] = useState(false);

  const fetchSeats = useCallback(async (showLoading = true) => {
    if (!screening?.id) {
      console.log('[DEBUG SeatMap] fetchSeats aborted: no screening.id');
      return;
    }
    console.log('[DEBUG SeatMap] fetchSeats start, screeningId:', screening.id);
    if (showLoading) setLoading(true);
    setError(null);
    try {
      const data = await getSeatsByScreeningId(screening.id);
      console.log('[DEBUG SeatMap] fetchSeats success, seats count:', data.length);
      console.log('[DEBUG SeatMap] first seat sample:', data[0]);
      setSeats(data);
    } catch (err: any) {
      console.log('[DEBUG SeatMap] fetchSeats error:', err?.message, err?.response?.data, err?.response?.status);
      setError(err?.message ?? 'Impossible de charger les sièges.');
    } finally {
      if (showLoading) setLoading(false);
    }
  }, [screening?.id]);

  useEffect(() => {
    console.log('[DEBUG SeatMap] component mounted / fetch effect triggered');
    fetchSeats();
  }, [fetchSeats]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchSeats(false);
    setRefreshing(false);
  }, [fetchSeats]);

  const toggleSeat = (seat: Seat) => {
    if (!isSeatTappable(seat.status)) return;

    console.log('[DEBUG SeatMap] toggleSeat tapped:', seat);
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(seat.id)) {
        next.delete(seat.id);
      } else {
        next.add(seat.id);
      }
      return next;
    });
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
    if (!screening?.id || selectedIds.size === 0) return;
    const payload = {
      screeningId: screening.id,
      seatIds: Array.from(selectedIds),
    };
    console.log('[DEBUG SeatMap] handleConfirm payload:', payload);
    setLocking(true);
    try {
      const reservation = await lockSeats(payload);
      console.log('[DEBUG SeatMap] lockSeats success reservation:', reservation);
      navigation.navigate('Payment', {
        movie,
        screening,
        reservation,
        seats: selectedSeats,
      });
    } catch (err: any) {
      console.log('[DEBUG SeatMap] lockSeats error:', err?.message, err?.response?.data, err?.response?.status);
      if (err.response?.status === 409) {
        const unavailable: { id: number }[] = err.response.data?.seats ?? [];
        const unavailableIds = unavailable.map((s) => s.id);
        console.log('[DEBUG SeatMap] 409 unavailable seats:', unavailable);
        setSeats((prev) =>
          prev.map((seat) =>
            unavailableIds.includes(seat.id) ? { ...seat, status: 'OCCUPE' as SeatStatus } : seat
          )
        );
        setSelectedIds((prev) => {
          const next = new Set(prev);
          unavailableIds.forEach((id) => next.delete(id));
          return next;
        });
        Alert.alert(
          'Sièges indisponibles',
          'Certains sièges viennent d\'être pris. Ils ont été désélectionnés et marqués comme occupés. Veuillez rafraîchir la liste.',
          [
            { text: 'OK' },
            { text: 'Rafraîchir', onPress: () => fetchSeats(false) },
          ]
        );
      } else {
        Alert.alert(
          'Erreur',
          err.response?.data?.message ?? 'Impossible de verrouiller les sièges.'
        );
      }
    } finally {
      setLocking(false);
    }
  };

  const renderSeat = (seat: Seat) => {
    const isSelected = selectedIds.has(seat.id);
    const tappable = isSeatTappable(seat.status);
    const category = seat.category;
    const config = CATEGORY_CONFIG[category];

    let seatStyle;
    if (isSelected) {
      seatStyle = [styles.seat, styles.seatSelected];
    } else if (!tappable) {
      seatStyle = [styles.seat, styles.seatOccupied];
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
        <ErrorState message={error} onRetry={() => fetchSeats(false)} />
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
        <View style={styles.titleGroup}>
          <Text style={styles.topBarTitle} numberOfLines={1}>{movie?.title}</Text>
          <Text style={styles.topBarSubtitle}>Séance {String(screening.id).slice(-4)}</Text>
        </View>
        <View style={styles.topBarSpacer} />
      </View>

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
          style={[styles.confirmButton, (selectedIds.size === 0 || locking) && styles.confirmButtonDisabled]}
          onPress={handleConfirm}
          activeOpacity={0.9}
          disabled={selectedIds.size === 0 || locking}
        >
          {locking ? (
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
    paddingTop: 80,
    paddingBottom: 160,
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
    borderColor: '#3a3a3a',
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
