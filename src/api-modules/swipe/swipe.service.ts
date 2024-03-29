import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { Movie } from '@prisma/client';
import { PrismaService } from '../../utility-modules/prisma/prisma.service';
import logger from '../../utils/logging/winston-config';
import { MovieCacheService } from '../../utility-modules/movie-cache/db-movie-cache.service';

@Injectable()
export class SwipeService {
  private popularMoviesCache: Map<number, Movie[]> = new Map();
  private popularMoviesCacheLastFetched: Date | null = null;
  private topRatedMoviesCache: Map<number, Movie[]> = new Map();
  private topRatedMoviesCacheLastFetched: Date | null = null;
  private noMorePopularMovies = false;
  private noMoreTopRatedMovies = false;

  constructor(private readonly prisma: PrismaService, private readonly movieCache: MovieCacheService) {}

  private async refreshPopularMoviesIfNecessary(page = 1) {
    const now = new Date();
    const tvelveHours = 12 * 60 * 60 * 1000;

    if (
      !this.popularMoviesCache.has(page) ||
      !this.popularMoviesCacheLastFetched ||
      now.getTime() - this.popularMoviesCacheLastFetched.getTime() > tvelveHours
    ) {
      this.popularMoviesCache.set(page, await this.movieCache.getPopularMovies(page, true));
      this.popularMoviesCacheLastFetched = now;
    }
  }

  private async refreshTopRatedMoviesIfNecessary(page = 1) {
    const now = new Date();
    const tvelveHours = 12 * 60 * 60 * 1000;

    if (
      !this.topRatedMoviesCache.has(page) ||
      !this.topRatedMoviesCacheLastFetched ||
      now.getTime() - this.topRatedMoviesCacheLastFetched.getTime() > tvelveHours
    ) {
      this.topRatedMoviesCache.set(page, await this.movieCache.getTopRatedMovies(page, true));
      this.topRatedMoviesCacheLastFetched = now;
    }
  }

  async getNextMovieToSwipe(userId: number): Promise<Movie[]> {
    const ratedByOthersMinimumCount = 1;
    const fromPopularMoviesRandomness = 0.55;
    const minimumStackSize = 100;

    // Get all movies liked or disliked by other users, not rated by current one
    // Use them ordered by number of rates at top of retunred list
    // append by top rated and popular (for diversity as it is fresher) movies not already rated by current user until at least a defined number of movies are in the list

    let filteredMovies: Movie[] = [];

    // Get movies rated (not 'unseen') by other users, not rated by current one
    let ratedByOthersGrouped = await this.prisma.userMovieRating.groupBy({
      by: ['movieId'],
      where: {
        userId: {
          not: userId,
        },
        OR: [{ interactionStatus: 'liked' }, { interactionStatus: 'disliked' }],
        movieId: {
          notIn: (
            await this.prisma.userMovieRating.findMany({
              where: {
                userId,
              },
              select: {
                movieId: true,
              },
            })
          ).map((movie) => movie.movieId),
        },
      },
      _count: {
        movieId: true,
      },
    });

    // create map of movieId to number of rates
    const ratedByOthersGroupedMapToRates = new Map<number, number>();
    ratedByOthersGrouped.forEach((movie) => {
      if (movie._count.movieId >= ratedByOthersMinimumCount) ratedByOthersGroupedMapToRates.set(movie.movieId, movie._count.movieId);
    });
    ratedByOthersGrouped = undefined; // Not use this anymore, outdated

    if (ratedByOthersGroupedMapToRates.size >= 1) {
      const moviesRatedByOthers = await this.prisma.movie.findMany({
        where: {
          id: {
            in: Array.from(ratedByOthersGroupedMapToRates.keys()),
          },
        },
      });
      // Sort by number of rates
      moviesRatedByOthers.sort((a, b) => {
        return ratedByOthersGroupedMapToRates.get(b.id) - ratedByOthersGroupedMapToRates.get(a.id);
      });
      filteredMovies = moviesRatedByOthers;
    }

    // Get by top rated then
    let topRatedPage = 1;
    let popularPage = 1;
    const moviesRatedByOthersCount = filteredMovies.length;

    // Iterate pages of top rated movies and popular ones for variety and add to return list until we have at least 40 movies
    while (filteredMovies.length <= minimumStackSize) {
      // Let random chance decide whether to get a movie from popular or top rated
      // Popular movies bring in more variety, top rated movies bring in more quality
      const fromPopularMovies = Math.random() < fromPopularMoviesRandomness;

      const {
        movies: relevantMovieList,
        popularPage: updatedPopularPage,
        topRatedPage: updatedTopRatedPage,
      } = await this.getRelevantMovies(fromPopularMovies, popularPage, topRatedPage);
      topRatedPage = updatedTopRatedPage;
      popularPage = updatedPopularPage;

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

      filteredMovies = filteredMovies.concat(
        relevantMovieList.filter((movie) => {
          return (
            !alreadyWatchedMovieIds.has(movie.id) &&
            !ratedByOthersGroupedMapToRates.has(movie.id) &&
            !filteredMovies.find((m) => m.id === movie.id)
          );
        }),
      );
    }

    // Shuffle the list of movies coming after moviesRatedByOthers in filteredMovies,
    // if there are any and if they are less than the total number of movies - 5 (arbitrary, as one getRelevantMovies call returns 20 movies and we just want to shuffle top rated and popular together)
    if (moviesRatedByOthersCount < filteredMovies.length - 5) {
      const moviesToShuffle = filteredMovies.slice(moviesRatedByOthersCount);
      for (let i = moviesToShuffle.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [moviesToShuffle[i], moviesToShuffle[j]] = [moviesToShuffle[j], moviesToShuffle[i]];
      }
      filteredMovies = filteredMovies.slice(0, moviesRatedByOthersCount).concat(moviesToShuffle);
    }

    return filteredMovies;
  }

