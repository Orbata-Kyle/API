import { BadRequestException, Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { GetUser } from '../../modules/auth/decorator';
import { JwtGuard } from '../../modules/auth/guard';
import { TournamentService } from './tournament.service';
import { MatchupDto, RankDto } from './dto';
import { MovieService } from '../movie/movie.service';
import { PrismaService } from '../../prisma/prisma.service';
import { MovieWithRankDto } from './dto/movie-with-rank.dto';
import { ApiOperation, ApiResponse, ApiTags, ApiBearerAuth, ApiBody, ApiParam } from '@nestjs/swagger';

@ApiTags('Tournament')
@Controller('tournament')
export class TournamentController {
  constructor(
    private readonly tournamentService: TournamentService,
    private readonly movieService: MovieService,
    private readonly prismaService: PrismaService,
  ) {}

  @UseGuards(JwtGuard)
  @Get('rankings/:interactionStatus')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Get User Tournament Rankings' })
  @ApiParam({ name: 'interactionStatus', enum: ['liked', 'disliked'], description: 'Interaction status to filter rankings' })
  @ApiResponse({ status: 200, description: 'User tournament rankings', type: [MovieWithRankDto] })
  @ApiResponse({ status: 400, description: 'Bad Request - Invalid interactionStatus' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getUsersTournamentRankings(
    @GetUser('id') userId: number,
    @Param('interactionStatus') interactionStatus: string,
  ): Promise<MovieWithRankDto[]> {
    if (!['liked', 'disliked'].includes(interactionStatus)) {
      throw new BadRequestException('Invalid interactionStatus');
    }
    return this.tournamentService.getUsersTournamentRankings(userId, interactionStatus === 'liked');
  }

  @UseGuards(JwtGuard)
  @Post('rank')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Rank a Movie for a User in a Tournament' })
  @ApiBody({ type: RankDto })
  @ApiResponse({ status: 200, description: 'Ranking processed successfully' })
  @ApiResponse({
    status: 400,
    description:
      'Bad Request - Winner and loser cannot be the same movie or User has not swiped both movies or User has not swiped both movies with the same status',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Movie not found' })
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
    if (swipedMovie1.interactionStatus !== swipedMovie2.interactionStatus) {
      throw new BadRequestException('User has not swiped both movies with the same status');
    }

    return this.tournamentService.tournamentRankMovieForUser(userId, dto.winnerId, dto.loserId, swipedMovie1.interactionStatus === 'liked');
  }

  @UseGuards(JwtGuard)
  @Get('matchup')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Get a Matchup for Tournament' })
  @ApiResponse({ status: 200, description: 'Matchup details', type: MatchupDto })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getMatchup(@GetUser('id') userId: number): Promise<MatchupDto> {
    return this.tournamentService.getMatchup(userId);
  }

  @UseGuards(JwtGuard)
  @Get('cycle/:interactionStatus')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Check if Tournament Ranking has a Cycle' })
  @ApiParam({ name: 'interactionStatus', enum: ['liked', 'disliked'], description: 'Interaction status to check for cycles' })
  @ApiResponse({ status: 200, description: 'Cycle existence status', type: Boolean })
  @ApiResponse({ status: 400, description: 'Invalid interactionStatus' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async hasCycle(@GetUser('id') userId: number, @Param('interactionStatus') interactionStatus: string) {
    if (!['liked', 'disliked'].includes(interactionStatus)) {
      throw new BadRequestException('Invalid interactionStatus');
    }
    return this.tournamentService.findCycle(userId, interactionStatus === 'liked');
  }
}
