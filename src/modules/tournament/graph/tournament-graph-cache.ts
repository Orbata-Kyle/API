import { PrismaService } from '../../../prisma/prisma.service';
import { TournamentGraph } from './tournament-graph';

export class TournamentGraphCache {
  private cache: {
    [userId: number]: { timestamp: number; graph: TournamentGraph };
  } = {};
  private prismaService: PrismaService;

  constructor(prismaService: PrismaService) {
    this.prismaService = prismaService;
  }

  public async getGraphForUser(userId: number): Promise<TournamentGraph> {
    if (
      this.cache[userId] &&
      this.cache[userId].timestamp > Date.now() - 1000 * 60 * 60 * 24
    ) {
      return this.cache[userId].graph;
    } else {
      const graph = await this.createGraphForUser(userId);
      this.cache[userId] = { timestamp: Date.now(), graph };
      return graph;
    }
  }

  private async createGraphForUser(userId: number): Promise<TournamentGraph> {
    const graph = new TournamentGraph();
    const preferences = await this.prismaService.tournamentRating.findMany({
      where: { userId },
    });

    preferences.forEach((pref) => {
      graph.addPreference(
        pref.winnerId,
        pref.movie1Id === pref.winnerId ? pref.movie2Id : pref.movie1Id,
      );
    });

    return graph;
  }
}
