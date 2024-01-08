import { Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosError } from 'axios';
import type { Prisma } from '@prisma/client';
import logger from '../utils/logging/winston-config';
import { PrismaService } from '../prisma/prisma.service';
interface MovieDbMovie {
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

interface MovieDbGenre {
  id: number;
  name: string;
}

export interface MovieCreateInputAndRelations {
  movieCreateInput: Prisma.MovieCreateInput;
  movieGenreCreateInputs: { movieId: number; genreId: number }[];
}

@Injectable()
export class TheMovieDb implements OnModuleInit {
  private apiKey: string;
  private apiBaseUrl = `https://api.themoviedb.org/3/`;
  private maxPages = 500;

  constructor(private config: ConfigService, private prisma: PrismaService) {
    this.apiKey = this.config.get<string>('THE_MOVIE_DB_API_KEY');
  }

  async onModuleInit(): Promise<void> {
    try {
      await this.ensureGenreInDb();
    } catch (error) {
      logger.error('Error initializing genres:', error);
    }
  }

  private toPrismaMovieCreateInput(movie: MovieDbMovie): Prisma.MovieCreateInput {
    return {
      id: movie.id,
      title: movie.original_title,
      backdropUrl: movie.backdrop_path ? `https://image.tmdb.org/t/p/original${movie.backdrop_path}` : undefined,
      posterUrl: movie.poster_path ? `https://image.tmdb.org/t/p/original${movie.poster_path}` : undefined,
      releaseDate: new Date(movie.release_date),
      synopsis: movie.overview,
      voteAverage: movie.vote_average,
      voteCount: movie.vote_count,
      popularity: movie.popularity,
      adult: movie.adult,
    };
  }

  private toPrismaGenreCreateInput(genre: MovieDbGenre): Prisma.GenreCreateInput {
    return {
      id: genre.id,
      name: genre.name,
    };
  }

  async ensureGenreInDb(): Promise<void> {
    const newGenres = await this.getGenres();

    newGenres.forEach(async (genre) => {
      await this.prisma.genre.upsert({
        where: {
          id: genre.id,
        },
        create: genre,
        update: genre,
      });
    });
  }

  async getPopularMovies(page: number, onlyReleased = true): Promise<Prisma.MovieCreateInput[]> {
    if (page > this.maxPages) throw new NotFoundException('No more popular movies');
    const url = new URL(`${this.apiBaseUrl}movie/popular?page=${page}`);

    const response = await axios.get<{ page: number; results: MovieDbMovie[] }>(url.toString(), {
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        Accept: 'application/json',
      },
    });
    if (response.data.results.length === 0) throw new NotFoundException(`No popular movies found on page ${page}`);

    const results: Prisma.MovieCreateInput[] = [];
    response.data.results.forEach((movie) => {
      if (onlyReleased && new Date(movie.release_date) > new Date()) {
        return;
      }
      results.push(this.toPrismaMovieCreateInput(movie));
    });
    return results;
  }

  async getTopRatedMovies(page: number, onlyReleased = true): Promise<Prisma.MovieCreateInput[]> {
    if (page > this.maxPages) throw new NotFoundException('No more popular movies');
    const url = new URL(`${this.apiBaseUrl}movie/top_rated?page=${page}`);

    const response = await axios.get<{ page: number; results: MovieDbMovie[] }>(url.toString(), {
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        Accept: 'application/json',
      },
    });
    if (response.data.results.length === 0) throw new NotFoundException(`No top rated movies found on page ${page}`);

    const results: Prisma.MovieCreateInput[] = [];
    response.data.results.forEach((movie) => {
      if (onlyReleased && new Date(movie.release_date) > new Date()) {
        return;
      }
      results.push(this.toPrismaMovieCreateInput(movie));
    });

    return results;
  }

  async searchForMovieByTitle(title: string, onlyReleased = true): Promise<Prisma.MovieCreateInput[]> {
    const url = new URL(`${this.apiBaseUrl}search/movie`);
    url.searchParams.set('query', title);

    const response = await axios.get(url.toString(), {
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        Accept: 'application/json',
      },
    });

    const results: Prisma.MovieCreateInput[] = [];
    response.data.results.forEach((movie) => {
      if (onlyReleased && new Date(movie.release_date) > new Date()) {
        return;
      }
      if (movie.popularity < 5) {
        return;
      }
      results.push(this.toPrismaMovieCreateInput(movie));
    });

    return results;
  }

  async getMovieById(id: number): Promise<MovieCreateInputAndRelations> {
    const url = new URL(`${this.apiBaseUrl}movie/${id}`);
    try {
      const response = await axios.get(url.toString(), {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          Accept: 'application/json',
        },
      });

      return {
        movieCreateInput: this.toPrismaMovieCreateInput(response.data),
        movieGenreCreateInputs: response.data.genres.map((genre: MovieDbGenre) => {
          return { movieId: response.data.id, genreId: genre.id };
        }),
      };
    } catch (error) {
      if (error instanceof AxiosError) {
        logger.error(error.response?.data.status_code + ': ' + error.response?.data.status_message + ' ' + url.toString());
        throw new NotFoundException(error.response?.data.status_message);
      }
    }
  }

  async getGenres(): Promise<Prisma.GenreCreateInput[]> {
    const url = new URL(`${this.apiBaseUrl}genre/movie/list`);

    const response = await axios.get(url.toString(), {
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        Accept: 'application/json',
      },
    });

    const genres = response.data.genres;

    const results: Prisma.GenreCreateInput[] = [];
    genres.forEach((genre) => {
      results.push(this.toPrismaGenreCreateInput(genre));
    });
    return results;
  }
}
