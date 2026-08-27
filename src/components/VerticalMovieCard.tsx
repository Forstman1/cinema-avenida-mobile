import React, { useMemo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import PosterImage from './PosterImage';
import { compareShowTimes, formatDuration } from '../utils/date';
import type { Movie, Screening } from '../types';

interface VerticalMovieCardProps {
  movie: Movie;
  screenings?: Screening[];
  onPress: (movie: Movie, screening?: Screening) => void;
  onTimePress?: (movie: Movie, screening: Screening) => void;
}

export default function VerticalMovieCard({
  movie,
  screenings = movie.screenings ?? [],
  onPress,
  onTimePress,
}: VerticalMovieCardProps) {
  const sortedScreenings = useMemo(() => {
    return [...screenings].sort((a, b) => compareShowTimes(a.showTime, b.showTime));
  }, [screenings]);

  const firstScreening = sortedScreenings[0];

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={() => onPress(movie, firstScreening)}
      style={styles.container}
      accessibilityRole="button"
      accessibilityLabel={`Voir les séances de ${movie.title}`}
    >
      <PosterImage
        uri={movie.poster}
        title={movie.title}
        style={styles.poster}
        borderRadius={10}
      />
      <View style={styles.content}>
        <View style={styles.details}>
          <Text style={styles.title} numberOfLines={2}>
            {movie.title}
          </Text>
          <View style={styles.metaRow}>
            <Text style={styles.metaText} numberOfLines={1}>{movie.genre}</Text>
            <View style={styles.dot} />
            <MaterialIcons name="schedule" size={14} color="#aa8986" />
            <Text style={styles.metaText}>{formatDuration(movie.duration)}</Text>
          </View>
        </View>
        <View style={styles.chips}>
          {sortedScreenings.length > 0 ? (
            sortedScreenings.map((screening) => {
              const time = screening.showTime;
              return (
                <TouchableOpacity
                  key={screening.id}
                  activeOpacity={0.8}
                  onPress={() => onTimePress?.(movie, screening)}
                  style={styles.chip}
                  accessibilityRole="button"
                  accessibilityLabel={`${movie.title}, séance à ${time}`}
                >
                  <Text style={styles.chipText}>{time}</Text>
                </TouchableOpacity>
              );
            })
          ) : null}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: '#201f1f',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(229,226,225,0.08)',
    padding: 10,
    gap: 13,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 3,
  },
  poster: {
    width: 84,
    height: 126,
    borderRadius: 10,
    backgroundColor: '#2a2a2a',
  },
  content: {
    flex: 1,
    justifyContent: 'space-between',
    paddingVertical: 3,
    minHeight: 126,
  },
  details: {
    gap: 5,
  },
  title: {
    fontFamily: 'EBGaramond-SemiBold',
    fontSize: 19,
    lineHeight: 21,
    color: '#e5e2e1',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    color: '#aa8986',
    flexShrink: 1,
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(170,137,134,0.5)',
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
    marginTop: 10,
  },
  chip: {
    backgroundColor: 'rgba(178,34,34,0.14)',
    borderRadius: 8,
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: 'rgba(255,180,172,0.28)',
  },
  chipText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 13,
    color: '#ffb4ac',
  },
});
