import React, { useCallback } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  useFocusEffect,
} from '@react-navigation/native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import CircularProgress from './CircularProgress';
import ErrorState from './ErrorState';
import { useAdminDashboardStore } from '../store/adminDashboardStore';
import { useAuthStore } from '../store/authStore';

function toSafeNumber(value: number | null | undefined): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function formatCurrency(value: number | null | undefined): string {
  return `${toSafeNumber(value).toLocaleString('fr-MA')} DH`;
}

function pluralize(
  count: number | null | undefined,
  singular: string,
  plural: string,
): string {
  return toSafeNumber(count) > 1 ? plural : singular;
}

function clampPercentage(value: number | null | undefined): number {
  return Math.max(0, Math.min(100, toSafeNumber(value)));
}

interface QuickStatProps {
  icon: keyof typeof MaterialIcons.glyphMap;
  label: string;
  value: string | number;
}

function QuickStat({ icon, label, value }: QuickStatProps) {
  return (
    <View style={styles.quickStat}>
      <MaterialIcons name={icon} size={18} color="#aa8986" />
      <Text style={styles.quickStatValue}>{value}</Text>
      <Text style={styles.quickStatLabel}>{label}</Text>
    </View>
  );
}

export default function AdminDashboard() {
  const user = useAuthStore((state) => state.user);
  const insets = useSafeAreaInsets();
  const dashboard = useAdminDashboardStore((state) => state.dashboard);
  const isLoading = useAdminDashboardStore((state) => state.isLoading);
  const isRefreshing = useAdminDashboardStore((state) => state.isRefreshing);
  const error = useAdminDashboardStore((state) => state.error);
  const refreshDashboard = useAdminDashboardStore((state) => state.refreshDashboard);

  useFocusEffect(
    useCallback(() => {
      void refreshDashboard();
    }, [refreshDashboard]),
  );

  if (user?.role !== 'ADMIN') {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" />
        <ErrorState
          message="Accès réservé aux administrateurs."
          onRetry={() => undefined}
        />
      </SafeAreaView>
    );
  }

  if (isLoading && !dashboard) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" />
        <View style={styles.skeleton}>
          <ActivityIndicator size="large" color="#b22222" />
        </View>
      </SafeAreaView>
    );
  }

  if (error || !dashboard) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" />
        <ErrorState
          message={error ?? 'Erreur inconnue.'}
          onRetry={() => void refreshDashboard()}
        />
      </SafeAreaView>
    );
  }

  const todayOccupancy = clampPercentage(dashboard.todayOccupancyRate);
  const weekOccupancy = clampPercentage(dashboard.weekOccupancyRate);
  const quickStats = dashboard.quickStats ?? {
    totalMovies: 0,
    totalScreeningsThisWeek: 0,
    pendingReservationsCount: 0,
  };
  const rawDate = new Date().toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
  const dateLabel = rawDate.charAt(0).toUpperCase() + rawDate.slice(1);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + 100 },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => void refreshDashboard()}
            tintColor="#b22222"
          />
        }
      >
        <View style={styles.header}>
          <View style={styles.headerText}>
            <Text style={styles.greeting}>Bonjour, {user?.name ?? 'Admin'}</Text>
            <Text style={styles.subtitle}>
              Administrateur · {dateLabel}
            </Text>
          </View>
          <TouchableOpacity style={styles.profileButton} activeOpacity={0.8}>
            <MaterialIcons name="person" size={22} color="#e5e2e1" />
          </TouchableOpacity>
        </View>

        <LinearGradient
          colors={['#c22626', '#7a1414']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroCard}
        >
          <MaterialIcons
            name="payments"
            size={130}
            color="rgba(255,255,255,0.07)"
            style={styles.heroWatermark}
          />
          <Text style={styles.heroLabel}>Recettes du jour</Text>
          <Text style={styles.heroValue}>{formatCurrency(dashboard.todayRevenue)}</Text>
          <View style={styles.heroChip}>
            <MaterialIcons name="confirmation-number" size={14} color="#ffd7d3" />
            <Text style={styles.heroChipText}>
              {toSafeNumber(dashboard.todayReservationsCount)}{' '}
              {pluralize(dashboard.todayReservationsCount, 'réservation', 'réservations')}
            </Text>
          </View>
        </LinearGradient>

        <View style={styles.occupancyRow}>
          <View style={[styles.card, styles.occupancyTodayCard]}>
            <CircularProgress progress={todayOccupancy} size={84} strokeWidth={8} />
            <Text style={styles.cardCaption}>Aujourd'hui</Text>
          </View>
          <View style={[styles.card, styles.occupancyWeekCard]}>
            <Text style={styles.cardCaption}>Occupation · 7 jours</Text>
            <Text style={styles.occupancyWeekValue}>{Math.round(weekOccupancy)}%</Text>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${weekOccupancy}%` }]} />
            </View>
            <Text style={styles.occupancyWeekDetail}>
              {toSafeNumber(dashboard.weekReservationsCount)}{' '}
              {pluralize(dashboard.weekReservationsCount, 'réservation', 'réservations')} cette semaine
            </Text>
          </View>
        </View>

        <View style={[styles.card, styles.weekCard]}>
          <View style={styles.weekHeader}>
            <Text style={styles.cardCaption}>Cette semaine</Text>
            <MaterialIcons name="trending-up" size={18} color="#ffb4ac" />
          </View>
          <View style={styles.weekStatsRow}>
            <View style={styles.weekStat}>
              <Text style={styles.weekStatValue}>{formatCurrency(dashboard.weekRevenue)}</Text>
              <Text style={styles.weekStatLabel}>Recettes</Text>
            </View>
            <View style={styles.weekStatDivider} />
            <View style={styles.weekStat}>
              <Text style={styles.weekStatValue}>{toSafeNumber(dashboard.weekReservationsCount)}</Text>
              <Text style={styles.weekStatLabel}>Réservations</Text>
            </View>
          </View>
          <View style={styles.weekDivider} />
          {dashboard.topMovieThisWeek ? (
            <View style={styles.topMovieRow}>
              <View style={styles.topMovieIcon}>
                <MaterialIcons name="local-movies" size={18} color="#ffb4ac" />
              </View>
              <View style={styles.topMovieInfo}>
                <Text style={styles.topMovieLabel}>Film le plus réservé</Text>
                <Text style={styles.topMovieTitle} numberOfLines={1}>
                  {dashboard.topMovieThisWeek.title}
                </Text>
              </View>
              <Text style={styles.topMovieCount}>
                {toSafeNumber(dashboard.topMovieThisWeek.count)}{' '}
                {pluralize(dashboard.topMovieThisWeek.count, 'place', 'places')}
              </Text>
            </View>
          ) : (
            <Text style={styles.topMovieEmpty}>Aucun film cette semaine</Text>
          )}
        </View>

        <View style={[styles.card, styles.quickStatsCard]}>
          <QuickStat icon="movie" label="Films" value={toSafeNumber(quickStats.totalMovies)} />
          <View style={styles.quickStatDivider} />
          <QuickStat
            icon="calendar-today"
            label="Séances"
            value={toSafeNumber(quickStats.totalScreeningsThisWeek)}
          />
          <View style={styles.quickStatDivider} />
          <QuickStat
            icon="hourglass-empty"
            label="En attente"
            value={toSafeNumber(quickStats.pendingReservationsCount)}
          />
        </View>

      </ScrollView>
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
  content: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  headerText: {
    flex: 1,
    marginRight: 12,
  },
  greeting: {
    fontFamily: 'EBGaramond-SemiBold',
    fontSize: 26,
    color: '#e5e2e1',
  },
  subtitle: {
    fontFamily: 'Inter-Regular',
    fontSize: 13,
    color: '#aa8986',
    marginTop: 4,
  },
  profileButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#201f1f',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    backgroundColor: '#201f1f',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    padding: 16,
  },
  cardCaption: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 11,
    color: '#aa8986',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  heroCard: {
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    overflow: 'hidden',
  },
  heroWatermark: {
    position: 'absolute',
    right: -24,
    top: -24,
  },
  heroLabel: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 11,
    color: 'rgba(255,255,255,0.75)',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  heroValue: {
    fontFamily: 'EBGaramond-Bold',
    fontSize: 40,
    color: '#fff',
    marginTop: 8,
  },
  heroChip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    backgroundColor: 'rgba(0,0,0,0.25)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    marginTop: 16,
  },
  heroChipText: {
    fontFamily: 'Inter-Medium',
    fontSize: 12,
    color: '#ffd7d3',
  },
  occupancyRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  occupancyTodayCard: {
    flex: 1,
    alignItems: 'center',
    gap: 12,
    paddingVertical: 18,
  },
  occupancyWeekCard: {
    flex: 1,
    justifyContent: 'center',
  },
  occupancyWeekValue: {
    fontFamily: 'EBGaramond-SemiBold',
    fontSize: 28,
    color: '#e5e2e1',
    marginTop: 8,
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.08)',
    marginTop: 10,
    overflow: 'hidden',
  },
  progressFill: {
    height: 6,
    borderRadius: 3,
    backgroundColor: '#ffb4ac',
  },
  occupancyWeekDetail: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    color: '#aa8986',
    marginTop: 10,
  },
  weekCard: {
    marginBottom: 16,
  },
  weekHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  weekStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 14,
  },
  weekStat: {
    flex: 1,
  },
  weekStatValue: {
    fontFamily: 'EBGaramond-SemiBold',
    fontSize: 24,
    color: '#e5e2e1',
  },
  weekStatLabel: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    color: '#aa8986',
    marginTop: 4,
  },
  weekStatDivider: {
    width: 1,
    height: 36,
    backgroundColor: 'rgba(255,255,255,0.08)',
    marginHorizontal: 16,
  },
  weekDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.06)',
    marginVertical: 16,
  },
  topMovieRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  topMovieIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(178,34,34,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  topMovieInfo: {
    flex: 1,
  },
  topMovieLabel: {
    fontFamily: 'Inter-Regular',
    fontSize: 11,
    color: '#aa8986',
  },
  topMovieTitle: {
    fontFamily: 'EBGaramond-SemiBold',
    fontSize: 17,
    color: '#e5e2e1',
    marginTop: 2,
  },
  topMovieCount: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 12,
    color: '#ffb4ac',
  },
  topMovieEmpty: {
    fontFamily: 'Inter-Regular',
    fontSize: 13,
    color: '#aa8986',
  },
  quickStatsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 8,
    marginBottom: 24,
  },
  quickStat: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  quickStatDivider: {
    width: 1,
    height: 40,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  quickStatValue: {
    fontFamily: 'EBGaramond-SemiBold',
    fontSize: 22,
    color: '#e5e2e1',
  },
  quickStatLabel: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    color: '#aa8986',
  },
  sectionTitle: {
    fontFamily: 'EBGaramond-SemiBold',
    fontSize: 20,
    color: '#e5e2e1',
    marginBottom: 14,
  },
});
