import logger from '../../../utils/logging/winston-config';

export class TournamentGraph {
  private adjacencyList: Map<number, Set<number>>; // Map of movieId to Set of movieIds it is preferred over
  private ranks: Map<number, number>; // Map of movieId to rank
  private newPreference = false; // True after a new preference is added, to invalidate current cached ranks

  constructor() {
    this.adjacencyList = new Map();
  }

  // The one and only place to change graph cache
  async addPreference(winnerId: number, loserId: number): Promise<void> {
    if (!this.adjacencyList.has(winnerId)) {
      this.adjacencyList.set(winnerId, new Set());
    }
    if (!this.adjacencyList.has(loserId)) {
      this.adjacencyList.set(loserId, new Set());
    }
    if (!this.adjacencyList.get(winnerId).has(loserId)) {
      // Update graph if this is a new differing preference on same movies
      if (this.adjacencyList.get(loserId)!.has(winnerId)) {
        this.adjacencyList.get(loserId)!.delete(winnerId);
      }

      //Add to graph
      this.adjacencyList.get(winnerId)!.add(loserId);
      this.newPreference = true;
    }
  }

  computeRankings(): Map<number, number> {
    // TODO: Consider different data structures and parallelization for performance on large data

    if (!this.newPreference && this.ranks) {
      return this.ranks;
    }

    // Page Rank algorithm, without considering damping and thus random surfing, this is not about websites after all
    let ranks = new Map<number, number>();
    const totalNodes = this.adjacencyList.size;

    // Initialize ranks
    this.adjacencyList.forEach((_, movieId) => {
      ranks.set(movieId, 1 / totalNodes);
    });

    // Compute incoming edge count for all nodes that have them
    // Used to devide share of rank that each node gets that is preferred over this, so that total share = current rank of this node
    const incomingEdgeCount = new Map<number, number>();
    this.adjacencyList.forEach((edges) => {
      edges.forEach((loserId) => {
        if (!incomingEdgeCount.has(loserId)) {
          incomingEdgeCount.set(loserId, 0);
        }
        incomingEdgeCount.set(loserId, incomingEdgeCount.get(loserId)! + 1);
      });
    });

    // Iterate to compute ranks and converge
    for (let i = 0; i < 25; i++) {
      const newRanks = new Map<number, number>();

      this.adjacencyList.forEach((edges, movieId) => {
        let rank = 1 / totalNodes;

        // Gets shares of the rank of each node this is preferred over, divided by how many other nodes are preferred over each of those other nodes
        edges.forEach((loserId) => {
          rank += ranks.get(loserId) / incomingEdgeCount.get(loserId)!;
        });

        newRanks.set(movieId, rank);
      });

      ranks = newRanks;
    }

    this.ranks = ranks;
    this.newPreference = false;
    logger.info('Computed new rankings: ' + JSON.stringify(Array.from(ranks.entries())));
    return ranks;
  }
}