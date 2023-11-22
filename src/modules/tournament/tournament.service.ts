import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { TournamentGraphService } from './graph/tournament-graph.service';
import logger from '../../utils/logging/winston-config';
import { Movie, TournamentRating, UserMovieRating } from '@prisma/client';
import { MatchupResponse, MovieWithRank } from '../../types';

@Injectable()
export class TournamentService {
  constructor(private readonly prismaService: PrismaService, private readonly tournamentGraphService: TournamentGraphService) {}

  async getUsersTournamentRankings(userId: number, liked: boolean): Promise<MovieWithRank[]> {
    const rankings = await this.tournamentGraphService.getUsersTournamentRankings(userId, liked);

    // Get movies from prisma
    const moviesWithoutRank = await this.prismaService.movie.findMany({
      where: { id: { in: Array.from(rankings.keys()) } },
    });

    // Order movies by rankings and add them to the objects
    let movies: MovieWithRank[] = moviesWithoutRank
      .map((movie, _) => {
        return {
          ...movie,
          rank: rankings.get(movie.id)!.toString(),
        };
      })
      .sort((a: MovieWithRank, b: MovieWithRank) => {
        return rankings.get(b.id)! - rankings.get(a.id)!;
      });

    // Get all movies from users likes or dislikes with id not in rankings as well as the movies and concat to movies
    const unrankedMovies = await this.prismaService.userMovieRating.findMany({
      where: { userId, likedStatus: liked ? 'liked' : 'disliked', movieId: { notIn: Array.from(rankings.keys()) } },
      include: { movie: true },
    });
    movies = movies.concat(
      unrankedMovies.map((m) => {
        return { ...m.movie, rank: 'Unranked' };
      }),
    );

    logger.info(
      `Returning ${movies.length} movie rankings for user ${userId}, with ${rankings.size} ranked movies and ${unrankedMovies.length} unranked movies`,
    );
    return movies;
  }

  async tournamentRankMovieForUser(userId: number, winnerId: number, loserId: number, liked: boolean): Promise<string> {
    // Add to database first to make sure it's working
    await this.addTournamentRankToDatabase(userId, winnerId, loserId, liked);

    // Then add to graph
    await this.tournamentGraphService.tournamentRankMovieForUser(userId, winnerId, loserId, winnerId, liked);

    return 'Successfully ranked movie';
  }

