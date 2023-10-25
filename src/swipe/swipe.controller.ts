import {
  BadRequestException,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { GetUser } from 'src/auth/decorator';
import { JwtGuard } from 'src/auth/guard';
import { PrismaService } from 'src/prisma/prisma.service';
import { TheMovieDb } from 'src/services/the-movie-db.service';

@Controller('swipe')
export class SwipeController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly theMovieDb: TheMovieDb,
  ) {}

  @UseGuards(JwtGuard)
  @Get('next')
  async getNextMovieToSwipe(@GetUser('id') userId: number) {
    const popularMovies = await this.theMovieDb.getPopularMovies();

    await this.prisma.movie.createMany({
      data: popularMovies,
      skipDuplicates: true,
    });

    const alreadyWatchedMovies = await this.prisma.userMovieRating.findMany({
      where: {
        userId,
        movieId: {
          in: popularMovies.map((movie) => movie.id),
        },
      },
    });

    const alreadyWatchedMovieIds = new Set(
      alreadyWatchedMovies.map((movie) => movie.movieId),
    );

    const filteredMovies = popularMovies.filter((movie) => {
      return !alreadyWatchedMovieIds.has(movie.id);
    });

    return filteredMovies[0];
  }
}
