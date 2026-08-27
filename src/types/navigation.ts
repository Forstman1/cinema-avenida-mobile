import type { NavigatorScreenParams } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type {
  ISODateString,
  Movie,
  MovieReference,
  Reservation,
  Screening,
  ScreeningReference,
  Seat,
  Ticket,
} from '.';

export type AuthStackParamList = {
  Login: undefined;
  Signup: undefined;
};

export type MainTabParamList = {
  Accueil: undefined;
  'Mes Billets': undefined;
  Gestion: undefined;
  Profil: undefined;
};

export type RootStackParamList = {
  Main: NavigatorScreenParams<MainTabParamList> | undefined;
  MovieDetails: { movieId: number; screening?: Screening; initialDate?: ISODateString };
  Screenings: { movie: Movie; initialDate?: ISODateString };
  SeatMap: { movie: Movie; screening: Screening };
  Payment: { movie: MovieReference; screening: ScreeningReference; reservation: Reservation; seats: Seat[] };
  Ticket: { movie: MovieReference; screening: ScreeningReference; reservation: Reservation; ticket: Ticket; seats: Seat[] };
  AdminMovies: undefined;
  AddMovie: { movie?: Movie } | undefined;
  ManageScreenings: { movie: Movie };
  Programme: undefined;
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
export type ManageScreeningsScreenProps = NativeStackScreenProps<RootStackParamList, 'ManageScreenings'>;
export type ProgrammeScreenProps = NativeStackScreenProps<RootStackParamList, 'Programme'>;
