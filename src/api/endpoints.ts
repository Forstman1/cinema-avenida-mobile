export const adminDashboardUrl = () => '/admin/dashboard';

export const loginUrl = () => '/auth/login';
export const signupUrl = () => '/auth/signup';
export const profileUrl = () => '/auth/me';

export const cinemaConfigUrl = () => '/config';

export const moviesUrl = () => '/movies';
export const movieByIdUrl = (id: number) => `/movies/${id}`;
export const movieScreeningsUrl = (id: number) => `/movies/${id}/screenings`;
export const screeningsUrl = () => '/screenings';
export const screeningByIdUrl = (id: number) => `/screenings/${id}`;

export const seatsByScreeningIdUrl = (screeningId: number) => `/screenings/${screeningId}/seats`;
export const lockReservationUrl = () => '/reservations/lock';
export const reservationsUrl = () => '/reservations/me';
export const reservationByIdUrl = (reservationId: number) => `/reservations/${reservationId}`;
export const payReservationUrl = (reservationId: number) => `/reservations/${reservationId}/pay`;
