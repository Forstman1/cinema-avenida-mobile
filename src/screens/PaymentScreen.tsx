import React, { useEffect, useMemo, useState } from 'react';
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

import { payReservation } from '../api/payments';
import type { RootStackParamList } from '../types/navigation';
import type { PaymentScreenProps } from '../types/navigation';

type PaymentNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Payment'>;

const LOCK_DURATION_SECONDS = 10 * 60; // 10 minutes

function formatCountdown(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function formatFullDate(dateString: string): string {
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return dateString;
  return date.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export default function PaymentScreen({ route }: PaymentScreenProps) {
  const navigation = useNavigation<PaymentNavigationProp>();
  const insets = useSafeAreaInsets();
  const { movie, screening, reservation, seats } = route.params ?? {};

  console.log('[DEBUG Payment] route.params:', route.params);
  console.log('[DEBUG Payment] movie:', movie);
  console.log('[DEBUG Payment] screening:', screening);
  console.log('[DEBUG Payment] reservation:', reservation);
  console.log('[DEBUG Payment] seats:', seats);

  const [remainingSeconds, setRemainingSeconds] = useState(LOCK_DURATION_SECONDS);
  const [paying, setPaying] = useState(false);

  const seatLabels = useMemo(() => seats.map((s) => `${s.row}${s.number}`).join(', '), [seats]);

  useEffect(() => {
    if (remainingSeconds <= 0) return;

    const interval = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          Alert.alert(
            'Délai expiré',
            'Le délai a expiré, vos sièges ont été libérés.',
            [
              {
                text: 'OK',
                onPress: () => {
                  if (movie && screening) {
                    navigation.navigate('SeatMap', { movie, screening });
                  } else {
                    navigation.goBack();
                  }
                },
              },
            ]
          );
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [remainingSeconds, movie, screening, navigation]);

  const isExpired = remainingSeconds <= 0;
  const isUrgent = remainingSeconds < 120;

  const handlePay = async () => {
    if (isExpired) {
      Alert.alert('Délai expiré', 'Veuillez choisir à nouveau vos sièges.');
      return;
    }
    if (!reservation?.id) {
      Alert.alert('Erreur', 'Aucune réservation à payer.');
      return;
    }
    setPaying(true);
    try {
      const result = await payReservation(reservation.id);
      console.log('[DEBUG Payment] payReservation result:', result);
      navigation.navigate('Ticket', {
        movie,
        screening,
        reservation: result,
        ticket: result.ticket,
        seats,
      });
    } catch (err: any) {
      const message = err?.response?.data?.message ?? 'Le paiement a échoué.';
      const isExpiredError = err?.response?.status === 410 || err?.response?.status === 409 || /expir/i.test(message);
      Alert.alert('Erreur de paiement', message, [
        {
          text: isExpiredError ? 'Choisir des sièges' : 'OK',
          onPress: () => {
            if (isExpiredError) {
              navigation.navigate('SeatMap', { movie, screening });
            }
          },
        },
      ]);
    } finally {
      setPaying(false);
    }
  };

  if (!reservation || !movie || !screening || !seats) {
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
            {movie.poster ? (
              <Image source={{ uri: movie.poster }} style={styles.posterThumbnail} />
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
          style={[styles.payButton, (isExpired || paying) && styles.payButtonDisabled]}
          onPress={handlePay}
          activeOpacity={0.9}
          disabled={isExpired || paying}
        >
          {paying ? (
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
