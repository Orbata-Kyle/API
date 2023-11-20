import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service'; // Assuming you have a PrismaService
import { TournamentGraphCache } from './tournament-graph-cache';
import { TournamentRating } from '@prisma/client';
import logger from 'src/utils/logging/winston-config';
import e from 'express';

@Injectable()
export class TournamentGraphService {
  private cache: TournamentGraphCache;

  constructor(private prismaService: PrismaService) {
    this.cache = new TournamentGraphCache(prismaService);
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

  private async addPreferenceToDatabase(
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

  // Returns users tournament rankins as a map of movieId -> ranking
  async getUsersMovieRankings(userId: number): Promise<Map<number, number>> {
    const userGraph = await this.cache.getGraphForUser(userId);
    const rankings = userGraph.computeRankings();

    return rankings;
  }

  // Ranks a movie against another one for a user and updates database
  async rankMovieForUser(
    userId: number,
    movie1Id: number,
    movie2Id: number,
    winnerId: number,
  ): Promise<void> {
    // Add to database first to make sure it's working
    await this.addPreferenceToDatabase(
      userId,
      winnerId,
      movie1Id === winnerId ? movie2Id : movie1Id,
    );

    // Add to graph cache
    const userGraph = await this.cache.getGraphForUser(userId);
    userGraph.addPreference(
      winnerId,
      movie1Id === winnerId ? movie2Id : movie1Id,
    );
  }
}
