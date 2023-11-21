import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { TournamentGraphService } from './graph/tournament-graph.service';
import logger from '../../utils/logging/winston-config';
import { TournamentRating } from '@prisma/client';

@Injectable()
export class TournamentService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly tournamentGraphService: TournamentGraphService,
  ) {}

  async getUsersTournamentRankings(userId: number) {
    const rankings = await this.tournamentGraphService.getUsersTournamentRankings(userId);

    // Get movies from prisma
    const movies = await this.prismaService.movie.findMany({
      where: { id: { in: Array.from(rankings.keys()) } },
    });

    // Order movies by rankings
    movies.sort((a, b) => {
      return rankings.get(b.id)! - rankings.get(a.id)!;
    });

    logger.info(`Returning ${movies.length} movie rankings for user ${userId}`);
    return movies;
  }

  async tournamentRankMovieForUser(userId: number, winnerId: number, loserId: number) {
    // Add to database first to make sure it's working
    await this.addTournamentRankToDatabase(userId, winnerId, loserId);

    // Then add to graph
    await this.tournamentGraphService.tournamentRankMovieForUser(userId, winnerId, loserId, winnerId);

    return 'Successfully ranked movie';
  }

  async getMatchup(userId: number) {
    const usersTournamentRanking = await this.prismaService.tournamentRating.findMany({
      where: { userId },
    });

    // Ranomize if getting liked or disliked movies
    // TODO: Make this depend on the user's preferences or where the movie counts in tournament rankins are lower
    const liked = Math.random() < 0.5;
    const userSwipedMovies = await this.prismaService.userMovieRating.findMany({
      where: { userId, likedStatus: liked ? 'liked' : 'disliked' },
    });
    // Shuffle array to make matchups random
    userSwipedMovies.sort(() => Math.random() - 0.5);
    logger.info(
      `Getting matchup of ${liked ? 'liked' : 'disliked'} movies for user ${userId} with ${
        userSwipedMovies.length
      } swiped movies`,
    );

    // Count how many times each movie has been ranked
    const movieCounts = new Map<number, number>();
    for (const ranking of usersTournamentRanking) {
      if (!movieCounts.has(ranking.movie1Id)) {
        movieCounts.set(ranking.movie1Id, 0);
      }
      if (!movieCounts.has(ranking.movie2Id)) {
        movieCounts.set(ranking.movie2Id, 0);
      }

      movieCounts.set(ranking.movie1Id, movieCounts.get(ranking.movie1Id)! + 1);
      movieCounts.set(ranking.movie2Id, movieCounts.get(ranking.movie2Id)! + 1);
    }

    // Find the two movies with the lowest count or no count
    const lowestCountMovie: { movieId: number; count: number } = {
      movieId: -1,
      count: Number.MAX_SAFE_INTEGER,
    };
    const secondLowestCountMovie: { movieId: number; count: number } = {
      movieId: -1,
      count: Number.MAX_SAFE_INTEGER,
    };
    for (const userSwipedMovie of userSwipedMovies) {
      if (
        movieCounts.has(userSwipedMovie.movieId) &&
        movieCounts.get(userSwipedMovie.movieId)! < lowestCountMovie.count
      ) {
        secondLowestCountMovie.movieId = lowestCountMovie.movieId;
        secondLowestCountMovie.count = lowestCountMovie.count;
        lowestCountMovie.movieId = userSwipedMovie.movieId;
        lowestCountMovie.count = movieCounts.get(userSwipedMovie.movieId)!;
      } else if (
        movieCounts.has(userSwipedMovie.movieId) &&
        movieCounts.get(userSwipedMovie.movieId)! < secondLowestCountMovie.count
      ) {
        secondLowestCountMovie.movieId = userSwipedMovie.movieId;
        secondLowestCountMovie.count = movieCounts.get(userSwipedMovie.movieId)!;
      } else if (!movieCounts.has(userSwipedMovie.movieId)) {
        secondLowestCountMovie.movieId = lowestCountMovie.movieId;
        secondLowestCountMovie.count = lowestCountMovie.count;
        lowestCountMovie.movieId = userSwipedMovie.movieId;
        lowestCountMovie.count = movieCounts.get(userSwipedMovie.movieId)!;
      }
      console.log(lowestCountMovie);
      console.log(secondLowestCountMovie);
    }

    const lowestMovies = await this.prismaService.movie.findMany({
      where: { id: { in: [lowestCountMovie.movieId, secondLowestCountMovie.movieId] } },
    });
    return lowestMovies;
  }

  // Finds an existing rating for a user and returns the tournamentRating
  private async findExistingPreference(
    userId: number,
    winnerId: number,
    loserId: number,
  ): Promise<undefined | TournamentRating> {
    const existingRating = await this.prismaService.tournamentRating.findFirst({
      where: {
        userId,
        OR: [
          { movie1Id: winnerId, movie2Id: loserId },
          { movie1Id: loserId, movie2Id: winnerId },
        ],
      },
    });

    return existingRating ?? undefined;
  }

  private async addTournamentRankToDatabase(userId: number, winnerId: number, loserId: number): Promise<void> {
    const existingPreference = await this.findExistingPreference(userId, winnerId, loserId);

    // If existingPreference undefined -> new preference, if not equal to winnerId -> update, else nothing
    if (!existingPreference) {
      await this.prismaService.tournamentRating.create({
        data: { userId, movie1Id: winnerId, movie2Id: loserId, winnerId },
      });
      logger.info(`Added new preference for user ${userId}, for winner ${winnerId} and loser ${loserId}`);
    } else if (existingPreference.winnerId !== winnerId) {
      await this.prismaService.tournamentRating.update({
        where: { id: existingPreference.id },
        data: { winnerId },
      });
      logger.info(`Updated preference for user ${userId}, for winner ${winnerId} and loser ${loserId}`);
    }
  }
}
