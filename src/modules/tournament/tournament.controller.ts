import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { GetUser } from '../../modules/auth/decorator';
import { JwtGuard } from '../../modules/auth/guard';
import { TournamentService } from './tournament.service';
import { RankDto } from './dto';
import { MovieService } from '../movie/movie.service';

@Controller('tournament')
export class TournamentController {
  constructor(private readonly tournamentService: TournamentService, private readonly movieService: MovieService) {}

  @UseGuards(JwtGuard)
  @Get('rankings')
  async getUsersTournamentRankings(@GetUser('id') userId: number) {
    return this.tournamentService.getUsersTournamentRankings(userId);
  }

  @UseGuards(JwtGuard)
  @Post('rank')
  async tournamentRankMovieForUser(@Body() dto: RankDto, @GetUser('id') userId: number) {
    await this.movieService.ensureMovieInDb(dto.winnerId);
    await this.movieService.ensureMovieInDb(dto.loserId);

    return this.tournamentService.tournamentRankMovieForUser(userId, dto.winnerId, dto.loserId);
  }

  @UseGuards(JwtGuard)
  @Get('matchup')
  async getMatchup(@GetUser('id') userId: number) {
    return this.tournamentService.getMatchup(userId);
  }
}
