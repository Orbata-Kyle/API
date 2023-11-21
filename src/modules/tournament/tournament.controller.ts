import { BadRequestException, Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { GetUser } from '../../modules/auth/decorator';
import { JwtGuard } from '../../modules/auth/guard';
import { TournamentService } from './tournament.service';
import { RankDto } from './dto';
import { MovieService } from '../movie/movie.service';
import { PrismaService } from '../../prisma/prisma.service';

@Controller('tournament')
export class TournamentController {
  constructor(
    private readonly tournamentService: TournamentService,
    private readonly movieService: MovieService,
    private readonly prismaService: PrismaService,
  ) {}

  @UseGuards(JwtGuard)
  @Get('rankings/:likedStatus')
  async getUsersTournamentRankings(@GetUser('id') userId: number, @Param('likedStatus') likedStatus: string) {
    if (!['liked', 'disliked'].includes(likedStatus)) {
      throw new BadRequestException('Invalid likedStatus');
    }
    return this.tournamentService.getUsersTournamentRankings(userId, likedStatus === 'liked');
  }

  @UseGuards(JwtGuard)
  @Post('rank')
  async tournamentRankMovieForUser(@Body() dto: RankDto, @GetUser('id') userId: number) {
    if (dto.winnerId === dto.loserId) {
      throw new BadRequestException('Winner and loser cannot be the same movie');
    }

    const swipedMovie1 = await this.prismaService.userMovieRating.findFirst({
      where: { userId, movieId: dto.winnerId },
    });
    const swipedMovie2 = await this.prismaService.userMovieRating.findFirst({
      where: { userId, movieId: dto.loserId },
    });
    if (!swipedMovie1 || !swipedMovie2) {
      throw new BadRequestException('User has not swiped both movies');
    }
    if (swipedMovie1.likedStatus !== swipedMovie2.likedStatus) {
      throw new BadRequestException('User has not swiped both movies with the same status');
    }

    return this.tournamentService.tournamentRankMovieForUser(
      userId,
      dto.winnerId,
      dto.loserId,
      swipedMovie1.likedStatus === 'liked',
    );
  }

  @UseGuards(JwtGuard)
  @Get('matchup')
  async getMatchup(@GetUser('id') userId: number) {
    return this.tournamentService.getMatchup(userId);
  }
}
