import React from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { MaterialIcons } from '@expo/vector-icons';

import { useAuth } from '../context/AuthContext';
import LoginScreen from '../screens/LoginScreen';
import SignupScreen from '../screens/SignupScreen';
import HomeScreen from '../screens/HomeScreen';
import MyBookingsScreen from '../screens/MyBookingsScreen';
import ProfileScreen from '../screens/ProfileScreen';
import MovieDetailsScreen from '../screens/MovieDetailsScreen';
import ScreeningsScreen from '../screens/ScreeningsScreen';
import SeatMapScreen from '../screens/SeatMapScreen';
import PaymentScreen from '../screens/PaymentScreen';
import TicketScreen from '../screens/TicketScreen';
import AdminMoviesScreen from '../screens/AdminMoviesScreen';
import AddMovieScreen from '../screens/AddMovieScreen';
import ManageScreeningsScreen from '../screens/ManageScreeningsScreen';
import type { AuthStackParamList, MainTabParamList, RootStackParamList } from '../types/navigation';

const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();
const RootStack = createNativeStackNavigator<RootStackParamList>();

function AuthNavigator() {
  return (
    <AuthStack.Navigator screenOptions={{ headerShown: false }}>
      <AuthStack.Screen name="Login" component={LoginScreen} />
      <AuthStack.Screen name="Signup" component={SignupScreen} />
    </AuthStack.Navigator>
  );
}

function MainTabs() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#b22222',
        tabBarInactiveTintColor: '#888',
        tabBarStyle: {
          backgroundColor: '#121212',
          borderTopColor: 'rgba(255,255,255,0.05)',
          borderTopWidth: 1,
        },
      }}
    >
      <Tab.Screen
        name="Accueil"
        component={HomeScreen}
        options={{
          tabBarIcon: ({ color, size }) => <MaterialIcons name="home" color={color} size={size} />,
        }}
      />
      {isAdmin ? (
        <Tab.Screen
          name="Gestion"
          component={AdminMoviesScreen}
          options={{
            tabBarIcon: ({ color, size }) => (
              <MaterialIcons name="movie-creation" color={color} size={size} />
            ),
          }}
        />
      ) : (
        <Tab.Screen
          name="Mes Billets"
          component={MyBookingsScreen}
          options={{
            tabBarIcon: ({ color, size }) => (
              <MaterialIcons name="confirmation-number" color={color} size={size} />
            ),
          }}
        />
      )}
      <Tab.Screen
        name="Profil"
        component={ProfileScreen}
        options={{
          tabBarIcon: ({ color, size }) => <MaterialIcons name="person" color={color} size={size} />,
        }}
      />
    </Tab.Navigator>
  );
}

function RootNavigator() {
  return (
    <RootStack.Navigator screenOptions={{ headerShown: false }}>
      <RootStack.Screen name="Main" component={MainTabs} />
      <RootStack.Screen name="MovieDetails" component={MovieDetailsScreen} />
      <RootStack.Screen name="Screenings" component={ScreeningsScreen} />
      <RootStack.Screen name="SeatMap" component={SeatMapScreen} />
      <RootStack.Screen name="Payment" component={PaymentScreen} />
      <RootStack.Screen name="Ticket" component={TicketScreen} />
      <RootStack.Screen name="AdminMovies" component={AdminMoviesScreen} />
      <RootStack.Screen name="AddMovie" component={AddMovieScreen} />
      <RootStack.Screen name="ManageScreenings" component={ManageScreeningsScreen} />
    </RootStack.Navigator>
  );
}

export default function AppNavigator() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={styles.splash}>
        <ActivityIndicator size="large" color="#b22222" />
      </View>
    );
  }

  return user ? <RootNavigator /> : <AuthNavigator />;
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    backgroundColor: '#0a0a0a',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
