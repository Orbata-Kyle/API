import { PrismaService } from '../../../prisma/prisma.service';
import { TournamentGraph } from './tournament-graph';

export class TournamentGraphCache {
  private likesCache: {
    [userId: number]: { timestamp: number; graph: TournamentGraph };
  } = {};
  private dislikesCache: {
    [userId: number]: { timestamp: number; graph: TournamentGraph };
  } = {};
  private likesCacheAdjacencyListCopy: {
    [userId: number]: { adjacencyList: Map<number, Set<number>> };
  } = {};
  private dislikesCacheAdjacencyListCopy: {
    [userId: number]: { adjacencyList: Map<number, Set<number>> };
  } = {};
  private prismaService: PrismaService;

  constructor(prismaService: PrismaService) {
    this.prismaService = prismaService;
  }

  public saveGraphCopy(userId: number, liked: boolean): void {
    if (liked) this.likesCacheAdjacencyListCopy[userId] = { adjacencyList: this.likesCache[userId].graph.getAdjacencyListCopy() };
    else this.dislikesCacheAdjacencyListCopy[userId] = { adjacencyList: this.dislikesCache[userId].graph.getAdjacencyListCopy() };
  }

  public restoreGraphCopy(userId: number, liked: boolean): void {
    if (liked) this.likesCache[userId].graph.restoreAdjacencyList(this.likesCacheAdjacencyListCopy[userId].adjacencyList);
    else this.dislikesCache[userId].graph.restoreAdjacencyList(this.dislikesCacheAdjacencyListCopy[userId].adjacencyList);
  }

  public intervalidateGraphCache(userId: number, liked: boolean): void {
    if (liked) {
      if (this.likesCache[userId]) {
        this.likesCache[userId] = undefined;
      }
    } else {
      if (this.dislikesCache[userId]) {
        this.dislikesCache[userId] = undefined;
      }
    }
  }

  public async getLikeGraphForUser(userId: number): Promise<TournamentGraph> {
    if (this.likesCache[userId] && this.likesCache[userId].timestamp > Date.now() - 1000 * 60 * 60 * 24) {
      return this.likesCache[userId].graph;
    } else {
      const graph = await this.createGraphForUser(userId, true);
      this.likesCache[userId] = { timestamp: Date.now(), graph };
      return graph;
    }
  }

  public async getDislikedGraphForUser(userId: number): Promise<TournamentGraph> {
    if (this.dislikesCache[userId] && this.dislikesCache[userId].timestamp > Date.now() - 1000 * 60 * 60 * 24) {
      return this.dislikesCache[userId].graph;
    } else {
      const graph = await this.createGraphForUser(userId, false);
      this.dislikesCache[userId] = { timestamp: Date.now(), graph };
      return graph;
    }
  }

  private async createGraphForUser(userId: number, liked: boolean): Promise<TournamentGraph> {
    const graph = new TournamentGraph();
    const preferences = await this.prismaService.tournamentRating.findMany({
      where: { userId, interactionStatus: liked ? 'liked' : 'disliked' },
    });

    preferences.forEach((pref) => {
      graph.addPreference(pref.winnerId, pref.movie1Id === pref.winnerId ? pref.movie2Id : pref.movie1Id);
    });

    return graph;
  }
}
