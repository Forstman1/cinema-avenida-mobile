import React, { useState } from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { Image } from 'expo-image';

interface PosterImageProps {
  uri?: string | null;
  title?: string;
  style?: StyleProp<ViewStyle>;
  contentFit?: 'cover' | 'contain' | 'fill' | 'none' | 'scale-down';
  borderRadius?: number;
}

export default function PosterImage({
  uri,
  title,
  style,
  contentFit = 'cover',
  borderRadius,
}: PosterImageProps) {
  const [failed, setFailed] = useState(false);
  const hasImage = uri && !failed;

  return (
    <View style={[styles.wrapper, style, borderRadius ? { borderRadius, overflow: 'hidden' } : null]}>
      {hasImage ? (
        <Image
          source={{ uri }}
          style={[styles.image, { borderRadius }]}
          contentFit={contentFit}
          onError={() => setFailed(true)}
          transition={200}
        />
      ) : (
        <View style={[styles.placeholder, { borderRadius }]}>
          <Text style={styles.placeholderText} numberOfLines={3}>
            {title ?? 'Cinéma Avenida'}
          </Text>
        </View>
      )}
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
  placeholder: {
    flex: 1,
    backgroundColor: '#201f1f',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
  },
  placeholderText: {
    fontFamily: 'EBGaramond-SemiBold',
    fontSize: 14,
    color: '#aa8986',
    textAlign: 'center',
  },
});
