import { Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { TheMovieDb } from '../../services/the-movie-db.service';
import logger from '../../utils/logging/winston-config';

@Injectable()
export class SwipeService {
  private popularMoviesCache: Map<number, Prisma.MovieCreateInput[]> = new Map();
  private popularMoviesCacheLastFetched: Date | null = null;
  private topRatedMoviesCache: Map<number, Prisma.MovieCreateInput[]> = new Map();
  private topRatedMoviesCacheLastFetched: Date | null = null;
  private noMorePopularMovies = false;
  private noMoreTopRatedMovies = false;

  constructor(private readonly prisma: PrismaService, private readonly theMovieDb: TheMovieDb) {}

  private async refreshPopularMovies(page = 1) {
    const now = new Date();
    const tvelveHours = 12 * 60 * 60 * 1000;

    if (
      !this.popularMoviesCache.has(page) ||
      !this.popularMoviesCacheLastFetched ||
      now.getTime() - this.popularMoviesCacheLastFetched.getTime() > tvelveHours
    ) {
      this.popularMoviesCache.set(page, await this.theMovieDb.getPopularMovies(page));
      this.prisma.saveMoviesToDb(this.popularMoviesCache.get(page), true);
      this.popularMoviesCacheLastFetched = now;
    }
  }

  private async refreshTopRatedMovies(page = 1) {
    const now = new Date();
    const tvelveHours = 12 * 60 * 60 * 1000;

    if (
      !this.topRatedMoviesCache.has(page) ||
      !this.topRatedMoviesCacheLastFetched ||
      now.getTime() - this.topRatedMoviesCacheLastFetched.getTime() > tvelveHours
    ) {
      this.topRatedMoviesCache.set(page, await this.theMovieDb.getTopRatedMovies(page));
      this.prisma.saveMoviesToDb(this.topRatedMoviesCache.get(page), true);
      this.topRatedMoviesCacheLastFetched = now;
    }
  }

  async getNextMovieToSwipe(userId: number) {
    let filteredMovie: Prisma.MovieCreateInput | undefined;
    let popularPage = 1;
    let topRatedPage = 1;
    // TODO: also randomdly get from recommended lists from similarity scores
    // Let random chance decide whether to get a movie from popular or top rated
    const fromPopularMovies = Math.random() < 0.5;

    // Iterate pages of popular and top rated movies until we find one that the user hasn't watched
    while (!filteredMovie) {
      const {
        movies: relevantMovieList,
        popularPage: updatedPopularPage,
        topRatedPage: updatedTopRatedPage,
      } = await this.getRelevantMovies(fromPopularMovies, popularPage, topRatedPage);
      popularPage = updatedPopularPage;
      topRatedPage = updatedTopRatedPage;

      // Find and filter out movies that the user has already watched
      const alreadyWatchedMovies = await this.prisma.userMovieRating.findMany({
        where: {
          userId,
          movieId: {
            in: relevantMovieList.map((movie) => movie.id),
          },
        },
        select: {
          movieId: true,
        },
      });

      const alreadyWatchedMovieIds = new Set(alreadyWatchedMovies.map((movie) => movie.movieId));

      filteredMovie = relevantMovieList.find((movie) => {
        return !alreadyWatchedMovieIds.has(movie.id);
      });
    }

    return filteredMovie;
  }

  private async getRelevantMovies(
    fromPopularMovies: boolean,
    popularPage: number,
    topRatedPage: number,
  ): Promise<{ movies: Prisma.MovieCreateInput[]; popularPage: number; topRatedPage: number }> {
    let relevantMovieList: Prisma.MovieCreateInput[] = [];
    // Get from popular movies if we haven't run out of popular movies and randomness says so or if we've run out of top rated movies
    if ((fromPopularMovies && !this.noMorePopularMovies) || this.noMoreTopRatedMovies) {
      try {
        await this.refreshPopularMovies(popularPage);
        relevantMovieList = this.popularMoviesCache.get(popularPage++);
      } catch (e) {
        if (e instanceof NotFoundException) {
          // If we've run out of popular movies, try to get a movie from top rated movies
          logger.error(e);
          this.noMorePopularMovies = true;
          if (this.noMoreTopRatedMovies) throw new NotFoundException('No remaining movies in top rated or popular movies.');
          try {
            await this.refreshTopRatedMovies(topRatedPage);
            relevantMovieList = this.topRatedMoviesCache.get(topRatedPage++);
          } catch (e) {
            logger.error(e);
            throw new NotFoundException('No remaining movies in top rated or popular movies.');
          }
        } else {
          throw e;
        }
      }
    } else {
      try {
        await this.refreshTopRatedMovies(topRatedPage);
        relevantMovieList = this.topRatedMoviesCache.get(topRatedPage++);
      } catch (e) {
        if (e instanceof NotFoundException) {
          // If we've run out of top rated movies, try to get a movie from popular movies
          logger.error(e);
          this.noMoreTopRatedMovies = true;
          if (this.noMorePopularMovies) throw new NotFoundException('No remaining movies in top rated or popular movies.');
          try {
            await this.refreshPopularMovies(popularPage);
            relevantMovieList = this.popularMoviesCache.get(popularPage++);
          } catch (e) {
            logger.error(e);
            throw new NotFoundException('No remaining movies in top rated or popular movies.');
          }
        } else {
          throw e;
        }
      }
    }

    return { movies: relevantMovieList, popularPage, topRatedPage };
  }
}
