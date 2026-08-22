export interface Movie {
  id: string;
  title: string;
  synopsis: string;
  duration: string;
  genre: string;
  poster: string;
}

export interface Screening {
  id: string;
  date: string;
  showTime: string;
  movieId: string;
}
