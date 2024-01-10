import { Injectable, OnModuleInit } from '@nestjs/common';
import { Movie, Prisma } from '@prisma/client';
import logger from '../../utils/logging/winston-config';
import { PrismaService } from '../prisma/prisma.service';
import { MovieCreateInputAndRelations, TheMovieDb } from '../../services/the-movie-db.service';

@Injectable()
export class MovieCacheService implements OnModuleInit {
  constructor(private readonly prisma: PrismaService, private readonly theMovieDb: TheMovieDb) {}

  async onModuleInit(): Promise<void> {
    try {
      await this.ensureGenreInDb();
    } catch (error) {
      logger.error('Error initializing genres:', error);
    }
    try {
      await this.ensureLanguageInDb();
    } catch (error) {
      logger.error('Error initializing languages:', error);
    }
  }

  async ensureGenreInDb(): Promise<void> {
    const newGenres = await this.theMovieDb.getGenres();

    newGenres.forEach(async (genre) => {
      await this.prisma.genre.upsert({
        where: {
          id: genre.id,
        },
        create: genre,
        update: genre,
      });
    });
  }

  async ensureLanguageInDb(): Promise<void> {
    const languages = await this.theMovieDb.getLanguages();

    languages.forEach(async (language) => {
      await this.prisma.language.upsert({
        where: {
          iso6391: language.iso6391,
        },
        create: language,
        update: language,
      });
    });
  }

  async getPopularMovies(page: number, onlyReleased = true): Promise<Movie[]> {
    const moviesToSave = await this.theMovieDb.getPopularMovies(page, onlyReleased);
    await this.saveMoviesToDb(moviesToSave);

    const movies = await this.getMoviesFromDb(moviesToSave.map((movie) => movie.id));
    return movies;
  }

  async getTopRatedMovies(page: number, onlyReleased = true): Promise<Movie[]> {
    const moviesToSave = await this.theMovieDb.getTopRatedMovies(page, onlyReleased);
    await this.saveMoviesToDb(moviesToSave);

    const movies = await this.getMoviesFromDb(moviesToSave.map((movie) => movie.id));
    return movies;
  }

  async searchForMovieByTitle(title: string): Promise<Movie[]> {
    const moviesToSave = await this.theMovieDb.searchForMovieByTitle(title);
    await this.saveMoviesToDb(moviesToSave);

    const movies = await this.getMoviesFromDb(moviesToSave.map((movie) => movie.id));
    return movies;
  }

  async ensureMovieInDb(id: number): Promise<Movie> {
    // Wrapper with different name for clarity
    return this.getMovieById(id, false);
  }

  async getMovieById(id: number, includeRelations = true): Promise<Movie> {
    const movieFromDb = await this.getMovieFromDb(id, includeRelations);

    if (movieFromDb) {
      // needsUpdate only true if relations wanted and not sufficient
      const needsUpdate =
        includeRelations &&
        (!(movieFromDb.genres.length > 0) ||
          !(movieFromDb.spokenLanguages.length > 0) ||
          !(movieFromDb.keywords.length > 0) ||
          !(movieFromDb.cast.length > 0) ||
          !(movieFromDb.crew.length > 0) ||
          !(movieFromDb.videos.length > 0) ||
          !movieFromDb.details);
      if (!needsUpdate) {
        logger.info(`Found movie with id ${id} in DB`);
        return movieFromDb;
      }
    }

    const movieToSave = await this.theMovieDb.getMovieById(id);
    const movie = await this.saveMovieToDb(movieToSave, includeRelations);

    // Saved movie does not have relations, so we need to get it again
    if (includeRelations) {
      const movieWithRelations = await this.getMovieFromDb(id, true);
      return movieWithRelations;
    }

    return movie;
  }

  private async saveMoviesToDb(movies: Prisma.MovieCreateInput[], skipDuplicates = true): Promise<void> {
    const savedMovies = await this.prisma.movie.createMany({
      data: movies,
      skipDuplicates,
    });

    logger.info(`Saved ${savedMovies.count} movies to DB`);

    return;
  }