  async getMatchup(userId: number): Promise<MatchupResponse> {
    const usersTournamentRanking = await this.prismaService.tournamentRating.findMany({
      where: { userId },
    });

    // Ranomize if getting liked or disliked movies
    // TODO: Make this depend on the user's preferences or where the movie counts in tournament rankins are lower
    // TODO: Rank unranked movie against established movie from middle of ranking to find place faster
    let liked = Math.random() < 0.5;
    let userSwipedMovies = await this.prismaService.userMovieRating.findMany({
      where: { userId, likedStatus: liked ? 'liked' : 'disliked' },
    });
    if (userSwipedMovies.length < 2) {
      userSwipedMovies = await this.prismaService.userMovieRating.findMany({
        where: { userId, likedStatus: liked ? 'disliked' : 'liked' },
      });
      if (userSwipedMovies.length < 2) {
        return { movies: [], likedStatus: 'undefined' };
      }
      liked = !liked;
    }
    // Shuffle array to make matchups random
    userSwipedMovies.sort(() => Math.random() - 0.5);
    logger.info(
      `Getting matchup of ${liked ? 'liked' : 'disliked'} movies for user ${userId} with ${userSwipedMovies.length} swiped movies`,
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

    let matchupExists = true;
    let matchupMovies: Movie[];
    while (matchupExists) {
      matchupMovies = await this.findMatchupMovies(movieCounts, userSwipedMovies);

      const matchup = await this.findExistingPreference(userId, matchupMovies[0].id, matchupMovies[1].id);
      matchupExists = matchup !== undefined;

      // Remove the second best movie from the array so they don't get matched up again
      if (matchupExists) {
        logger.info(`Matchup ${matchupMovies[0].id} and ${matchupMovies[1].id} already exists for user ${userId}, finding new matchup`);
        userSwipedMovies.splice(
          userSwipedMovies.findIndex((m) => m.movieId === matchupMovies[1].id),
          1,
        );
        if (userSwipedMovies.length < 2) {
          // No matchups left
          return { movies: [], likedStatus: 'undefined' };
        }
      }
    }
    return {
      movies: matchupMovies,
      likedStatus: liked ? 'liked' : 'disliked',
    };
  }

  async removeMovieRankingsAsLikedStatusChanged(userId: number, movieId: number, prevLikedStatus: string, newLikedStatus: string) {
    if (prevLikedStatus !== 'liked' && prevLikedStatus !== 'disliked') return;
    if (newLikedStatus === prevLikedStatus) return;

    // Get all matchups with this movie
    const matchups = await this.prismaService.tournamentRating.findMany({
      where: { userId, likedStatus: prevLikedStatus, OR: [{ movie1Id: movieId }, { movie2Id: movieId }] },
    });

    if (matchups.length === 0) return;

    // Remove them from the graph
    for (const matchup of matchups) {
      await this.tournamentGraphService.findAndRemovePreferenceCombination(
        userId,
        matchup.movie1Id,
        matchup.movie2Id,
        prevLikedStatus === 'liked',
      );
    }

    // Remove them from the database
    await this.prismaService.tournamentRating.deleteMany({
      where: { userId, likedStatus: prevLikedStatus, OR: [{ movie1Id: movieId }, { movie2Id: movieId }] },
    });

    logger.info(
      `Removed ${matchups.length} matchups for user ${userId} with movie ${movieId} as likedStatus changed from ${prevLikedStatus} to ${newLikedStatus}`,
    );
  }

  private async findMatchupMovies(movieCounts: Map<number, number>, userSwipedMovies: UserMovieRating[]): Promise<Movie[]> {
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
      if (movieCounts.has(userSwipedMovie.movieId) && movieCounts.get(userSwipedMovie.movieId)! < lowestCountMovie.count) {
        secondLowestCountMovie.movieId = lowestCountMovie.movieId;
        secondLowestCountMovie.count = lowestCountMovie.count;
        lowestCountMovie.movieId = userSwipedMovie.movieId;
        lowestCountMovie.count = movieCounts.get(userSwipedMovie.movieId)!;
      } else if (movieCounts.has(userSwipedMovie.movieId) && movieCounts.get(userSwipedMovie.movieId)! < secondLowestCountMovie.count) {
        secondLowestCountMovie.movieId = userSwipedMovie.movieId;
        secondLowestCountMovie.count = movieCounts.get(userSwipedMovie.movieId)!;
      } else if (!movieCounts.has(userSwipedMovie.movieId)) {
        secondLowestCountMovie.movieId = lowestCountMovie.movieId;
        secondLowestCountMovie.count = lowestCountMovie.count;
        lowestCountMovie.movieId = userSwipedMovie.movieId;
        lowestCountMovie.count = movieCounts.get(userSwipedMovie.movieId)!;
      }
    }

    const lowestMovies = await this.prismaService.movie.findMany({
      where: { id: { in: [lowestCountMovie.movieId, secondLowestCountMovie.movieId] } },
    });
    // Sort so that lowest count movie first
    lowestMovies.sort((a, b) => {
      if (a.id === lowestCountMovie.movieId) {
        return -1;
      } else if (b.id === lowestCountMovie.movieId) {
        return 1;
      } else {
        return 0;
      }
    });
    return lowestMovies;
  }

  // Finds an existing rating for a user and returns the tournamentRating
  private async findExistingPreference(userId: number, winnerId: number, loserId: number): Promise<undefined | TournamentRating> {
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

  private async addTournamentRankToDatabase(userId: number, winnerId: number, loserId: number, liked: boolean): Promise<void> {
    const existingPreference = await this.findExistingPreference(userId, winnerId, loserId);

    // If existingPreference undefined -> new preference, if not equal to winnerId -> update, else nothing
    // This is what is done for the graph in the addPreference method in tournament-graph.ts
    if (!existingPreference) {
      await this.prismaService.tournamentRating.create({
        data: { userId, movie1Id: winnerId, movie2Id: loserId, winnerId, likedStatus: liked ? 'liked' : 'disliked' },
      });
      logger.info(`Added new ${liked ? 'liked' : 'dislike'} preference for user ${userId}, for winner ${winnerId} and loser ${loserId}`);
    } else if (existingPreference.likedStatus !== (liked ? 'liked' : 'disliked') && existingPreference.winnerId !== winnerId) {
      await this.prismaService.tournamentRating.update({
        where: { id: existingPreference.id },
        data: { likedStatus: liked ? 'liked' : 'disliked', winnerId },
      });
      logger.info(`Updated ${liked ? 'liked' : 'dislike'} preference for user ${userId}, for winner ${winnerId} and loser ${loserId}`);
    } else if (existingPreference.likedStatus !== (liked ? 'liked' : 'disliked')) {
      await this.prismaService.tournamentRating.update({
        where: { id: existingPreference.id },
        data: { likedStatus: liked ? 'liked' : 'disliked' },
      });
      logger.info(`Updated ${liked ? 'liked' : 'dislike'} preference for user ${userId}, for winner ${winnerId} and loser ${loserId}`);
    } else if (existingPreference.winnerId !== winnerId) {
      await this.prismaService.tournamentRating.update({
        where: { id: existingPreference.id },
        data: { winnerId },
      });
      logger.info(`Updated ${liked ? 'liked' : 'dislike'} preference for user ${userId}, for winner ${winnerId} and loser ${loserId}`);
    }
  }
}
