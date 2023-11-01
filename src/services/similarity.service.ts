import { Injectable } from '@nestjs/common';
import statistics from 'statistics.js';
import { RBO } from '../utils/rbo';

const RBO_RANKING_WEIGHT = 0.99;

const rbo = new RBO(RBO_RANKING_WEIGHT);

@Injectable()
export class SimilarityService {
  getSimilarity(listA: string[], listB: string[]) {
    return rbo.calculate(listA, listB);
  }

  spearmanRankCorrelation(listA: string[], listB: string[]): number {
    const n = listA.length;
    let sumOfSquaredDifferences = 0;
    for (let i = 0; i < n; i++) {
      const rankA = listA.indexOf(listB[i]) + 1;
      const rankB = listB.indexOf(listA[i]) + 1;
      const difference = rankA - rankB;
      sumOfSquaredDifferences += difference * difference;
    }
    return 1 - (6 * sumOfSquaredDifferences) / (n * (n * n - 1));
  }

  getSpearmanRank(array1: string[], array2: string[]) {
    statistics.spe;

    const length1 = array1.length;
    const length2 = array2.length;

    const commonLength = Math.min(length1, length2);
    const rankArray1 = this.rankArray(array1.slice(0, commonLength));
    const rankArray2 = this.rankArray(array2.slice(0, commonLength));

    const sumOfSquaredDifferences = rankArray1.reduce((sum, rank1, i) => {
      const rank2 = rankArray2[i];
      return sum + Math.pow(rank1 - rank2, 2);
    }, 0);

    const spearmanRank =
      1 -
      (6 * sumOfSquaredDifferences) /
        (commonLength * (Math.pow(commonLength, 2) - 1));
    return spearmanRank;
  }

  private rankArray(array: string[]) {
    const sortedArray = array.slice().sort((a, b) => a.localeCompare(b));
    return array.map((value) => sortedArray.indexOf(value) + 1);
  }
}
