import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';

interface ToastProps {
  message: string | null;
  onDismiss: () => void;
}

export default function Toast({ message, onDismiss }: ToastProps) {
  useEffect(() => {
    if (!message) return undefined;

    const timeout = setTimeout(onDismiss, 3500);
    return () => clearTimeout(timeout);
  }, [message, onDismiss]);

  if (!message) return null;

  return (
    <View pointerEvents="none" style={styles.container} accessibilityLiveRegion="polite">
      <Text style={styles.message}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 20,
    right: 20,
    bottom: 20,
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderRadius: 12,
    backgroundColor: '#2b1717',
    borderWidth: 1,
    borderColor: 'rgba(255,180,172,0.35)',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
  message: {
    fontFamily: 'Inter-Regular',
    fontSize: 13,
    lineHeight: 18,
    color: '#ffe7e4',
    textAlign: 'center',
  },
});
