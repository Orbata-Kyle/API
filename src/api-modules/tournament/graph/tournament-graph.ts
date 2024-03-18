import { InternalServerErrorException } from '@nestjs/common';
import logger from '../../../utils/logging/winston-config';

export class TournamentGraph {
  private adjacencyList: Map<number, Set<number>>; // Map of movieId to Set of movieIds it is preferred over
  private savedScores: Map<number, number>; // Map of movieId to rank
  private newPreference = false; // True after a new preference is added, to invalidate current cached ranks

  constructor() {
    this.adjacencyList = new Map();
  }

  getAdjacencyListCopy(): Map<number, Set<number>> {
    const adjacencyListCopy = new Map<number, Set<number>>();

    this.adjacencyList.forEach((edges, movieId) => {
      // Clone each Set of movieIds
      adjacencyListCopy.set(movieId, new Set(edges));
    });

    return adjacencyListCopy;
  }

  restoreAdjacencyList(adjacencyList: Map<number, Set<number>>): void {
    this.adjacencyList = adjacencyList;
    this.savedScores = new Map<number, number>();
    this.newPreference = true;
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
    // this can be triggered if these are two movies that that were moved to another graph (liked -> disliked or vice versa) as their interactionStatus changed
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

  forceMoviePlacement(movieId: number, aboveMovieId: number | undefined, belowMovieId: number | undefined): [number, number][] {
    // Save all movieIds that won over moveiId and all movieIds that movieId won over
    const movieIdsThatWonOverMovieId = new Set<number>();
    const movieIdsThatMovieIdWonOver = new Set<number>();
    this.adjacencyList.forEach((edges, winnerMovieId) => {
      if (winnerMovieId === movieId) {
        edges.forEach((loserMovieId) => {
          movieIdsThatMovieIdWonOver.add(loserMovieId);
        });
      } else if (edges.has(movieId)) {
        movieIdsThatWonOverMovieId.add(winnerMovieId);
      }
    });

    // Remove all edges involving the movieId
    this.adjacencyList.set(movieId, new Set());
    this.adjacencyList.forEach((edges) => edges.delete(movieId));

    // Add edge from the movie it is placed under
    if (aboveMovieId) {
      if (!this.adjacencyList.has(aboveMovieId)) {
        this.adjacencyList.set(aboveMovieId, new Set());
      }
      this.adjacencyList.get(aboveMovieId)!.add(movieId);
    }

    // Add edge from the movie to the one it is placed above
    if (belowMovieId) this.adjacencyList.get(movieId)!.add(belowMovieId);

    const newEdges: [number, number][] = [];
    // Point all movieIdsThatWonOverMovieId to all movieIdsThatMovieIdWonOver to preserve this data
    // all transitive connections that were severed to be restored without now the middleman movieId in between
    movieIdsThatWonOverMovieId.forEach((winnerMovieId) => {
      movieIdsThatMovieIdWonOver.forEach((loserMovieId) => {
        this.addPreference(winnerMovieId, loserMovieId);
        newEdges.push([winnerMovieId, loserMovieId]);
      });
    });

    this.newPreference = true; // Invalidate cached ranks as the graph has changed

    return newEdges;
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
    for (const [winnerId, losers] of this.adjacencyList.entries()) {
      for (const loserId of losers) {
        const visited = new Set<number>(); // Reset visited set for each dfs call
        if (this.dfs(loserId, winnerId, visited, this.adjacencyList)) {
          return true;
        }
      }
    }

    return false;
  }

  computeRankings(): Map<number, number> {
    const uniqueMovieIds = new Set<number>();
    this.adjacencyList.forEach((edges, winnerId) => {
      uniqueMovieIds.add(winnerId);
      edges.forEach((val) => uniqueMovieIds.add(val));
    });

    if (!this.newPreference && this.savedScores && this.savedScores.size === uniqueMovieIds.size) {
      // Nothing changed, return cached rankings
      return this.convertScoresToRanks(this.savedScores);
    }

    const scores = new Map<number, number>();
    this.initializeScores(scores, uniqueMovieIds);

    const MAX_ITERATIONS = uniqueMovieIds.size * 150;
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

      // Don't need transitivity as above takes care of it too, just in more iterations, normalization is also not needed
      // Transitivity check
      // if (this.applyTransitivityCheck(scores)) {
      //   hasChanges = true;
      // }
      // this.normalizeScores(scores); // Normalize scores
    } while (hasChanges && iterationCount < MAX_ITERATIONS);

    if (iterationCount === MAX_ITERATIONS) {
      logger.error(`Max iterations of ${MAX_ITERATIONS} reached while computing rankings`);
    }

    this.savedScores = scores;
    this.newPreference = false;

    const ranks = this.convertScoresToRanks(scores);
    return ranks;
  }

