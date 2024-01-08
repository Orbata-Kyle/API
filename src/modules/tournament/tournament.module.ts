import { Module } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { TournamentService } from './tournament.service';
import { TournamentController } from './tournament.controller';
import { TournamentGraphService } from './graph/tournament-graph.service';

@Module({
  imports: [],
  controllers: [TournamentController],
  providers: [TournamentService, PrismaService, TournamentGraphService],
  exports: [TournamentGraphService, TournamentService],
})
export class TournamentModule {}
