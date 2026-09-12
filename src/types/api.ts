export type UserRole = 'CLIENT' | 'ADMIN';
export type SeatStatus = 'LIBRE' | 'OCCUPE' | 'VERROUILLE';
/** Seat categories are defined by the cinema configuration returned by the API. */
export type SeatCategory = string;
export type ReservationStatus = 'EN_ATTENTE' | 'CONFIRMED' | 'CANCELLED';
export type TicketStatus = 'VALID' | 'CANCELLED';

/** API calendar values are kept as date-only strings, never Date instances. */
export type ISODateString = string & { readonly __brand: 'ISODateString' };
export type TimeString = string & { readonly __brand: 'TimeString' };

export interface User {
  id: number;
  name: string;
  email: string;
  role: UserRole;
}

export interface MovieSummary {
  id: number;
  title: string;
  poster: string | null;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: User;
}

export interface SignupRequest {
  name: string;
  email: string;
  password: string;
}

export interface SignupResponse {
  id: number;
  name: string;
  email: string;
}

export interface UpdateProfileRequest {
  name: string;
}

export type UpdateProfileResponse = User;

export interface AuthResult {
  success: boolean;
  message?: string;
}

export interface CinemaConfig {
  capacity: number;
  timezone: string;
  screeningSlots: TimeString[];
  seatCategories: Record<SeatCategory, number>;
}

export interface Movie {
  id: number;
  title: string;
  synopsis: string;
  duration: number;
  genre: string;
  poster: string | null;
  screenings?: Screening[];
}

export type MovieReference = Movie | MovieSummary;

export interface Screening {
  id: number;
  date: ISODateString;
  showTime: TimeString;
  movieId: number;
  availableSeats?: number;
}

export interface ReservationScreening {
  id: number;
  date: ISODateString;
  showTime: TimeString;
  movieId: number;
  movie: MovieSummary;
}

export type ScreeningReference = Screening | ReservationScreening;

export interface MovieRequest {
  title: string;
  synopsis: string;
  duration: number;
  genre: string;
  poster?: string;
}

export interface ScreeningRequest {
  movieId: number;
  date: ISODateString;
  showTime: TimeString;
}

export interface Seat {
  id: number;
  row: string;
  number: number;
  category: SeatCategory;
  status: SeatStatus;
}

export interface ReservationSeat {
  id: number;
  lockedUntil: string | null;
  reservationId: number;
  seatId: number;
  seat: Seat;
}

export interface Reservation {
  id: number;
  totalAmount: number;
  status: ReservationStatus;
  reservedAt: string;
  userId: number;
  screeningId: number;
  screening: ReservationScreening;
  reservationSeats: ReservationSeat[];
  ticket: Ticket | null;
}

export interface Ticket {
  id: number;
  qrCode: string;
  status: TicketStatus;
}

export interface UnavailableSeat {
  id: number;
  row: string;
  number: number;
}

export interface LockReservationConflict {
  message: string;
  seats: UnavailableSeat[];
  pendingReservationId?: number;
}

export interface ApiErrorBody {
  message?: string | string[];
  error?: string;
  code?: string;
  statusCode?: number;
  pendingReservationId?: number;
  seats?: UnavailableSeat[];
  [key: string]: unknown;
}

/** Stable error shape exposed by the API layer to the rest of the app. */
export interface ApiError {
  message: string;
  code?: string;
}

/** Transport metadata kept by the API boundary for status-aware flows. */
export interface ApiErrorDetails extends ApiError {
  status: number | null;
  body: ApiErrorBody | null;
  isNetworkError: boolean;
}

export interface AdminTopMovie {
  title: string;
  count: number;
}

export interface AdminQuickStats {
  totalMovies: number;
  totalScreeningsThisWeek: number;
  pendingReservationsCount: number;
}

export interface AdminDashboard {
  todayRevenue: number;
  todayReservationsCount: number;
  todayOccupancyRate: number;
  weekRevenue: number;
  weekReservationsCount: number;
  weekOccupancyRate: number;
  topMovieThisWeek: AdminTopMovie | null;
  quickStats: AdminQuickStats;
}

export type GetMoviesRequest = {
  current?: boolean;
};
export type GetMoviesResponse = Movie[];
export type GetMovieByIdRequest = number;
export type GetMovieByIdResponse = Movie;
export type GetScreeningsByMovieIdRequest = number;
export type GetScreeningsByMovieIdResponse = Screening[];
export type GetScreeningsByDateRequest = ISODateString;
export type GetScreeningsByDateResponse = Screening[];
export type CreateMovieRequest = MovieRequest;
export type CreateMovieResponse = Movie;
export type UpdateMovieRequest = { id: number; payload: MovieRequest };
export type UpdateMovieResponse = Movie;
export type CreateScreeningRequest = ScreeningRequest;
export type CreateScreeningResponse = Screening;
export type UpdateScreeningRequest = { id: number; payload: ScreeningRequest };
export type UpdateScreeningResponse = Screening;
export type DeleteScreeningRequest = number;
export interface DeleteScreeningResponse {
  message: string;
}

export type GetSeatsByScreeningIdRequest = number;
export type GetSeatsByScreeningIdResponse = Seat[];
export interface LockReservationRequest {
  screeningId: number;
  seatIds: number[];
}
export type LockReservationResponse = Reservation;
export type GetMyReservationsResponse = Reservation[];
export type CancelReservationRequest = number;
export interface CancelReservationResponse {
  message: string;
}
export type PayReservationRequest = number;
export type PayReservationApiResponse = Reservation;
export type PaidReservation = Reservation & { ticket: Ticket };
export type PayReservationResponse = PaidReservation;
export type GetAdminDashboardResponse = AdminDashboard;
export type GetCinemaConfigResponse = CinemaConfig;
