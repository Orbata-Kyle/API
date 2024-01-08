import { Injectable } from '@nestjs/common';
import { Movie, Prisma } from '@prisma/client';
import logger from '../utils/logging/winston-config';
import { PrismaService } from '../prisma/prisma.service';
import { MovieCreateInputAndRelations, TheMovieDb } from '../services/the-movie-db.service';

@Injectable()
export class MovieCacheService {
  constructor(private readonly prisma: PrismaService, private readonly theMovieDb: TheMovieDb) {}

  async getPopularMovies(page: number, onlyReleased = true): Promise<Movie[]> {
    const moviesToSave = await this.theMovieDb.getPopularMovies(page, onlyReleased);
    await this.saveMoviesToDb(moviesToSave);

    const movies = await this.getMovies(moviesToSave.map((movie) => movie.id));
    return movies;
  }

  async getTopRatedMovies(page: number, onlyReleased = true): Promise<Movie[]> {
    const moviesToSave = await this.theMovieDb.getTopRatedMovies(page, onlyReleased);
    await this.saveMoviesToDb(moviesToSave);

    const movies = await this.getMovies(moviesToSave.map((movie) => movie.id));
    return movies;
  }

  async searchForMovieByTitle(title: string): Promise<Movie[]> {
    const moviesToSave = await this.theMovieDb.searchForMovieByTitle(title);
    await this.saveMoviesToDb(moviesToSave);

    const movies = await this.getMovies(moviesToSave.map((movie) => movie.id));
    return movies;
  }

  async ensureMovieInDb(id: number): Promise<Movie> {
    // Wrapper with different name for clarity
    return this.getMovieById(id, false);
  }

  async getMovieById(id: number, saveRelations = true): Promise<Movie> {
    const movieFromDb = await this.prisma.movie.findUnique({
      where: { id },
    });

    if (movieFromDb) {
      logger.info(`Found movie with id ${id} in DB`);
      return movieFromDb;
    }

    const movieToSave = await this.theMovieDb.getMovieById(id);

    const movie = await this.saveMovieToDb(movieToSave, saveRelations);

    return movie;
  }

  private async saveMoviesToDb(movies: Prisma.MovieCreateInput[], skipDuplicates = true): Promise<void> {
    const savedMovies = await this.prisma.movie.createMany({
      data: movies,
      skipDuplicates,
    });

    logger.info(`Saved ${savedMovies.count} movies to DB`);

    return;
  }

  private async saveMovieToDb(movieAndRelations: MovieCreateInputAndRelations, saveRelations = true): Promise<Movie> {
    const savedMovie = await this.prisma.movie.create({
      data: movieAndRelations.movieCreateInput,
    });

    logger.info(`Saved 1 movie to DB`);

    if (saveRelations) {
      const savedMovieGenres = await this.prisma.movieGenre.createMany({
        data: movieAndRelations.movieGenreCreateInputs,
      });
      logger.info(`Saved ${savedMovieGenres.count} movieGenre relation to DB`);
    }

    return savedMovie;
  }

  private async getMovies(movieIds: number[]): Promise<Movie[]> {
    const movies = await this.prisma.movie.findMany({
      where: { id: { in: movieIds } },
    });

    return movies;
  }
}
