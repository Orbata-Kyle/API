import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { TournamentGraphService } from './graph/tournament-graph.service';
import logger from 'src/utils/logging/winston-config';

@Injectable()
export class TournamentService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly tournamentGraphService: TournamentGraphService,
  ) {}

  async getUsersMovieRankings(userId: number) {
    const rankings = await this.tournamentGraphService.getUsersMovieRankings(
      userId,
    );

    // Get movies from prisma
    const movies = await this.prismaService.movie.findMany({
      where: { id: { in: Array.from(rankings.keys()) } },
    });

    // Order movies by rankings
    movies.sort((a, b) => {
      return rankings.get(b.id)! - rankings.get(a.id)!;
    });

    logger.info(`Returning ${movies.length} movie rankins for user ${userId}`);
    return movies;
  }

  async rankMovieForUser(userId: number, winnerId: number, looserId: number) {
    await this.tournamentGraphService.rankMovieForUser(
      userId,
      winnerId,
      looserId,
      winnerId,
    );
  }
}
