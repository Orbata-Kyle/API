import { Injectable } from '@nestjs/common';
import type { Movie, UserMovieRating } from '@prisma/client';
import { PrismaService } from '../../utility-modules/prisma/prisma.service';
import logger from '../../utils/logging/winston-config';
import { TournamentService } from '../tournament/tournament.service';
import { MovieCacheService } from '../../utility-modules/movie-cache/db-movie-cache.service';

@Injectable()
export class MovieService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly movieCache: MovieCacheService,
    private readonly tournamentService: TournamentService,
  ) {}

  async searchForMovieByTitle(title: string): Promise<Movie[]> {
    logger.info('Searching for movie by title: ' + title);
    const movies = await this.movieCache.searchForMovieByTitle(title);

    return movies;
  }

  async getMovieById(id: string): Promise<Movie> {
    return await this.movieCache.getMovieById(parseInt(id));
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
      if (existingRating.interactionStatus !== 'unseen' && existingRating.interactionStatus !== action) {
        await this.tournamentService.removeMovieRankings(userId, parseInt(id), existingRating.interactionStatus, action);
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
