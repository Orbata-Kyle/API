import { Module } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { TournamentService } from './tournament.service';
import { TournamentController } from './tournament.controller';
import { TournamentGraphService } from './graph/tournament-graph.service';
import { MovieService } from '../movie/movie.service';
import { TheMovieDb } from 'src/services/the-movie-db.service';

@Module({
  imports: [],
  controllers: [TournamentController],
  providers: [
    TournamentService,
    PrismaService,
    TournamentGraphService,
    MovieService,
    TheMovieDb,
  ],
})
export class TournamentModule {}
