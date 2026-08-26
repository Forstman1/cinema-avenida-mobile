import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

interface CircularProgressProps {
  progress: number; // 0–100
  size?: number;
  strokeWidth?: number;
  color?: string;
  trackColor?: string;
}

/**
 * Dependency-free progress ring. Each half of the arc is a half-ring ("D" shape)
 * placed inside a full-size square that rotates around the ring's center, clipped
 * by a half-size container: rotating from -180deg to 0deg sweeps the arc in.
 */
export default function CircularProgress({
  progress,
  size = 84,
  strokeWidth = 8,
  color = '#ffb4ac',
  trackColor = 'rgba(255,255,255,0.08)',
}: CircularProgressProps) {
  const clamped = Math.max(0, Math.min(100, progress));
  const half = size / 2;
  const rightRotation = -180 + (Math.min(clamped, 50) / 50) * 180;
  const leftRotation = -180 + (Math.max(clamped - 50, 0) / 50) * 180;

  return (
    <View style={{ width: size, height: size }}>
      <View
        style={[
          styles.track,
          {
            width: size,
            height: size,
            borderRadius: half,
            borderWidth: strokeWidth,
            borderColor: trackColor,
          },
        ]}
      />
      <View style={[styles.clip, { right: 0, width: half, height: size }]}>
        <View
          style={[
            styles.rotator,
            { right: 0, width: size, height: size, transform: [{ rotate: `${rightRotation}deg` }] },
          ]}
        >
          <View
            style={[
              styles.halfRing,
              {
                right: 0,
                width: half,
                height: size,
                borderWidth: strokeWidth,
                borderLeftWidth: 0,
                borderColor: color,
                borderTopRightRadius: half,
                borderBottomRightRadius: half,
              },
            ]}
          />
        </View>
      </View>
      <View style={[styles.clip, { left: 0, width: half, height: size }]}>
        <View
          style={[
            styles.rotator,
            { left: 0, width: size, height: size, transform: [{ rotate: `${leftRotation}deg` }] },
          ]}
        >
          <View
            style={[
              styles.halfRing,
              {
                left: 0,
                width: half,
                height: size,
                borderWidth: strokeWidth,
                borderRightWidth: 0,
                borderColor: color,
                borderTopLeftRadius: half,
                borderBottomLeftRadius: half,
              },
            ]}
          />
        </View>
      </View>
      <View style={styles.center} pointerEvents="none">
        <Text style={[styles.value, { fontSize: Math.round(size * 0.24) }]}>{Math.round(clamped)}%</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    position: 'absolute',
  },
  clip: {
    position: 'absolute',
    top: 0,
    overflow: 'hidden',
  },
  rotator: {
    position: 'absolute',
    top: 0,
  },
  halfRing: {
    position: 'absolute',
  },
  center: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  value: {
    fontFamily: 'EBGaramond-SemiBold',
    color: '#e5e2e1',
  },
});
