import type { NativeStackScreenProps } from '@react-navigation/native-stack';

export type AuthStackParamList = {
  Login: undefined;
  Signup: undefined;
};

export type MainTabParamList = {
  Accueil: undefined;
  'Mes Billets': undefined;
  Profil: undefined;
};

export type RootStackParamList = {
  Main: undefined;
  MovieDetails: { movieId: string };
  Screenings: { movieId: string; movieTitle: string };
  SeatMap: { movieId: string; screeningId: string };
};

export type LoginScreenProps = NativeStackScreenProps<AuthStackParamList, 'Login'>;
export type SignupScreenProps = NativeStackScreenProps<AuthStackParamList, 'Signup'>;

export type MovieDetailsScreenProps = NativeStackScreenProps<RootStackParamList, 'MovieDetails'>;
export type ScreeningsScreenProps = NativeStackScreenProps<RootStackParamList, 'Screenings'>;
