import React from 'react';
import {
  Alert,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';

import { useAuth } from '../context/AuthContext';

function getInitial(name: string): string {
  return name?.trim()?.charAt(0)?.toUpperCase() ?? '?';
}

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const insets = useSafeAreaInsets();

  const handleLogout = () => {
    Alert.alert(
      'Se déconnecter ?',
      '',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Se déconnecter',
          style: 'destructive',
          onPress: async () => {
            await logout();
            // The root navigator (AppNavigator) watches `user` and will switch
            // from RootNavigator to AuthNavigator automatically.
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={[styles.container, { paddingBottom: insets.bottom }]}>
      <StatusBar barStyle="light-content" />

      <View style={styles.content}>
        {/* Avatar */}
        <View style={styles.avatarWrapper}>
          <View style={styles.avatar}>
            <Text style={styles.avatarInitial}>{getInitial(user?.name ?? '')}</Text>
          </View>
        </View>

        {/* Name + email */}
        <Text style={styles.name} numberOfLines={1}>{user?.name ?? 'Invité'}</Text>
        <Text style={styles.email} numberOfLines={1}>{user?.email ?? ''}</Text>

        {/* Profile row — display only, no backend route exists */}
        <View style={styles.row}>
          <View style={styles.rowIcon}>
            <MaterialIcons name="person" size={20} color="#e2beba" />
          </View>
          <Text style={styles.rowText}>Modifier mon profil</Text>
          <MaterialIcons name="chevron-right" size={20} color="#666" />
        </View>

        {/* Admin film management is now a top-level bottom tab. */}
      </View>

      {/* Logout button */}
      <View style={styles.footer}>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout} activeOpacity={0.9}>
          <MaterialIcons name="logout" size={20} color="#fff" />
          <Text style={styles.logoutButtonText}>Se déconnecter</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#131313',
    justifyContent: 'space-between',
  },
  content: {
    alignItems: 'center',
    paddingTop: 40,
    paddingHorizontal: 24,
  },
  avatarWrapper: {
    marginBottom: 24,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#201f1f',
    borderWidth: 3,
    borderColor: '#b22222',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    fontFamily: 'EBGaramond-Bold',
    fontSize: 48,
    color: '#b22222',
  },
  name: {
    fontFamily: 'EBGaramond-SemiBold',
    fontSize: 30,
    color: '#e5e2e1',
    marginBottom: 8,
    textAlign: 'center',
  },
  email: {
    fontFamily: 'Inter-Regular',
    fontSize: 15,
    color: '#aa8986',
    marginBottom: 40,
    textAlign: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    backgroundColor: '#201f1f',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    paddingHorizontal: 16,
    paddingVertical: 18,
    opacity: 0.6,
    marginBottom: 12,
  },
  adminRow: {
    opacity: 1,
  },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  rowText: {
    flex: 1,
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
    color: '#e5e2e1',
  },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 32,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#b22222',
    borderRadius: 14,
    paddingVertical: 16,
    shadowColor: 'rgba(0,0,0,0.5)',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 8,
  },
  logoutButtonText: {
    fontFamily: 'Inter-Bold',
    fontSize: 16,
    color: '#fff',
  },
});
