import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';

export const POSTER_PLACEHOLDER =
  'https://placehold.co/600x900/201f1f/e2beba?text=Cin%C3%A9ma+Avenida';

interface PosterImageProps {
  uri?: string;
  style?: any;
  contentFit?: 'cover' | 'contain' | 'fill' | 'none' | 'scale-down';
  borderRadius?: number;
}

export default function PosterImage({
  uri,
  style,
  contentFit = 'cover',
  borderRadius,
}: PosterImageProps) {
  const [failed, setFailed] = useState(false);

  const source = uri && !failed ? { uri } : POSTER_PLACEHOLDER;

  return (
    <View style={[styles.wrapper, style, borderRadius ? { borderRadius, overflow: 'hidden' } : null]}>
      <Image
        source={source}
        style={[styles.image, { borderRadius }]}
        contentFit={contentFit}
        onError={() => setFailed(true)}
        transition={200}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    overflow: 'hidden',
    backgroundColor: '#201f1f',
  },
  image: {
    width: '100%',
    height: '100%',
  },
});