  private async saveMovieToDb(movieAndRelations: MovieCreateInputAndRelations, saveRelations = true): Promise<Movie> {
    const savedMovie = await this.prisma.movie.upsert({
      where: {
        id: movieAndRelations.movieCreateInput.id,
      },
      create: movieAndRelations.movieCreateInput,
      update: movieAndRelations.movieCreateInput,
    });

    logger.info(`Saved 1 movie to DB`);

    if (saveRelations) {
      const savedMovieGenres = await this.prisma.movieGenre.createMany({
        data: movieAndRelations.movieGenreCreateInputs,
        skipDuplicates: true,
      });
      logger.info(`Saved ${savedMovieGenres.count} movieGenre relations to DB`);

      const savedMovieLanguages = await this.prisma.movieSpokenLanguage.createMany({
        data: movieAndRelations.movieSpokenLanguagesCreateInputs,
        skipDuplicates: true,
      });
      logger.info(`Saved ${savedMovieLanguages.count} movieSpokenLanguage relations to DB`);

      let savedMovieKeywords = 0;
      let savedKeywords = 0;
      for (const keyword of movieAndRelations.keywordsCreateInputs) {
        // Default will be that it exists, so this is faster than upsert
        const existingKeyword = await this.prisma.keyword.findUnique({
          where: {
            id: keyword.id,
          },
        });
        if (!existingKeyword) {
          await this.prisma.keyword.create({
            data: keyword,
          });
          savedKeywords++;

          // After that actually create the relation
          await this.prisma.movieKeyword.create({
            data: {
              keywordId: keyword.id,
              movieId: savedMovie.id,
            },
          });
          savedMovieKeywords++;
        } else {
          const existingMovieKeyword = await this.prisma.movieKeyword.findFirst({
            where: {
              keywordId: keyword.id,
              movieId: savedMovie.id,
            },
          });
          if (!existingMovieKeyword) {
            await this.prisma.movieKeyword.create({
              data: {
                keywordId: keyword.id,
                movieId: savedMovie.id,
              },
            });
            savedMovieKeywords++;
          }
        }
      }
      logger.info(`Saved ${savedKeywords} keywords to DB`);
      logger.info(`Saved ${savedMovieKeywords} movieKeyword relations to DB`);

      const savedCasts = await this.prisma.cast.createMany({
        data: movieAndRelations.castCreateInputs,
        skipDuplicates: true,
      });
      logger.info(`Saved ${savedCasts.count} casts to DB`);

      const savedCrews = await this.prisma.crew.createMany({
        data: movieAndRelations.crewCreateInputs,
        skipDuplicates: true,
      });
      logger.info(`Saved ${savedCrews.count} crews to DB`);

      const savedVideos = await this.prisma.video.createMany({
        data: movieAndRelations.videosCreateInputs,
        skipDuplicates: true,
      });
      logger.info(`Saved ${savedVideos.count} videos to DB`);

      const existingDetails = await this.prisma.movieDetails.findFirst({
        where: {
          movieId: savedMovie.id,
        },
      });
      if (!existingDetails) {
        await this.prisma.movieDetails.create({
          data: movieAndRelations.detailsCreateInput,
        });
        logger.info(`Saved movieDetails to DB`);
      }
    }

    return savedMovie;
  }

  private async getMoviesFromDb(movieIds: number[]): Promise<Movie[]> {
    const movies = await this.prisma.movie.findMany({
      where: { id: { in: movieIds } },
    });

    return movies;
  }

  private async getMovieFromDb(movieId: number, includeRelations: boolean) {
    const movieFromDb = await this.prisma.movie.findUnique({
      where: { id: movieId },
      include: includeRelations
        ? {
            genres: { select: { genre: true } },
            spokenLanguages: { select: { spokenLanguage: true } },
            keywords: { select: { keyword: true } },
            cast: true,
            crew: true,
            videos: true,
            details: true,
          }
        : undefined,
    });

    return movieFromDb;
  }
}
