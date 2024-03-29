import { BadRequestException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../utility-modules/prisma/prisma.service';
import { TournamentGraphService } from './graph/tournament-graph.service';
import logger from '../../utils/logging/winston-config';
import { Movie, TournamentRating } from '@prisma/client';
import { MovieWithRankDto } from './dto/response/movie-with-rank.dto';
import { MatchupDto } from './dto/response';

@Injectable()
export class TournamentService {
  constructor(private readonly prismaService: PrismaService, private readonly tournamentGraphService: TournamentGraphService) {}

  // Wrapper for tournamentGraphService.findCircle
  async findCycle(userId: number, liked: boolean): Promise<boolean> {
    return this.tournamentGraphService.hasCycle(userId, liked);
  }

  async getUsersTournamentRankings(userId: number, liked: boolean): Promise<MovieWithRankDto[]> {
    const rankings = await this.tournamentGraphService.getUsersTournamentRankings(userId, liked);

    let movies: MovieWithRankDto[] = [];
    if (rankings && rankings.size > 0) {
      // Get movies from prisma
      const moviesWithoutRank = await this.prismaService.movie.findMany({
        where: { id: { in: Array.from(rankings.keys()) } },
      });

      // Order movies by rankings and add them to the objects
      movies = moviesWithoutRank
        .map((movie, _) => {
          return {
            ...movie,
            rank: rankings.get(movie.id)!.toString(),
          };
        })
        .sort((a: MovieWithRankDto, b: MovieWithRankDto) => {
          return rankings.get(a.id)! - rankings.get(b.id)!;
        });
    }

    // Get all movies from users likes or dislikes with id not in rankings as well as the movies and concat to movies
    const unrankedMovies = await this.prismaService.userMovieRating.findMany({
      where: { userId, interactionStatus: liked ? 'liked' : 'disliked', movieId: { notIn: Array.from(rankings?.keys() ?? []) } },
      include: { movie: true },
    });
    movies = movies.concat(
      unrankedMovies.map((m) => {
        return { ...m.movie, rank: '?' };
      }),
    );

    logger.info(
      `Returning ${movies.length} movie rankings for user ${userId}, with ${rankings?.size ?? 0} ranked movies and ${
        unrankedMovies.length
      } unranked movies`,
    );
    return movies;
  }

  async tournamentRankMovieForUser(userId: number, winnerId: number, loserId: number, liked: boolean): Promise<string> {
    // Check if it will create a cycle
    if (await this.tournamentGraphService.willCauseCycle(userId, winnerId, loserId, liked)) {
      logger.warn(`User ${userId} tried to create a cycle with ${winnerId} and ${loserId}`);
      throw new BadRequestException('This ranking would create a cylce');
    }

    // Add to database first to make sure it's working
    await this.addTournamentRankToDatabase(userId, winnerId, loserId, liked);

    // Then add to graph
    await this.tournamentGraphService.tournamentRankMovieForUser(userId, winnerId, loserId, winnerId, liked);

    return 'Successfully ranked movie';
  }

  async undoLastRanking(userId: number): Promise<MatchupDto> {
    const lastRating = await this.prismaService.tournamentRating.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    if (!lastRating) {
      throw new NotFoundException('No ratings to undo');
    }

    await this.prismaService.tournamentRating.delete({
      where: { id: lastRating.id },
    });

    await this.tournamentGraphService.findAndRemovePreferenceCombination(
      userId,
      lastRating.movie1Id,
      lastRating.movie2Id,
      lastRating.interactionStatus === 'liked',
    );

    const lastMovies = await this.prismaService.movie.findMany({
      where: { id: { in: [lastRating.movie1Id, lastRating.movie2Id] } },
    });
    return { interactionStatus: lastRating.interactionStatus, movies: lastMovies };
  }

  async getMatchup(userId: number): Promise<MatchupDto> {
    let liked = true;
    let movies = await this.findMatchupMovies(liked, userId);
    if (movies.length === 0) {
      liked = !liked;
      movies = await this.findMatchupMovies(liked, userId);
    }
    if (movies.length === 0) {
      logger.info(`No Matchups remaining for user ${userId}`);
      return { interactionStatus: 'undefined', movies: [] };
    }
    return { interactionStatus: liked ? 'liked' : 'disliked', movies };
  }

  async forceMoviePlacement(
    userId: number,
    movieId: number,
    aboveMovieId: number | undefined,
    belowMovieId: number | undefined,
    liked: boolean,
  ): Promise<string> {
    // Have to do graph first, to see if there will be cycles
    const newEdges = await this.tournamentGraphService.forceMoviePlacement(userId, movieId, aboveMovieId, belowMovieId, liked);

    // DB second, which can be tricky as impermanent change of graph made before permanent change to db
    try {
      await this.removeMovieRankingsInDb(userId, movieId, liked ? 'liked' : 'disliked');

      if (aboveMovieId) await this.addTournamentRankToDatabase(userId, aboveMovieId, movieId, liked, true);
      if (belowMovieId) await this.addTournamentRankToDatabase(userId, movieId, belowMovieId, liked, true);

      // Add new edges to graph that were created by the forceMoviePlacement method to avoid data loss
      // all transitive connections that were severed to be restored without now the middleman movieId in between
      for (const edge of newEdges) {
        await this.addTournamentRankToDatabase(userId, edge[0], edge[1], liked);
      }
    } catch (e) {
      this.tournamentGraphService.intervalidateGraphCache(userId, liked); // As unsure what happened but least we can do
      if (e instanceof BadRequestException) {
        logger.error(e);
        throw new InternalServerErrorException('Failed to remove previous movie rankings from database');
      } else {
        throw e;
      }
    }

    return 'Successfully forced movie placement';
  }

  async removeMovieRankingsEndpoint(userId: number, movieId: number, interactionStatus: string): Promise<string> {
    await this.removeMovieRankingsEverywhere(userId, movieId, interactionStatus, interactionStatus, true);
    return 'Successfully removed movie rankings';
  }

  async getTournamentProgress(userId: number, interactionStatus: string): Promise<string> {
    // Get unique tournament rankings
    const userRankings = await this.prismaService.tournamentRating.findMany({
      where: { userId, interactionStatus },
    });
    const uniqueRankings = new Set<number>();
    for (const ranking of userRankings) {
      uniqueRankings.add(ranking.movie1Id);
      uniqueRankings.add(ranking.movie2Id);
    }

    // Get unique user ratings
    const userRatings = await this.prismaService.userMovieRating.findMany({
      where: { userId, interactionStatus },
    });
    const uniqueRatings = new Set<number>();
    for (const rating of userRatings) {
      uniqueRatings.add(rating.movieId);
    }

    if (uniqueRatings.size === 0 || uniqueRankings.size === 0) return '0';

    if (uniqueRatings.size < uniqueRankings.size) {
      logger.error(`User ${userId} has more unique tournament rankings than unique user ratings`);
      throw new InternalServerErrorException('Internal Server Error');
    }

    return (uniqueRankings.size / uniqueRatings.size).toFixed(4);
  }

  async removeMovieRankingsEverywhere(
    userId: number,
    movieId: number,
    prevInteractionStatus: string,
    newInteractionStatus: string,
    force = false,
  ) {
    if (prevInteractionStatus !== 'liked' && prevInteractionStatus !== 'disliked') return;
    if (!force && newInteractionStatus === prevInteractionStatus) return;

    // Get all matchups with this movie
    const matchups = await this.prismaService.tournamentRating.findMany({
      where: { userId, interactionStatus: prevInteractionStatus, OR: [{ movie1Id: movieId }, { movie2Id: movieId }] },
    });

    if (matchups.length === 0) return;

    // Remove them from the graph
    for (const matchup of matchups) {
      await this.tournamentGraphService.findAndRemovePreferenceCombination(
        userId,
        matchup.movie1Id,
        matchup.movie2Id,
        prevInteractionStatus === 'liked',
      );
    }

    // Remove them from the database
    await this.prismaService.tournamentRating.deleteMany({
      where: { id: { in: matchups.map((m) => m.id) } },
    });

    if (!force) {
      logger.info(
        `Removed ${matchups.length} matchups for user ${userId} with movie ${movieId} as interactionStatus changed from ${prevInteractionStatus} to ${newInteractionStatus}`,
      );
    } else {
      logger.info(`Removed ${matchups.length} matchups for user ${userId} with movie ${movieId} from db with force`);
    }
  }

  async removeMovieRankingsInDb(userId: number, movieId: number, prevInteractionStatus: string) {
    // Remove all matchups with this movie
    const matchups = await this.prismaService.tournamentRating.deleteMany({
      where: { userId, interactionStatus: prevInteractionStatus, OR: [{ movie1Id: movieId }, { movie2Id: movieId }] },
    });

    logger.info(`Removed ${matchups.count} matchups for user ${userId} with movie ${movieId} from db with force`);
  }

  private async findMatchupMovies(liked: boolean, userId: number): Promise<Movie[]> {
    const usersTournamentRanking = await this.prismaService.tournamentRating.findMany({
      where: { userId, interactionStatus: liked ? 'liked' : 'disliked' },
    });
    const userSwipedMovies = await this.prismaService.userMovieRating.findMany({
      where: { userId, interactionStatus: liked ? 'liked' : 'disliked' },
    });

    // Filter movies that have been swiped on but not ranked
    const freshMoviesToRank = userSwipedMovies.filter((m) => {
      return !usersTournamentRanking.some((r) => r.movie1Id === m.movieId || r.movie2Id === m.movieId);
    });

    // If fresh movies available, rank agains random/average one from graph to establish a baseline
    if (freshMoviesToRank.length > 0) {
      const movie1 = await this.prismaService.movie.findFirst({
        where: { id: freshMoviesToRank[0].movieId },
      });
      const movie2Id = await this.tournamentGraphService.getAvgRankMovieId(userId, liked);
      if (movie2Id && movie2Id !== 0) {
        const movie2 = await this.prismaService.movie.findFirst({
          where: { id: await this.tournamentGraphService.getAvgRankMovieId(userId, liked) },
        });
        logger.info(`Returning fresh matchup for user ${userId} with ${liked ? 'liked' : 'disliked'} movies ${movie1.id} and ${movie2.id}`);
        return [movie1, movie2];
      } else {
        // No ranked movies yet, so just return the first two fresh movies
        if (freshMoviesToRank.length >= 2) {
          const movie2 = await this.prismaService.movie.findFirst({
            where: { id: freshMoviesToRank[1].movieId },
          });
          return [movie1, movie2];
        }
      }
    }

    // If no fresh movies available, get matchup from graph, which is least ranked movies that wouldn't cause a cycle in any combination
    const suggestedGraphMatchup = await this.tournamentGraphService.getMatchup(userId, liked);
    if (!suggestedGraphMatchup) {
      return [];
    }
    const movie1 = await this.prismaService.movie.findFirst({
      where: { id: suggestedGraphMatchup[0] },
    });
    const movie2 = await this.prismaService.movie.findFirst({
      where: { id: suggestedGraphMatchup[1] },
    });
    logger.info(`Returning graph for user ${userId} with ${liked ? 'liked' : 'disliked'} movies ${movie1.id} and ${movie2.id}`);
    return [movie1, movie2];
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

  private async addTournamentRankToDatabase(
    userId: number,
    winnerId: number,
    loserId: number,
    liked: boolean,
    throwIfExisting = false,
  ): Promise<void> {
    const existingPreference = await this.findExistingPreference(userId, winnerId, loserId);
    if (existingPreference && throwIfExisting) {
      throw new BadRequestException('This movie is already ranked.');
    }

    // If existingPreference undefined -> new preference, if not equal to winnerId -> update, else nothing
    // This is what is done for the graph in the addPreference method in tournament-graph.ts
    if (!existingPreference) {
      await this.prismaService.tournamentRating.create({
        data: { userId, movie1Id: winnerId, movie2Id: loserId, winnerId, interactionStatus: liked ? 'liked' : 'disliked' },
      });
      logger.info(`Added new ${liked ? 'liked' : 'dislike'} preference for user ${userId}, for winner ${winnerId} and loser ${loserId}`);
    } else if (existingPreference.interactionStatus !== (liked ? 'liked' : 'disliked') && existingPreference.winnerId !== winnerId) {
      await this.prismaService.tournamentRating.update({
        where: { id: existingPreference.id },
        data: { interactionStatus: liked ? 'liked' : 'disliked', winnerId },
      });
      logger.info(`Updated ${liked ? 'liked' : 'dislike'} preference for user ${userId}, for winner ${winnerId} and loser ${loserId}`);
    } else if (existingPreference.interactionStatus !== (liked ? 'liked' : 'disliked')) {
      await this.prismaService.tournamentRating.update({
        where: { id: existingPreference.id },
        data: { interactionStatus: liked ? 'liked' : 'disliked' },
      });
      logger.info(`Updated ${liked ? 'liked' : 'dislike'} preference for user ${userId}, for winner ${winnerId} and loser ${loserId}`);
    } else if (existingPreference.winnerId !== winnerId) {
      await this.prismaService.tournamentRating.update({
        where: { id: existingPreference.id },
        data: { winnerId },
      });
      logger.info(`Updated ${liked ? 'liked' : 'dislike'} preference for user ${userId}, for winner ${winnerId} and loser ${loserId}`);
    } else {
      logger.info(`No change to ${liked ? 'liked' : 'dislike'} preference for user ${userId}, for winner ${winnerId} and loser ${loserId}`);
    }
  }
}
