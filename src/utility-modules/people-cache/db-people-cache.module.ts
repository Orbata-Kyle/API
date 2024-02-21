import { TheMovieDb } from '../../services/the-movie-db.service';
import { Module } from '@nestjs/common';
import { PeopleCacheService } from './db-people-cache.service';

@Module({
  imports: [],
  controllers: [],
  providers: [TheMovieDb, PeopleCacheService],
  exports: [PeopleCacheService],
})
export class PeopleCacheModule {}
