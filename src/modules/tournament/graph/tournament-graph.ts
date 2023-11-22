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

  getAvgRankMovieId(): number {
    // Get MovieId of movie with average adjecency list length
    // Tradeoff as getting one with avg rank will require computing ranks for all movies and thus longer time
    let totalLenth = 0;
    this.adjacencyList.forEach((edges) => (totalLenth += edges.size));
    const avgLength = totalLenth / this.adjacencyList.size;
    let closestMovieId = 0;
    let closestMovieLength = Number.MAX_SAFE_INTEGER;
    this.adjacencyList.forEach((edges, movieId) => {
      const length = Math.abs(edges.size - avgLength);
      if (length < closestMovieLength) {
        closestMovieId = movieId;
        closestMovieLength = length;
      }
    });
    return closestMovieId;
  }

  getMatchup(): [number, number] | null {
    // Calculate the frequency of matchups for each movie
    const frequencyMap = new Map<number, number>();
    this.adjacencyList.forEach((opponents, movieId) => {
      frequencyMap.set(movieId, (frequencyMap.get(movieId) || 0) + opponents.size);
      opponents.forEach((opponentId) => {
        frequencyMap.set(opponentId, (frequencyMap.get(opponentId) || 0) + 1);
      });
    });

    // Convert frequencyMap to array and sort by frequency
    const sortedMovies = Array.from(frequencyMap.entries()).sort((a, b) => a[1] - b[1]);

    // Find a pair of movies with the least occurrences that haven't been matched and won't cause a cycle
    for (let i = 0; i < sortedMovies.length; i++) {
      for (let j = i + 1; j < sortedMovies.length; j++) {
        const [movie1Id, __] = sortedMovies[i];
        const [movie2Id, _] = sortedMovies[j];
        if (!this.hasPreferenceCombination(movie1Id, movie2Id) && !this.willCauseCycle(movie1Id, movie2Id)) {
          return [movie1Id, movie2Id];
        }
      }
    }

    return null; // No valid matchup found
  }

  willCauseCycle(movie1Id: number, movie2Id: number): boolean {
    // Check if adding movie1 > movie2 causes a cycle
    if (this.checkPotentialMatchup(movie1Id, movie2Id)) {
      return true;
    }

    // Check if adding movie2 > movie1 causes a cycle
    if (this.checkPotentialMatchup(movie2Id, movie1Id)) {
      return true;
    }

    // No cycle detected in either scenario
    return false;
  }

  hasCycle(): boolean {
    // Same as checkPotentialMatchup but for all edges
    const visited = new Set<number>();

    for (const [winnerId, losers] of this.adjacencyList.entries()) {
      for (const loserId of losers) {
        if (this.dfs(loserId, winnerId, visited, this.adjacencyList)) {
          return true;
        }
      }
    }

    return false;
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

  // --------------------- Helper methods for computing rankings ---------------------

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

  // --------------------- Helper methods for checking cycles ---------------------

  private dfs(current: number, target: number, visited: Set<number>, adjList: Map<number, Set<number>>): boolean {
    if (current === target) return true;
    visited.add(current);
    for (const neighbor of adjList.get(current) || []) {
      if (!visited.has(neighbor) && this.dfs(neighbor, target, visited, adjList)) {
        return true;
      }
    }
    return false;
  }

  private checkPotentialMatchup(winnerId: number, loserId: number): boolean {
    // Create a copy of the adjacency list
    const adjacencyListCopy = new Map<number, Set<number>>();
    this.adjacencyList.forEach((edges, id) => {
      adjacencyListCopy.set(id, new Set(edges));
    });

    // Temporarily add the potential matchup to the copy of the graph
    if (!adjacencyListCopy.has(winnerId)) {
      adjacencyListCopy.set(winnerId, new Set());
    }
    adjacencyListCopy.get(winnerId)!.add(loserId);

    // Remove the reverse edge if it exists, as it would obviously cause a cycle
    if (adjacencyListCopy.has(loserId) && adjacencyListCopy.get(loserId)!.has(winnerId)) {
      adjacencyListCopy.get(loserId)!.delete(winnerId);
    }

    // Perform a depth-first search on the copy to detect potential cycles
    const visited = new Set<number>();
    const hasCycle = this.dfs(loserId, winnerId, visited, adjacencyListCopy);

    return hasCycle;
  }
}
