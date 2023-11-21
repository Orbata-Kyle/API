import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service'; // Assuming you have a PrismaService
import { TournamentGraphCache } from './tournament-graph-cache';

@Injectable()
export class TournamentGraphService {
  private cache: TournamentGraphCache;

  constructor(private prismaService: PrismaService) {
    this.cache = new TournamentGraphCache(prismaService);
  }

  // Returns users tournament rankins as a map of movieId -> ranking
  async getUsersTournamentRankings(userId: number, liked: boolean): Promise<Map<number, number>> {
    const userGraph = liked
      ? await this.cache.getLikeGraphForUser(userId)
      : await this.cache.getDislikedGraphForUser(userId);
    const rankings = userGraph.computeRankings();

    return rankings;
  }

  // Ranks a movie against another one for a user and updates database
  async tournamentRankMovieForUser(
    userId: number,
    movie1Id: number,
    movie2Id: number,
    winnerId: number,
    liked: boolean,
  ): Promise<void> {
    // Add to graph cache
    const userGraph = liked
      ? await this.cache.getLikeGraphForUser(userId)
      : await this.cache.getDislikedGraphForUser(userId);
    userGraph.addPreference(winnerId, movie1Id === winnerId ? movie2Id : movie1Id);
  }
}
