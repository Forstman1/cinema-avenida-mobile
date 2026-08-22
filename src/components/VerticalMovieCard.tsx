import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import PosterImage from './PosterImage';
import type { Movie } from '../types/movie';

interface VerticalMovieCardProps {
  movie: Movie;
  onPress: (movie: Movie) => void;
  onTimePress?: (movie: Movie, time: string) => void;
}

const DEFAULT_SLOTS = ['18:00', '20:30', '22:30'];

export default function VerticalMovieCard({ movie, onPress, onTimePress }: VerticalMovieCardProps) {
  const [selectedTime, setSelectedTime] = useState<string>('20:30');

  const handleTimePress = (time: string) => {
    setSelectedTime(time);
    onTimePress?.(movie, time);
  };

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={() => onPress(movie)}
      style={styles.container}
    >
      <PosterImage
        uri={movie.poster}
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
          {DEFAULT_SLOTS.map((time) => {
            const isSelected = time === selectedTime;
            return (
              <TouchableOpacity
                key={time}
                activeOpacity={0.8}
                onPress={() => handleTimePress(time)}
                style={[styles.chip, isSelected && styles.chipSelected]}
              >
                <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>{time}</Text>
              </TouchableOpacity>
            );
          })}
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
  chipSelected: {
    backgroundColor: '#b22222',
    borderColor: '#b22222',
    shadowColor: 'rgba(178,34,34,0.3)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 4,
  },
  chipText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 12,
    color: '#e5e2e1',
  },
  chipTextSelected: {
    color: '#fff',
  },
});
