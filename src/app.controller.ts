import { Controller, Get, Param, Post, Query } from '@nestjs/common';
import { AppService } from './app.service';
import { SimilarityService } from './similarity.service';
import { PrismaService } from './prisma.service';
import { TheMovieDb } from './services/the-movie-db.service';
import type { Prisma } from '@prisma/client';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly similarityService: SimilarityService,
    private readonly prisma: PrismaService,
    private readonly theMovieDb: TheMovieDb,
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

      console.log(firstUserMovieIds.length, nextUserMovieIds.length);

      const similarity = this.similarityService.getSimilarity([], []);

      console.log(
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
}
