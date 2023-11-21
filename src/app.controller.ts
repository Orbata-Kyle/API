import { Controller, Get, Post } from '@nestjs/common';
import { SimilarityService } from './services/similarity.service';
import { PrismaService } from './prisma/prisma.service';
import logger from './utils/logging/winston-config';

@Controller()
export class AppController {
  constructor(private readonly similarityService: SimilarityService, private readonly prisma: PrismaService) {}

  @Get('/debug')
  async debug() {
    const users = await this.prisma.user.findMany({
      include: { UserMovieRating: true },
    });

    const firstUser = users[0];
    const firstUserMovieIds = firstUser.UserMovieRating.map((umr) => umr.movieId);

    for (const nextUser of users) {
      const nextUserMovieIds = nextUser.UserMovieRating.map((umr) => umr.movieId);

      logger.debug(firstUserMovieIds.length + ', ' + nextUserMovieIds.length);

      const similarity = this.similarityService.getSimilarity([], []);

      logger.info(`Similarity between ${firstUser.name} and ${nextUser.name}: ${similarity}`);
    }

    return { users };
  }
}
