import { Module } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { TheMovieDb } from '../../services/the-movie-db.service';
import { MovieController } from './movie.controller';
import { MovieService } from './movie.service';

@Module({
  imports: [],
  controllers: [MovieController],
  providers: [PrismaService, TheMovieDb, MovieService],
})
export class MovieModule {}
