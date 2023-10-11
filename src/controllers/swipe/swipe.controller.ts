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
import { AuthGuard } from 'src/auth/auth.guard';
import { User } from 'src/auth/user.decorator';
import { PrismaService } from 'src/prisma.service';
import { FirebaseUser } from 'src/services/firebase.service';
import { TheMovieDb } from 'src/services/the-movie-db.service';

@Controller('swipe')
export class SwipeController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly theMovieDb: TheMovieDb,
  ) {}

  @UseGuards(AuthGuard)
  @Get('next')
  async getNextMovieToSwipe(@User() user: FirebaseUser) {
    const popularMovies = await this.theMovieDb.getPopularMovies();

    await this.prisma.movie.createMany({
      data: popularMovies,
      skipDuplicates: true,
    });

    const alreadyWatchedMovies = await this.prisma.userMovieRating.findMany({
      where: {
        userId: user.user_id,
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
