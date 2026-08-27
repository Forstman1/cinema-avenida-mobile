import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';

import { createQRCodePath } from '../utils/qr';

interface NativeQRCodeProps {
  value: string;
  size?: number;
}

export default function NativeQRCode({ value, size = 180 }: NativeQRCodeProps) {
  const qrCode = useMemo(() => createQRCodePath(value), [value]);

  if (!qrCode) {
    return <Text style={styles.error}>Code QR indisponible.</Text>;
  }

  return (
    <View accessibilityRole="image" accessibilityLabel="Code QR du billet">
      <Svg
        width={size}
        height={size}
        viewBox={`0 0 ${qrCode.viewBoxSize} ${qrCode.viewBoxSize}`}
      >
        <Rect width={qrCode.viewBoxSize} height={qrCode.viewBoxSize} fill="#fff" />
        <Path d={qrCode.path} fill="#111" />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  error: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    color: '#b22222',
    textAlign: 'center',
  },
});
