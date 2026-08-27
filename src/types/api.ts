export type UserRole = 'CLIENT' | 'ADMIN';
export type SeatStatus = 'LIBRE' | 'OCCUPE' | 'VERROUILLE';
export type SeatCategory = 'CLUB' | 'NORMAL' | 'VIP';
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

export interface AuthResult {
  success: boolean;
  message?: string;
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

export interface Screening {
  id: number;
  date: ISODateString;
  showTime: TimeString;
  movieId: number;
  availableSeats?: number;
}

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
  seatId: number;
  seat: Seat;
  lockedUntil?: string;
}

export interface Reservation {
  id: number;
  totalAmount: number;
  status: ReservationStatus;
  reservedAt?: string;
  screening?: Screening & { movie: Movie };
  reservationSeats?: ReservationSeat[];
  ticket?: Ticket;
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

export interface GetMoviesRequest {
  current?: boolean;
}
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
export type PayReservationResponse = Reservation & { ticket: Ticket };
export type GetAdminDashboardResponse = AdminDashboard;
