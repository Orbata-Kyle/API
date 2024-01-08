import { TheMovieDb } from '../services/the-movie-db.service';
import { MovieCacheService } from './db-movie-cache.service';
import { Module } from '@nestjs/common';

@Module({
  imports: [],
  controllers: [],
  providers: [TheMovieDb, MovieCacheService],
  exports: [MovieCacheService],
})
export class MovieCacheModule {}
