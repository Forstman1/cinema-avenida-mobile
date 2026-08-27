import React, { useMemo } from 'react';
import {
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

import NativeQRCode from '../components/NativeQRCode';
import { useAuthStore } from '../store/authStore';
import { useBookingsStore } from '../store/bookingsStore';
import { formatScreeningDate } from '../utils/date';
import type { ReservationStatus, SeatCategory, TicketStatus } from '../types';
import type { RootStackParamList } from '../types/navigation';
import type { TicketScreenProps } from '../types/navigation';

type TicketNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Ticket'>;

function formatZoneLabel(seats: { category: SeatCategory }[]): string {
  const categories = Array.from(new Set(seats.map((s) => s.category)));
  if (categories.length === 1) {
    return categories[0].charAt(0) + categories[0].slice(1).toLowerCase();
  }
  return 'Mixte';
}

function formatReservationStatus(status: ReservationStatus): string {
  if (status === 'CANCELLED') return 'ANNULÉE';
  if (status === 'EN_ATTENTE') return 'EN ATTENTE';
  if (status === 'CONFIRMED') return 'CONFIRMÉE';
  return status;
}

function formatTicketStatus(status: TicketStatus, isCancelled: boolean): string {
  if (isCancelled || status === 'CANCELLED') return 'ANNULÉ';
  return 'VALIDE';
}

export default function TicketScreen({ route }: TicketScreenProps) {
  const navigation = useNavigation<TicketNavigationProp>();
  const insets = useSafeAreaInsets();
  const currentUserId = useAuthStore((state) => state.user?.id ?? null);
  const storedBooking = useBookingsStore(
    (state) => state.selectedBooking ?? state.lastCompletedBooking
  );
  const routeParams = route.params;
  const storedBookingBelongsToUser = storedBooking?.userId === currentUserId;
  const storedBookingMatchesRoute = storedBooking?.reservation.id === routeParams.reservation.id;
  const completedBooking =
    storedBooking && storedBookingBelongsToUser && storedBookingMatchesRoute ? storedBooking : null;
  const canUseRouteFallback = !storedBooking || storedBookingBelongsToUser;
  const movie = completedBooking?.movie ?? (canUseRouteFallback ? routeParams.movie : null);
  const screening = completedBooking?.screening ?? (canUseRouteFallback ? routeParams.screening : null);
  const reservation = completedBooking?.reservation ?? (canUseRouteFallback ? routeParams.reservation : null);
  const ticket = completedBooking?.ticket ?? (canUseRouteFallback ? routeParams.ticket : null);
  const seats = completedBooking?.seats ?? (canUseRouteFallback ? routeParams.seats : []);

  const seatLabels = useMemo(() => seats.map((s) => `${s.row}${s.number}`), [seats]);
  const zoneLabel = useMemo(() => formatZoneLabel(seats), [seats]);

  const handleViewBookings = () => {
    navigation.navigate('Main', { screen: 'Mes Billets' });
  };

  if (!movie || !screening || !reservation || !ticket) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" />
        <View style={styles.missingState}>
          <Text style={styles.missingStateText}>Billet indisponible.</Text>
          <TouchableOpacity style={styles.missingStateButton} onPress={handleViewBookings} activeOpacity={0.9}>
            <Text style={styles.buttonText}>Voir mes billets</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const isCancelled = reservation.status === 'CANCELLED' || ticket.status === 'CANCELLED';

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Text style={styles.headerTitle}>Cinéma Avenida</Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Ticket card */}
        <View style={styles.ticketCard}>
          {/* Left notch */}
          <View style={[styles.notch, styles.notchLeft]} />
          {/* Right notch */}
          <View style={[styles.notch, styles.notchRight]} />

          {/* Movie title */}
          <Text style={styles.movieTitle} numberOfLines={2}>{movie.title}</Text>

          {/* Date / Time */}
          <View style={styles.infoRow}>
            <View style={styles.infoBlock}>
              <Text style={styles.infoLabel}>DATE</Text>
              <Text style={styles.infoValue}>{formatScreeningDate(screening.date)}</Text>
            </View>
            <View style={[styles.infoBlock, styles.infoBlockRight]}>
              <Text style={styles.infoLabel}>HEURE</Text>
              <Text style={styles.infoValue}>{screening.showTime}</Text>
            </View>
          </View>

          {/* Room / Zone */}
          <View style={styles.infoRow}>
            <View style={styles.infoBlock}>
              <Text style={styles.infoLabel}>SALLE</Text>
              <Text style={[styles.infoValue, styles.infoValueAccent]}>Salle 1</Text>
            </View>
            <View style={[styles.infoBlock, styles.infoBlockRight]}>
              <Text style={styles.infoLabel}>ZONE</Text>
              <Text style={styles.infoValue}>{zoneLabel}</Text>
            </View>
          </View>

          {/* Reservation / ticket status */}
          <View style={styles.infoRow}>
            <View style={styles.infoBlock}>
              <Text style={styles.infoLabel}>RÉSERVATION</Text>
              <Text style={[styles.infoValue, isCancelled && styles.infoValueCancelled]}>
                {formatReservationStatus(reservation.status)}
              </Text>
            </View>
            <View style={[styles.infoBlock, styles.infoBlockRight]}>
              <Text style={styles.infoLabel}>BILLET</Text>
              <Text style={[styles.infoValue, isCancelled && styles.infoValueCancelled]}>
                {formatTicketStatus(ticket.status, isCancelled)}
              </Text>
            </View>
          </View>

          {/* Perforation line */}
          <View style={styles.perforation}>
            <View style={styles.dashedLine} />
          </View>

          {/* Seats */}
          <Text style={styles.seatsLabel}>SIÈGES</Text>
          <View style={styles.seatChips}>
            {seatLabels.map((label) => (
              <View key={label} style={styles.seatChip}>
                <Text style={styles.seatChipText}>{label}</Text>
              </View>
            ))}
          </View>

          {/* Backend-generated QR code */}
          {isCancelled ? (
            <View style={styles.cancelledTicket}>
              <MaterialIcons name="block" size={44} color="#b22222" />
              <Text style={styles.cancelledTicketText}>Billet annulé</Text>
            </View>
          ) : (
            <View style={styles.qrWrapper}>
              <NativeQRCode value={ticket.qrCode} size={180} />
            </View>
          )}
        </View>

        <Text style={isCancelled ? styles.cancelledHint : styles.hint}>
          {isCancelled ? 'Cette réservation a été annulée.' : 'Présentez ce code à l’entrée'}
        </Text>
      </ScrollView>

      {/* Bottom button */}
      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 16 }]}>
        <TouchableOpacity style={styles.button} onPress={handleViewBookings} activeOpacity={0.9}>
          <MaterialIcons name="confirmation-number" size={20} color="#fff" />
          <Text style={styles.buttonText}>Voir mes billets</Text>
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
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 120,
  },
  ticketCard: {
    backgroundColor: '#f5f2f0',
    borderRadius: 20,
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 32,
    marginTop: 12,
    position: 'relative',
    overflow: 'hidden',
  },
  notch: {
    position: 'absolute',
    top: '50%',
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#131313',
    marginTop: -12,
  },
  notchLeft: {
    left: -12,
  },
  notchRight: {
    right: -12,
  },
  movieTitle: {
    fontFamily: 'EBGaramond-Bold',
    fontSize: 34,
    color: '#1a1a1a',
    textAlign: 'center',
    marginBottom: 28,
    lineHeight: 40,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  infoBlock: {
    flex: 1,
  },
  infoBlockRight: {
    alignItems: 'flex-end',
  },
  infoLabel: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 12,
    color: '#b22222',
    letterSpacing: 1,
    marginBottom: 6,
  },
  infoValue: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 20,
    color: '#1a1a1a',
  },
  infoValueAccent: {
    color: '#b22222',
  },
  infoValueCancelled: {
    color: '#b22222',
  },
  perforation: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  dashedLine: {
    flex: 1,
    height: 1,
    borderStyle: 'dashed',
    borderWidth: 1,
    borderColor: '#c9c5c3',
  },
  seatsLabel: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 12,
    color: '#b22222',
    letterSpacing: 1,
    textAlign: 'center',
    marginBottom: 14,
  },
  seatChips: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 28,
  },
  seatChip: {
    backgroundColor: '#e8e4e2',
    borderRadius: 10,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#d9d5d3',
  },
  seatChipText: {
    fontFamily: 'EBGaramond-SemiBold',
    fontSize: 18,
    color: '#1a1a1a',
  },
  qrWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    alignSelf: 'center',
    minWidth: 212,
    minHeight: 212,
  },
  cancelledTicket: {
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    width: 212,
    height: 212,
    borderRadius: 16,
    backgroundColor: '#ebe5e3',
    borderWidth: 1,
    borderColor: '#d5c6c3',
    gap: 12,
  },
  cancelledTicketText: {
    fontFamily: 'Inter-Bold',
    fontSize: 16,
    color: '#b22222',
  },
  hint: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: '#aa8986',
    textAlign: 'center',
    marginTop: 24,
  },
  missingState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    gap: 18,
  },
  missingStateText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
    color: '#e5e2e1',
  },
  missingStateButton: {
    backgroundColor: '#b22222',
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 14,
  },
  cancelledHint: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: '#b22222',
    textAlign: 'center',
    marginTop: 24,
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
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#b22222',
    borderRadius: 12,
    paddingVertical: 16,
  },
  buttonText: {
    fontFamily: 'Inter-Bold',
    fontSize: 16,
    color: '#fff',
  },
});
