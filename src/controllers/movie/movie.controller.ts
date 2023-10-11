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

import logger from '../../utils/logging/winston-config';

@Controller('movie')
export class MovieController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly theMovieDb: TheMovieDb,
  ) {}

  @Get('search')
  async searchForMovieByTitle(@Query('title') title: string) {
    logger.info('Searching for movie by title:', title);
    const response = await this.theMovieDb.searchForMovieByTitle(title);

    const moviesToSave: Prisma.MovieCreateManyInput[] = [];

    // Save the movies to the DB
    for (const movie of response.results) {
      if (movie.popularity > 5) {
        moviesToSave.push({
          id: movie.id,
          title: movie.original_title,
          backdropUrl: movie.backdrop_path
            ? `https://image.tmdb.org/t/p/original${movie.backdrop_path}`
            : undefined,
          posterUrl: movie.poster_path
            ? `https://image.tmdb.org/t/p/original${movie.poster_path}`
            : undefined,
          releaseDate: new Date(movie.release_date),
          synopsis: movie.overview,
        });
      }
    }

    const savedMovies = await this.prisma.movie.createMany({
      data: moviesToSave,
      skipDuplicates: true,
    });

    return moviesToSave;
  }

  @Get(':id')
  async getMovieById(@Param('id') id: string) {
    const movieFromDb = await this.prisma.movie.findUnique({
      where: { id: parseInt(id) },
    });

    if (movieFromDb) {
      logger.info('Found movie in DB');
      return movieFromDb;
    }

    const movieFromApi = await this.theMovieDb.getMovieById(parseInt(id));
    const movieToSave: Prisma.MovieCreateInput = {
      id: movieFromApi.id,
      title: movieFromApi.original_title,
      backdropUrl: movieFromApi.backdrop_path
        ? `https://image.tmdb.org/t/p/original${movieFromApi.backdrop_path}`
        : undefined,
      posterUrl: movieFromApi.poster_path
        ? `https://image.tmdb.org/t/p/original${movieFromApi.poster_path}`
        : undefined,
      releaseDate: new Date(movieFromApi.release_date),
      synopsis: movieFromApi.overview,
    };

    const savedMovie = await this.prisma.movie.create({
      data: movieToSave,
    });

    return savedMovie;
  }

  @UseGuards(AuthGuard)
  @Post(':id/rate/:action')
  async rateMovieById(
    @Param('id') id: string,
    @Param('action') action: string,
    @User() user: FirebaseUser,
  ) {
    // Make sure the action is valid
    if (!['liked', 'disliked', 'unseen'].includes(action)) {
      throw new BadRequestException('Invalid action');
    }

    // Make sure the movie exists
    const movieFromDb = await this.prisma.movie.findUnique({
      where: { id: parseInt(id) },
    });

    const movieRating = await this.prisma.userMovieRating.create({
      data: {
        likedStatus: action,
        movieId: movieFromDb.id,
        userId: user.user_id,
      },
    });

    return movieRating;
  }
}
