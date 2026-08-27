import { Platform } from 'react-native';

const configuredApiUrl = process.env.EXPO_PUBLIC_API_URL?.trim();

/**
 * EXPO_PUBLIC_API_URL is safe to expose because it contains only the API
 * address, never credentials. Platform defaults keep local development useful;
 * physical devices should always provide the machine's LAN address.
 */
export const API_BASE_URL =
  configuredApiUrl ||
  (Platform.OS === 'android' ? 'http://10.0.2.2:3000/api' : 'http://localhost:3000/api');
