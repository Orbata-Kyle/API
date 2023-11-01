import {
  BadRequestException,
  Controller,
  Get,
  Injectable,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { TheMovieDb } from '../../services/the-movie-db.service';
import logger from '../../utils/logging/winston-config';

@Injectable()
export class MovieService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly theMovieDb: TheMovieDb,
  ) {}

  async searchForMovieByTitle(title: string) {
    logger.info('Searching for movie by title: ' + title);
    const response = await this.theMovieDb.searchForMovieByTitle(title);

    const moviesToSave: Prisma.MovieCreateManyInput[] = [];

    // Save the movies to the DB
    for (const movie of response.results) {
      if (movie.popularity > 5) {
        moviesToSave.push({
          id: movie.id,
          title: movie.original_title,
          backdropUrl: movie.backdrop_path
            ? `https://image.tmdb.org/t/p/original${movie.backdrop_path}`
            : undefined,
          posterUrl: movie.poster_path
            ? `https://image.tmdb.org/t/p/original${movie.poster_path}`
            : undefined,
          releaseDate: new Date(movie.release_date),
          synopsis: movie.overview,
        });
      }
    }

    this.prisma.saveMoviesToDb(moviesToSave);

    return moviesToSave;
  }

  async getMovieById(id: string) {
    const movieFromDb = await this.prisma.movie.findUnique({
      where: { id: parseInt(id) },
    });

    if (movieFromDb) {
      logger.info(`Found movie with id ${id} in DB`);
      return movieFromDb;
    }

    const movieFromApi = await this.theMovieDb.getMovieById(parseInt(id));
    const movieToSave: Prisma.MovieCreateInput = {
      id: movieFromApi.id,
      title: movieFromApi.original_title,
      backdropUrl: movieFromApi.backdrop_path
        ? `https://image.tmdb.org/t/p/original${movieFromApi.backdrop_path}`
        : undefined,
      posterUrl: movieFromApi.poster_path
        ? `https://image.tmdb.org/t/p/original${movieFromApi.poster_path}`
        : undefined,
      releaseDate: new Date(movieFromApi.release_date),
      synopsis: movieFromApi.overview,
    };

    const savedMovie = await this.prisma.movie.create({
      data: movieToSave,
    });
    logger.info(`Saved 1 movie to DB`);

    return savedMovie;
  }

  async rateMovieById(id: string, action: string, userId: number) {
    logger.info(`User ${userId} ${action} movie ${id}`);
    // Make sure the movie exists
    let movieFromDb = await this.prisma.movie.findUnique({
      where: { id: parseInt(id) },
    });

    if (!movieFromDb) {
      logger.warn(`Did not find movie with id ${id} in DB`);
      const movieFromApi = await this.theMovieDb.getMovieById(parseInt(id));
      const movieToSave: Prisma.MovieCreateInput = {
        id: movieFromApi.id,
        title: movieFromApi.original_title,
        backdropUrl: movieFromApi.backdrop_path
          ? `https://image.tmdb.org/t/p/original${movieFromApi.backdrop_path}`
          : undefined,
        posterUrl: movieFromApi.poster_path
          ? `https://image.tmdb.org/t/p/original${movieFromApi.poster_path}`
          : undefined,
        releaseDate: new Date(movieFromApi.release_date),
        synopsis: movieFromApi.overview,
      };
      movieFromDb = await this.prisma.movie.create({
        data: movieToSave,
      });
      logger.info(`Saved 1 movie to DB`);
    }

    const movieRating = await this.prisma.userMovieRating.create({
      data: {
        likedStatus: action,
        movieId: movieFromDb.id,
        userId: userId,
      },
    });

    return movieRating;
  }
}