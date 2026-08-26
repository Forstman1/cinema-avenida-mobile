import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, type CompositeNavigationProp } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { getAdminDashboard } from '../api/admin';
import { useAuth } from '../context/AuthContext';
import CircularProgress from './CircularProgress';
import ErrorState from './ErrorState';
import type { AdminDashboard as AdminDashboardType } from '../types';
import type { MainTabParamList, RootStackParamList } from '../types/navigation';

type AdminHomeNavigationProp = CompositeNavigationProp<
  BottomTabNavigationProp<MainTabParamList, 'Accueil'>,
  NativeStackNavigationProp<RootStackParamList>
>;

function formatCurrency(value: number): string {
  return `${value.toLocaleString('fr-MA')} DH`;
}

function pluralize(count: number, singular: string, plural: string): string {
  return count > 1 ? plural : singular;
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
  const navigation = useNavigation<AdminHomeNavigationProp>();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [data, setData] = useState<AdminDashboardType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getAdminDashboard();
      setData(result);
    } catch (err: any) {
      setError(err?.message ?? 'Impossible de charger le tableau de bord.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  const handleManageMovies = () => {
    navigation.navigate('Gestion');
  };

  const handleAddMovie = () => {
    navigation.navigate('AddMovie');
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

  if (error || !data) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" />
        <ErrorState message={error ?? 'Erreur inconnue.'} onRetry={fetchDashboard} />
      </SafeAreaView>
    );
  }

  const weekOccupancy = Math.max(0, Math.min(100, data.weekOccupancyRate));
  const roleLabel = user?.role === 'admin' ? 'Administrateur' : user?.role ?? 'Administrateur';
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
      >
        <View style={styles.header}>
          <View style={styles.headerText}>
            <Text style={styles.greeting}>Bonjour, {user?.name ?? 'Admin'}</Text>
            <Text style={styles.subtitle}>
              {roleLabel} · {dateLabel}
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
          <Text style={styles.heroValue}>{formatCurrency(data.todayRevenue)}</Text>
          <View style={styles.heroChip}>
            <MaterialIcons name="confirmation-number" size={14} color="#ffd7d3" />
            <Text style={styles.heroChipText}>
              {data.todayReservationsCount}{' '}
              {pluralize(data.todayReservationsCount, 'réservation', 'réservations')}
            </Text>
          </View>
        </LinearGradient>

        <View style={styles.occupancyRow}>
          <View style={[styles.card, styles.occupancyTodayCard]}>
            <CircularProgress progress={data.todayOccupancyRate} size={84} strokeWidth={8} />
            <Text style={styles.cardCaption}>Aujourd'hui</Text>
          </View>
          <View style={[styles.card, styles.occupancyWeekCard]}>
            <Text style={styles.cardCaption}>Occupation · 7 jours</Text>
            <Text style={styles.occupancyWeekValue}>{data.weekOccupancyRate}%</Text>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${weekOccupancy}%` }]} />
            </View>
            <Text style={styles.occupancyWeekDetail}>
              {data.weekReservationsCount}{' '}
              {pluralize(data.weekReservationsCount, 'réservation', 'réservations')} cette semaine
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
              <Text style={styles.weekStatValue}>{formatCurrency(data.weekRevenue)}</Text>
              <Text style={styles.weekStatLabel}>Recettes</Text>
            </View>
            <View style={styles.weekStatDivider} />
            <View style={styles.weekStat}>
              <Text style={styles.weekStatValue}>{data.weekReservationsCount}</Text>
              <Text style={styles.weekStatLabel}>Réservations</Text>
            </View>
          </View>
          <View style={styles.weekDivider} />
          {data.topMovieThisWeek ? (
            <View style={styles.topMovieRow}>
              <View style={styles.topMovieIcon}>
                <MaterialIcons name="local-movies" size={18} color="#ffb4ac" />
              </View>
              <View style={styles.topMovieInfo}>
                <Text style={styles.topMovieLabel}>Film le plus réservé</Text>
                <Text style={styles.topMovieTitle} numberOfLines={1}>
                  {data.topMovieThisWeek.title}
                </Text>
              </View>
              <Text style={styles.topMovieCount}>
                {data.topMovieThisWeek.count}{' '}
                {pluralize(data.topMovieThisWeek.count, 'place', 'places')}
              </Text>
            </View>
          ) : (
            <Text style={styles.topMovieEmpty}>Aucune réservation cette semaine.</Text>
          )}
        </View>

        <View style={[styles.card, styles.quickStatsCard]}>
          <QuickStat icon="movie" label="Films" value={data.quickStats.totalMovies} />
          <View style={styles.quickStatDivider} />
          <QuickStat
            icon="calendar-today"
            label="Séances"
            value={data.quickStats.totalScreeningsThisWeek}
          />
          <View style={styles.quickStatDivider} />
          <QuickStat
            icon="hourglass-empty"
            label="En attente"
            value={data.quickStats.pendingReservationsCount}
          />
        </View>

        <Text style={styles.sectionTitle}>Actions rapides</Text>
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={styles.actionPrimary}
            onPress={handleAddMovie}
            activeOpacity={0.9}
          >
            <LinearGradient
              colors={['#c22626', '#8f1818']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.actionPrimaryGradient}
            >
              <MaterialIcons name="add" size={20} color="#fff" />
              <Text style={styles.actionPrimaryText}>Ajouter un film</Text>
            </LinearGradient>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, styles.actionSecondary]}
            onPress={handleManageMovies}
            activeOpacity={0.9}
          >
            <MaterialIcons name="movie" size={20} color="#e5e2e1" />
            <Text style={styles.actionSecondaryText}>Gérer les films</Text>
          </TouchableOpacity>
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
  actionsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 14,
    paddingVertical: 16,
  },
  actionPrimary: {
    flex: 1,
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#b22222',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 6,
  },
  actionPrimaryGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
  },
  actionSecondary: {
    backgroundColor: '#201f1f',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  actionPrimaryText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
    color: '#fff',
  },
  actionSecondaryText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
    color: '#e5e2e1',
  },
});
