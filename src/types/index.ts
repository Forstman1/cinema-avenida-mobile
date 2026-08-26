export interface User {
  id: number;
  name: string;
  email: string;
  role?: string;
}

export interface SignupResponse {
  id: number;
  name: string;
  email: string;
}

export interface LoginResponse {
  token: string;
  user: User;
}

export interface AuthResult {
  success: boolean;
  message?: string;
}

export interface Movie {
  id: number;
  title: string;
  synopsis: string;
  duration: string;
  genre: string;
  poster: string | null;
  screenings?: Screening[];
}

export interface Screening {
  id: number;
  date: string;
  showTime: string;
  movieId: number;
  availableSeats: number;
}

export type SeatStatus = 'LIBRE' | 'OCCUPE' | 'VERROUILLE';
export type SeatCategory = 'CLUB' | 'NORMAL' | 'VIP';

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
  status: string;
  reservedAt?: string;
  screening?: Screening & { movie: Movie };
  reservationSeats?: ReservationSeat[];
  ticket?: Ticket;
}

export interface Ticket {
  id: number;
  qrCode: string;
  status?: string;
  // Extend as needed
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
