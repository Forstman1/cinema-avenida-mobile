import React from 'react';
import { ImageBackground, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { getNextScreening } from '../utils/date';
import type { Movie, Screening } from '../types';

interface HorizontalMovieCardProps {
  movie: Movie;
  onPress: (movie: Movie, screening?: Screening) => void;
  isNew?: boolean;
}

export default function HorizontalMovieCard({ movie, onPress, isNew = false }: HorizontalMovieCardProps) {
  const hasPoster = Boolean(movie.poster);
  const nextScreening = getNextScreening(movie.screenings ?? []);

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={() => onPress(movie, nextScreening ?? undefined)}
      style={styles.container}
    >
      {hasPoster ? (
        <ImageBackground
          source={{ uri: movie.poster! }}
          style={styles.poster}
          imageStyle={styles.image}
          resizeMode="cover"
        >
          <LinearGradient
            colors={['rgba(0,0,0,0)', 'rgba(19,19,19,0.2)', 'rgba(19,19,19,0.95)']}
            locations={[0.4, 0.7, 1]}
            style={styles.gradient}
          >
            {isNew && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>NOUVEAU</Text>
              </View>
            )}
            <Text style={styles.title} numberOfLines={2}>
              {movie.title}
            </Text>
            <Text style={styles.subtitle} numberOfLines={1}>
              {movie.genre}
            </Text>
          </LinearGradient>
        </ImageBackground>
      ) : (
        <View style={styles.placeholder}>
          {isNew && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>NOUVEAU</Text>
            </View>
          )}
          <Text style={styles.placeholderTitle} numberOfLines={2}>
            {movie.title}
          </Text>
          <Text style={styles.subtitle} numberOfLines={1}>
            {movie.genre}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 260,
    height: 380,
    borderRadius: 16,
    overflow: 'hidden',
    marginRight: 16,
    backgroundColor: '#201f1f',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 8,
  },
  poster: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  image: {
    borderRadius: 16,
  },
  gradient: {
    padding: 16,
    justifyContent: 'flex-end',
    minHeight: 140,
  },
  placeholder: {
    flex: 1,
    padding: 16,
    justifyContent: 'flex-end',
    backgroundColor: '#201f1f',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: '#b22222',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
    marginBottom: 10,
  },
  badgeText: {
    fontFamily: 'Inter-Bold',
    fontSize: 10,
    color: '#fff',
    letterSpacing: 0.8,
  },
  title: {
    fontFamily: 'EBGaramond-SemiBold',
    fontSize: 22,
    color: '#fff',
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  placeholderTitle: {
    fontFamily: 'EBGaramond-SemiBold',
    fontSize: 22,
    color: '#e5e2e1',
  },
  subtitle: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: '#e2beba',
    marginTop: 4,
  },
});
