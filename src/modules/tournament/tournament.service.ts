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
    const rankings =
      await this.tournamentGraphService.getUsersTournamentRankings(userId);

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

  async tournamentRankMovieForUser(
    userId: number,
    winnerId: number,
    loserId: number,
  ) {
    // Add to database first to make sure it's working
    await this.addTournamentRankToDatabase(userId, winnerId, loserId);

    // Then add to graph
    await this.tournamentGraphService.tournamentRankMovieForUser(
      userId,
      winnerId,
      loserId,
      winnerId,
    );

    return 'Successfully ranked movie';
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

  private async addTournamentRankToDatabase(
    userId: number,
    winnerId: number,
    loserId: number,
  ): Promise<void> {
    const existingPreference = await this.findExistingPreference(
      userId,
      winnerId,
      loserId,
    );

    // If existingPreference undefined -> new preference, if not equal to winnerId -> update, else nothing
    if (!existingPreference) {
      await this.prismaService.tournamentRating.create({
        data: { userId, movie1Id: winnerId, movie2Id: loserId, winnerId },
      });
      logger.info(
        `Added new preference for user ${userId}, for winner ${winnerId} and loser ${loserId}`,
      );
    } else if (existingPreference.winnerId !== winnerId) {
      await this.prismaService.tournamentRating.update({
        where: { id: existingPreference.id },
        data: { winnerId },
      });
      logger.info(
        `Updated preference for user ${userId}, for winner ${winnerId} and loser ${loserId}`,
      );
    }
  }
}