  // --------------------- Helper methods for computing rankings ---------------------
  private initializeScores(scores: Map<number, number>, uniqueMovieIds: Set<number>): void {
    const getFactor = (wins: number, losses: number): number => {
      return ((wins - losses) / uniqueMovieIds.size) * ((wins + 1) / (wins + losses + 1));
    };
    const getWinLossCounts = (): [Map<number, number>, Map<number, number>] => {
      const winCounts = new Map<number, number>();
      const lossCounts = new Map<number, number>();
      this.adjacencyList.forEach((edges, winnerId) => {
        edges.forEach((loserId) => {
          winCounts.set(winnerId, (winCounts.get(winnerId) || 0) + 1);
          lossCounts.set(loserId, (lossCounts.get(loserId) || 0) + 1);
        });
      });
      return [winCounts, lossCounts];
    };

    if (
      this.savedScores &&
      Math.abs(this.savedScores.size - uniqueMovieIds.size) <= 10 &&
      this.savedScores.size > 0.7 * uniqueMovieIds.size
    ) {
      // If most scores are already cached, use them as a starting point while filling in the gaps
      let winCounts: Map<number, number> | undefined;
      let lossCounts: Map<number, number> | undefined;

      this.adjacencyList.forEach((edges, winnerId) => {
        if (!scores.has(winnerId)) {
          if (this.savedScores.has(winnerId)) {
            scores.set(winnerId, this.savedScores.get(winnerId)!);
          } else {
            if (!winCounts || !lossCounts) [winCounts, lossCounts] = getWinLossCounts();
            const wins = winCounts.get(winnerId) || 0;
            const losses = lossCounts.get(winnerId) || 0;
            scores.set(winnerId, 1000 + 2000 * getFactor(wins, losses));
          }
        }

        edges.forEach((loserId) => {
          if (!scores.has(loserId)) {
            if (this.savedScores.has(loserId)) {
              scores.set(loserId, this.savedScores.get(loserId)!);
            } else {
              if (!winCounts || !lossCounts) [winCounts, lossCounts] = getWinLossCounts();
              const wins = winCounts.get(loserId) || 0;
              const losses = lossCounts.get(loserId) || 0;
              scores.set(loserId, 1000 + 2000 * getFactor(wins, losses));
            }
          }
        });
      });
    } else {
      // If most scores are not cached, compute starting point them from scratch
      const [winCounts, lossCounts] = getWinLossCounts();
      this.adjacencyList.forEach((edges, winnerId) => {
        if (!scores.has(winnerId)) {
          const wins = winCounts.get(winnerId) || 0;
          const losses = lossCounts.get(winnerId) || 0;
          scores.set(winnerId, 1000 + 2000 * getFactor(wins, losses));
        }

        edges.forEach((loserId) => {
          if (!scores.has(loserId)) {
            const wins = winCounts.get(loserId) || 0;
            const losses = lossCounts.get(loserId) || 0;
            scores.set(loserId, 1000 + 2000 * getFactor(wins, losses));
          }
        });
      });
    }
  }

  private adjustScores(winnerId: number, loserId: number, scores: Map<number, number>): boolean {
    const upsetFactor = 19 + Math.random() * 10; // Random to prevent deadlocks
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

  // private applyTransitivityCheck(scores: Map<number, number>): boolean {
  //   const upsetFactor = 3;
  //   let scoreChanged = false;

  //   this.adjacencyList.forEach((edges, winnerId) => {
  //     edges.forEach((loserId) => {
  //       this.adjacencyList.get(loserId)?.forEach((transitiveLoserId) => {
  //         if (scores.get(winnerId) <= scores.get(transitiveLoserId)) {
  //           scores.set(winnerId, scores.get(winnerId) + upsetFactor);
  //           scores.set(transitiveLoserId, scores.get(transitiveLoserId) - upsetFactor);
  //           scoreChanged = true;
  //         }
  //       });
  //     });
  //   });

  //   return scoreChanged;
  // }

  // private normalizeScores(scores: Map<number, number>): void {
  //   const maxScore = Math.max(...Array.from(scores.values()));
  //   const minScore = Math.min(...Array.from(scores.values()));

  //   scores.forEach((score, movieId) => {
  //     const normalizedScore = (1000 * (score - minScore)) / (maxScore - minScore);
  //     scores.set(movieId, normalizedScore);
  //   });
  // }

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
