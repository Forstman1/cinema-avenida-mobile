import React, { useMemo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import PosterImage from './PosterImage';
import { compareShowTimes, formatDuration } from '../utils/date';
import type { Movie, Screening } from '../types';

interface FeaturedMovieCardProps {
  movie: Movie;
  screenings: Screening[];
  onPress: (movie: Movie, screening?: Screening) => void;
  onTimePress: (movie: Movie, screening: Screening) => void;
}

export default function FeaturedMovieCard({
  movie,
  screenings,
  onPress,
  onTimePress,
}: FeaturedMovieCardProps) {
  const sortedScreenings = useMemo(
    () => [...screenings].sort((a, b) => compareShowTimes(a.showTime, b.showTime)),
    [screenings]
  );

  return (
    <View style={styles.card}>
      <PosterImage uri={movie.poster} title={movie.title} style={styles.backdrop} />
      <LinearGradient
        colors={['rgba(19,19,19,0.04)', 'rgba(19,19,19,0.58)', 'rgba(19,19,19,0.98)']}
        locations={[0, 0.45, 1]}
        style={StyleSheet.absoluteFill}
      />

      <View style={styles.featuredBadge}>
        <MaterialIcons name="local-movies" size={13} color="#ffb4ac" />
        <Text style={styles.featuredBadgeText}>À LA UNE</Text>
      </View>

      <View style={styles.content}>
        <TouchableOpacity
          activeOpacity={0.92}
          onPress={() => onPress(movie, sortedScreenings[0])}
          style={styles.detailsPressable}
          accessibilityRole="button"
          accessibilityLabel={`Film à la une, ${movie.title}. Voir les séances`}
        >
          <Text style={styles.title} numberOfLines={2}>{movie.title}</Text>
          <View style={styles.metaRow}>
            <Text style={styles.genre} numberOfLines={1}>{movie.genre}</Text>
            <View style={styles.dot} />
            <MaterialIcons name="schedule" size={15} color="#e2beba" />
            <Text style={styles.metaText}>{formatDuration(movie.duration)}</Text>
          </View>
        </TouchableOpacity>

        <View style={styles.timesRow}>
          {sortedScreenings.map((screening) => (
            <TouchableOpacity
              key={screening.id}
              activeOpacity={0.78}
              onPress={() => onTimePress(movie, screening)}
              style={styles.timeChip}
              accessibilityRole="button"
              accessibilityLabel={`${movie.title}, séance à ${screening.showTime}`}
            >
              <Text style={styles.timeText}>{screening.showTime}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          activeOpacity={0.92}
          onPress={() => onPress(movie, sortedScreenings[0])}
          style={styles.actionRow}
          accessibilityRole="button"
          accessibilityLabel={`Voir les séances de ${movie.title}`}
        >
          <Text style={styles.actionText}>Voir les séances</Text>
          <MaterialIcons name="arrow-forward" size={18} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    minHeight: 330,
    borderRadius: 22,
    overflow: 'hidden',
    backgroundColor: '#201f1f',
    borderWidth: 1,
    borderColor: 'rgba(229,226,225,0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.34,
    shadowRadius: 18,
    elevation: 7,
  },
  backdrop: {
    position: 'absolute',
    inset: 0,
  },
  featuredBadge: {
    position: 'absolute',
    top: 16,
    left: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(19,19,19,0.8)',
    borderWidth: 1,
    borderColor: 'rgba(255,180,172,0.28)',
  },
  featuredBadgeText: {
    fontFamily: 'Inter-Bold',
    fontSize: 10,
    letterSpacing: 1.1,
    color: '#ffb4ac',
  },
  content: {
    flex: 1,
    justifyContent: 'flex-end',
    padding: 18,
  },
  detailsPressable: {
    alignSelf: 'stretch',
  },
  title: {
    fontFamily: 'EBGaramond-SemiBold',
    fontSize: 29,
    lineHeight: 31,
    color: '#f3efed',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginTop: 7,
  },
  genre: {
    maxWidth: '58%',
    fontFamily: 'Inter-Regular',
    fontSize: 13,
    color: '#e2beba',
  },
  metaText: {
    fontFamily: 'Inter-Regular',
    fontSize: 13,
    color: '#e2beba',
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(226,190,186,0.6)',
  },
  timesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 15,
  },
  timeChip: {
    paddingHorizontal: 13,
    paddingVertical: 8,
    borderRadius: 9,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  timeText: {
    fontFamily: 'Inter-Bold',
    fontSize: 13,
    color: '#fff',
  },
  actionRow: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 15,
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#b22222',
  },
  actionText: {
    fontFamily: 'Inter-Bold',
    fontSize: 13,
    color: '#fff',
  },
});
