import { Injectable } from '@nestjs/common';

@Injectable()
export class SimilarityService {
  spearmanRankCorrelation(listA: number[], listB: number[]): number {
    const n = listA.length;
    let sumOfSquaredDifferences = 0;
    for (let i = 0; i < n; i++) {
      const rankA = listA.indexOf(listA[i]) + 1;
      const rankB = listB.indexOf(listB[i]) + 1;
      const difference = rankA - rankB;
      sumOfSquaredDifferences += difference * difference;
    }
    return 1 - (6 * sumOfSquaredDifferences) / (n * (n * n - 1));
  }
}
