import { BadRequestException, Body, Controller, Delete, Get, NotFoundException, Param, Post, Put, UseGuards } from '@nestjs/common';
import { GetUser } from '../auth/decorator';
import { JwtGuard } from '../auth/guard';
import { TournamentService } from './tournament.service';
import { MatchupDto, MovieWithRankDto } from './dto/response';
import { PrismaService } from '../../utility-modules/prisma/prisma.service';
import { ForceRankDto, RankDto } from './dto/request';
import { ApiOperation, ApiResponse, ApiTags, ApiBearerAuth, ApiBody, ApiParam } from '@nestjs/swagger';
import { ResponseValidationService } from '../../utility-modules/validation/response-validation.service';
import { ValidateSeenInteractionStatus } from '../../pipes/seen-interaction-status.pipe';
import { ValidateStringIdPipe } from '../../pipes/string-id.pipe';

@ApiTags('Tournament')
@Controller('tournament')
export class TournamentController {
  constructor(
    private readonly tournamentService: TournamentService,
    private readonly prismaService: PrismaService,
    private readonly responseValidationService: ResponseValidationService,
  ) {}

  @UseGuards(JwtGuard)
  @Get('rankings/:interactionStatus')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Get User Tournament Rankings' })
  @ApiParam({
    name: 'interactionStatus',
    type: String,
    enum: ['liked', 'disliked'],
    description: 'Interaction status to filter rankings',
    required: true,
  })
  @ApiResponse({ status: 200, description: 'User tournament rankings', type: [MovieWithRankDto] })
  @ApiResponse({ status: 400, description: 'Bad Request - Invalid interactionStatus' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getUsersTournamentRankings(
    @GetUser('id') userId: number,
    @Param('interactionStatus', new ValidateSeenInteractionStatus()) interactionStatus: string,
  ): Promise<MovieWithRankDto[]> {
    const result = await this.tournamentService.getUsersTournamentRankings(userId, interactionStatus === 'liked');
    return this.responseValidationService.validateArrayResponse(result, MovieWithRankDto);
  }

  @UseGuards(JwtGuard)
  @Post('rank')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Rank a Movie for a User in a Tournament' })
  @ApiBody({ type: RankDto, required: true })
  @ApiResponse({ status: 200, description: 'Ranking processed successfully' })
  @ApiResponse({
    status: 400,
    description:
      'Bad Request - Winner and loser cannot be the same movie or User has not swiped both movies or User has not swiped both movies with the same status',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Movie not found' })
  async tournamentRankMovieForUser(@Body() dto: RankDto, @GetUser('id') userId: number): Promise<string> {
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
    const result = await this.tournamentService.getMatchup(userId);
    return this.responseValidationService.validateResponse(result, MatchupDto);
  }

  @UseGuards(JwtGuard)
  @Get('cycle/:interactionStatus')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Check if Tournament Ranking has a Cycle' })
  @ApiParam({
    name: 'interactionStatus',
    type: String,
    enum: ['liked', 'disliked'],
    description: 'Interaction status to check for cycles',
    required: true,
  })
  @ApiResponse({ status: 200, description: 'Cycle existence status', type: Boolean })
  @ApiResponse({ status: 400, description: 'Invalid interactionStatus' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async hasCycle(
    @GetUser('id') userId: number,
    @Param('interactionStatus', new ValidateSeenInteractionStatus()) interactionStatus: string,
  ): Promise<boolean> {
    return this.tournamentService.findCycle(userId, interactionStatus === 'liked');
  }

  @UseGuards(JwtGuard)
  @Put('forceMoviePlacement/:interactionStatus')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Force a Movie Placement for a User, between two other already ranked movies' })
  @ApiParam({
    name: 'interactionStatus',
    type: String,
    enum: ['liked', 'disliked'],
    description: 'Interaction status to force movie placement',
    required: true,
  })
  @ApiResponse({ status: 200, description: 'Movie placement forced successfully', type: String })
  @ApiResponse({
    status: 400,
    description:
      `**Invalid Body**: Both aboveMovieId and belowMovieId cannot be undefined.\n\n` +
      `**Invalid Interaction Status**: The provided interactionStatus is invalid.\n\n` +
      `**Invalid Movie IDs**: AboveMovieId and belowMovieId cannot be the same and cannot be the same as movieId.\n\n` +
      `**Ranking Requirements**: AboveMovieId and belowMovieId must have been ranked already and have the same interactionStatus as in request.\n\n` +
      `**Cycle Prevention**: This ranking would create a cycle. This should not happen if aboveMovieId is ranked above belowMovieId, i.e., if dragged in tournament ranking.`,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async forceMoviePlacement(
    @Body() dto: ForceRankDto,
    @GetUser('id') userId: number,
    @Param('interactionStatus', new ValidateSeenInteractionStatus()) interactionStatus: string,
  ): Promise<string> {
    if (dto.aboveMovieId === undefined && dto.belowMovieId === undefined) {
      throw new BadRequestException('Both aboveMovieId and belowMovieId cannot be undefined');
    }

    // Make sure aboveMovieId and belowMovieId are not the same and that they are not the same as movieId
    if (
      dto.aboveMovieId &&
      dto.belowMovieId &&
      (dto.aboveMovieId === dto.belowMovieId || dto.aboveMovieId === dto.movieId || dto.belowMovieId === dto.movieId)
    ) {
      throw new BadRequestException('aboveMovieId and belowMovieId cannot be the same and cannot be the same as movieId');
    }
    // Make sure aboveMovieId and belowMovieId are same interactionStatus and there are individual rankings for both
    if (dto.aboveMovieId) {
      const aboveMovie = await this.prismaService.tournamentRating.findFirst({
        where: { userId, interactionStatus: interactionStatus, OR: [{ movie1Id: dto.aboveMovieId }, { movie2Id: dto.aboveMovieId }] },
      });
      if (!aboveMovie) {
        throw new BadRequestException(`aboveMovieId must have been ranked already and have interactionStatus status`);
      }
    }

    if (dto.belowMovieId) {
      const belowMovie = await this.prismaService.tournamentRating.findFirst({
        where: { userId, interactionStatus: interactionStatus, OR: [{ movie1Id: dto.belowMovieId }, { movie2Id: dto.belowMovieId }] },
      });
      if (!belowMovie) {
        throw new BadRequestException(`belowMovieId must have been ranked already and have interactionStatus status`);
      }
    }

    return this.tournamentService.forceMoviePlacement(
      userId,
      dto.movieId,
      dto.aboveMovieId,
      dto.belowMovieId,
      interactionStatus === 'liked',
    );
  }

  @UseGuards(JwtGuard)
  @Put('rank/undo')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Undo last Tournament Ranking and return that Matchup' })
  @ApiResponse({ status: 200, description: 'Last ranking undone', type: MatchupDto })
  @ApiResponse({ status: 404, description: 'No more rankings to undo' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async undoLastRanking(@GetUser('id') userId: number): Promise<MatchupDto> {
    const result = await this.tournamentService.undoLastRanking(userId);
    return this.responseValidationService.validateResponse(result, MatchupDto);
  }

  @UseGuards(JwtGuard)
  @Delete('rank/:interactionStatus/:movieId')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Remove a Movie from Tournament Rankings' })
  @ApiParam({
    name: 'interactionStatus',
    type: String,
    enum: ['liked', 'disliked'],
    description: 'Interaction status to remove movie',
    required: true,
  })
  @ApiParam({ name: 'movieId', type: Number, description: 'ID of the movie to remove', required: true })
  @ApiResponse({ status: 200, description: 'Movie removed from rankings' })
  @ApiResponse({ status: 400, description: 'Invalid interactionStatus' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Movie ranking not found' })
  async removeMovieRanking(
    @GetUser('id') userId: number,
    @Param('interactionStatus', new ValidateSeenInteractionStatus()) interactionStatus: string,
    @Param('movieId', new ValidateStringIdPipe()) movieId: string,
  ): Promise<string> {
    const swipedMovie = await this.prismaService.tournamentRating.findFirst({
      where: { userId, interactionStatus, OR: [{ movie1Id: Number(movieId) }, { movie2Id: Number(movieId) }] },
    });
    if (!swipedMovie) {
      throw new NotFoundException('Movie ranking not found');
    }

    return this.tournamentService.removeMovieRankingsEndpoint(userId, Number(movieId), interactionStatus);
  }

  @UseGuards(JwtGuard)
  @Get('progress/:interactionStatus')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Get Users rough Tournament Progress' })
  @ApiParam({
    name: 'interactionStatus',
    type: String,
    enum: ['liked', 'disliked'],
    description: 'Interaction status to check for progress',
    required: true,
  })
  @ApiResponse({ status: 200, description: 'Tournament progress', type: String })
  @ApiResponse({ status: 400, description: 'Invalid interactionStatus' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getTournamentProgress(
    @GetUser('id') userId: number,
    @Param('interactionStatus', new ValidateSeenInteractionStatus()) interactionStatus: string,
  ): Promise<string> {
    return this.tournamentService.getTournamentProgress(userId, interactionStatus);
  }
}