  async undoLastSwipe(userId: number): Promise<Movie> {
    const lastSwipe = await this.prisma.userMovieRating.findFirst({
      where: {
        userId,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (!lastSwipe) throw new NotFoundException('No more swipes to undo');

    // Check if involved in tournament rating
    const tournamentRating = await this.prisma.tournamentRating.findFirst({
      where: {
        OR: [{ movie1Id: lastSwipe.movieId }, { movie2Id: lastSwipe.movieId }],
      },
    });
    if (tournamentRating) {
      throw new BadRequestException('Cannot undo a swipe that is already part of a tournament rating');
    }

    await this.prisma.userMovieRating.delete({
      where: {
        id: lastSwipe.id,
      },
    });

    return await this.prisma.movie.findUnique({
      where: {
        id: lastSwipe.movieId,
      },
    });
  }

  private async getRelevantMovies(
    fromPopularMovies: boolean,
    popularPage: number,
    topRatedPage: number,
  ): Promise<{ movies: Movie[]; popularPage: number; topRatedPage: number }> {
    let relevantMovieList: Movie[] = [];
    // Get from popular movies if we haven't run out of popular movies and randomness says so or if we've run out of top rated movies
    if ((fromPopularMovies && !this.noMorePopularMovies) || this.noMoreTopRatedMovies) {
      try {
        await this.refreshPopularMoviesIfNecessary(popularPage);
        relevantMovieList = this.popularMoviesCache.get(popularPage++);
      } catch (e) {
        if (e instanceof NotFoundException) {
          // If we've run out of popular movies, try to get a movie from top rated movies
          logger.error(e);
          this.noMorePopularMovies = true;
          if (this.noMoreTopRatedMovies) throw new NotFoundException('No remaining movies in top rated or popular movies.');
          try {
            await this.refreshTopRatedMoviesIfNecessary(topRatedPage);
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
        await this.refreshTopRatedMoviesIfNecessary(topRatedPage);
        relevantMovieList = this.topRatedMoviesCache.get(topRatedPage++);
      } catch (e) {
        if (e instanceof NotFoundException) {
          // If we've run out of top rated movies, try to get a movie from popular movies
          logger.error(e);
          this.noMoreTopRatedMovies = true;
          if (this.noMorePopularMovies) throw new NotFoundException('No remaining movies in top rated or popular movies.');
          try {
            await this.refreshPopularMoviesIfNecessary(popularPage);
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
