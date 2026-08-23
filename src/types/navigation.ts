import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { Movie, Reservation, Screening, Seat, Ticket } from '.';

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
  MovieDetails: { movieId: number };
  Screenings: { movie: Movie };
  SeatMap: { movie: Movie; screening: Screening };
  Payment: { movie: Movie; screening: Screening; reservation: Reservation; seats: Seat[] };
  Ticket: { movie: Movie; screening: Screening; reservation: Reservation; ticket: Ticket; seats: Seat[] };
  AdminMovies: undefined;
  AddMovie: { movie?: Movie } | undefined;
};

export type LoginScreenProps = NativeStackScreenProps<AuthStackParamList, 'Login'>;
export type SignupScreenProps = NativeStackScreenProps<AuthStackParamList, 'Signup'>;

export type MovieDetailsScreenProps = NativeStackScreenProps<RootStackParamList, 'MovieDetails'>;
export type ScreeningsScreenProps = NativeStackScreenProps<RootStackParamList, 'Screenings'>;
export type SeatMapScreenProps = NativeStackScreenProps<RootStackParamList, 'SeatMap'>;
export type PaymentScreenProps = NativeStackScreenProps<RootStackParamList, 'Payment'>;
export type TicketScreenProps = NativeStackScreenProps<RootStackParamList, 'Ticket'>;
export type AdminMoviesScreenProps = NativeStackScreenProps<RootStackParamList, 'AdminMovies'>;
export type AddMovieScreenProps = NativeStackScreenProps<RootStackParamList, 'AddMovie'>;
