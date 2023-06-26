import { Controller, Get, Param, Post, Query } from '@nestjs/common';
import { AppService } from './app.service';
import { SimilarityService } from './similarity.service';
import { PrismaService } from './prisma.service';
import { TheMovieDb } from './services/the-move-db.service';
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

  @Get('/movie/search')
  async searchForMovieByTitle(@Query('title') title: string) {
    console.log('Searching for movie by title:', title);
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

    await this.prisma.movie.createMany({
      data: moviesToSave,
    });

    return { movies: moviesToSave };
  }

  @Get('/movie/:id')
  async getMovieById(@Param('id') id: string) {
    const movieFromDb = await this.prisma.movie.findUnique({
      where: { id: parseInt(id) },
    });

    if (movieFromDb) {
      console.log('Found movie in DB');
      return movieFromDb;
    }

    const movieFromApi = await this.theMovieDb.getMovieById(parseInt(id));
    const movieToSave: Prisma.MovieCreateManyInput = {
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
