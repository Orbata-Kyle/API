import { Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { GetUser } from '../auth/decorator';
import { JwtGuard } from '../auth/guard';
import { MovieService } from './movie.service';
import { ApiOperation, ApiResponse, ApiTags, ApiParam, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { MovieRatingDto, MovieDto, DetailedMovieDto } from './dto/response';
import { MovieCacheService } from '../../utility-modules/movie-cache/db-movie-cache.service';
import { ResponseValidationService } from '../../utility-modules/validation/response-validation.service';
import { ValidateStringIdPipe } from '../../pipes/string-id.pipe';
import { ValidateFullInteractionStatus } from '../..//pipes/full-interaction-status.pipe';

@ApiTags('Movie')
@Controller('movie')
export class MovieController {
  constructor(
    private readonly movieService: MovieService,
    private readonly dbMovieCache: MovieCacheService,
    private readonly responseValidationService: ResponseValidationService,
  ) {}

  @Get('search')
  @ApiOperation({ summary: 'Search for a movie by title' })
  @ApiQuery({ name: 'title', type: String, description: 'Title of the movie' })
  @ApiResponse({ status: 200, description: 'Movies found', type: [MovieDto] })
  async searchForMovieByTitle(@Query('title') title: string): Promise<MovieDto[]> {
    const movie = await this.movieService.searchForMovieByTitle(title);
    return await this.responseValidationService.validateArrayResponse(movie, MovieDto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a movie by its ID' })
  @ApiParam({ name: 'id', type: String, description: 'ID of the movie' })
  @ApiResponse({ status: 200, description: 'Movie details', type: DetailedMovieDto })
  @ApiResponse({ status: 404, description: 'Movie not found' })
  async getMovieById(@Param('id', new ValidateStringIdPipe()) id: string): Promise<DetailedMovieDto> {
    const movie = await this.dbMovieCache.getMovieById(Number(id));
    return await this.responseValidationService.validateResponse(movie, DetailedMovieDto);
  }

  @UseGuards(JwtGuard)
  @Post(':id/rate/:action')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Rate a movie' })
  @ApiParam({ name: 'id', type: String, description: 'ID of the movie' })
  @ApiParam({ name: 'action', type: String, enum: ['liked', 'disliked', 'unseen'], description: 'Rating action' })
  @ApiResponse({ status: 201, description: 'Movie rated', type: MovieRatingDto })
  @ApiResponse({ status: 400, description: 'Invalid action' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Movie not found' })
  @ApiBearerAuth('access-token')
  async rateMovieById(
    @Param('id', new ValidateStringIdPipe()) id: string,
    @Param('action', new ValidateFullInteractionStatus()) action: string,
    @GetUser('id') userId: number,
  ): Promise<MovieRatingDto> {
    await this.dbMovieCache.ensureMovieInDb(Number(id));

    const result = await this.movieService.rateMovieById(id, action, userId);
    return await this.responseValidationService.validateResponse(result, MovieRatingDto);
  }
}
