import React, { useCallback } from 'react';
import {
  FlatList,
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

import ErrorState from '../components/ErrorState';
import PosterImage from '../components/PosterImage';
import { useAdminMoviesStore } from '../store/adminMoviesStore';
import type { Movie } from '../types';
import type { RootStackParamList } from '../types/navigation';

type AdminNavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function AdminMoviesScreen() {
  const navigation = useNavigation<AdminNavigationProp>();
  const insets = useSafeAreaInsets();
  const movies = useAdminMoviesStore((state) => state.movies);
  const loading = useAdminMoviesStore((state) => state.isLoadingMovies);
  const error = useAdminMoviesStore((state) => state.moviesError);
  const fetchMovies = useAdminMoviesStore((state) => state.fetchMovies);

  useFocusEffect(
    useCallback(() => {
      void fetchMovies();
    }, [fetchMovies]),
  );

  const handleAdd = () => {
    navigation.navigate('AddMovie');
  };

  const handleEdit = (movie: Movie) => {
    navigation.navigate('AddMovie', { movie });
  };

  const handleProgramme = () => {
    navigation.navigate('Programme');
  };

  const renderHeader = (subtitle?: string) => (
    <View style={styles.topBar}>
      <View style={styles.topBarSpacer} />
      <View style={styles.titleBlock}>
        <Text style={styles.topBarTitle}>Gestion des Films</Text>
        {subtitle ? <Text style={styles.topBarSubtitle}>{subtitle}</Text> : null}
      </View>
      <TouchableOpacity
        style={styles.programmeButton}
        onPress={handleProgramme}
        activeOpacity={0.8}
      >
        <MaterialIcons name="calendar-month" size={22} color="#e5e2e1" />
      </TouchableOpacity>
    </View>
  );

  const renderSkeleton = () => (
    <View style={styles.listContent}>
      {[0, 1, 2, 3].map((index) => (
        <View key={index} style={styles.skeletonCard}>
          <View style={styles.skeletonMain}>
            <View style={styles.skeletonPoster} />
            <View style={styles.skeletonInfo}>
              <View style={styles.skeletonLineWide} />
              <View style={styles.skeletonLineShort} />
              <View style={styles.skeletonLineShort} />
            </View>
          </View>
          <View style={styles.skeletonActions} />
        </View>
      ))}
    </View>
  );

  const renderEmpty = () => (
    <View style={styles.emptyState}>
      <View style={styles.emptyIconWrap}>
        <MaterialIcons name="local-movies" size={30} color="#ffb4ac" />
      </View>
      <Text style={styles.emptyTitle}>Aucun film</Text>
      <Text style={styles.emptyText}>
        Ajoutez votre premier film au catalogue pour commencer.
      </Text>
    </View>
  );

  const renderItem = ({ item }: { item: Movie }) => (
    <View style={styles.card}>
      <View style={styles.cardMain}>
        <PosterImage
          uri={item.poster}
          title={item.title}
          style={styles.poster}
          borderRadius={12}
        />
        <View style={styles.info}>
          <Text style={styles.title} numberOfLines={2}>{item.title}</Text>
          <Text style={styles.genre} numberOfLines={1}>{item.genre}</Text>
          <View style={styles.metaRow}>
            <MaterialIcons name="schedule" size={13} color="#aa8986" />
            <Text style={styles.metaText}>{item.duration}</Text>
          </View>
        </View>
      </View>
      <View style={styles.cardActions}>
        <TouchableOpacity
          style={[styles.pillButton, styles.editPill]}
          onPress={() => handleEdit(item)}
          activeOpacity={0.85}
        >
          <MaterialIcons name="edit" size={14} color="#ffb4ac" />
          <Text style={styles.editPillText}>Modifier</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" />
        {renderHeader()}
        {renderSkeleton()}
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" />
        {renderHeader()}
        <ErrorState message={error} onRetry={() => void fetchMovies()} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />

      {renderHeader(`${movies.length} film${movies.length > 1 ? 's' : ''} au catalogue`)}

      <FlatList
        data={movies}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={() => <View style={{ height: 16 }} />}
        ListEmptyComponent={renderEmpty}
        showsVerticalScrollIndicator={false}
      />

      <TouchableOpacity
        style={[styles.fab, { bottom: insets.bottom + 24 }]}
        onPress={handleAdd}
        activeOpacity={0.9}
      >
        <LinearGradient
          colors={['#c22626', '#8f1818']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.fabGradient}
        >
          <MaterialIcons name="add" size={28} color="#fff" />
        </LinearGradient>
      </TouchableOpacity>
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
    paddingTop: 12,
    paddingBottom: 16,
  },
  titleBlock: {
    flex: 1,
    alignItems: 'center',
  },
  topBarTitle: {
    fontFamily: 'EBGaramond-SemiBold',
    fontSize: 22,
    color: '#e5e2e1',
  },
  topBarSubtitle: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    color: '#aa8986',
    marginTop: 3,
  },
  topBarSpacer: {
    width: 40,
  },
  programmeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 120,
  },
  card: {
    backgroundColor: '#201f1f',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    padding: 14,
  },
  cardMain: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  poster: {
    width: 64,
    height: 92,
    backgroundColor: '#1a1a1a',
  },
  info: {
    flex: 1,
    justifyContent: 'center',
    gap: 5,
  },
  title: {
    fontFamily: 'EBGaramond-SemiBold',
    fontSize: 19,
    color: '#e5e2e1',
  },
  genre: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 11,
    color: '#aa8986',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  metaText: {
    fontFamily: 'Inter-Regular',
    fontSize: 13,
    color: '#aa8986',
  },
  cardActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
  },
  pillButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
  },
  editPill: {
    backgroundColor: 'rgba(178,34,34,0.15)',
    borderColor: 'rgba(178,34,34,0.3)',
  },
  editPillText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 13,
    color: '#ffb4ac',
  },
  skeletonCard: {
    backgroundColor: '#201f1f',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    padding: 14,
    marginBottom: 16,
  },
  skeletonMain: {
    flexDirection: 'row',
    gap: 14,
  },
  skeletonPoster: {
    width: 64,
    height: 92,
    borderRadius: 12,
    backgroundColor: '#2a2a2a',
  },
  skeletonInfo: {
    flex: 1,
    justifyContent: 'center',
    gap: 10,
  },
  skeletonLineWide: {
    width: '70%',
    height: 16,
    borderRadius: 6,
    backgroundColor: '#2a2a2a',
  },
  skeletonLineShort: {
    width: '45%',
    height: 12,
    borderRadius: 6,
    backgroundColor: '#2a2a2a',
  },
  skeletonActions: {
    height: 38,
    borderRadius: 19,
    backgroundColor: '#2a2a2a',
    marginTop: 14,
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: 90,
    paddingHorizontal: 32,
  },
  emptyIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(178,34,34,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(178,34,34,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontFamily: 'EBGaramond-SemiBold',
    fontSize: 22,
    color: '#e5e2e1',
    marginTop: 18,
  },
  emptyText: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: '#aa8986',
    textAlign: 'center',
    lineHeight: 20,
    marginTop: 8,
  },
  fab: {
    position: 'absolute',
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    overflow: 'hidden',
    shadowColor: '#b22222',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
  fabGradient: {
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
