import { Inject, Injectable } from '@nestjs/common';
import type { Prisma, UserMovieRating } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { TheMovieDb } from '../../services/the-movie-db.service';
import logger from '../../utils/logging/winston-config';
import { TournamentService } from '../tournament/tournament.service';

@Injectable()
export class MovieService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly theMovieDb: TheMovieDb,
    @Inject(TournamentService) private readonly tournamentService: TournamentService,
  ) {}

  async ensureMovieInDb(id: number): Promise<void> {
    const movieFromDb = await this.prisma.movie.findUnique({
      where: { id },
    });

    if (movieFromDb) {
      return;
    }

    const movieFromApi = await this.theMovieDb.getMovieById(id);
    const movieToSave: Prisma.MovieCreateInput = {
      id: movieFromApi.id,
      title: movieFromApi.original_title,
      backdropUrl: movieFromApi.backdrop_path ? `https://image.tmdb.org/t/p/original${movieFromApi.backdrop_path}` : undefined,
      posterUrl: movieFromApi.poster_path ? `https://image.tmdb.org/t/p/original${movieFromApi.poster_path}` : undefined,
      releaseDate: new Date(movieFromApi.release_date),
      synopsis: movieFromApi.overview,
    };

    await this.prisma.movie.create({
      data: movieToSave,
    });
    logger.info(`Saved 1 movie to DB`);

    return;
  }

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
          backdropUrl: movie.backdrop_path ? `https://image.tmdb.org/t/p/original${movie.backdrop_path}` : undefined,
          posterUrl: movie.poster_path ? `https://image.tmdb.org/t/p/original${movie.poster_path}` : undefined,
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

    logger.info(`Found movie with id ${id} in DB`);
    return movieFromDb;
  }

  async rateMovieById(id: string, action: string, userId: number): Promise<UserMovieRating> {
    logger.info(`User ${userId} ${action} movie ${id}`);
    // Make sure the movie exists
    const movieFromDb = await this.prisma.movie.findUnique({
      where: { id: parseInt(id) },
    });

    // Find out if user already rated this movie
    const existingRating = await this.prisma.userMovieRating.findFirst({
      where: { userId, movieId: parseInt(id) },
    });
    if (existingRating) {
      logger.info(`User ${userId} already rated movie ${id}`);
      const updatedRating = await this.prisma.userMovieRating.update({
        where: { id: existingRating.id },
        data: { interactionStatus: action },
      });
      if (existingRating.interactionStatus !== 'unseen') {
        await this.tournamentService.removeMovieRankingsAsInteractionStatusChanged(
          userId,
          parseInt(id),
          existingRating.interactionStatus,
          action,
        );
      }
      return updatedRating;
    }

    const movieRating = await this.prisma.userMovieRating.create({
      data: {
        interactionStatus: action,
        movieId: movieFromDb.id,
        userId: userId,
      },
    });

    return movieRating;
  }
}
