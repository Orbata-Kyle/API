import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosError } from 'axios';
import type { Prisma } from '@prisma/client';
import logger from '../utils/logging/winston-config';

export interface MovieDbMovie {
  adult: boolean;
  backdrop_path: string;
  genre_ids: number[];
  id: number;
  original_language: string;
  original_title: string;
  overview: string;
  popularity: number;
  poster_path: string;
  release_date: string;
  title: string;
  video: boolean;
  vote_average: number;
  vote_count: number;
}

@Injectable()
export class TheMovieDb {
  private apiKey: string;
  private apiBaseUrl = `https://api.themoviedb.org/3/`;

  constructor(private config: ConfigService) {
    this.apiKey = this.config.get<string>('THE_MOVIE_DB_API_KEY');
  }

  private toPrismaMovie(movie: MovieDbMovie): Prisma.MovieCreateInput {
    return {
      id: movie.id,
      title: movie.original_title,
      backdropUrl: movie.backdrop_path ? `https://image.tmdb.org/t/p/original${movie.backdrop_path}` : undefined,
      posterUrl: movie.poster_path ? `https://image.tmdb.org/t/p/original${movie.poster_path}` : undefined,
      releaseDate: new Date(movie.release_date),
      synopsis: movie.overview,
    };
  }

  async getPopularMovies() {
    const url = new URL(`${this.apiBaseUrl}movie/popular`);

    const response = await axios.get<{ page: number; results: MovieDbMovie[] }>(url.toString(), {
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        Accept: 'application/json',
      },
    });

    return response.data.results.map(this.toPrismaMovie);
  }

  async searchForMovieByTitle(title: string) {
    const url = new URL(`${this.apiBaseUrl}search/movie`);
    url.searchParams.set('query', title);

    const response = await axios.get(url.toString(), {
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        Accept: 'application/json',
      },
    });

    return response.data;
  }

  async getMovieById(id: number) {
    const url = new URL(`${this.apiBaseUrl}movie/${id}`);
    try {
      const response = await axios.get(url.toString(), {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          Accept: 'application/json',
        },
      });

      return response.data;
    } catch (error) {
      if (error instanceof AxiosError) {
        logger.error(error.response?.data.status_code + ': ' + error.response?.data.status_message + ' ' + url.toString());
        throw new NotFoundException(error.response?.data.status_message);
      }
    }
  }
}
