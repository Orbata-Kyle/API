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
    const userGraph = liked ? await this.cache.getLikeGraphForUser(userId) : await this.cache.getDislikedGraphForUser(userId);
    const rankings = userGraph.computeRankings();

    return rankings;
  }

  // Ranks a movie against another one for a user and updates database
  async tournamentRankMovieForUser(userId: number, movie1Id: number, movie2Id: number, winnerId: number, liked: boolean): Promise<void> {
    // Add to graph cache
    const userLikedGraph = await this.cache.getLikeGraphForUser(userId);
    const userDisikedGraph = await this.cache.getDislikedGraphForUser(userId);

    // Remove from other graph if it exists there already to keep data consistent with database
    // This is what is done for the database in the addTournamentRankToDatabase method in tournament.service.ts
    if (liked) {
      userDisikedGraph.findAndRemovePreferenceCombination(movie1Id, movie2Id);
    } else {
      userLikedGraph.findAndRemovePreferenceCombination(movie1Id, movie2Id);
    }
    (liked ? userLikedGraph : userDisikedGraph).addPreference(winnerId, movie1Id === winnerId ? movie2Id : movie1Id);
  }

  // Wrapper for saving graph copy
  async saveGraphCopy(userId: number, liked: boolean): Promise<void> {
    this.cache.saveGraphCopy(userId, liked);
  }

  // Wrapper for restoring graph copy
  async restoreGraphCopy(userId: number, liked: boolean): Promise<void> {
    this.cache.restoreGraphCopy(userId, liked);
  }

  // Wrapper for intervalidating graph cache
  async intervalidateGraphCache(userId: number, liked: boolean): Promise<void> {
    this.cache.intervalidateGraphCache(userId, liked);
  }

  // Wrapper for finding and removing preferences from the graph
  async findAndRemovePreferenceCombination(userId: number, movie1Id: number, movie2Id: number, liked: boolean): Promise<boolean> {
    const userGraph = liked ? await this.cache.getLikeGraphForUser(userId) : await this.cache.getDislikedGraphForUser(userId);
    return userGraph.findAndRemovePreferenceCombination(movie1Id, movie2Id);
  }

  // wrapper for has circle method
  async hasCycle(userId: number, liked: boolean): Promise<boolean> {
    const userGraph = liked ? await this.cache.getLikeGraphForUser(userId) : await this.cache.getDislikedGraphForUser(userId);
    return userGraph.hasCycle();
  }

  // Wrapper for willCauseCycle method
  async willCauseCycle(userId: number, movie1Id: number, movie2Id: number, liked: boolean): Promise<boolean> {
    const userGraph = liked ? await this.cache.getLikeGraphForUser(userId) : await this.cache.getDislikedGraphForUser(userId);
    return userGraph.willCauseCycle(movie1Id, movie2Id);
  }

  // Wrapper for getAvgRankMovieId method
  async getAvgRankMovieId(userId: number, liked: boolean): Promise<number> {
    const userGraph = liked ? await this.cache.getLikeGraphForUser(userId) : await this.cache.getDislikedGraphForUser(userId);
    return userGraph.getAvgRankMovieId();
  }

  // Wrapper for getMatchup method
  async getMatchup(userId: number, liked: boolean): Promise<[number, number]> {
    const userGraph = liked ? await this.cache.getLikeGraphForUser(userId) : await this.cache.getDislikedGraphForUser(userId);
    return userGraph.getMatchup();
  }

  // Wrapper for forcing a movie placement
  async forceMoviePlacement(
    userId: number,
    movieId: number,
    aboveMovieId: number,
    belowMovieId: number,
    liked: boolean,
  ): Promise<[number, number][]> {
    const userGraph = liked ? await this.cache.getLikeGraphForUser(userId) : await this.cache.getDislikedGraphForUser(userId);
    return userGraph.forceMoviePlacement(movieId, aboveMovieId, belowMovieId);
  }
}
