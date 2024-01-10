import { Module } from '@nestjs/common';
import { PrismaService } from '../../utility-modules/prisma/prisma.service';
import { MovieController } from './movie.controller';
import { MovieService } from './movie.service';
import { TournamentModule } from '../tournament/tournament.module';
import { MovieCacheModule } from '../../utility-modules/movie-cache/db-movie-cache.module';

@Module({
  imports: [TournamentModule, MovieCacheModule],
  controllers: [MovieController],
  providers: [PrismaService, MovieService],
})
export class MovieModule {}
