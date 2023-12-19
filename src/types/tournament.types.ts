// export interface for movie with added field for rank which is a string
import { Movie } from '@prisma/client';

export type MovieWithRank = Movie & { rank: string };

export interface MatchupResponse {
  movies: Movie[];
  interactionStatus: string;
}
