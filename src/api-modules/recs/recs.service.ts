import { Injectable, NotFoundException } from '@nestjs/common';
import { RecommendationsDto } from './dto/response';
import { MovieCacheService } from '../../utility-modules/movie-cache/db-movie-cache.service';
import { TournamentService } from '../tournament/tournament.service';
import { Movie } from '@prisma/client';
import { MovieWithRankDto } from '../tournament/dto/response';
import { PrismaService } from '../../utility-modules/prisma/prisma.service';

@Injectable()
export class RecsService {
  constructor(
    private readonly movieCache: MovieCacheService,
    private readonly tournamentService: TournamentService,
    private readonly prisma: PrismaService,
  ) {}

  async getRecommendations(userId: number): Promise<RecommendationsDto> {
    const userRankingsLiked = await this.tournamentService.getUsersTournamentRankings(userId, true);
    const userRankingsDisliked = await this.tournamentService.getUsersTournamentRankings(userId, false);

    const usersRankingsUnseen = await this.prisma.userMovieRating.findMany({
      where: {
        userId: userId,
        interactionStatus: 'unseen',
      },
      select: {
        movieId: true,
      },
    });

    if (userRankingsLiked.length < 5) throw new NotFoundException('Not enough user data');

    const userRankingsLikedIdSet = new Set(userRankingsLiked.map((ranking) => ranking.id));
    const userRankingsDislikedIdSet = new Set(userRankingsDisliked.map((ranking) => ranking.id));
    const userRankingsUnseenIdSet = new Set(usersRankingsUnseen.map((ranking) => ranking.movieId));

    // Loop through rankings and get recommendations from TMDB for liked rankings, filter by voteCount > 1000, voteAverage > 6 and already in rankings
    // Same for disliked rankings
    // Weight movies by voteAverage and position of original movie in ranking
    // Same for disliked rankings
    // Substract disliked rankings from liked rankings weights
    // Sort by weight
    // Return top 20 movies

    // mutlipleRecCoefficient
    const mrc = 1.6;
    // rankRelevanceCoeefficient
    const rrc = 2.7;
    // Function to calculate weight is: rrc-(rrc/(originalRanking-1))*(x-1)

    const likedWeigts: Map<number, number> = new Map();
    const dislikedWeigts: Map<number, number> = new Map();

    // Store movie details so we don't have to fetch them again
    const recsMovieInfo = new Map<number, Movie>();

    // Only do based on top 10 liked and disliked rankings for now
    const splicedLikedRankings = userRankingsLiked.splice(0, 50);
    // const splicedDislikedRankings = userRankingsDisliked.splice(0, 10);

    for (const ranking of splicedLikedRankings) {
      const tmdbRecs = await this.movieCache.getRecommendationsForMovie(ranking.id);

      for (const rec of tmdbRecs) {
        if (
          rec.voteCount > 1000 &&
          rec.voteAverage > 6 &&
          !userRankingsLikedIdSet.has(rec.id) &&
          !userRankingsDislikedIdSet.has(rec.id) &&
          !userRankingsUnseenIdSet.has(rec.id)
        ) {
          const originalRanking = Number(ranking.rank === '?' ? splicedLikedRankings.length : ranking.rank);
          if (likedWeigts.has(rec.id)) {
            // Increase existing weight by more than the avg of it + new weight but less than it + new weight
            likedWeigts.set(
              rec.id,
              (likedWeigts.get(rec.id) + rec.voteAverage + (rrc - (rrc / (splicedLikedRankings.length - 1)) * (originalRanking - 1))) / mrc,
            );
          } else {
            likedWeigts.set(rec.id, rec.voteAverage + (rrc - (rrc / (splicedLikedRankings.length - 1)) * (originalRanking - 1)));
          }
          recsMovieInfo.set(rec.id, rec);
        }
      }
    }

    // Deaktivate disliked substract for now as unlikely it gets same movies
    // for (const ranking of splicedDislikedRankings) {
    //   const tmdbRecs = await this.movieCache.getRecommendationsForMovie(ranking.id);

    //   for (const rec of tmdbRecs) {
    //     if (rec.voteCount > 5000 && rec.voteAverage > 6 && !likedWeigts.has(rec.id) && !dislikedWeigts.has(rec.id)) {
    //       const originalRanking = Number(ranking.rank === '?' ? splicedDislikedRankings.length : ranking.rank);
    //       if (dislikedWeigts.has(rec.id)) {
    //         // Increase existing weight by more than the avg of it + new weight but less than it + new weight
    //         dislikedWeigts.set(
    //           rec.id,
    //           (dislikedWeigts.get(rec.id) +
    //             rec.voteAverage +
    //             (rrc - (rrc / (splicedDislikedRankings.length - 1)) * (originalRanking - 1))) /
    //             mrc,
    //         );
    //       } else {
    //         dislikedWeigts.set(rec.id, rec.voteAverage + (rrc - (rrc / (splicedDislikedRankings.length - 1)) * (originalRanking - 1)));
    //       }
    //       recsMovieInfo.set(rec.id, rec);
    //     }
    //   }
    // }

    // // Substract disliked rankings from liked rankings weights
    // const movieWeights: Map<number, number> = new Map();
    // for (const [movieId, weight] of likedWeigts.entries()) {
    //   if (dislikedWeigts.has(movieId)) {
    //     movieWeights.set(movieId, weight - dislikedWeigts.get(movieId));
    //   } else {
    //     movieWeights.set(movieId, weight);
    //   }
    // }

    // Sort by weight, decreasing
    // const sortedMovieWeights = [...movieWeights.entries()].sort((a, b) => b[1] - a[1]);

    // ALERT: If reactivating disliked substract, this line incorrect
    const sortedMovieWeights = [...likedWeigts.entries()].sort((a, b) => b[1] - a[1]);

    // Return array of movies with details coming from recsMovieInfo and weight from movieWeights converted to rank
    const movies: MovieWithRankDto[] = [];
    for (let i = 0; i < sortedMovieWeights.length; i++) {
      const movie = recsMovieInfo.get(sortedMovieWeights[i][0]);
      const movieWithRank: MovieWithRankDto = {
        ...movie,
        rank: (i + 1).toString(),
      };
      movies.push(movieWithRank);
    }

    return {
      movies: movies,
      accuracyLevel: 2,
    };
  }
}
