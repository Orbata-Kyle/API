import { Controller, Get, Post } from '@nestjs/common';
import { AppService } from './app.service';
import { SimilarityService } from './similarity.service';
import { PrismaService } from './prisma.service';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly similarityService: SimilarityService,
    private readonly prisma: PrismaService,
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

      const similarity = this.similarityService.getSimilarity(
        [...firstUserMovieIds, 'df67cee3-bb8b-437e-8d02-c04400ec3654'],
        [...nextUserMovieIds, 'df67cee3-bb8b-437e-8d02-c04400ec3654'],
      );

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
