import { Module } from '@nestjs/common';
import { RecsService } from './recs.service';
import { RecsController } from './recs.controller';
import { MovieCacheModule } from '../../utility-modules/movie-cache/db-movie-cache.module';
import { PrismaService } from '../../utility-modules/prisma/prisma.service';
import { TournamentModule } from '../tournament/tournament.module';

@Module({
  imports: [MovieCacheModule, TournamentModule],
  controllers: [RecsController],
  providers: [RecsService, PrismaService],
})
export class RecsModule {}
