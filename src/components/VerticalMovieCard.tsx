import React, { useMemo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import PosterImage from './PosterImage';
import { compareShowTimes } from '../utils/date';
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
    >
      <PosterImage
        uri={movie.poster}
        title={movie.title}
        style={styles.poster}
        borderRadius={10}
      />
      <View style={styles.content}>
        <View>
          <Text style={styles.title} numberOfLines={1}>
            {movie.title}
          </Text>
          <View style={styles.metaRow}>
            <Text style={styles.metaText}>{movie.genre}</Text>
            <View style={styles.dot} />
            <MaterialIcons name="schedule" size={14} color="#aa8986" />
            <Text style={styles.metaText}>{movie.duration}</Text>
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
    borderColor: 'rgba(255,255,255,0.05)',
    padding: 12,
    gap: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 4,
  },
  poster: {
    width: 90,
    height: 130,
    borderRadius: 10,
    backgroundColor: '#2a2a2a',
  },
  content: {
    flex: 1,
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  title: {
    fontFamily: 'EBGaramond-SemiBold',
    fontSize: 18,
    color: '#e5e2e1',
    marginBottom: 6,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  metaText: {
    fontFamily: 'Inter-Regular',
    fontSize: 13,
    color: '#aa8986',
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
    gap: 8,
    marginTop: 8,
  },
  chip: {
    backgroundColor: '#353534',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  chipText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 12,
    color: '#e5e2e1',
  },
});
