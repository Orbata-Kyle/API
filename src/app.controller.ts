import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { AppService } from './app.service';
import { SimilarityService } from './similarity.service';
import { PrismaService } from './prisma.service';
import { TheMovieDb } from './services/the-movie-db.service';
import type { Prisma } from '@prisma/client';
import { FirebaseService } from './services/firebase.service';
import logger from './utils/logging/winston-config';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly similarityService: SimilarityService,
    private readonly prisma: PrismaService,
    private readonly firebase: FirebaseService,
  ) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('/debug')
  async debug() {
    const users = await this.prisma.user.findMany({
      include: { UserMovieRating: true },
    });

    const firstUser = users[0];
    const firstUserMovieIds = firstUser.UserMovieRating.map(
      (umr) => umr.movieId,
    );

    for (const nextUser of users) {
      const nextUserMovieIds = nextUser.UserMovieRating.map(
        (umr) => umr.movieId,
      );

      logger.debug(firstUserMovieIds.length + ', ' + nextUserMovieIds.length);

      const similarity = this.similarityService.getSimilarity([], []);

      logger.info(
        `Similarity between ${firstUser.name} and ${nextUser.name}: ${similarity}`,
      );
    }

    return { users };
  }

  @Get('/movies')
  async getMovies() {
    const movies = await this.prisma.movie.findMany();

    return [{ movies }];
  }

  @Post('/movies')
  addMovie(body) {
    return [];
  }

  @Post('/token-debug')
  async tokenDebug(@Body('token') token: string) {
    const validatedToken = await this.firebase.verifyToken(token);

    return validatedToken;
  }
}
