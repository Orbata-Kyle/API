import logger from '../../../utils/logging/winston-config';

export class TournamentGraph {
  private adjacencyList: Map<number, Set<number>>; // Map of movieId to Set of movieIds it is preferred over
  private ranks: Map<number, number>; // Map of movieId to rank
  private newPreference = false; // True after a new preference is added, to invalidate current cached ranks

  constructor() {
    this.adjacencyList = new Map();
  }

  scanAndDeleteUnusedMovie(movieId: number) {
    // Search if movieIds adjecency list itself is empty and if it is an edge in any other movieIds adjecency lists, if both false then delete it
    // As this can only happen if this is a movie that was a looser from a matchup that was then moved to another graph (liked -> disliked or vice versa)
    if (this.adjacencyList.has(movieId) && this.adjacencyList.get(movieId)!.size === 0) {
      let isUsed = false;
      this.adjacencyList.forEach((edges, _) => {
        if (edges.has(movieId)) {
          isUsed = true;
        }
      });
      if (!isUsed) {
        this.adjacencyList.delete(movieId);
        this.newPreference = true;
      }
    }
  }

  hasPreferenceCombination(movie1Id: number, movie2Id: number): boolean {
    // return if the graph contains the edge movie1Id -> movie2Id or movie2Id -> movie1Id
    return (
      (this.adjacencyList.has(movie1Id) && this.adjacencyList.get(movie1Id)!.has(movie2Id)) ||
      (this.adjacencyList.has(movie2Id) && this.adjacencyList.get(movie2Id)!.has(movie1Id))
    );
  }

  findAndRemovePreferenceCombination(movie1Id: number, movie2Id: number): boolean {
    // this can be triggered if these are two movies that that were moved to another graph (liked -> disliked or vice versa) as their likedStatus changed
    if (this.adjacencyList.has(movie1Id) && this.adjacencyList.get(movie1Id)!.has(movie2Id)) {
      this.adjacencyList.get(movie1Id)!.delete(movie2Id);
      this.scanAndDeleteUnusedMovie(movie1Id);
      this.scanAndDeleteUnusedMovie(movie2Id);
      this.newPreference = true;
      return true;
    } else if (this.adjacencyList.has(movie2Id) && this.adjacencyList.get(movie2Id)!.has(movie1Id)) {
      this.adjacencyList.get(movie2Id)!.delete(movie1Id);
      this.scanAndDeleteUnusedMovie(movie1Id);
      this.scanAndDeleteUnusedMovie(movie2Id);
      this.newPreference = true;
      return true;
    } else {
      return false;
    }
  }

  addPreference(winnerId: number, loserId: number): void {
    if (!this.adjacencyList.has(winnerId)) {
      this.adjacencyList.set(winnerId, new Set());
      this.newPreference = true;
    }
    if (!this.adjacencyList.has(loserId)) {
      this.adjacencyList.set(loserId, new Set());
      this.newPreference = true;
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
    if (!this.newPreference) {
      return this.ranks;
    }

    const scores = new Map<number, number>();
    this.adjacencyList.forEach((_, movieId) => scores.set(movieId, 1000)); // Initialize scores

    const MAX_ITERATIONS = 100;
    let iterationCount = 0;
    let hasChanges: boolean;

    do {
      hasChanges = false;
      iterationCount++;

      // Direct matchup score adjustments
      this.adjacencyList.forEach((edges, winnerId) => {
        edges.forEach((loserId) => {
          if (this.adjustScores(winnerId, loserId, scores)) {
            hasChanges = true;
          }
        });
      });

      // Transitivity check
      if (this.applyTransitivityCheck(scores)) {
        hasChanges = true;
      }

      this.normalizeScores(scores); // Normalize scores
    } while (hasChanges && iterationCount < MAX_ITERATIONS);

    this.ranks = this.convertScoresToRanks(scores);
    this.newPreference = false;
    return this.ranks;
  }

  private adjustScores(winnerId: number, loserId: number, scores: Map<number, number>): boolean {
    const upsetFactor = 1.5;
    const winnerScore = scores.get(winnerId);
    const loserScore = scores.get(loserId);
    let scoreChanged = false;

    if (winnerScore <= loserScore) {
      scores.set(winnerId, winnerScore + upsetFactor);
      scores.set(loserId, loserScore - upsetFactor);
      scoreChanged = true;
    }

    return scoreChanged;
  }

  private applyTransitivityCheck(scores: Map<number, number>): boolean {
    let transitivityApplied = false;

    this.adjacencyList.forEach((edges, winnerId) => {
      edges.forEach((loserId) => {
        this.adjacencyList.get(loserId)?.forEach((transitiveLoserId) => {
          if (scores.get(winnerId) <= scores.get(transitiveLoserId)) {
            const scoreAdjustment = (scores.get(transitiveLoserId) - scores.get(winnerId)) / 2;
            scores.set(winnerId, scores.get(winnerId) + scoreAdjustment);
            scores.set(transitiveLoserId, scores.get(transitiveLoserId) - scoreAdjustment);
            transitivityApplied = true;
          }
        });
      });
    });

    return transitivityApplied;
  }

  private normalizeScores(scores: Map<number, number>): void {
    const maxScore = Math.max(...Array.from(scores.values()));
    const minScore = Math.min(...Array.from(scores.values()));

    scores.forEach((score, movieId) => {
      const normalizedScore = (1000 * (score - minScore)) / (maxScore - minScore);
      scores.set(movieId, normalizedScore);
    });
  }

  private convertScoresToRanks(scores: Map<number, number>): Map<number, number> {
    const sortedScores = Array.from(scores.entries()).sort((a, b) => b[1] - a[1]);
    const ranks = new Map<number, number>();
    sortedScores.forEach(([movieId, _], index) => ranks.set(movieId, index + 1));
    return ranks;
  }
}
