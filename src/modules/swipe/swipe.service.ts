import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { TheMovieDb } from '../../services/the-movie-db.service';

@Injectable()
export class SwipeService {
  private popularMoviesCache: Prisma.MovieCreateInput[] = [];
  private popularMoviesCacheLastFetched: Date | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly theMovieDb: TheMovieDb,
  ) {}

  private async refreshPopularMovies() {
    const now = new Date();
    const tvelveHours = 12 * 60 * 60 * 1000;

    if (
      !this.popularMoviesCacheLastFetched ||
      now.getTime() - this.popularMoviesCacheLastFetched.getTime() > tvelveHours
    ) {
      this.popularMoviesCache = await this.theMovieDb.getPopularMovies();
      this.prisma.saveMoviesToDb(this.popularMoviesCache, true);
      this.popularMoviesCacheLastFetched = now;
    }
  }

  async getNextMovieToSwipe(userId: number) {
    await this.refreshPopularMovies();

    const alreadyWatchedMovies = await this.prisma.userMovieRating.findMany({
      where: {
        userId,
        movieId: {
          in: this.popularMoviesCache.map((movie) => movie.id),
        },
      },
    });

    const alreadyWatchedMovieIds = new Set(
      alreadyWatchedMovies.map((movie) => movie.movieId),
    );

    const filteredMovie = this.popularMoviesCache.find((movie) => {
      return !alreadyWatchedMovieIds.has(movie.id);
    });

    return filteredMovie;
  }
}
